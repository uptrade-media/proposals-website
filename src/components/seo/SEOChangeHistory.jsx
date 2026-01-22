// src/components/seo/SEOChangeHistory.jsx
// Action History Feed - Timeline of SEO changes with impact tracking
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  Type,
  FileText,
  Code,
  Link2,
  Image,
  Sparkles,
  User,
  Clock,
  RotateCcw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Filter,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import { useSEOChangeHistory } from '@/hooks/useSEOChangeHistory'

// Change type icons and colors
const CHANGE_TYPES = {
  title: { 
    icon: Type, 
    label: 'Title', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10'
  },
  meta_description: { 
    icon: FileText, 
    label: 'Meta Description', 
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10'
  },
  h1: { 
    icon: Type, 
    label: 'H1 Heading', 
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10'
  },
  schema_markup: { 
    icon: Code, 
    label: 'Schema Markup', 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10'
  },
  internal_link: { 
    icon: Link2, 
    label: 'Internal Link', 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10'
  },
  image_alt: { 
    icon: Image, 
    label: 'Image Alt', 
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10'
  },
  content: { 
    icon: FileText, 
    label: 'Content', 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10'
  },
  other: { 
    icon: History, 
    label: 'Other', 
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10'
  }
}

// Source badges
const SOURCE_BADGES = {
  manual: { label: 'Manual', variant: 'outline' },
  ai_suggestion: { label: 'AI', variant: 'default', className: 'bg-emerald-600' },
  bulk_edit: { label: 'Bulk', variant: 'secondary' },
  auto_fix: { label: 'Auto', variant: 'default', className: 'bg-blue-600' }
}

function ImpactIndicator({ baseline, current, label, inverse = false }) {
  if (baseline === null || baseline === undefined || current === null || current === undefined) {
    return <span className="text-xs text-[var(--text-tertiary)]">Pending</span>
  }
  
  const diff = current - baseline
  const percentChange = baseline !== 0 ? ((diff / baseline) * 100).toFixed(1) : 0
  const isPositive = inverse ? diff < 0 : diff > 0
  const isNeutral = diff === 0
  
  return (
    <div className={cn(
      'flex items-center gap-1 text-xs font-medium',
      isNeutral ? 'text-[var(--text-tertiary)]' :
      isPositive ? 'text-green-400' : 'text-red-400'
    )}>
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      <span>{isPositive ? '+' : ''}{percentChange}%</span>
      <span className="text-[var(--text-tertiary)]">{label}</span>
    </div>
  )
}

function ChangeCard({ change, onRevert, onViewPage }) {
  const [expanded, setExpanded] = useState(false)
  const typeConfig = CHANGE_TYPES[change.change_type] || CHANGE_TYPES.other
  const Icon = typeConfig.icon
  const sourceConfig = SOURCE_BADGES[change.source] || SOURCE_BADGES.manual
  
  const hasImpactData = change.impact_7d_measured_at || change.impact_14d_measured_at || change.impact_30d_measured_at
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Timeline connector */}
      <div className="absolute left-5 top-12 bottom-0 w-px bg-[var(--glass-border)]" />
      
      <div className="flex gap-4">
        {/* Icon */}
        <div className={cn(
          'relative z-10 flex items-center justify-center w-10 h-10 rounded-full',
          typeConfig.bgColor
        )}>
          <Icon className={cn('h-5 w-5', typeConfig.color)} />
        </div>
        
        {/* Content */}
        <div className="flex-1 pb-6">
          <div 
            className={cn(
              'p-4 rounded-lg border cursor-pointer transition-all duration-200',
              'bg-[var(--glass-bg)] border-[var(--glass-border)]',
              'hover:border-[var(--accent-primary)]/30'
            )}
            onClick={() => setExpanded(!expanded)}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[var(--text-primary)]">
                    {typeConfig.label} updated
                  </span>
                  <Badge 
                    variant={sourceConfig.variant}
                    className={cn('text-xs', sourceConfig.className)}
                  >
                    {change.source === 'ai_suggestion' && (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    {sourceConfig.label}
                  </Badge>
                  {change.status === 'reverted' && (
                    <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/30">
                      Reverted
                    </Badge>
                  )}
                </div>
                
                {change.page_url && (
                  <p className="text-sm text-[var(--text-secondary)] truncate mt-1">
                    {change.page_url}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(change.created_at), { addSuffix: true })}
                <ChevronRight className={cn(
                  'h-4 w-4 transition-transform',
                  expanded && 'rotate-90'
                )} />
              </div>
            </div>
            
            {/* Impact summary (always visible if data exists) */}
            {hasImpactData && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--glass-border)]">
                <ImpactIndicator 
                  baseline={change.baseline_clicks} 
                  current={change.impact_7d_clicks || change.impact_14d_clicks || change.impact_30d_clicks}
                  label="clicks"
                />
                <ImpactIndicator 
                  baseline={change.baseline_ctr} 
                  current={change.impact_7d_ctr || change.impact_14d_ctr || change.impact_30d_ctr}
                  label="CTR"
                />
                <ImpactIndicator 
                  baseline={change.baseline_position} 
                  current={change.impact_7d_position || change.impact_14d_position || change.impact_30d_position}
                  label="position"
                  inverse
                />
              </div>
            )}
            
            {/* Expanded details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-[var(--glass-border)] space-y-4">
                    {/* Before/After */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Before</span>
                        <div className="mt-1 p-2 rounded bg-red-500/10 border border-red-500/20 text-sm text-[var(--text-secondary)] line-through">
                          {change.old_value || <span className="italic">Empty</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-green-400 uppercase tracking-wider">After</span>
                        <div className="mt-1 p-2 rounded bg-green-500/10 border border-green-500/20 text-sm text-[var(--text-primary)]">
                          {change.new_value || <span className="italic">Empty</span>}
                        </div>
                      </div>
                    </div>
                    
                    {/* User info */}
                    {change.user_email && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        <User className="h-3 w-3" />
                        <span>Changed by {change.user_email}</span>
                      </div>
                    )}
                    
                    {/* Impact timeline */}
                    {hasImpactData && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">Impact Timeline</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '7 days', data: change.impact_7d_measured_at, clicks: change.impact_7d_clicks, ctr: change.impact_7d_ctr },
                            { label: '14 days', data: change.impact_14d_measured_at, clicks: change.impact_14d_clicks, ctr: change.impact_14d_ctr },
                            { label: '30 days', data: change.impact_30d_measured_at, clicks: change.impact_30d_clicks, ctr: change.impact_30d_ctr }
                          ].map(period => (
                            <div 
                              key={period.label}
                              className={cn(
                                'p-2 rounded text-center text-xs',
                                period.data ? 'bg-[var(--glass-bg)]' : 'bg-[var(--glass-bg-subtle)] opacity-50'
                              )}
                            >
                              <div className="font-medium text-[var(--text-primary)]">{period.label}</div>
                              {period.data ? (
                                <div className="text-[var(--text-secondary)]">
                                  {period.clicks ?? '-'} clicks
                                </div>
                              ) : (
                                <div className="text-[var(--text-tertiary)]">Pending</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {change.page_id && onViewPage && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewPage(change.page_id)
                          }}
                        >
                          View Page
                        </Button>
                      )}
                      {change.status !== 'reverted' && onRevert && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRevert(change.id)
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Revert
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * SEOChangeHistory - Timeline feed of SEO changes with impact tracking
 * 
 * @param {string} projectId - Project to show history for (optional - uses hook if not provided)
 * @param {string} pageId - Optional: filter to specific page
 * @param {array} changes - Array of change history records (optional - uses hook if not provided)
 * @param {boolean} isLoading - Loading state (optional - uses hook if not provided)
 * @param {function} onLoadMore - Load more callback
 * @param {function} onRevert - Revert change callback
 * @param {function} onViewPage - View page callback
 * @param {string} variant - 'full' | 'compact' | 'sidebar'
 */
export default function SEOChangeHistory({
  projectId,
  pageId,
  changes: propChanges,
  isLoading: propIsLoading,
  onLoadMore: propOnLoadMore,
  onRevert,
  onViewPage,
  variant = 'full'
}) {
  // Use the hook if changes aren't provided as props (standalone mode)
  const hookData = useSEOChangeHistory({ pageId })
  
  // Use prop data if provided, otherwise use hook data
  const changes = propChanges ?? hookData.changes
  const isLoading = propIsLoading ?? hookData.isLoading
  const onLoadMore = propOnLoadMore ?? (hookData.hasMore ? hookData.loadMore : null)
  const handleRevert = onRevert ?? hookData.revertChange
  
  const [filter, setFilter] = useState('all') // 'all' | 'ai' | 'manual' | 'with_impact'
  
  const filteredChanges = changes.filter(c => {
    if (filter === 'ai') return c.source === 'ai_suggestion' || c.source === 'auto_fix'
    if (filter === 'manual') return c.source === 'manual'
    if (filter === 'with_impact') return c.impact_7d_measured_at || c.impact_14d_measured_at
    return true
  })
  
  if (variant === 'sidebar') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">Recent Changes</h4>
          <Badge variant="outline" className="text-xs">{changes.length}</Badge>
        </div>
        
        <div className="space-y-2">
          {changes.slice(0, 5).map(change => {
            const typeConfig = CHANGE_TYPES[change.change_type] || CHANGE_TYPES.other
            const Icon = typeConfig.icon
            
            return (
              <div 
                key={change.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] cursor-pointer transition-colors"
              >
                <Icon className={cn('h-4 w-4', typeConfig.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    {typeConfig.label}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {formatDistanceToNow(new Date(change.created_at), { addSuffix: true })}
                  </p>
                </div>
                {change.source === 'ai_suggestion' && (
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                )}
              </div>
            )
          })}
        </div>
        
        {changes.length > 5 && (
          <Button variant="ghost" size="sm" className="w-full text-xs">
            View all {changes.length} changes
          </Button>
        )}
      </div>
    )
  }
  
  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Change History
            </CardTitle>
            <Badge variant="outline">{changes.length} changes</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-1 pr-4">
              {filteredChanges.map(change => {
                const typeConfig = CHANGE_TYPES[change.change_type] || CHANGE_TYPES.other
                const hasPositiveImpact = change.impact_7d_clicks > change.baseline_clicks
                
                return (
                  <div 
                    key={change.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-[var(--glass-bg)] cursor-pointer"
                  >
                    <div className={cn('w-1.5 h-1.5 rounded-full', typeConfig.color.replace('text-', 'bg-'))} />
                    <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
                      {typeConfig.label}
                    </span>
                    {hasPositiveImpact && (
                      <TrendingUp className="h-3 w-3 text-green-400" />
                    )}
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {formatDistanceToNow(new Date(change.created_at), { addSuffix: true })}
                    </span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }
  
  // Full variant
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              SEO Change History
            </CardTitle>
            <CardDescription>
              Track changes and their impact on search performance
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-md px-3 py-1.5"
            >
              <option value="all">All Changes</option>
              <option value="ai">AI Generated</option>
              <option value="manual">Manual</option>
              <option value="with_impact">With Impact Data</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && changes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : filteredChanges.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-[var(--text-tertiary)] opacity-50 mb-4" />
            <p className="text-[var(--text-secondary)]">No changes recorded yet</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              Changes made through the portal will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChanges.map((change, index) => (
              <ChangeCard 
                key={change.id} 
                change={change}
                onRevert={handleRevert}
                onViewPage={onViewPage}
              />
            ))}
            
            {onLoadMore && (
              <div className="pt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={onLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
