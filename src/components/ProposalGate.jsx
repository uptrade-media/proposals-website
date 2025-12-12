import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import api from '@/lib/api'
import { toast } from '@/lib/toast'
import UptradeLoading from './UptradeLoading'
import ProposalTemplate from './ProposalTemplate'

export default function ProposalGate() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [proposal, setProposal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMagicLink, setIsMagicLink] = useState(false)
  const authChecked = useRef(false)

  useEffect(() => {
    // Set up Supabase auth state listener for magic link tokens in URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[ProposalGate] Auth state change:', event, !!session)
        
        if (event === 'SIGNED_IN' && session) {
          // Magic link worked - fetch proposal with session
          setIsMagicLink(true)
          await fetchProposalWithSession(session)
        }
      }
    )

    // Initial auth check
    checkAuthAndFetchProposal()

    return () => {
      subscription.unsubscribe()
    }
  }, [slug])

  // Check for existing session or token
  const checkAuthAndFetchProposal = async () => {
    if (authChecked.current) return
    authChecked.current = true

    try {
      setIsLoading(true)
      setError(null)

      // Check if URL hash contains magic link tokens
      const hashHasTokens = window.location.hash.includes('access_token') || 
                            window.location.hash.includes('error_description')
      
      if (hashHasTokens) {
        console.log('[ProposalGate] Magic link tokens in URL hash, letting Supabase process...')
        // Give Supabase a moment to process the hash tokens
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check if auth succeeded after processing
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('[ProposalGate] Session established from magic link')
          // Clean up the URL hash for better UX
          window.history.replaceState(null, '', window.location.pathname)
          setIsMagicLink(true)
          await fetchProposalWithSession(session)
          return
        }
        
        // Check for auth errors in hash
        if (window.location.hash.includes('error_description')) {
          const errorMatch = window.location.hash.match(/error_description=([^&]+)/)
          const errorMsg = errorMatch ? decodeURIComponent(errorMatch[1]) : 'Authentication failed'
          console.error('[ProposalGate] Magic link error:', errorMsg)
          setError(errorMsg.includes('expired') ? 'This link has expired' : 'Invalid link')
          setIsLoading(false)
          return
        }
        
        // Wait for onAuthStateChange to fire
        console.log('[ProposalGate] Waiting for auth state change...')
        return
      }

      // Check for existing Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log('[ProposalGate] Found existing session')
        setIsMagicLink(true)
        await fetchProposalWithSession(session)
        return
      }

      // Fallback: Check for legacy token in query params
      const token = searchParams.get('token')
      if (token) {
        console.log('[ProposalGate] Using legacy token validation')
        setIsMagicLink(true)
        await fetchProposalWithToken(token)
        return
      }

      // No auth - try to fetch without auth (will require login if not public)
      await fetchProposalNoAuth()

    } catch (err) {
      console.error('[ProposalGate] Auth check failed:', err)
      setError('Failed to authenticate. Please try again.')
      setIsLoading(false)
    }
  }

  // Fetch proposal using Supabase session
  const fetchProposalWithSession = async (session) => {
    try {
      console.log('[ProposalGate] Fetching proposal with session for user:', session.user?.email)
      
      const response = await api.get(`/.netlify/functions/proposals-get?id=${slug}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      setProposal(response.data.proposal)
      
      // Track view
      trackProposalView(response.data.proposal?.id, 'supabase_magic_link', session.access_token)
      
      setIsLoading(false)
    } catch (err) {
      console.error('[ProposalGate] Failed to fetch proposal with session:', err)
      setError(err.response?.data?.error || 'Failed to load proposal')
      setIsLoading(false)
    }
  }

  // Fetch proposal using legacy token
  const fetchProposalWithToken = async (token) => {
    try {
      const params = new URLSearchParams({ id: slug, token })
      const response = await api.get(`/.netlify/functions/proposals-get?${params.toString()}`)
      
      setProposal(response.data.proposal)
      
      // Track view
      trackProposalView(response.data.proposal?.id, 'legacy_token')
      
      setIsLoading(false)
    } catch (err) {
      console.error('[ProposalGate] Failed to fetch proposal with token:', err)
      setError(err.response?.data?.error || 'Failed to load proposal')
      setIsLoading(false)
    }
  }

  // Fetch proposal without auth (requires login for non-public proposals)
  const fetchProposalNoAuth = async () => {
    try {
      const response = await api.get(`/.netlify/functions/proposals-get?id=${slug}`)
      setProposal(response.data.proposal)
      setIsLoading(false)
    } catch (err) {
      console.error('[ProposalGate] Failed to fetch proposal:', err)
      const errorMsg = err.response?.data?.error || 'Failed to load proposal'
      setError(errorMsg)
      
      // Redirect to login if unauthorized
      if (err.response?.status === 401) {
        toast.error('Please log in to view this proposal')
        navigate('/login')
      }
      setIsLoading(false)
    }
  }

  // Track proposal view for analytics
  const trackProposalView = async (proposalId, accessType, accessToken = null) => {
    if (!proposalId) return
    
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      
      await api.post('/.netlify/functions/proposals-track-view', {
        proposalId,
        event: 'view',
        metadata: {
          accessType,
          userAgent: navigator.userAgent,
          referrer: document.referrer
        }
      }, { headers })
    } catch (err) {
      console.warn('[ProposalGate] Failed to track view:', err)
    }
  }

  if (isLoading) {
    return <UptradeLoading />
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Unable to Load Proposal</h1>
          <p className="text-gray-600 mb-4">{error || 'Proposal not found'}</p>
          {!isMagicLink && (
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-[#4bbf39] text-white rounded hover:bg-[#3da832]"
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    )
  }

  // Pass isPublicView=true since this is the client-facing route
  // Clients should always see the signature section
  return <ProposalTemplate proposal={proposal} proposalSlug={slug} isPublicView={true} />
}
