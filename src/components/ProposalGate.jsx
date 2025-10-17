import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { toast } from '@/lib/toast'
import UptradeLoading from './UptradeLoading'
import ProposalTemplate from './ProposalTemplate'

export default function ProposalGate() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setIsLoading(true)
        const response = await api.get(`/.netlify/functions/proposals-get?id=${slug}`)
        setProposal(response.data.proposal)
      } catch (err) {
        console.error('Failed to fetch proposal:', err)
        const errorMsg = err.response?.data?.error || 'Failed to load proposal'
        setError(errorMsg)
        toast.error(errorMsg)
        // Redirect to login if not authenticated
        if (err.response?.status === 401) {
          navigate('/login')
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (slug) {
      fetchProposal()
    }
  }, [slug, navigate])

  if (isLoading) {
    return <UptradeLoading />
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Unable to Load Proposal</h1>
          <p className="text-gray-600 mb-4">{error || 'Proposal not found'}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-[#4bbf39] text-white rounded hover:bg-[#3da832]"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return <ProposalTemplate proposal={proposal} proposalSlug={slug} />
}
