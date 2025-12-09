/**
 * ScopeOverview - High-level project scope introduction
 * 
 * Sets expectations about what's included and the approach.
 */

import { cn } from '@/lib/utils'
import { Package, CheckCircle2 } from 'lucide-react'
import { Section, SectionHeader } from '../core/Section'

export function ScopeOverview({
  title = "Scope of Work",
  subtitle,
  phases = [],
  children,
  className = ''
}) {
  return (
    <Section id="scope" padding="lg" className={className}>
      <SectionHeader
        badge="What's Included"
        title={title}
        subtitle={subtitle}
      />
      
      {/* Phase overview cards */}
      {phases.length > 0 && (
        <div className="grid gap-4 mb-10">
          {phases.map((phase, i) => (
            <div 
              key={i}
              className="flex gap-4 p-5 rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm
                border border-[var(--glass-border)] hover:border-[var(--brand-green)]/30 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full 
                bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-teal)]
                flex items-center justify-center text-white font-bold">
                {i + 1}
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                  {phase.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {phase.description}
                </p>
                {phase.duration && (
                  <span className="inline-block mt-2 text-xs font-medium text-[var(--brand-green)] 
                    bg-[var(--brand-green)]/10 px-2 py-1 rounded">
                    {phase.duration}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {children}
    </Section>
  )
}
