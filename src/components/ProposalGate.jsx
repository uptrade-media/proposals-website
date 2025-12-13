import { useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'
import UptradeLoading from './UptradeLoading'
import ProposalTemplate from './ProposalTemplate'

export default function ProposalGate() {
  const { slug } = useParams()
  const [proposal, setProposal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchAttempted = useRef(false)

  useEffect(() => {
    // Proposals are publicly accessible by slug - no auth required
    fetchProposal()
  }, [slug])

  // Fetch proposal by slug (public access)
  const fetchProposal = async () => {
    if (fetchAttempted.current) return
    fetchAttempted.current = true

    try {
      setIsLoading(true)
      setError(null)
      
      console.log('[ProposalGate] Fetching proposal by slug:', slug)
      
      const response = await api.get(`/.netlify/functions/proposals-get?id=${slug}`)
      
      if (response.data?.proposal) {
        setProposal(response.data.proposal)
        console.log('[ProposalGate] Proposal loaded:', response.data.proposal.title)
        
        // Track view (fire and forget)
        trackProposalView(response.data.proposal.id)
      } else {
        setError('Proposal not found')
      }
    } catch (err) {
      console.error('[ProposalGate] Failed to fetch proposal:', err)
      setError(err.response?.data?.error || 'Failed to load proposal')
    } finally {
      setIsLoading(false)
    }
  }

  // Track proposal view for analytics (fire and forget)
  const trackProposalView = async (proposalId) => {
    if (!proposalId) return
    
    try {
      await api.post('/.netlify/functions/proposals-track-view', {
        proposalId,
        event: 'view',
        metadata: {
          accessType: 'public_slug',
          userAgent: navigator.userAgent,
          referrer: document.referrer
        }
      })
    } catch (err) {
      // Ignore tracking errors
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
        </div>
      </div>
    )
  }

  // Pass isPublicView=true since this is the client-facing route
  // Clients should always see the signature section
  return <ProposalTemplate proposal={proposal} proposalSlug={slug} isPublicView={true} />
}
