import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
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

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setIsLoading(true)
        
        // Check for magic link token
        const token = searchParams.get('token')
        
        // Build request with token if present
        const params = new URLSearchParams({ id: slug })
        if (token) {
          params.append('token', token)
          setIsMagicLink(true)
        }
        
        const response = await api.get(`/.netlify/functions/proposals-get?${params.toString()}`)
        setProposal(response.data.proposal)
        
        // Track proposal view if magic link access
        if (token && response.data.proposal?.id) {
          api.post('/.netlify/functions/proposals-track-view', {
            proposalId: response.data.proposal.id,
            event: 'view',
            metadata: {
              accessType: 'magic_link',
              userAgent: navigator.userAgent,
              referrer: document.referrer
            }
          }).catch(err => console.warn('Failed to track view:', err))
        }
      } catch (err) {
        console.error('Failed to fetch proposal:', err)
        const errorMsg = err.response?.data?.error || 'Failed to load proposal'
        setError(errorMsg)
        
        // Only redirect to login if not using magic link
        if (err.response?.status === 401 && !searchParams.get('token')) {
          toast.error('Please log in to view this proposal')
          navigate('/login')
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (slug) {
      fetchProposal()
    }
  }, [slug, navigate, searchParams])

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

  // Pass isMagicLink to ProposalTemplate so it can hide portal UI
  return <ProposalTemplate proposal={proposal} proposalSlug={slug} isPublicView={isMagicLink} />
}
