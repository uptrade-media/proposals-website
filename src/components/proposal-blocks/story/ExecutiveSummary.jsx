/**
 * ExecutiveSummary - The hook that sells the project
 * 
 * Concise overview of why this project matters,
 * what we'll accomplish, and the transformation expected.
 */

import { cn } from '@/lib/utils'
import { Lightbulb, CheckCircle2 } from 'lucide-react'
import { Section } from '../core/Section'

export function ExecutiveSummary({ 
  children,
  keyPoints = [],
  className = '' 
}) {
  return (
    <Section id="summary" padding="lg" className={className}>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-teal)]">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Executive Summary
        </h2>
      </div>
      
      <div className="bg-gradient-to-br from-[var(--brand-green)]/5 to-[var(--brand-teal)]/5 
        rounded-2xl border border-[var(--brand-green)]/15 p-8 sm:p-10">
        
        {/* Main content - prose styling */}
        <div className="prose prose-lg max-w-none 
          text-[var(--text-primary)]
          prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed
          prose-strong:text-[var(--text-primary)] prose-strong:font-semibold
          prose-ul:text-[var(--text-secondary)]
          prose-li:marker:text-[var(--brand-green)]">
          {children}
        </div>
        
        {/* Key points highlight */}
        {keyPoints.length > 0 && (
          <div className="mt-8 pt-8 border-t border-[var(--brand-green)]/15">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wide">
              Key Deliverables
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {keyPoints.map((point, i) => (
                <div 
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white/50 dark:bg-white/5"
                >
                  <CheckCircle2 className="w-5 h-5 text-[var(--brand-green)] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-[var(--text-primary)] font-medium">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
