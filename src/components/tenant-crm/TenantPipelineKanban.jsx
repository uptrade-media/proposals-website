/**
 * TenantPipelineKanban - Universal pipeline stages for tenants
 * No proposal-specific stages, universally applicable
 */
import { useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  Sparkles, 
  PhoneCall, 
  CheckCircle2, 
  Handshake, 
  MessageSquare, 
  CheckCheck, 
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import TenantContactCard from './TenantContactCard'

// Universal pipeline stages - applicable to any business
export const TENANT_PIPELINE_STAGES = {
  new_lead: { 
    label: 'New Lead', 
    color: 'bg-[#4bbf39]', 
    textColor: 'text-[#4bbf39]', 
    bgLight: 'bg-[#4bbf39]/10',
    borderColor: 'border-[#4bbf39]/20',
    gradientFrom: 'from-[#4bbf39]/20',
    icon: Sparkles,
    description: 'Fresh leads to review'
  },
  contacted: { 
    label: 'Contacted', 
    color: 'bg-[#39bfb0]', 
    textColor: 'text-[#39bfb0]', 
    bgLight: 'bg-[#39bfb0]/10',
    borderColor: 'border-[#39bfb0]/20',
    gradientFrom: 'from-[#39bfb0]/20',
    icon: PhoneCall,
    description: 'Initial contact made'
  },
  qualified: { 
    label: 'Qualified', 
    color: 'bg-amber-500', 
    textColor: 'text-amber-600', 
    bgLight: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    gradientFrom: 'from-amber-500/20',
    icon: CheckCircle2,
    description: 'Confirmed as potential customer'
  },
  offer_made: { 
    label: 'Offer Made', 
    color: 'bg-blue-500', 
    textColor: 'text-blue-600', 
    bgLight: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    gradientFrom: 'from-blue-500/20',
    icon: Handshake,
    description: 'Quote or offer presented'
  },
  negotiating: { 
    label: 'Negotiating', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-600', 
    bgLight: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    gradientFrom: 'from-orange-500/20',
    icon: MessageSquare,
    description: 'Working out details'
  },
  closed_won: { 
    label: 'Won', 
    color: 'bg-[#4bbf39]', 
    textColor: 'text-[#4bbf39]', 
    bgLight: 'bg-[#4bbf39]/10',
    borderColor: 'border-[#4bbf39]/20',
    gradientFrom: 'from-[#4bbf39]/20',
    icon: CheckCheck,
    description: 'Deal closed successfully'
  },
  closed_lost: { 
    label: 'Lost', 
    color: 'bg-red-500', 
    textColor: 'text-red-600', 
    bgLight: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    gradientFrom: 'from-red-500/20',
    icon: XCircle,
    description: 'Deal did not close'
  }
}

// Map the old proposal_sent stage to offer_made for compatibility
const STAGE_MAPPING = {
  proposal_sent: 'offer_made'
}

const ACTIVE_STAGES = ['new_lead', 'contacted', 'qualified', 'offer_made', 'negotiating']
const CLOSED_STAGES = ['closed_won', 'closed_lost']

// Pipeline Column Component
function PipelineColumn({ 
  stage, 
  config, 
  contacts, 
  selectedContacts,
  onSelectContact,
  onCardClick,
  onUpdateStage,
  isClosedSection = false
}) {
  const Icon = config.icon

  return (
    <div className={cn(
      "rounded-xl border backdrop-blur-sm",
      // Responsive: fixed min-width for scrolling on mobile, flex to fill on desktop
      isClosedSection 
        ? "w-64 flex-shrink-0" 
        : "min-w-[280px] flex-shrink-0 xl:flex-shrink xl:flex-1",
      config.borderColor,
      "bg-gradient-to-b",
      config.gradientFrom,
      "to-[var(--glass-bg)]/50"
    )}>
      {/* Column Header */}
      <div className={cn(
        "p-3 border-b",
        config.borderColor
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", config.bgLight)}>
              <Icon className={cn("h-4 w-4", config.textColor)} />
            </div>
            <span className="font-medium text-[var(--text-primary)]">{config.label}</span>
          </div>
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            config.bgLight,
            config.textColor
          )}>
            {contacts.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className={cn(isClosedSection ? "h-48" : "h-[calc(100vh-380px)] min-h-[300px]")}>
        <div className="p-2 space-y-2">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">
              No contacts
            </div>
          ) : (
            contacts.map(contact => (
              <TenantContactCard
                key={contact.id}
                contact={contact}
                isSelected={selectedContacts.includes(contact.id)}
                onSelect={() => onSelectContact(contact.id)}
                onClick={() => onCardClick(contact)}
                compact={isClosedSection}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default function TenantPipelineKanban({
  contacts,
  selectedContacts,
  onSelectContact,
  onCardClick,
  onUpdateStage,
  showClosedDeals,
  onToggleClosedDeals
}) {
  const scrollRef = useRef(null)
  
  // Group contacts by stage, mapping old stages to new ones
  const contactsByStage = useMemo(() => {
    const groups = {}
    
    // Initialize all stages
    Object.keys(TENANT_PIPELINE_STAGES).forEach(stage => {
      groups[stage] = []
    })
    
    // Group contacts
    contacts.forEach(contact => {
      let stage = contact.pipeline_stage || 'new_lead'
      
      // Map old stages to new ones
      if (STAGE_MAPPING[stage]) {
        stage = STAGE_MAPPING[stage]
      }
      
      // Ensure stage exists
      if (!groups[stage]) {
        stage = 'new_lead'
      }
      
      groups[stage].push(contact)
    })
    
    return groups
  }, [contacts])

  // Closed deals counts
  const closedWonCount = contactsByStage.closed_won?.length || 0
  const closedLostCount = contactsByStage.closed_lost?.length || 0

  return (
    <div className="space-y-4">
      {/* Active Pipeline */}
      <div 
        ref={scrollRef}
        className="flex gap-4 pb-4 overflow-x-auto xl:overflow-x-visible snap-x snap-mandatory xl:snap-none"
        style={{ scrollbarWidth: 'thin' }}
      >
        {ACTIVE_STAGES.map(stageKey => (
          <PipelineColumn
            key={stageKey}
            stage={stageKey}
            config={TENANT_PIPELINE_STAGES[stageKey]}
            contacts={contactsByStage[stageKey] || []}
            selectedContacts={selectedContacts}
            onSelectContact={onSelectContact}
            onCardClick={onCardClick}
            onUpdateStage={onUpdateStage}
          />
        ))}
      </div>

      {/* Closed Deals Toggle */}
      <div className="border-t border-[var(--glass-border)] pt-4">
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={onToggleClosedDeals}
        >
          <span className="flex items-center gap-2 text-[var(--text-secondary)]">
            {showClosedDeals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Closed Deals
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              {closedWonCount} won
            </span>
            <span className="text-sm text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
              {closedLostCount} lost
            </span>
          </div>
        </Button>

        {showClosedDeals && (
          <div className="flex gap-4 mt-4 overflow-x-auto pb-4">
            {CLOSED_STAGES.map(stageKey => (
              <PipelineColumn
                key={stageKey}
                stage={stageKey}
                config={TENANT_PIPELINE_STAGES[stageKey]}
                contacts={contactsByStage[stageKey] || []}
                selectedContacts={selectedContacts}
                onSelectContact={onSelectContact}
                onCardClick={onCardClick}
                onUpdateStage={onUpdateStage}
                isClosedSection
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
