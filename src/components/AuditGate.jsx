// src/components/AuditGate.jsx
// Public gate for magic link access to audits (similar to ProposalGate)
import { useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import UptradeLoading from './UptradeLoading'
import AuditPublicView from './AuditPublicView'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

export default function AuditGate() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [audit, setAudit] = useState(null)
  const [contact, setContact] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get magic token from URL
        const token = searchParams.get('token')
        
        if (!token) {
          setError('Invalid link. No access token provided.')
          return
        }
        
        // Fetch audit with magic token
        const params = new URLSearchParams({ id, token })
        const response = await api.get(`/.netlify/functions/audits-get-public?${params.toString()}`)
        
        setAudit(response.data.audit)
        setContact(response.data.contact)
        
        // Track view
        api.post('/.netlify/functions/audits-track-view', {
          auditId: response.data.audit.id,
          event: 'view',
          metadata: {
            accessType: 'magic_link',
            userAgent: navigator.userAgent,
            referrer: document.referrer
          }
        }).catch(err => console.warn('Failed to track view:', err))
        
      } catch (err) {
        console.error('Failed to fetch audit:', err)
        const errorMsg = err.response?.data?.error || 'Failed to load audit report'
        setError(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchAudit()
    }
  }, [id, searchParams])

  if (isLoading) {
    return <UptradeLoading message="Loading your audit report..." />
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-[var(--accent-red)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-[var(--accent-red)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Unable to Load Audit
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">{error || 'Audit not found'}</p>
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
