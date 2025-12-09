/**
 * Phases - Project timeline breakdown by phase
 * 
 * Shows the project journey from kickoff to launch.
 */

import { cn } from '@/lib/utils'
import { Clock, CheckCircle2, Calendar } from 'lucide-react'
import { Section, SectionHeader } from '../core/Section'

export function PhaseBreakdown({
  title = "Project Timeline",
  subtitle,
  totalDuration,
  phases = [],
  children,
  className = ''
}) {
  return (
    <Section id="timeline" padding="lg" variant="elevated" className={className}>
      <SectionHeader
        badge={totalDuration ? `${totalDuration} Total` : 'Timeline'}
        title={title}
        subtitle={subtitle}
      />
      
      {/* Timeline visualization */}
      <div className="space-y-0">
        {phases.map((phase, i) => (
          <Phase 
            key={i}
            number={i + 1}
            isLast={i === phases.length - 1}
            {...phase}
          />
        ))}
      </div>
      
      {children}
    </Section>
  )
}

// Individual phase card
export function Phase({
  number,
  title,
  duration,
  description,
  deliverables = [],
  milestones = [],
  isLast = false,
  className = ''
}) {
  return (
    <div className={cn('relative flex gap-4 sm:gap-6', className)}>
      {/* Timeline track */}
      <div className="flex flex-col items-center">
        {/* Phase number circle */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full 
          bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-teal)]
          flex items-center justify-center text-white font-bold text-lg
          shadow-lg shadow-[var(--brand-green)]/25 z-10">
          {number}
        </div>
        
        {/* Connecting line */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-[var(--brand-green)] to-[var(--glass-border)] my-2" />
        )}
      </div>
      
      {/* Phase content */}
      <div className={cn('flex-1 pb-10', isLast && 'pb-0')}>
        <div className="bg-[var(--surface-primary)] rounded-xl border border-[var(--glass-border)] p-5 sm:p-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
              {title}
            </h3>
            {duration && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                bg-[var(--brand-green)]/10 text-[var(--brand-green)] text-sm font-medium">
                <Clock className="w-3.5 h-3.5" />
                {duration}
              </span>
            )}
          </div>
          
          {/* Description */}
          {description && (
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              {description}
            </p>
          )}
          
          {/* Deliverables */}
          {deliverables.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Deliverables
              </p>
              <ul className="grid sm:grid-cols-2 gap-2">
                {deliverables.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] flex-shrink-0" />
                    <span className="text-[var(--text-primary)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="pt-4 border-t border-[var(--glass-border)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Milestones
              </p>
              <div className="flex flex-wrap gap-2">
                {milestones.map((milestone, i) => (
                  <span 
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded 
                      bg-[var(--surface-secondary)] text-xs text-[var(--text-secondary)]"
                  >
                    <Calendar className="w-3 h-3" />
                    {milestone}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact timeline for simpler projects
export function SimpleTimeline({
  phases = [],
  className = ''
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {phases.map((phase, i) => (
        <div 
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl 
            bg-[var(--glass-bg)] border border-[var(--glass-border)]"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--brand-green)]/20 
            flex items-center justify-center text-[var(--brand-green)] font-semibold text-sm">
            {i + 1}
          </div>
          <div className="flex-1">
            <span className="font-medium text-[var(--text-primary)]">{phase.title}</span>
          </div>
          {phase.duration && (
            <span className="text-sm text-[var(--text-tertiary)]">{phase.duration}</span>
          )}
        </div>
      ))}
    </div>
  )
}
