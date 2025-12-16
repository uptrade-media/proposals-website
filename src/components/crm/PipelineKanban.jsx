/**
 * PipelineKanban - Glass-styled kanban board for sales pipeline
 * Features: Drag-scroll, glass columns, smooth animations, collapsed closed stages
 */
import { useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  Sparkles, 
  PhoneCall, 
  CheckCircle2, 
  Send, 
  MessageSquare, 
  CheckCheck, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import ProspectCard from './ProspectCard'
import { GlassEmptyState } from './ui'

// Pipeline stages configuration
export const PIPELINE_STAGES = {
  new_lead: { 
    label: 'New Lead', 
    color: 'bg-[#4bbf39]', 
    textColor: 'text-[#4bbf39]', 
    bgLight: 'bg-[#4bbf39]/10',
    borderColor: 'border-[#4bbf39]/20',
    gradientFrom: 'from-[#4bbf39]/20',
    icon: Sparkles 
  },
  contacted: { 
    label: 'Contacted', 
    color: 'bg-[#39bfb0]', 
    textColor: 'text-[#39bfb0]', 
    bgLight: 'bg-[#39bfb0]/10',
    borderColor: 'border-[#39bfb0]/20',
    gradientFrom: 'from-[#39bfb0]/20',
    icon: PhoneCall 
  },
  qualified: { 
    label: 'Qualified', 
    color: 'bg-amber-500', 
    textColor: 'text-amber-600', 
    bgLight: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    gradientFrom: 'from-amber-500/20',
    icon: CheckCircle2 
  },
  proposal_sent: { 
    label: 'Proposal Sent', 
    color: 'bg-[#39bfb0]', 
    textColor: 'text-[#39bfb0]', 
    bgLight: 'bg-[#39bfb0]/10',
    borderColor: 'border-[#39bfb0]/20',
    gradientFrom: 'from-[#39bfb0]/20',
    icon: Send 
  },
  negotiating: { 
    label: 'Negotiating', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-600', 
    bgLight: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    gradientFrom: 'from-orange-500/20',
    icon: MessageSquare 
  },
  closed_won: { 
    label: 'Won', 
    color: 'bg-[#4bbf39]', 
    textColor: 'text-[#4bbf39]', 
    bgLight: 'bg-[#4bbf39]/10',
    borderColor: 'border-[#4bbf39]/20',
    gradientFrom: 'from-[#4bbf39]/20',
    icon: CheckCheck 
  },
  closed_lost: { 
    label: 'Lost', 
    color: 'bg-red-500', 
    textColor: 'text-red-600', 
    bgLight: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    gradientFrom: 'from-red-500/20',
    icon: XCircle 
  }
}

const ACTIVE_STAGES = ['new_lead', 'contacted', 'qualified', 'proposal_sent', 'negotiating']
const CLOSED_STAGES = ['closed_won', 'closed_lost']

// Pipeline Column Component
function PipelineColumn({ 
  stage, 
  config, 
  prospects, 
  selectedProspects,
  onSelectProspect,
  onProspectClick,
  onMoveNext,
  onEmail,
  onCall,
  onViewWebsite,
  onArchive,
  onDrop,
  draggingProspectId,
  onDragStart,
  isLast = false
}) {
  const StageIcon = config.icon
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    // Only set to false if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const prospectId = e.dataTransfer.getData('text/plain')
    if (prospectId) {
      onDrop?.(prospectId, stage)
    }
  }

  return (
    <div 
      className="flex flex-col min-w-0 snap-start"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header - Glass styled */}
      <div className={cn(
        'rounded-t-2xl p-4 backdrop-blur-md border border-b-0',
        'bg-gradient-to-b',
        config.gradientFrom,
        'to-transparent',
        config.borderColor
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'p-2 rounded-xl',
              config.color
            )}>
              <StageIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className={cn('font-semibold text-sm', config.textColor)}>
                {config.label}
              </span>
            </div>
          </div>
          
          {/* Count badge */}
          <div className={cn(
            'px-2.5 py-1 rounded-full text-xs font-bold',
            'backdrop-blur-sm',
            config.bgLight,
            config.textColor
          )}>
            {prospects.length}
          </div>
        </div>
      </div>
      
      {/* Column Content */}
      <ScrollArea className={cn(
        'flex-1 min-h-[500px] max-h-[calc(100vh-320px)]',
        'rounded-b-2xl border backdrop-blur-sm',
        config.borderColor,
        'bg-[var(--glass-bg)]/30',
        'transition-all duration-200',
        isDragOver && 'ring-2 ring-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
      )}>
        <div className="p-3 space-y-3">
          {prospects.length === 0 ? (
            <GlassEmptyState
              icon={StageIcon}
              title="No prospects"
              description="in this stage"
              size="sm"
            />
          ) : (
            prospects.map(prospect => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                stageConfig={config}
                isSelected={selectedProspects.includes(prospect.id)}
                isDragging={draggingProspectId === prospect.id}
                onSelect={onSelectProspect}
                onClick={onProspectClick}
                onDragStart={onDragStart}
                onMoveNext={!isLast ? (() => onMoveNext?.(prospect)) : undefined}
                onEmail={() => onEmail?.(prospect)}
                onCall={() => onCall?.(prospect)}
                onViewWebsite={() => onViewWebsite?.(prospect)}
                onArchive={() => onArchive?.(prospect)}
                onViewDetails={onProspectClick}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Closed Deals Summary - Compact view for won/lost
function ClosedDealsSummary({ 
  wonProspects, 
  lostProspects, 
  isExpanded, 
  onToggle,
  selectedProspects,
  onSelectProspect,
  onProspectClick
}) {
  const wonConfig = PIPELINE_STAGES.closed_won
  const lostConfig = PIPELINE_STAGES.closed_lost

  return (
    <div className="flex flex-col min-w-0">
      {/* Toggle Header */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center justify-between p-4 rounded-2xl',
          'glass hover:bg-[var(--glass-bg-hover)]',
          'transition-all duration-300'
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-lg', wonConfig.color)}>
              <CheckCheck className="h-3.5 w-3.5 text-white" />
            </div>
            <span className={cn('font-semibold text-sm', wonConfig.textColor)}>
              {wonProspects.length} Won
            </span>
          </div>
          
          <div className="h-4 w-px bg-[var(--glass-border)]" />
          
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-lg', lostConfig.color)}>
              <XCircle className="h-3.5 w-3.5 text-white" />
            </div>
            <span className={cn('font-semibold text-sm', lostConfig.textColor)}>
              {lostProspects.length} Lost
            </span>
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[var(--text-tertiary)]" />
        )}
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="grid grid-cols-2 gap-4 mt-4 animate-in slide-in-from-top-2 duration-300">
          <PipelineColumn
            stage="closed_won"
            config={wonConfig}
            prospects={wonProspects}
            selectedProspects={selectedProspects}
            onSelectProspect={onSelectProspect}
            onProspectClick={onProspectClick}
            isLast
          />
          <PipelineColumn
            stage="closed_lost"
            config={lostConfig}
            prospects={lostProspects}
            selectedProspects={selectedProspects}
            onSelectProspect={onSelectProspect}
            onProspectClick={onProspectClick}
            isLast
          />
        </div>
      )}
    </div>
  )
}

export default function PipelineKanban({
  prospects,
  selectedProspects = [],
  isLoading = false,
  showClosedDeals = false,
  onToggleClosedDeals,
  onSelectProspect,
  onProspectClick,
  onMoveToStage,
  onEmail,
  onCall,
  onViewWebsite,
  onArchive,
  className
}) {
  const scrollRef = useRef(null)
  const [isScrollDragging, setIsScrollDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [draggingProspectId, setDraggingProspectId] = useState(null)

  // Group prospects by stage
  const prospectsByStage = useMemo(() => {
    const grouped = {}
    Object.keys(PIPELINE_STAGES).forEach(stage => {
      grouped[stage] = prospects.filter(p => (p.pipeline_stage || 'new_lead') === stage)
    })
    return grouped
  }, [prospects])

  // Handle move to next stage
  const handleMoveNext = (prospect) => {
    const currentStage = prospect.pipeline_stage || 'new_lead'
    const currentIndex = ACTIVE_STAGES.indexOf(currentStage)
    if (currentIndex < ACTIVE_STAGES.length - 1) {
      onMoveToStage?.(prospect.id, ACTIVE_STAGES[currentIndex + 1])
    }
  }

  // Handle drag-and-drop between columns
  const handleDragStart = (prospect) => {
    setDraggingProspectId(prospect.id)
  }

  const handleDrop = (prospectId, newStage) => {
    setDraggingProspectId(null)
    // Find the prospect to check if stage is actually changing
    const prospect = prospects.find(p => p.id === prospectId)
    if (prospect && prospect.pipeline_stage !== newStage) {
      onMoveToStage?.(prospectId, newStage)
    }
  }

  // Clear dragging state when drag ends (e.g., cancelled)
  const handleDragEnd = () => {
    setDraggingProspectId(null)
  }

  // Mouse drag scrolling (for horizontal scroll, not card drag)
  const handleMouseDown = (e) => {
    // Don't start scroll drag if we're dragging a card
    if (draggingProspectId) return
    if (!scrollRef.current) return
    setIsScrollDragging(true)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }

  const handleMouseMove = (e) => {
    if (!isScrollDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    setIsScrollDragging(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
          <p className="text-sm text-[var(--text-tertiary)]">Loading pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)} onDragEnd={handleDragEnd}>
      {/* Kanban Board - Horizontally scrollable */}
      <div 
        ref={scrollRef}
        className={cn(
          'overflow-x-auto pb-4 -mx-4 px-4',
          'scroll-smooth snap-x snap-mandatory touch-pan-x',
          isScrollDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--glass-border) transparent' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="grid gap-4"
          style={{ 
            gridTemplateColumns: `repeat(${ACTIVE_STAGES.length}, minmax(280px, 1fr))`,
            minWidth: `${ACTIVE_STAGES.length * 300}px`
          }}
        >
          {ACTIVE_STAGES.map((stage, index) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              config={PIPELINE_STAGES[stage]}
              prospects={prospectsByStage[stage] || []}
              selectedProspects={selectedProspects}
              onSelectProspect={onSelectProspect}
              onProspectClick={onProspectClick}
              onMoveNext={handleMoveNext}
              onEmail={onEmail}
              onCall={onCall}
              onViewWebsite={onViewWebsite}
              onArchive={onArchive}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              draggingProspectId={draggingProspectId}
              isLast={index === ACTIVE_STAGES.length - 1}
            />
          ))}
        </div>
      </div>
      
      {/* Closed Deals Section */}
      <ClosedDealsSummary
        wonProspects={prospectsByStage.closed_won || []}
        lostProspects={prospectsByStage.closed_lost || []}
        isExpanded={showClosedDeals}
        onToggle={onToggleClosedDeals}
        selectedProspects={selectedProspects}
        onSelectProspect={onSelectProspect}
        onProspectClick={onProspectClick}
      />
    </div>
  )
}
