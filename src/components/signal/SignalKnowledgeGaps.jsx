// src/components/signal/SignalKnowledgeGaps.jsx
// SIGNAL-017: Knowledge Gap Detection Dashboard
// Shows questions that Signal couldn't answer well and provides tools to fill them

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  Search,
  Check,
  X,
  AlertTriangle,
  TrendingUp,
  Loader2,
  MoreVertical,
  Plus,
  Lightbulb,
  ArrowUpDown,
  MessageSquareWarning,
  CheckCircle2,
  XCircle,
  GitMerge,
  BookOpen,
  BarChart3,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSignalStore } from '@/lib/signal-store'
import { cn } from '@/lib/utils'

// Status configuration
const STATUS_CONFIG = {
  open: { 
    label: 'Open', 
    icon: AlertTriangle, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/20',
    description: 'Needs attention'
  },
  addressed: { 
    label: 'Addressed', 
    icon: CheckCircle2, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/20',
    description: 'Linked to knowledge'
  },
  dismissed: { 
    label: 'Dismissed', 
    icon: XCircle, 
    color: 'text-gray-400', 
    bg: 'bg-gray-500/20',
    description: 'Not relevant'
  }
}

// Sort options
const SORT_OPTIONS = [
  { value: 'occurrence', label: 'Most Asked', icon: TrendingUp },
  { value: 'similarity', label: 'Lowest Similarity', icon: BarChart3 },
  { value: 'recent', label: 'Most Recent', icon: ArrowUpDown },
  { value: 'created', label: 'Oldest First', icon: ArrowUpDown }
]

export default function SignalKnowledgeGaps({ projectId, className }) {
  const {
    knowledgeGaps,
    knowledgeGapsLoading,
    knowledgeGapsPagination,
    knowledgeGapsStats,
    fetchKnowledgeGaps,
    fetchKnowledgeGapsStats,
    addressKnowledgeGap,
    dismissKnowledgeGap,
    mergeKnowledgeGaps,
    fillKnowledgeGap,
    setSignalContext
  } = useSignalStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('open')
  const [sortBy, setSortBy] = useState('occurrence')
  const [selectedGaps, setSelectedGaps] = useState([])
  
  // Dialog states
  const [fillDialogOpen, setFillDialogOpen] = useState(false)
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [activeGap, setActiveGap] = useState(null)
  
  // Form state
  const [fillContent, setFillContent] = useState('')
  const [dismissReason, setDismissReason] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Action loading state
  const [actionLoading, setActionLoading] = useState({})

  // Fetch gaps on mount and when filters change
  useEffect(() => {
    if (projectId) {
      setSignalContext(null, projectId)
      fetchKnowledgeGaps(projectId, {
        status: activeTab !== 'all' ? activeTab : undefined,
        sortBy
      })
    }
  }, [projectId, activeTab, sortBy])

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value)
  }, [])

  // Filter gaps by search query
  const filteredGaps = knowledgeGaps.filter(gap =>
    !searchQuery || gap.question.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleFillGap = async () => {
    if (!activeGap || !fillContent.trim()) return
    
    setFormLoading(true)
    try {
      await fillKnowledgeGap(projectId, activeGap.id, fillContent)
      setFillDialogOpen(false)
      setFillContent('')
      setActiveGap(null)
      // Refresh list
      fetchKnowledgeGaps(projectId, { status: activeTab, sortBy })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDismiss = async () => {
    if (!activeGap) return
    
    setFormLoading(true)
    try {
      await dismissKnowledgeGap(projectId, activeGap.id, dismissReason)
      setDismissDialogOpen(false)
      setDismissReason('')
      setActiveGap(null)
    } finally {
      setFormLoading(false)
    }
  }

  const handleMergeSelected = async () => {
    if (selectedGaps.length < 2) return
    
    const [primary, ...duplicates] = selectedGaps
    setActionLoading(prev => ({ ...prev, merge: true }))
    try {
      await mergeKnowledgeGaps(projectId, primary, duplicates)
      setSelectedGaps([])
    } finally {
      setActionLoading(prev => ({ ...prev, merge: false }))
    }
  }

  const toggleGapSelection = (gapId) => {
    setSelectedGaps(prev => 
      prev.includes(gapId) 
        ? prev.filter(id => id !== gapId)
        : [...prev, gapId]
    )
  }

  const openFillDialog = (gap) => {
    setActiveGap(gap)
    setFillContent('')
    setFillDialogOpen(true)
  }

  const openDismissDialog = (gap) => {
    setActiveGap(gap)
    setDismissReason('')
    setDismissDialogOpen(true)
  }

  const openViewDialog = (gap) => {
    setActiveGap(gap)
    setViewDialogOpen(true)
  }

  const stats = knowledgeGapsStats || { 
    openGaps: 0, 
    addressedGaps: 0, 
    dismissedGaps: 0,
    totalOccurrences: 0,
    avgSimilarity: 0
  }

  // Calculate similarity color (lower = worse = more red)
  const getSimilarityColor = (similarity) => {
    if (similarity < 0.3) return 'text-red-400 bg-red-500/20'
    if (similarity < 0.5) return 'text-orange-400 bg-orange-500/20'
    if (similarity < 0.7) return 'text-amber-400 bg-amber-500/20'
    return 'text-emerald-400 bg-emerald-500/20'
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20">
              <MessageSquareWarning className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle>Knowledge Gaps</CardTitle>
              <CardDescription>
                Questions Signal couldn't answer well — fill these to improve AI
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Merge selected */}
            {selectedGaps.length >= 2 && (
              <Button 
                variant="outline" 
                onClick={handleMergeSelected}
                disabled={actionLoading.merge}
                className="gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
              >
                {actionLoading.merge ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitMerge className="h-4 w-4" />
                )}
                Merge ({selectedGaps.length})
              </Button>
            )}
            
            {/* Sort dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mt-4 p-3 rounded-lg bg-muted/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.openGaps || 0}</div>
            <div className="text-xs text-muted-foreground">Open Gaps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.addressedGaps || 0}</div>
            <div className="text-xs text-muted-foreground">Addressed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.totalOccurrences || 0}</div>
            <div className="text-xs text-muted-foreground">Total Occurrences</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {stats.avgSimilarity ? `${(stats.avgSimilarity * 100).toFixed(0)}%` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Avg Similarity</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search questions..."
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Status tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="open" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Open
              {stats.openGaps > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-amber-500/20 text-amber-400">
                  {stats.openGaps}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="addressed" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Addressed
            </TabsTrigger>
            <TabsTrigger value="dismissed" className="gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-gray-400" />
              Dismissed
            </TabsTrigger>
          </TabsList>

          {/* Gaps list */}
          <div className="space-y-3">
            {knowledgeGapsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGaps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No gaps found</p>
                <p className="text-sm">
                  {activeTab === 'open' 
                    ? 'Signal is answering questions well!' 
                    : 'No gaps in this category'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredGaps.map((gap, index) => (
                  <motion.div
                    key={gap.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GapCard
                      gap={gap}
                      isSelected={selectedGaps.includes(gap.id)}
                      onSelect={() => toggleGapSelection(gap.id)}
                      onFill={() => openFillDialog(gap)}
                      onDismiss={() => openDismissDialog(gap)}
                      onView={() => openViewDialog(gap)}
                      getSimilarityColor={getSimilarityColor}
                      showActions={gap.status === 'open'}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </Tabs>
      </CardContent>

      {/* Fill Gap Dialog */}
      <Dialog open={fillDialogOpen} onOpenChange={setFillDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-400" />
              Fill Knowledge Gap
            </DialogTitle>
            <DialogDescription>
              Add knowledge to answer this question. This will create a new knowledge entry and mark the gap as addressed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Question */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <Label className="text-xs text-muted-foreground">Question that needs answering:</Label>
              <p className="mt-1 font-medium">{activeGap?.question}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>Asked {activeGap?.occurrence_count || 1}x</span>
                <span>•</span>
                <span>Similarity: {((activeGap?.max_similarity || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Response given (if any) */}
            {activeGap?.response_given && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Label className="text-xs text-amber-400">Response Signal gave:</Label>
                <p className="mt-1 text-sm">{activeGap.response_given}</p>
              </div>
            )}

            {/* Answer content */}
            <div className="space-y-2">
              <Label>Answer / Knowledge Content</Label>
              <Textarea
                value={fillContent}
                onChange={(e) => setFillContent(e.target.value)}
                placeholder="Write a clear, helpful answer to this question..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                This will be added to the knowledge base and used by Signal to answer similar questions.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFillDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleFillGap} 
              disabled={formLoading || !fillContent.trim()}
              className="gap-2"
            >
              {formLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Fill Gap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Gap</DialogTitle>
            <DialogDescription>
              This question will be marked as not relevant. You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="font-medium">{activeGap?.question}</p>
            </div>

            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="e.g., Out of scope, spam, already covered..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDismiss} 
              disabled={formLoading}
              className="gap-2"
            >
              {formLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gap Details</DialogTitle>
          </DialogHeader>

          {activeGap && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <Label className="text-xs text-muted-foreground">Question</Label>
                <p className="mt-1 font-medium text-lg">{activeGap.question}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <Label className="text-xs text-muted-foreground">Times Asked</Label>
                  <p className="text-2xl font-bold">{activeGap.occurrence_count || 1}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Label className="text-xs text-muted-foreground">Best Match Similarity</Label>
                  <p className="text-2xl font-bold">{((activeGap.max_similarity || 0) * 100).toFixed(0)}%</p>
                </div>
              </div>

              {activeGap.response_given && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Label className="text-xs text-amber-400">Response Given</Label>
                  <p className="mt-1">{activeGap.response_given}</p>
                </div>
              )}

              {activeGap.resolution_note && (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <Label className="text-xs text-emerald-400">Resolution Note</Label>
                  <p className="mt-1">{activeGap.resolution_note}</p>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p>First detected: {new Date(activeGap.created_at).toLocaleDateString()}</p>
                <p>Last occurred: {new Date(activeGap.last_occurred_at).toLocaleDateString()}</p>
                {activeGap.skill_key && <p>Skill: {activeGap.skill_key}</p>}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {activeGap?.status === 'open' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setViewDialogOpen(false)
                    openDismissDialog(activeGap)
                  }}
                >
                  Dismiss
                </Button>
                <Button 
                  onClick={() => {
                    setViewDialogOpen(false)
                    openFillDialog(activeGap)
                  }}
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Fill Gap
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Gap Card Component
function GapCard({ gap, isSelected, onSelect, onFill, onDismiss, onView, getSimilarityColor, showActions }) {
  const statusConfig = STATUS_CONFIG[gap.status] || STATUS_CONFIG.open
  const StatusIcon = statusConfig.icon

  return (
    <div 
      className={cn(
        'p-4 rounded-lg border transition-colors',
        isSelected ? 'border-purple-500 bg-purple-500/10' : 'border-border hover:border-muted-foreground/50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox (for open gaps) */}
        {showActions && (
          <button
            onClick={onSelect}
            className={cn(
              'mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              isSelected 
                ? 'border-purple-500 bg-purple-500 text-white' 
                : 'border-muted-foreground/30 hover:border-muted-foreground'
            )}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-snug">{gap.question}</p>
          
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Status badge */}
            <Badge variant="secondary" className={cn('gap-1', statusConfig.bg, statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            
            {/* Occurrence count */}
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {gap.occurrence_count || 1}x
            </Badge>
            
            {/* Similarity score */}
            <Badge 
              variant="secondary" 
              className={cn('gap-1', getSimilarityColor(gap.max_similarity || 0))}
            >
              <BarChart3 className="h-3 w-3" />
              {((gap.max_similarity || 0) * 100).toFixed(0)}% match
            </Badge>
            
            {/* Last occurred */}
            <span className="text-xs text-muted-foreground">
              Last: {new Date(gap.last_occurred_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showActions ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={onFill}
                      className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fill this gap</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDismiss} className="text-destructive">
                    <X className="h-4 w-4 mr-2" />
                    Dismiss
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
