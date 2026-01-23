// src/pages/reputation/NewReputationDashboard.jsx
// Unified Reputation Dashboard - Commerce/Sync style with collapsible sidebar
// Dark theme compatible, brand colors only

import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useAuthStore from '@/lib/auth-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { useReputationStore } from '@/lib/reputation-store'
import { useSignalAccess } from '@/lib/signal-access'
import SignalIcon from '@/components/ui/SignalIcon'
import portalApi, { reputationApi } from '@/lib/portal-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Star,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  PanelLeftClose,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Settings,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  BarChart3,
  FileText,
  Globe,
  Link2,
  Zap,
  Eye,
  Archive,
  Flag,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  GoogleOAuthDialog,
  FacebookOAuthDialog,
  TrustpilotOAuthDialog,
  YelpApiKeyDialog,
} from '@/components/reputation/ReputationOAuthDialogs'

// ============================================================================
// SIDEBAR SECTIONS
// ============================================================================

const SIDEBAR_SECTIONS = {
  reviews: {
    label: 'Reviews',
    icon: MessageSquare,
    views: [
      { id: 'all', label: 'All Reviews', icon: MessageSquare },
      { id: 'pending', label: 'Pending Approval', icon: Clock },
      { id: 'responded', label: 'Responded', icon: CheckCircle },
      { id: 'flagged', label: 'Flagged', icon: Flag },
      { id: 'archived', label: 'Archived', icon: Archive },
    ],
  },
  insights: {
    label: 'Insights',
    icon: BarChart3,
    views: [
      { id: 'overview', label: 'Overview', icon: TrendingUp },
      { id: 'page-match', label: 'Page Matching', icon: Link2 },
      { id: 'sentiment', label: 'Sentiment Analysis', icon: Sparkles },
    ],
  },
  automation: {
    label: 'Automation',
    icon: Zap,
    views: [
      { id: 'response-queue', label: 'Response Queue', icon: Clock },
      { id: 'campaigns', label: 'Campaigns', icon: Send },
      { id: 'templates', label: 'Templates', icon: FileText },
    ],
  },
}

// ============================================================================
// STAR RATING COMPONENT
// ============================================================================

function StarRating({ rating, size = 'sm' }) {
  const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClass,
            star <= rating
              ? 'fill-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'text-[var(--text-tertiary)]'
          )}
        />
      ))}
    </div>
  )
}

// ============================================================================
// REVIEW CARD COMPONENT
// ============================================================================

function ReviewCard({ 
  review, 
  isSelected, 
  onClick, 
  onApprove, 
  onReject, 
  showApprovalActions 
}) {
  const getSentimentStyle = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20'
      case 'negative':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-[var(--text-tertiary)]/10 text-[var(--text-secondary)] border-[var(--text-tertiary)]/20'
    }
  }

  return (
    <div
      className={cn(
        'p-4 border-b border-[var(--glass-border)] cursor-pointer transition-colors',
        isSelected
          ? 'bg-[var(--brand-primary)]/5 border-l-2 border-l-[var(--brand-primary)]'
          : 'hover:bg-[var(--glass-bg-hover)]'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-[var(--text-primary)] truncate">
              {review.reviewer_name || 'Anonymous'}
            </span>
            <Badge 
              variant="outline" 
              className="text-xs shrink-0"
              style={{ 
                borderColor: 'var(--brand-primary)', 
                color: 'var(--brand-primary)' 
              }}
            >
              {review.platform_type}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={review.rating} />
            {review.sentiment && (
              <Badge 
                variant="outline" 
                className={cn('text-xs', getSentimentStyle(review.sentiment))}
              >
                {review.sentiment}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
            {review.review_text}
          </p>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
            <span>
              {(() => {
                try {
                  if (!review.review_date) return 'Unknown date'
                  const date = new Date(review.review_date)
                  if (isNaN(date.getTime())) return 'Invalid date'
                  return formatDistanceToNow(date, { addSuffix: true })
                } catch {
                  return 'Unknown date'
                }
              })()}
            </span>
            {review.matched_page && (
              <span className="flex items-center gap-1 text-[var(--brand-primary)]">
                <Link2 className="h-3 w-3" />
                Matched
              </span>
            )}
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex flex-col items-end gap-2">
          {review.response_text ? (
            <Badge 
              className="text-xs"
              style={{ 
                backgroundColor: 'var(--brand-primary)', 
                color: 'white' 
              }}
            >
              Responded
            </Badge>
          ) : review.pending_response ? (
            <Badge 
              variant="outline" 
              className="text-xs border-amber-500/30 text-amber-500"
            >
              Pending
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              New
            </Badge>
          )}
          
          {/* Approval actions for pending responses */}
          {showApprovalActions && review.pending_response && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onApprove?.(review)
                }}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-500 hover:bg-red-500/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onReject?.(review)
                }}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// REVIEW DETAIL PANEL
// ============================================================================

function ReviewDetailPanel({ review, onClose, settings, onGenerateResponse, onApprove, onReject, onPostResponse }) {
  const [responseText, setResponseText] = useState(review?.pending_response || review?.response_text || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  useEffect(() => {
    setResponseText(review?.pending_response || review?.response_text || '')
  }, [review])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await onGenerateResponse?.(review)
      if (response) {
        setResponseText(response)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePost = async () => {
    setIsPosting(true)
    try {
      await onPostResponse?.(review, responseText)
    } finally {
      setIsPosting(false)
    }
  }

  if (!review) return null

  const date = format(new Date(review.review_date), 'MMMM d, yyyy')

  return (
    <div className="h-full flex flex-col bg-[var(--glass-bg)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="md" />
          <span className="text-sm text-[var(--text-secondary)]">{date}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <XCircle className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Reviewer Info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {(review.reviewer_name || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {review.reviewer_name || 'Anonymous'}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">via {review.platform_type}</p>
              </div>
            </div>
          </div>

          {/* Review Text */}
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Review</h4>
            <p className="text-[var(--text-primary)] leading-relaxed">
              {review.review_text || 'No review text'}
            </p>
          </div>

          {/* AI Analysis */}
          {(review.sentiment || review.topics?.length > 0 || review.keywords?.length > 0) && (
            <div className="p-3 rounded-lg bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-sm font-medium text-[var(--text-primary)]">Signal Analysis</span>
              </div>
              
              {review.sentiment && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[var(--text-tertiary)]">Sentiment:</span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      'text-xs',
                      review.sentiment === 'positive' 
                        ? 'border-[var(--brand-primary)]/30 text-[var(--brand-primary)]'
                        : review.sentiment === 'negative'
                        ? 'border-red-500/30 text-red-500'
                        : 'border-[var(--text-tertiary)]/30 text-[var(--text-secondary)]'
                    )}
                  >
                    {review.sentiment}
                  </Badge>
                </div>
              )}
              
              {review.topics?.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-[var(--text-tertiary)]">Topics:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {review.topics.map((topic, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: 'var(--brand-secondary)', color: 'var(--brand-secondary)' }}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {review.services_mentioned?.length > 0 && (
                <div>
                  <span className="text-xs text-[var(--text-tertiary)]">Services Mentioned:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {review.services_mentioned.map((service, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Matched SEO Page */}
          {review.matched_page && (
            <div className="p-3 rounded-lg border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-sm font-medium text-[var(--text-primary)]">Matched Page</span>
              </div>
              <a 
                href={review.matched_page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline flex items-center gap-1"
                style={{ color: 'var(--brand-primary)' }}
              >
                {review.matched_page.path}
                <ExternalLink className="h-3 w-3" />
              </a>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Match confidence: {review.match_confidence}%
              </p>
            </div>
          )}

          {/* Response Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">
                {review.response_text ? 'Response' : 'Draft Response'}
              </h4>
              {!review.response_posted_to_platform && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  style={{ color: 'var(--brand-primary)' }}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {isGenerating ? 'Generating...' : 'Generate with Signal'}
                </Button>
              )}
            </div>
            
            {review.response_posted_to_platform ? (
              <div className="p-3 rounded-lg bg-[var(--glass-bg-inset)]">
                <p className="text-sm text-[var(--text-primary)]">{review.response_text}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-tertiary)]">
                  <CheckCircle className="h-3 w-3 text-[var(--brand-primary)]" />
                  Posted {review.response_date && formatDistanceToNow(new Date(review.response_date), { addSuffix: true })}
                </div>
              </div>
            ) : (
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response..."
                className="w-full h-32 p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
              />
            )}
          </div>

          {/* Pending Approval Actions */}
          {review.pending_response && !review.response_posted_to_platform && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">Pending Approval</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                This response was generated by Signal and is waiting for your approval before posting.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onApprove?.(review)}
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Approve & Post
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject?.(review)}
                  className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      {!review.response_posted_to_platform && !review.pending_response && (
        <div className="p-4 border-t border-[var(--glass-border)] flex items-center gap-2">
          <Button
            className="flex-1"
            onClick={handlePost}
            disabled={!responseText.trim() || isPosting}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            <Send className="h-4 w-4 mr-2" />
            {isPosting ? 'Posting...' : 'Post Response'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// OVERVIEW STATS COMPONENT
// ============================================================================

function OverviewStats({ overview, loading }) {
  const stats = [
    {
      label: 'Total Reviews',
      value: overview?.totalReviews || 0,
      icon: MessageSquare,
    },
    {
      label: 'Avg Rating',
      value: overview?.averageRating?.toFixed(1) || '0.0',
      icon: Star,
    },
    {
      label: 'Pending Approval',
      value: overview?.pendingApproval || 0,
      icon: Clock,
    },
    {
      label: 'Response Rate',
      value: `${overview?.responseRate || 0}%`,
      icon: CheckCircle,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
        >
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-tertiary)]">{stat.label}</span>
                <stat.icon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// PAGE MATCHING VIEW
// ============================================================================

function PageMatchingView({ projectId }) {
  const [pageMatches, setPageMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPage, setSelectedPage] = useState(null)

  useEffect(() => {
    loadPageMatches()
  }, [projectId])

  const loadPageMatches = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const response = await portalApi.get(`/reputation/projects/${projectId}/page-matches`)
      setPageMatches(response.data?.matches || [])
    } catch (error) {
      console.error('Failed to load page matches:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Review → Page Matching</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Reviews matched to SEO pages for intelligent site-kit embedding
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadPageMatches}
          style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Re-analyze
        </Button>
      </div>

      <div className="space-y-3">
        {pageMatches.map((match) => (
          <div
            key={match.page.id}
            className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30 transition-colors cursor-pointer"
            onClick={() => setSelectedPage(selectedPage?.id === match.page.id ? null : match)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                  <span className="font-medium text-[var(--text-primary)]">{match.page.path}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-1">
                  {match.page.title || match.page.url}
                </p>
              </div>
              <div className="text-right">
                <Badge 
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                >
                  {match.reviews.length} reviews
                </Badge>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Avg: {match.avgRating.toFixed(1)} ⭐
                </p>
              </div>
            </div>

            {/* Expanded reviews */}
            <AnimatePresence>
              {selectedPage?.id === match.page.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-[var(--glass-border)] space-y-2">
                    {match.reviews.slice(0, 5).map((review) => (
                      <div 
                        key={review.id}
                        className="p-3 rounded-lg bg-[var(--glass-bg-inset)] text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <StarRating rating={review.rating} />
                          <span className="text-[var(--text-tertiary)]">
                            {review.reviewer_name || 'Anonymous'}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)] line-clamp-2">
                          {review.review_text}
                        </p>
                      </div>
                    ))}
                    {match.reviews.length > 5 && (
                      <p className="text-xs text-center text-[var(--text-tertiary)]">
                        +{match.reviews.length - 5} more reviews
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {pageMatches.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No page matches found yet.</p>
            <p className="text-sm">Reviews will be matched to SEO pages automatically.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// RESPONSE QUEUE VIEW
// ============================================================================

function ResponseQueueView({ projectId, settings, onApprove, onReject }) {
  const [pendingReviews, setPendingReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPendingReviews()
  }, [projectId])

  const loadPendingReviews = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const response = await portalApi.get(`/reputation/projects/${projectId}/reviews`, {
        params: { pending_approval: true }
      })
      setPendingReviews(response.data?.reviews || [])
    } catch (error) {
      console.error('Failed to load pending reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkApprove = async () => {
    try {
      await portalApi.post(`/reputation/projects/${projectId}/responses/bulk-approve`, {
        reviewIds: pendingReviews.map(r => r.id)
      })
      toast.success(`Approved ${pendingReviews.length} responses`)
      loadPendingReviews()
    } catch (error) {
      toast.error('Failed to approve responses')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Response Queue</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {pendingReviews.length} responses pending your approval
          </p>
        </div>
        {pendingReviews.length > 0 && (
          <Button 
            onClick={handleBulkApprove}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve All
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {pendingReviews.map((review) => (
          <div
            key={review.id}
            className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">
                    {review.reviewer_name || 'Anonymous'}
                  </span>
                  <StarRating rating={review.rating} />
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {review.review_text}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Signal-Generated Response
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {review.pending_response}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onApprove?.(review)}
                style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Approve & Post
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject?.(review)}
                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
              >
                <FileText className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        ))}

        {pendingReviews.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No responses pending approval!</p>
            <p className="text-sm">All Signal-generated responses have been reviewed.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SETTINGS PANEL
// ============================================================================

function AutoResponseSettingsPanel({ projectId, settings, onSettingsChange }) {
  const [localSettings, setLocalSettings] = useState(settings || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalSettings(settings || {})
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await portalApi.put(`/reputation/projects/${projectId}/settings`, localSettings)
      onSettingsChange?.(localSettings)
      toast.success('Settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const ratingActions = [
    { rating: 5, label: '5-Star Reviews', key: 'rating_5_action' },
    { rating: 4, label: '4-Star Reviews', key: 'rating_4_action' },
    { rating: 3, label: '3-Star Reviews', key: 'rating_3_action' },
    { rating: 2, label: '2-Star Reviews', key: 'rating_2_action' },
    { rating: 1, label: '1-Star Reviews', key: 'rating_1_action' },
  ]

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          Signal Auto-Response
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure how Signal handles automatic review responses
        </p>
      </div>

      {/* Response Mode by Rating */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">Response Mode by Rating</h4>
        
        {ratingActions.map(({ rating, label, key }) => (
          <div 
            key={key}
            className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
          >
            <div className="flex items-center gap-3">
              <StarRating rating={rating} />
              <span className="text-sm text-[var(--text-primary)]">{label}</span>
            </div>
            <Select
              value={localSettings[key] || 'auto'}
              onValueChange={(value) => setLocalSettings({ ...localSettings, [key]: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="flex items-center gap-2">
                    <Zap className="h-3 w-3" style={{ color: 'var(--brand-primary)' }} />
                    Auto-Post
                  </span>
                </SelectItem>
                <SelectItem value="queue">
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-amber-500" />
                    Queue for Approval
                  </span>
                </SelectItem>
                <SelectItem value="manual">
                  <span className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-[var(--text-tertiary)]" />
                    Manual Only
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Delay Setting */}
      <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <Label className="text-sm text-[var(--text-primary)]">Auto-Response Delay</Label>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">
          Time to wait before posting auto-approved responses
        </p>
        <Select
          value={String(localSettings.auto_response_delay_minutes || 5)}
          onValueChange={(value) => setLocalSettings({ 
            ...localSettings, 
            auto_response_delay_minutes: parseInt(value) 
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Immediately</SelectItem>
            <SelectItem value="5">5 minutes</SelectItem>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full"
        style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}

// ============================================================================
// HEALTH SCORE SECTION
// ============================================================================

function HealthScoreSection({ healthScore }) {
  if (!healthScore) return null

  const score = healthScore.overall_score || 0
  const getScoreColor = (s) => {
    if (s >= 80) return 'var(--brand-primary)'
    if (s >= 60) return '#eab308' // yellow
    if (s >= 40) return '#f97316' // orange
    return '#ef4444' // red
  }

  const getScoreLabel = (s) => {
    if (s >= 80) return 'Excellent'
    if (s >= 60) return 'Good'
    if (s >= 40) return 'Fair'
    return 'Needs Attention'
  }

  return (
    <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
      <CardHeader>
        <CardTitle className="text-[var(--text-primary)]">Reputation Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          {/* Score Gauge */}
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                className="stroke-[var(--glass-border)]"
                strokeWidth="8"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
              />
              <circle
                stroke={getScoreColor(score)}
                strokeWidth="8"
                strokeLinecap="round"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
                strokeDasharray={`${(score / 100) * 264} 264`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
              <span className="text-xs text-[var(--text-tertiary)]">/ 100</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Average Rating</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {healthScore.average_rating?.toFixed(1) || '0.0'} ⭐
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Response Rate</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {healthScore.response_rate || 0}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Total Reviews</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {healthScore.total_reviews || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Status</p>
              <Badge 
                variant="outline"
                style={{ borderColor: getScoreColor(score), color: getScoreColor(score) }}
              >
                {getScoreLabel(score)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ALERTS SECTION
// ============================================================================

function AlertsSection({ alerts }) {
  if (!alerts?.length) return null

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-500">
          <AlertCircle className="h-4 w-4" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {alerts.map((alert, i) => (
            <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {alert}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CAMPAIGNS VIEW
// ============================================================================

function CampaignsView({ projectId }) {
  const { campaigns, campaignsLoading, fetchCampaigns, activateCampaign, pauseCampaign } = useReputationStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    if (projectId) fetchCampaigns()
  }, [projectId])

  if (campaignsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Review Campaigns</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Request reviews from your customers via SMS or email
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
        >
          <Send className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[var(--text-primary)]">{campaign.name}</span>
                    <Badge 
                      variant="outline"
                      className={cn(
                        campaign.status === 'active' 
                          ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                          : 'border-[var(--text-tertiary)] text-[var(--text-tertiary)]'
                      )}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-[var(--text-secondary)]">{campaign.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {campaign.totalSent || 0} sent
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {campaign.totalReviews || 0} reviews
                    </p>
                  </div>
                  {campaign.status === 'active' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => pauseCampaign(campaign.id)}
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => activateCampaign(campaign.id)}
                      style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {campaigns.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No campaigns yet</p>
            <p className="text-sm">Create a campaign to start requesting reviews</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TEMPLATES VIEW
// ============================================================================

function TemplatesView({ projectId }) {
  const { templates, templatesLoading, fetchTemplates } = useReputationStore()

  useEffect(() => {
    if (projectId) fetchTemplates()
  }, [projectId])

  if (templatesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Response Templates</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Pre-written responses for quick replies
          </p>
        </div>
        <Button 
          style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
        >
          <FileText className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <Card key={template.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[var(--text-primary)]">{template.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {template.forRatingMin}-{template.forRatingMax} stars
                  </Badge>
                  <Badge 
                    variant="outline"
                    style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                  >
                    Used {template.useCount || 0}x
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                {template.templateText}
              </p>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No templates yet</p>
            <p className="text-sm">Create templates for faster review responses</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PLATFORMS VIEW
// ============================================================================

function PlatformsView({ projectId }) {
  const { 
    platforms, 
    platformsLoading, 
    fetchPlatforms, 
    syncPlatform,
    getOAuthUrl 
  } = useReputationStore()
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (projectId) fetchPlatforms()
  }, [projectId])

  const handleConnect = async (platformType) => {
    setConnecting(true)
    try {
      const { url } = await getOAuthUrl(platformType)
      window.location.href = url
    } catch (error) {
      toast.error('Failed to start connection')
      setConnecting(false)
    }
  }

  const handleSync = async (platformId) => {
    try {
      await syncPlatform(platformId)
      toast.success('Platform synced')
    } catch (error) {
      toast.error('Failed to sync platform')
    }
  }

  const platformConfig = {
    google: { name: 'Google Business Profile', icon: '🔵', requiresOAuth: true },
    yelp: { name: 'Yelp', icon: '🔴', requiresOAuth: false },
    facebook: { name: 'Facebook', icon: '🔷', requiresOAuth: true },
    trustpilot: { name: 'Trustpilot', icon: '🟢', requiresOAuth: true },
  }

  if (platformsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Connected Platforms</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage your review platform connections
        </p>
      </div>

      {/* Connected Platforms */}
      <div className="space-y-3">
        {platforms.map((platform) => {
          const config = platformConfig[platform.platformType] || { name: platform.platformType, icon: '⭐' }
          return (
            <Card key={platform.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">{config.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          platform.isConnected ? 'bg-[var(--brand-primary)]' : 'bg-red-500'
                        )} />
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {platform.isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {platform.totalReviews || 0} reviews
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {platform.averageRating?.toFixed(1) || '0.0'} avg
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSync(platform.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {platforms.length === 0 && (
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No platforms connected yet</p>
          </div>
        )}
      </div>

      {/* Add Platform */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] border-dashed">
        <CardContent className="p-4">
          <h3 className="font-medium text-[var(--text-primary)] mb-3">Connect a Platform</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(platformConfig).map(([key, config]) => {
              const isConnected = platforms.some(p => p.platformType === key && p.isConnected)
              return (
                <Button
                  key={key}
                  variant="outline"
                  disabled={isConnected || connecting}
                  onClick={() => handleConnect(key)}
                  className="justify-start"
                >
                  <span className="mr-2">{config.icon}</span>
                  {config.name}
                  {isConnected && <CheckCircle className="h-4 w-4 ml-auto text-[var(--brand-primary)]" />}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function NewReputationDashboard({ onNavigate }) {
  const { currentProject } = useAuthStore()
  const brandColors = useBrandColors()
  const { hasSignalAccess } = useSignalAccess()
  const {
    overview,
    overviewLoading,
    reviews,
    reviewsTotal,
    reviewsLoading,
    selectedReview,
    reviewFilters,
    settings,
    settingsLoading,
    fetchOverview,
    fetchReviews,
    fetchSettings,
    selectReview,
    setReviewFilters,
    generateResponse,
    approveResponse,
    rejectResponse,
    postResponse,
  } = useReputationStore()

  const projectId = currentProject?.id

  // UI State
  const [showSidebar, setShowSidebar] = useState(true)
  const [currentView, setCurrentView] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // OAuth Dialog State
  const [isGoogleDialogOpen, setIsGoogleDialogOpen] = useState(false)
  const [isFacebookDialogOpen, setIsFacebookDialogOpen] = useState(false)
  const [isTrustpilotDialogOpen, setIsTrustpilotDialogOpen] = useState(false)
  const [isYelpDialogOpen, setIsYelpDialogOpen] = useState(false)
  
  // Sidebar sections open state
  const [reviewsOpen, setReviewsOpen] = useState(true)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [automationOpen, setAutomationOpen] = useState(false)

  // Load initial data
  useEffect(() => {
    if (projectId) {
      fetchOverview()
      fetchReviews()
      fetchSettings(projectId)
    }
  }, [projectId])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([fetchOverview(), fetchReviews()])
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleApprove = async (review) => {
    try {
      await approveResponse(review.id)
      toast.success('Response approved and posted')
      fetchReviews()
    } catch (error) {
      toast.error('Failed to approve response')
    }
  }

  const handleReject = async (review) => {
    try {
      await rejectResponse(review.id)
      toast.success('Response rejected')
      fetchReviews()
    } catch (error) {
      toast.error('Failed to reject response')
    }
  }

  const handleGenerateResponse = async (review) => {
    try {
      const response = await generateResponse(review.id)
      return response
    } catch (error) {
      toast.error('Failed to generate response')
      return null
    }
  }

  const handlePostResponse = async (review, text) => {
    try {
      await postResponse(review.id, text)
      toast.success('Response posted')
      fetchReviews()
    } catch (error) {
      toast.error('Failed to post response')
    }
  }

  // Determine what content to show based on view
  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <OverviewStats overview={overview} loading={overviewLoading} />
            <HealthScoreSection healthScore={overview?.healthScore} />
            <AlertsSection alerts={overview?.healthScore?.alerts} />
          </div>
        )
      case 'page-match':
        return <PageMatchingView projectId={projectId} />
      case 'response-queue':
        return (
          <ResponseQueueView 
            projectId={projectId} 
            settings={settings}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )
      case 'campaigns':
        return <CampaignsView projectId={projectId} />
      case 'templates':
        return <TemplatesView projectId={projectId} />
      case 'platforms':
        return <PlatformsView projectId={projectId} />
      case 'pending':
        // Filter for pending approval
        return renderReviewsList(reviews.filter(r => r.pending_response && !r.response_posted_to_platform))
      case 'responded':
        return renderReviewsList(reviews.filter(r => r.response_posted_to_platform))
      case 'flagged':
        return renderReviewsList(reviews.filter(r => r.status === 'flagged'))
      case 'archived':
        return renderReviewsList(reviews.filter(r => r.status === 'archived'))
      default:
        return renderReviewsList(reviews)
    }
  }

  const renderReviewsList = (filteredReviews) => {
    const showApprovalActions = currentView === 'pending' || currentView === 'all'

    return (
      <div className="flex gap-6 h-full">
        {/* Reviews List */}
        <div className="flex-1 min-w-0">
          <Card className="h-full bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
              {reviewsLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isSelected={selectedReview?.id === review.id}
                    onClick={() => selectReview(review.id)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    showApprovalActions={showApprovalActions}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-[var(--text-tertiary)]">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No reviews found</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Review Detail Panel */}
        {selectedReview && (
          <Card className="w-[400px] shrink-0 bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <ReviewDetailPanel
              review={selectedReview}
              settings={settings}
              onClose={() => selectReview(null)}
              onGenerateResponse={handleGenerateResponse}
              onApprove={handleApprove}
              onReject={handleReject}
              onPostResponse={handlePostResponse}
            />
          </Card>
        )}
      </div>
    )
  }

  // Connected platforms for sidebar display
  const { platforms, platformsLoading, fetchPlatforms } = useReputationStore()
  const [syncingPlatform, setSyncingPlatform] = useState(null)

  const handleSyncPlatform = async (platformId) => {
    setSyncingPlatform(platformId)
    try {
      const result = await reputationApi.syncPlatform(platformId)
      toast.success(`Synced ${result.data?.newReviews || 0} new reviews`)
      fetchPlatforms()
      fetchReviews() // Refresh reviews list after sync
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error(error.response?.data?.message || 'Sync failed')
    } finally {
      setSyncingPlatform(null)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchPlatforms()
    }
  }, [projectId])

  // Platform config for display
  const platformConfig = {
    google: { name: 'Google', color: '#4285f4' },
    yelp: { name: 'Yelp', color: '#d32323' },
    facebook: { name: 'Facebook', color: '#1877f2' },
    trustpilot: { name: 'Trustpilot', color: '#00b67a' },
  }

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-120px)] flex flex-col bg-background overflow-hidden">
        {/* Full-width Header */}
        <div className="flex-shrink-0 h-14 border-b flex items-center justify-between px-4 bg-card/50">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSidebar(!showSidebar)}>
                  <PanelLeftClose className={cn("h-4 w-4 transition-transform", !showSidebar && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showSidebar ? 'Hide sidebar' : 'Show sidebar'}</TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center shadow-sm">
                <Star className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg">Reputation</span>
              {hasSignalAccess && (
                <Badge 
                  className="ml-1 text-xs gap-1 py-0.5 px-1.5"
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                >
                  <SignalIcon className="h-3 w-3" />
                  Signal
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 h-8 bg-[var(--glass-bg)] border-[var(--glass-border)]"
              />
            </div>
            {/* Refresh */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="h-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Collapsible Sidebar */}
          <AnimatePresence>
            {showSidebar && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="border-r bg-muted/10 flex-shrink-0 overflow-hidden"
              >
                <ScrollArea className="h-full py-4">
                  {/* Navigation Items */}
                  <nav className="space-y-1 px-2">
                    {/* Reviews Section */}
                  <Collapsible open={reviewsOpen} onOpenChange={setReviewsOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Reviews
                      </span>
                      {reviewsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {SIDEBAR_SECTIONS.reviews.views.map((view) => (
                        <button
                          key={view.id}
                          onClick={() => setCurrentView(view.id)}
                          className={cn(
                            'flex items-center gap-2 w-full px-6 py-2 text-sm transition-colors',
                            currentView === view.id
                              ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                          )}
                        >
                          <view.icon className="h-4 w-4" />
                          {view.label}
                          {view.id === 'pending' && overview?.pendingApproval > 0 && (
                            <Badge 
                              className="ml-auto text-xs"
                              style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                            >
                              {overview.pendingApproval}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Insights Section */}
                  <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Insights
                      </span>
                      {insightsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {SIDEBAR_SECTIONS.insights.views.map((view) => (
                        <button
                          key={view.id}
                          onClick={() => setCurrentView(view.id)}
                          className={cn(
                            'flex items-center gap-2 w-full px-6 py-2 text-sm transition-colors',
                            currentView === view.id
                              ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                          )}
                        >
                          <view.icon className="h-4 w-4" />
                          {view.label}
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Automation Section */}
                  <Collapsible open={automationOpen} onOpenChange={setAutomationOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]">
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Automation
                      </span>
                      {automationOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {SIDEBAR_SECTIONS.automation.views.map((view) => (
                        <button
                          key={view.id}
                          onClick={() => setCurrentView(view.id)}
                          className={cn(
                            'flex items-center gap-2 w-full px-6 py-2 text-sm transition-colors',
                            currentView === view.id
                              ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                          )}
                        >
                          <view.icon className="h-4 w-4" />
                          {view.label}
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  </nav>

                  {/* Integrations Section (like Commerce) */}
                  <div className="mt-6 px-2">
                    <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      Integrations
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-[var(--glass-bg-hover)]"
                        onClick={() => setCurrentView('platforms')}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Google Business Profile */}
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: platforms.find(p => p.platformType === 'google')?.isConnected ? '#4285f4' : 'var(--text-tertiary)' }}
                        />
                        <span className="text-sm text-[var(--text-primary)]">Google</span>
                        {(() => {
                          const googlePlatform = platforms.find(p => p.platformType === 'google')
                          if (googlePlatform?.isConnected) {
                            return (
                              <div className="flex items-center gap-1 ml-auto">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                  onClick={() => handleSyncPlatform(googlePlatform.id, 'Google')}
                                  disabled={syncingPlatform === googlePlatform.id}
                                >
                                  {syncingPlatform === googlePlatform.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3" />
                                  )}
                                </Button>
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{ backgroundColor: '#4285f415', color: '#4285f4', borderColor: '#4285f430' }}
                                >
                                  {googlePlatform.lastSyncAt ? 'Synced' : 'Connected'}
                                </Badge>
                              </div>
                            )
                          }
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
                              onClick={() => setIsGoogleDialogOpen(true)}
                            >
                              Connect
                            </Button>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Facebook */}
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: platforms.find(p => p.platformType === 'facebook')?.isConnected ? '#1877f2' : 'var(--text-tertiary)' }}
                        />
                        <span className="text-sm text-[var(--text-primary)]">Facebook</span>
                        {platforms.find(p => p.platformType === 'facebook')?.isConnected ? (
                          <Badge
                            variant="outline"
                            className="text-xs ml-auto"
                            style={{ backgroundColor: '#1877f215', color: '#1877f2', borderColor: '#1877f230' }}
                          >
                            Synced
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
                            onClick={() => setIsFacebookDialogOpen(true)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Yelp */}
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: platforms.find(p => p.platformType === 'yelp')?.isConnected ? '#d32323' : 'var(--text-tertiary)' }}
                        />
                        <span className="text-sm text-[var(--text-primary)]">Yelp</span>
                        {platforms.find(p => p.platformType === 'yelp')?.isConnected ? (
                          <Badge
                            variant="outline"
                            className="text-xs ml-auto"
                            style={{ backgroundColor: '#d3232315', color: '#d32323', borderColor: '#d3232330' }}
                          >
                            Synced
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
                            onClick={() => setIsYelpDialogOpen(true)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Trustpilot */}
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: platforms.find(p => p.platformType === 'trustpilot')?.isConnected ? '#00b67a' : 'var(--text-tertiary)' }}
                        />
                        <span className="text-sm text-[var(--text-primary)]">Trustpilot</span>
                        {platforms.find(p => p.platformType === 'trustpilot')?.isConnected ? (
                          <Badge
                            variant="outline"
                            className="text-xs ml-auto"
                            style={{ backgroundColor: '#00b67a15', color: '#00b67a', borderColor: '#00b67a30' }}
                          >
                            Synced
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
                            onClick={() => setIsTrustpilotDialogOpen(true)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="px-3 py-3 mt-2 bg-[var(--glass-bg-inset)] rounded-lg mx-1">
                      <div className="flex items-center gap-2 text-xs">
                        {platforms.filter(p => p.isConnected).length > 0 ? (
                          <>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
                            <span className="text-[var(--text-secondary)]">
                              {platforms.filter(p => p.isConnected).length} platform{platforms.filter(p => p.isConnected).length !== 1 ? 's' : ''} connected
                            </span>
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3 text-[var(--text-tertiary)]" />
                            <span className="text-[var(--text-tertiary)]">No platforms connected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </motion.aside>
          )}
        </AnimatePresence>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* Sub-header with stats */}
            <div className="px-6 py-3 border-b border-[var(--glass-border)] bg-muted/5">
              <div className="flex items-center gap-6 text-sm">
                <span className="text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">{reviewsTotal || 0}</strong> reviews
                </span>
                <span className="text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">{overview?.averageRating?.toFixed(1) || '0.0'}</strong> avg rating
                </span>
                {overview?.pendingApproval > 0 && (
                  <Badge
                    className="text-xs"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)', color: 'var(--brand-primary)' }}
                  >
                    {overview.pendingApproval} pending approval
                  </Badge>
                )}
                <span className="text-[var(--text-tertiary)] ml-auto flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {platforms.filter(p => p.isConnected).length} platforms connected
                </span>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {renderContent()}
            </div>
          </main>
        </div>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md bg-[var(--glass-bg-elevated)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                Auto-Response Settings
              </DialogTitle>
              <DialogDescription>
                Configure Signal's automatic review response behavior
              </DialogDescription>
            </DialogHeader>
            <AutoResponseSettingsPanel
              projectId={projectId}
              settings={settings}
              onSettingsChange={(newSettings) => {
                fetchSettings(projectId)
              }}
            />
          </DialogContent>
        </Dialog>

        {/* OAuth Dialogs */}
        <GoogleOAuthDialog
          open={isGoogleDialogOpen}
          onOpenChange={setIsGoogleDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            setIsGoogleDialogOpen(false)
            fetchPlatforms()
          }}
        />
        <FacebookOAuthDialog
          open={isFacebookDialogOpen}
          onOpenChange={setIsFacebookDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            setIsFacebookDialogOpen(false)
            fetchPlatforms()
          }}
        />
        <TrustpilotOAuthDialog
          open={isTrustpilotDialogOpen}
          onOpenChange={setIsTrustpilotDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            setIsTrustpilotDialogOpen(false)
            fetchPlatforms()
          }}
        />
        <YelpApiKeyDialog
          open={isYelpDialogOpen}
          onOpenChange={setIsYelpDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            setIsYelpDialogOpen(false)
            fetchPlatforms()
          }}
        />
      </div>
    </TooltipProvider>
  )
}
