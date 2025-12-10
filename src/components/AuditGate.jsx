// src/components/AuditGate.jsx
// Public gate for magic link access to audits
// Uses Supabase Auth magic links (primary) with token validation fallback
// See MAGIC-LINK-AUTH.md for architecture details
import { useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import UptradeLoading from './UptradeLoading'
import AuditPublicView from './AuditPublicView'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Main site API for fallback token validation
const MAIN_SITE_API = 'https://uptrademedia.com/api/audit-validate-token'

// Error messages for better UX
const errorMessages = {
  'No access token provided': {
    title: 'Invalid Link',
    message: 'This link is missing the access token. Please use the link from your email.'
  },
  'Invalid token': {
    title: 'Access Denied',
    message: 'This link is not valid. Please request a new audit or contact support.'
  },
  'Token expired': {
    title: 'Link Expired',
    message: 'This link has expired (30 days). Please request a new audit to get a fresh link.'
  },
  'Audit not found': {
    title: 'Audit Not Found',
    message: 'This audit does not exist. It may have been deleted.'
  },
  'No session or token': {
    title: 'Authentication Required',
    message: 'Please use the link from your email to access this audit.'
  }
}

export default function AuditGate() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [audit, setAudit] = useState(null)
  const [contact, setContact] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const authChecked = useRef(false)

  useEffect(() => {
    // Set up Supabase auth state listener
    // This handles magic link tokens in URL hash (#access_token=...)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuditGate] Auth state change:', event, !!session)
        
        if (event === 'SIGNED_IN' && session) {
          // Magic link worked - fetch audit with session
          await fetchAuditWithSession(session)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Session refreshed, already have audit data
          console.log('[AuditGate] Token refreshed')
        }
      }
    )

    // Initial auth check
    checkAuthAndFetchAudit()

    return () => {
      subscription.unsubscribe()
    }
  }, [id])

  // Check for existing session or fallback token
  const checkAuthAndFetchAudit = async () => {
    // Prevent duplicate checks
    if (authChecked.current) return
    authChecked.current = true

    try {
      setIsLoading(true)
      setError(null)

      // Check session cache first (1 hour)
      const cacheKey = `audit_${id}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          if (Date.now() - cachedData._cachedAt < 3600000) {
            console.log('[AuditGate] Using cached audit data')
            setAudit(cachedData.audit)
            setContact(cachedData.contact)
            setIsLoading(false)
            return
          }
        } catch (e) {
          sessionStorage.removeItem(cacheKey)
        }
      }

      // Check for existing Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log('[AuditGate] Found existing session')
        await fetchAuditWithSession(session)
        return
      }

      // Check if URL hash contains magic link tokens (Supabase will process these)
      if (window.location.hash.includes('access_token')) {
        console.log('[AuditGate] Magic link tokens in URL, waiting for auth state change...')
        // Don't set loading false - onAuthStateChange will handle this
        return
      }

      // Fallback: Check for legacy token in query params
      const token = searchParams.get('token')
      if (token) {
        console.log('[AuditGate] Using fallback token validation')
        await validateWithToken(token)
        return
      }

      // No auth method available
      setError('No session or token')
      setIsLoading(false)

    } catch (err) {
      console.error('[AuditGate] Auth check failed:', err)
      setError('Failed to authenticate. Please try again.')
      setIsLoading(false)
    }
  }

  // Fetch audit using Supabase session
  const fetchAuditWithSession = async (session) => {
    try {
      console.log('[AuditGate] Fetching audit with session for user:', session.user?.email)
      
      // Call portal's audit-get-public function with session
      const response = await fetch(`/.netlify/functions/audits-get-public?id=${id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to load audit')
        setIsLoading(false)
        return
      }

      const data = await response.json()
      
      // Cache for session
      const cacheKey = `audit_${id}`
      sessionStorage.setItem(cacheKey, JSON.stringify({
        audit: data.audit || data,
        contact: data.contact || data.audit?.contact || null,
        _cachedAt: Date.now()
      }))

      setAudit(data.audit || data)
      setContact(data.contact || data.audit?.contact || null)
      setIsLoading(false)

      // Track view (fire and forget)
      trackAuditView(id, session)

    } catch (err) {
      console.error('[AuditGate] Failed to fetch audit with session:', err)
      setError('Failed to load audit report. Please try again.')
      setIsLoading(false)
    }
  }

  // Fallback: Validate with legacy token via main site API
  const validateWithToken = async (token) => {
    try {
      const response = await fetch(MAIN_SITE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: id, token })
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        setError(data.error || 'Failed to validate token')
        setIsLoading(false)
        return
      }

      // Cache for session
      const cacheKey = `audit_${id}`
      sessionStorage.setItem(cacheKey, JSON.stringify({
        audit: data.audit,
        contact: data.audit?.contact || null,
        _cachedAt: Date.now()
      }))

      setAudit(data.audit)
      setContact(data.audit?.contact || null)
      setIsLoading(false)

    } catch (err) {
      console.error('[AuditGate] Token validation failed:', err)
      setError('Failed to load audit report. Please try again.')
      setIsLoading(false)
    }
  }

  // Track audit view for analytics
  const trackAuditView = async (auditId, session) => {
    try {
      await fetch('/.netlify/functions/audits-track-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ auditId })
      })
    } catch (err) {
      console.warn('[AuditGate] Failed to track view:', err)
    }
  }

  if (isLoading) {
    return <UptradeLoading message="Loading your audit report..." />
  }

  if (error || !audit) {
    const errorInfo = errorMessages[error] || {
      title: 'Unable to Load Audit',
      message: error || 'Audit not found'
    }
    
    return (
      <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-[var(--accent-red)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-[var(--accent-red)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            {errorInfo.title}
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">{errorInfo.message}</p>
          <a 
            href="https://uptrademedia.com/free-audit/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Request a New Audit
          </a>
        </div>
      </div>
    )
  }

  return <AuditPublicView audit={audit} contact={contact} />
}
