/**
 * AuditViewModal - Full-screen modal to view audit report
 * Displays the complete audit using AuditPublicView component directly
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X, ExternalLink, Loader2, Copy, Check, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import api from '@/lib/api'
import AuditPublicView from '@/components/AuditPublicView'

export default function AuditViewModal({ 
  audit: initialAudit, 
  isOpen, 
  onClose,
  onSendAudit 
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [fullAudit, setFullAudit] = useState(null)
  const [error, setError] = useState(null)

  // Fetch full audit data when modal opens
  useEffect(() => {
    if (isOpen && initialAudit?.id) {
      setIsLoading(true)
      setError(null)
      
      api.get(`/.netlify/functions/audits-get?id=${initialAudit.id}`)
        .then(response => {
          setFullAudit(response.data.audit)
          setIsLoading(false)
        })
        .catch(err => {
          console.error('Failed to fetch audit:', err)
          setError(err.response?.data?.error || 'Failed to load audit')
          setIsLoading(false)
        })
    }
  }, [isOpen, initialAudit?.id])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFullAudit(null)
      setError(null)
    }
  }, [isOpen])

  if (!isOpen || !initialAudit) return null

  // Build the audit URL with magic token for sharing
  const portalBaseUrl = import.meta.env.VITE_PORTAL_URL || 'https://portal.uptrademedia.com'
  const auditUrl = initialAudit.magic_token 
    ? `${portalBaseUrl}/audit/${initialAudit.id}?token=${initialAudit.magic_token}`
    : `${portalBaseUrl}/audit/${initialAudit.id}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(auditUrl)
      setCopied(true)
      toast.success('Audit link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  const handleOpenExternal = () => {
    window.open(auditUrl, '_blank')
  }

  const score = initialAudit.performance_score || initialAudit.scores?.performance || null
  const status = initialAudit.status || 'unknown'

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-4 md:inset-6 lg:inset-8 z-50 flex flex-col animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-t-2xl shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Website Audit
              </h2>
              <p className="text-sm text-[var(--text-secondary)] truncate max-w-md">
                {initialAudit.target_url || initialAudit.targetUrl}
              </p>
            </div>
            
            {score !== null && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                score >= 90 ? "bg-emerald-500/10 text-emerald-600" :
                score >= 50 ? "bg-amber-500/10 text-amber-600" :
                "bg-red-500/10 text-red-600"
              )}>
                <span>Performance: {Math.round(score)}</span>
              </div>
            )}
            
            <Badge variant={status === 'complete' || status === 'completed' ? 'success' : status === 'running' ? 'warning' : 'secondary'}>
              {status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="rounded-xl"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1.5 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy Link
                </>
              )}
            </Button>
            
            {onSendAudit && (status === 'complete' || status === 'completed') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendAudit(initialAudit)}
                className="rounded-xl"
              >
                <Mail className="h-4 w-4 mr-1.5" />
                Send
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
              className="rounded-xl"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Open in New Tab
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 bg-[var(--surface-primary)] rounded-b-2xl overflow-hidden border-x border-b border-[var(--glass-border)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
                <p className="text-sm text-[var(--text-secondary)]">Loading audit report...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-center max-w-md">
                <div className="p-4 rounded-full bg-red-500/10">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-lg font-medium text-[var(--text-primary)]">Failed to Load Audit</p>
                <p className="text-sm text-[var(--text-secondary)]">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsLoading(true)
                    setError(null)
                    api.get(`/.netlify/functions/audits-get?id=${initialAudit.id}`)
                      .then(response => {
                        setFullAudit(response.data.audit)
                        setIsLoading(false)
                      })
                      .catch(err => {
                        setError(err.response?.data?.error || 'Failed to load audit')
                        setIsLoading(false)
                      })
                  }}
                  className="rounded-xl mt-2"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : fullAudit ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                <AuditPublicView audit={fullAudit} />
              </div>
            </ScrollArea>
          ) : null}
        </div>
      </div>
    </>
  )
}
