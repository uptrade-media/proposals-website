// src/components/AuditGate.jsx
// Public gate for magic link access to audits
// Validates token via main site API per AUDIT-SYSTEM-REFERENCE.md
import { useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import UptradeLoading from './UptradeLoading'
import AuditPublicView from './AuditPublicView'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Main site API for token validation
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
  }
}

export default function AuditGate() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [audit, setAudit] = useState(null)
  const [contact, setContact] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const validateAndFetchAudit = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get magic token from URL
        const token = searchParams.get('token')
        
        if (!token) {
          setError('No access token provided')
          return
        }
        
        // Check session cache first (1 hour)
        const cacheKey = `audit_${id}`
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          try {
            const cachedData = JSON.parse(cached)
            if (Date.now() - cachedData._cachedAt < 3600000) {
              setAudit(cachedData.audit)
              setContact(cachedData.contact)
              setIsLoading(false)
              return
            }
          } catch (e) {
            // Invalid cache, continue to validate
            sessionStorage.removeItem(cacheKey)
          }
        }
        
        // Validate token with main site API
        const response = await fetch(MAIN_SITE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auditId: id, token })
        })
        
        const data = await response.json()
        
        if (!response.ok || !data.valid) {
          setError(data.error || 'Failed to validate token')
          return
        }
        
        // Cache for session
        sessionStorage.setItem(cacheKey, JSON.stringify({
          audit: data.audit,
          contact: data.audit?.contact || null,
          _cachedAt: Date.now()
        }))
        
        setAudit(data.audit)
        setContact(data.audit?.contact || null)
        
      } catch (err) {
        console.error('Failed to validate audit token:', err)
        setError('Failed to load audit report. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      validateAndFetchAudit()
    }
  }, [id, searchParams])

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
