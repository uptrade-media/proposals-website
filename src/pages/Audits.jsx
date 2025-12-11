// src/pages/Audits.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Progress } from '../components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { 
  BarChart3, 
  ExternalLink, 
  Loader2, 
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Link2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  User,
  Building2,
  Mail,
  Smartphone,
  Monitor,
  TrendingUp,
  Trash2,
  Zap,
  Search,
  Shield,
  Maximize2
} from 'lucide-react'
import useReportsStore from '../lib/reports-store'
import useProjectsStore from '../lib/projects-store'
import useAuthStore from '../lib/auth-store'
import api from '../lib/api'
import { toast } from '../lib/toast'
import AuditPublicView from '../components/AuditPublicView'

// Helper: Check if audit is completed (handles both 'complete' and 'completed' statuses)
const isAuditCompleted = (status) => status === 'completed' || status === 'complete'

// Admin-only audit row component with magic link and analytics
function AdminAuditRow({ audit, navigate, getStatusIcon, getScoreColor, getAuditStatusBadge, onDelete }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showFullAudit, setShowFullAudit] = useState(false)
  const [fullAuditData, setFullAuditData] = useState(null)
  const [loadingFullAudit, setLoadingFullAudit] = useState(false)
  const [magicLink, setMagicLink] = useState(audit.magicToken ? 
    `${window.location.origin}/audit/${audit.id}?token=${audit.magicToken}` : null
  )
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const statusBadge = getAuditStatusBadge(audit.status)

  // Handle delete
  const handleDelete = async (e) => {
    e.stopPropagation()
    setIsDeleting(true)
    try {
      const result = await onDelete(audit.id)
      if (result.success) {
        toast.success('Audit deleted')
      } else {
        toast.error(result.error || 'Failed to delete audit')
      }
    } catch (err) {
      toast.error('Failed to delete audit')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Generate or get magic link
  const handleGetMagicLink = async (e) => {
    e.stopPropagation()
    
    if (magicLink) {
      // Copy existing link
      copyToClipboard()
      return
    }

    setIsGenerating(true)
    try {
      const res = await api.post(`/.netlify/functions/audits-magic-link`, {
        auditId: audit.id
      })
      
      if (res.data.magicLink) {
        setMagicLink(res.data.magicLink)
        await navigator.clipboard.writeText(res.data.magicLink)
        setCopied(true)
        toast.success('Magic link created and copied!')
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to generate magic link:', err)
      toast.error('Failed to generate magic link')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (!magicLink) return
    try {
      await navigator.clipboard.writeText(magicLink)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  // Load analytics and audit preview when expanded
  const handleToggle = async () => {
    const newState = !isOpen
    setIsOpen(newState)
    
    if (newState && isAuditCompleted(audit.status)) {
      // Load analytics
      if (!analytics) {
        setLoadingAnalytics(true)
        try {
          const res = await api.get(`/.netlify/functions/audits-analytics?auditId=${audit.id}`)
          setAnalytics(res.data)
        } catch (err) {
          console.error('Failed to load analytics:', err)
        } finally {
          setLoadingAnalytics(false)
        }
      }
      
      // Load full audit data for preview
      if (!fullAuditData) {
        setLoadingFullAudit(true)
        try {
          const res = await api.get(`/.netlify/functions/audits-get?id=${audit.id}`)
          setFullAuditData(res.data.audit)
        } catch (err) {
          console.error('Failed to load audit data:', err)
        } finally {
          setLoadingFullAudit(false)
        }
      }
    }
  }

  // Open full audit view modal
  const handleViewFullAudit = async (e) => {
    e?.stopPropagation()
    
    if (!fullAuditData) {
      setLoadingFullAudit(true)
      try {
        const res = await api.get(`/.netlify/functions/audits-get?id=${audit.id}`)
        setFullAuditData(res.data.audit)
      } catch (err) {
        console.error('Failed to load audit data:', err)
        toast.error('Failed to load audit data')
        return
      } finally {
        setLoadingFullAudit(false)
      }
    }
    
    setShowFullAudit(true)
  }

  // Check if magic link is expired
  const isExpired = audit.magicTokenExpiresAt && new Date(audit.magicTokenExpiresAt) < new Date()

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] hover:shadow-[var(--shadow-lg)] transition-all">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* URL and Status */}
              <div className="flex items-center gap-3 mb-3">
                {getStatusIcon(audit.status)}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    {audit.targetUrl}
                    <a 
                      href={audit.targetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]" />
                    </a>
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={statusBadge.color}>
                      {statusBadge.text}
                    </Badge>
                    <span className="text-sm text-[var(--text-tertiary)] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                    
                    {/* Contact info badge for admin */}
                    {audit.contact && (
                      <span className="text-sm text-[var(--brand-primary)] flex items-center gap-1 bg-[var(--brand-primary)]/10 px-2 py-0.5 rounded-full">
                        <User className="w-3 h-3" />
                        {audit.contact.name || audit.contact.email}
                        {audit.contact.company && (
                          <span className="text-[var(--text-tertiary)]">• {audit.contact.company}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Processing message */}
              {(audit.status === 'pending' || audit.status === 'running') && (
                <p className="text-sm text-[var(--text-secondary)] mt-2">
                  Analysis in progress. This usually takes 2-3 minutes.
                </p>
              )}

              {/* Failed message */}
              {audit.status === 'failed' && (
                <p className="text-sm text-[var(--accent-error)] mt-2">
                  Audit failed. Please try requesting a new audit.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-4">
              {/* View Report Button */}
              {isAuditCompleted(audit.status) && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/audits/${audit.id}`)
                  }}
                >
                  View Report
                </Button>
              )}

              {/* Delete Button */}
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Confirm'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteConfirm(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(true)
                  }}
                  title="Delete audit"
                  className="text-[var(--text-tertiary)] hover:text-[var(--accent-error)]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              {/* Expand/Collapse */}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Expanded Analytics Section */}
          <CollapsibleContent>
            <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
              {loadingAnalytics || loadingFullAudit ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Audit Results Preview */}
                  {isAuditCompleted(audit.status) && fullAuditData && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Audit Results
                        </h4>
                        <div className="flex items-center gap-2">
                          {/* Copy Link Button */}
                          <Button
                            variant="glass"
                            size="sm"
                            onClick={handleGetMagicLink}
                            disabled={isGenerating}
                            className={`${isExpired ? 'border-[var(--accent-warning)]' : ''}`}
                            title={isExpired ? 'Link expired - click to generate new' : (magicLink ? 'Copy magic link' : 'Generate magic link')}
                          >
                            {isGenerating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : copied ? (
                              <Check className="w-4 h-4 text-[var(--accent-success)]" />
                            ) : (
                              <Link2 className="w-4 h-4" />
                            )}
                            <span className="ml-1.5">
                              {isExpired ? 'Regenerate' : (magicLink ? 'Copy Link' : 'Get Link')}
                            </span>
                          </Button>
                          {/* View Full Report Button */}
                          <Button
                            variant="glass"
                            size="sm"
                            onClick={handleViewFullAudit}
                          >
                            <Maximize2 className="w-4 h-4 mr-1.5" />
                            View Full Report
                          </Button>
                        </div>
                      </div>
                      
                      {/* Score Cards Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(fullAuditData.performanceScore ?? fullAuditData.scores?.performance) != null && (
                          <div className={`p-3 rounded-xl border ${
                            (fullAuditData.performanceScore ?? fullAuditData.scores?.performance) >= 90 
                              ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20' 
                              : (fullAuditData.performanceScore ?? fullAuditData.scores?.performance) >= 50 
                                ? 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/20'
                                : 'bg-[var(--accent-error)]/10 border-[var(--accent-error)]/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="w-4 h-4 text-[var(--text-tertiary)]" />
                              <span className="text-xs font-medium text-[var(--text-secondary)]">Performance</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              (fullAuditData.performanceScore ?? fullAuditData.scores?.performance) >= 90 
                                ? 'text-[var(--accent-success)]' 
                                : (fullAuditData.performanceScore ?? fullAuditData.scores?.performance) >= 50 
                                  ? 'text-[var(--accent-warning)]'
                                  : 'text-[var(--accent-error)]'
                            }`}>
                              {fullAuditData.performanceScore ?? fullAuditData.scores?.performance}
                            </div>
                          </div>
                        )}
                        {(fullAuditData.seoScore ?? fullAuditData.scores?.seo) != null && (
                          <div className={`p-3 rounded-xl border ${
                            (fullAuditData.seoScore ?? fullAuditData.scores?.seo) >= 90 
                              ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20' 
                              : (fullAuditData.seoScore ?? fullAuditData.scores?.seo) >= 50 
                                ? 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/20'
                                : 'bg-[var(--accent-error)]/10 border-[var(--accent-error)]/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
                              <span className="text-xs font-medium text-[var(--text-secondary)]">SEO</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              (fullAuditData.seoScore ?? fullAuditData.scores?.seo) >= 90 
                                ? 'text-[var(--accent-success)]' 
                                : (fullAuditData.seoScore ?? fullAuditData.scores?.seo) >= 50 
                                  ? 'text-[var(--accent-warning)]'
                                  : 'text-[var(--accent-error)]'
                            }`}>
                              {fullAuditData.seoScore ?? fullAuditData.scores?.seo}
                            </div>
                          </div>
                        )}
                        {(fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) != null && (
                          <div className={`p-3 rounded-xl border ${
                            (fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) >= 90 
                              ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20' 
                              : (fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) >= 50 
                                ? 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/20'
                                : 'bg-[var(--accent-error)]/10 border-[var(--accent-error)]/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Eye className="w-4 h-4 text-[var(--text-tertiary)]" />
                              <span className="text-xs font-medium text-[var(--text-secondary)]">Accessibility</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              (fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) >= 90 
                                ? 'text-[var(--accent-success)]' 
                                : (fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) >= 50 
                                  ? 'text-[var(--accent-warning)]'
                                  : 'text-[var(--accent-error)]'
                            }`}>
                              {fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility}
                            </div>
                          </div>
                        )}
                        {(fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) != null && (
                          <div className={`p-3 rounded-xl border ${
                            (fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) >= 90 
                              ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20' 
                              : (fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) >= 50 
                                ? 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/20'
                                : 'bg-[var(--accent-error)]/10 border-[var(--accent-error)]/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="w-4 h-4 text-[var(--text-tertiary)]" />
                              <span className="text-xs font-medium text-[var(--text-secondary)]">Best Practices</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              (fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) >= 90 
                                ? 'text-[var(--accent-success)]' 
                                : (fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) >= 50 
                                  ? 'text-[var(--accent-warning)]'
                                  : 'text-[var(--accent-error)]'
                            }`}>
                              {fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Priority Actions Preview */}
                      {(() => {
                        const auditJson = typeof fullAuditData.fullAuditJson === 'string' 
                          ? JSON.parse(fullAuditData.fullAuditJson || '{}') 
                          : (fullAuditData.fullAuditJson || {})
                        const priorityActions = fullAuditData.priorityActions || auditJson.priorityActions || []
                        
                        if (priorityActions.length > 0) {
                          return (
                            <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                              <h5 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Top Priority Actions</h5>
                              <ul className="space-y-1.5">
                                {priorityActions.slice(0, 3).map((action, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                    <span className="text-[var(--brand-primary)] font-bold">{i + 1}.</span>
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>
                  )}

                  {/* Analytics Section */}
                  {analytics ? (
                    <div className="space-y-4">
                      {/* Contact Details */}
                      {audit.contact && (
                        <div className="p-4 rounded-xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20">
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Prospect Details
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-[var(--text-tertiary)]">Name</span>
                              <p className="font-medium text-[var(--text-primary)]">{audit.contact.name || '—'}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-tertiary)]">Email</span>
                              <p className="font-medium text-[var(--text-primary)]">{audit.contact.email}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-tertiary)]">Company</span>
                              <p className="font-medium text-[var(--text-primary)]">{audit.contact.company || '—'}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-tertiary)]">Magic Link</span>
                              <p className="font-medium text-[var(--text-primary)]">
                                {magicLink ? (
                                  <span className={isExpired ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-success)]'}>
                                    {isExpired ? 'Expired' : 'Active'}
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-tertiary)]">Not generated</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Engagement Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                          <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-1">
                            <Eye className="w-4 h-4" />
                            <span className="text-xs font-medium">Total Views</span>
                          </div>
                          <p className="text-2xl font-bold text-[var(--text-primary)]">{analytics.totalViews || 0}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                          <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-medium">Time Spent</span>
                          </div>
                          <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {analytics.totalTimeSpent ? `${Math.round(analytics.totalTimeSpent / 60)}m` : '0m'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-1">
                        <Monitor className="w-4 h-4" />
                        <span className="text-xs font-medium">Scroll Depth</span>
                      </div>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {analytics.maxScrollDepth || 0}%
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Engagement</span>
                      </div>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {analytics.engagementScore || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Engagement Progress Bar */}
                  {analytics.engagementScore > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">Engagement Score</span>
                        <span className="text-[var(--text-primary)] font-medium">{analytics.engagementScore}%</span>
                      </div>
                      <Progress 
                        value={analytics.engagementScore} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Activity Timeline */}
                  {analytics.activityTimeline && analytics.activityTimeline.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Activity</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {analytics.activityTimeline.slice(0, 10).map((activity, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                            <div className={`w-2 h-2 rounded-full ${
                              activity.eventType === 'view' ? 'bg-[var(--brand-primary)]' :
                              activity.eventType === 'scroll' ? 'bg-[var(--accent-success)]' :
                              'bg-[var(--text-tertiary)]'
                            }`} />
                            <span className="text-[var(--text-secondary)] capitalize">{activity.eventType}</span>
                            {activity.eventData?.depth && (
                              <span className="text-[var(--text-tertiary)]">({activity.eventData.depth}%)</span>
                            )}
                            <span className="text-[var(--text-tertiary)] ml-auto text-xs">
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No analytics yet */}
                  {analytics.totalViews === 0 && (
                    <div className="text-center py-8 text-[var(--text-tertiary)]">
                      <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No views yet. Share the magic link with your prospect!</p>
                    </div>
                  )}
                    </div>
                  ) : !fullAuditData && isAuditCompleted(audit.status) ? (
                    <div className="text-center py-8 text-[var(--text-tertiary)]">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Loading audit data...</p>
                    </div>
                  ) : !isAuditCompleted(audit.status) ? (
                    <div className="text-center py-8 text-[var(--text-tertiary)]">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Audit results will appear here when complete</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>

      {/* Full Audit Modal */}
      <Dialog open={showFullAudit} onOpenChange={setShowFullAudit}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden p-0">
          <div className="overflow-y-auto max-h-[95vh]">
            {fullAuditData && (
              <AuditPublicView 
                audit={fullAuditData} 
                contact={audit.contact}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Collapsible>
  )
}

// Client audit row (simpler, no magic link management)
function ClientAuditRow({ audit, navigate, getStatusIcon, getScoreColor, getAuditStatusBadge }) {
  const [showFullAudit, setShowFullAudit] = useState(false)
  const [fullAuditData, setFullAuditData] = useState(null)
  const [loadingFullAudit, setLoadingFullAudit] = useState(false)
  
  const statusBadge = getAuditStatusBadge(audit.status)

  // Open full audit view modal
  const handleViewFullAudit = async (e) => {
    e?.stopPropagation()
    
    if (!fullAuditData) {
      setLoadingFullAudit(true)
      try {
        const res = await api.get(`/.netlify/functions/audits-get?id=${audit.id}`)
        setFullAuditData(res.data.audit)
      } catch (err) {
        console.error('Failed to load audit data:', err)
        toast.error('Failed to load audit data')
        return
      } finally {
        setLoadingFullAudit(false)
      }
    }
    
    setShowFullAudit(true)
  }

  return (
    <>
      <Card 
        className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] hover:shadow-[var(--shadow-lg)] transition-all cursor-pointer"
        onClick={handleViewFullAudit}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* URL and Status */}
              <div className="flex items-center gap-3 mb-3">
                {getStatusIcon(audit.status)}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    {audit.targetUrl}
                    <ExternalLink className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={statusBadge.color}>
                      {statusBadge.text}
                    </Badge>
                    <span className="text-sm text-[var(--text-tertiary)] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scores (only show if completed) */}
              {isAuditCompleted(audit.status) && (
                <div className="flex gap-3 mt-4">
                  {audit.scorePerformance !== null && (
                    <div className={`px-3 py-2 rounded-xl ${getScoreColor(audit.scorePerformance)}`}>
                      <div className="text-xs font-medium">Performance</div>
                      <div className="text-2xl font-bold">{audit.scorePerformance}</div>
                    </div>
                  )}
                  {audit.scoreSeo !== null && (
                    <div className={`px-3 py-2 rounded-xl ${getScoreColor(audit.scoreSeo)}`}>
                      <div className="text-xs font-medium">SEO</div>
                      <div className="text-2xl font-bold">{audit.scoreSeo}</div>
                    </div>
                  )}
                  {audit.scoreAccessibility !== null && (
                    <div className={`px-3 py-2 rounded-xl ${getScoreColor(audit.scoreAccessibility)}`}>
                      <div className="text-xs font-medium">Accessibility</div>
                      <div className="text-2xl font-bold">{audit.scoreAccessibility}</div>
                    </div>
                  )}
                </div>
              )}

            {/* Processing message */}
            {(audit.status === 'pending' || audit.status === 'running') && (
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                Analysis in progress. This usually takes 2-3 minutes.
              </p>
            )}

            {/* Failed message */}
            {audit.status === 'failed' && (
              <p className="text-sm text-[var(--accent-error)] mt-2">
                Audit failed. Please try requesting a new audit.
              </p>
            )}
          </div>

          {/* View Button */}
          {isAuditCompleted(audit.status) && (
            <Button
              variant="glass"
              onClick={handleViewFullAudit}
              disabled={loadingFullAudit}
            >
              {loadingFullAudit ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Maximize2 className="w-4 h-4 mr-2" />
              )}
              View Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Full Audit Modal */}
    <Dialog open={showFullAudit} onOpenChange={setShowFullAudit}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[95vh]">
          {fullAuditData && (
            <AuditPublicView 
              audit={fullAuditData} 
              contact={null}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

export default function Audits() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    audits, 
    fetchAudits, 
    requestAudit,
    deleteAudit,
    getAuditStatusBadge,
    isLoading,
    error 
  } = useReportsStore()
  
  const { projects, fetchProjects } = useProjectsStore()
  
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestUrl, setRequestUrl] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchAudits()
    fetchProjects()
  }, [])

  const handleRequestAudit = async (e) => {
    e.preventDefault()
    setRequestError('')
    
    if (!requestUrl) {
      setRequestError('Please enter a URL')
      return
    }
    
    // Admins must provide email, clients must select project
    if (isAdmin && !recipientEmail) {
      setRequestError('Please enter recipient email')
      return
    }
    
    if (!isAdmin && !selectedProjectId) {
      setRequestError('Please select a project')
      return
    }

    setIsRequesting(true)
    const result = await requestAudit(requestUrl, selectedProjectId, {
      email: recipientEmail,
      name: recipientName
    })
    setIsRequesting(false)

    if (result.success) {
      setShowRequestForm(false)
      setRequestUrl('')
      setRecipientEmail('')
      setRecipientName('')
      setSelectedProjectId('')
      toast.success('Audit requested! Results will be ready in 2-3 minutes.')
      fetchAudits() // Refresh list
    } else {
      setRequestError(result.error || 'Failed to request audit')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-[var(--accent-success)]" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-[var(--brand-primary)] animate-spin" />
      case 'pending':
        return <Clock className="w-5 h-5 text-[var(--text-tertiary)]" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-[var(--accent-error)]" />
      default:
        return <AlertCircle className="w-5 h-5 text-[var(--text-tertiary)]" />
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-[var(--accent-success)] bg-[var(--accent-success)]/10'
    if (score >= 50) return 'text-[var(--accent-warning)] bg-[var(--accent-warning)]/10'
    return 'text-[var(--accent-error)] bg-[var(--accent-error)]/10'
  }

  if (isLoading && audits.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Website Audits</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Performance, SEO, and accessibility analysis for your websites
          </p>
        </div>
        <Button
          onClick={() => setShowRequestForm(!showRequestForm)}
          variant="glass-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Request New Audit
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Request Form */}
      {showRequestForm && (
        <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">
              {isAdmin ? 'Create Prospect Audit' : 'Request New Audit'}
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {isAdmin 
                ? 'Run a website audit and send the results to a prospect'
                : 'Enter a website URL to analyze its performance, SEO, and accessibility'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestAudit} className="space-y-4">
              {/* Admin: Email and Name fields */}
              {isAdmin && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Recipient Email <span className="text-[var(--accent-error)]">*</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="prospect@company.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Recipient Name <span className="text-[var(--text-tertiary)]">(optional)</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="John Smith"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Website URL <span className="text-[var(--accent-error)]">*</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                  required
                />
              </div>

              {/* Client: Project selector (required) */}
              {!isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Select Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                    required
                  >
                    <option value="">Choose a project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {requestError && (
                <Alert variant="destructive">
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isRequesting}
                  variant="glass-primary"
                >
                  {isRequesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    'Request Audit'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="glass"
                  onClick={() => {
                    setShowRequestForm(false)
                    setRequestError('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Audits List */}
      {audits.length === 0 ? (
        <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)]">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto text-[var(--text-tertiary)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No audits yet
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              {isAdmin 
                ? 'Create an audit for a prospect to get started'
                : 'Request your first website audit to get started'}
            </p>
            <Button
              onClick={() => setShowRequestForm(true)}
              variant="glass-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isAdmin ? 'Create Audit' : 'Request Audit'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {audits.map(audit => (
            isAdmin ? (
              <AdminAuditRow
                key={audit.id}
                audit={audit}
                navigate={navigate}
                getStatusIcon={getStatusIcon}
                getScoreColor={getScoreColor}
                getAuditStatusBadge={getAuditStatusBadge}
                onDelete={deleteAudit}
              />
            ) : (
              <ClientAuditRow
                key={audit.id}
                audit={audit}
                navigate={navigate}
                getStatusIcon={getStatusIcon}
                getScoreColor={getScoreColor}
                getAuditStatusBadge={getAuditStatusBadge}
              />
            )
          ))}
        </div>
      )}
    </div>
  )
}
