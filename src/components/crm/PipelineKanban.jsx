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
    color: '#3B82F6',
    bgLight: 'rgba(59, 130, 246, 0.1)',
    textColor: '#3B82F6',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    icon: Sparkles 
  },
  contacted: { 
    label: 'Contacted', 
    color: '#39bfb0',
    bgLight: 'rgba(57, 191, 176, 0.1)',
    textColor: '#39bfb0',
    borderColor: 'rgba(57, 191, 176, 0.2)',
    icon: PhoneCall 
  },
  qualified: { 
    label: 'Qualified', 
    color: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.1)',
    textColor: '#F59E0B',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    icon: CheckCircle2 
  },
  proposal_sent: { 
    label: 'Proposal Sent', 
    color: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.1)',
    textColor: '#8B5CF6',
    borderColor: 'rgba(139, 92, 246, 0.2)',
    icon: Send 
  },
  negotiating: { 
    label: 'Negotiating', 
    color: '#F97316',
    bgLight: 'rgba(249, 115, 22, 0.1)',
    textColor: '#F97316',
    borderColor: 'rgba(249, 115, 22, 0.2)',
    icon: MessageSquare 
  },
  closed_won: { 
    label: 'Won', 
    color: '#22C55E',
    bgLight: 'rgba(34, 197, 94, 0.1)',
    textColor: '#22C55E',
    borderColor: 'rgba(34, 197, 94, 0.2)',
    icon: CheckCheck 
  },
  closed_lost: { 
    label: 'Lost', 
    color: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.1)',
    textColor: '#EF4444',
    borderColor: 'rgba(239, 68, 68, 0.2)',
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
      {/* Column Header - Fully rounded, separated */}
      <div 
        className="rounded-xl p-3 mb-2 bg-[var(--glass-bg)] border"
        style={{ borderColor: config.borderColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: config.color }}
            >
              <StageIcon className="h-4 w-4 text-white" />
            </div>
            <span 
              className="font-semibold text-sm"
              style={{ color: config.textColor }}
            >
              {config.label}
            </span>
          </div>
          
          {/* Count badge - colored background */}
          <div 
            className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: config.color }}
          >
            {prospects.length}
          </div>
        </div>
      </div>
      
      {/* Column Content - Separate from header */}
      <ScrollArea className={cn(
        'flex-1 min-h-0 rounded-xl border bg-[var(--glass-bg)]/50',
        'transition-all duration-200',
        isDragOver && 'ring-2 ring-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
      )}
      style={{ borderColor: config.borderColor }}
      >
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
      {/* Toggle Header - Rounded with modern styling */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center justify-between p-4 rounded-xl',
          'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
          'hover:border-[var(--text-tertiary)]',
          'transition-all duration-200'
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: wonConfig.color }}
            >
              <CheckCheck className="h-3.5 w-3.5 text-white" />
            </div>
            <span 
              className="font-semibold text-sm"
              style={{ color: wonConfig.textColor }}
            >
              {wonProspects.length} Won
            </span>
          </div>
          
          <div className="h-4 w-px bg-[var(--glass-border)]" />
          
          <div className="flex items-center gap-2">
            <div 
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: lostConfig.color }}
            >
              <XCircle className="h-3.5 w-3.5 text-white" />
            </div>
            <span 
              className="font-semibold text-sm"
              style={{ color: lostConfig.textColor }}
            >
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
    <div className={cn('flex flex-col h-full', className)} onDragEnd={handleDragEnd}>
      {/* Kanban Board - Horizontally scrollable, fills vertical space */}
      <div 
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-x-auto overflow-y-hidden pb-4 -mx-4 px-4',
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
          className="grid gap-4 h-full"
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
      <div className="flex-shrink-0 pt-4">
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
    </div>
  )
}
