/**
 * ProjectVision - The transformation we'll create
 * 
 * Paints the picture of success. What will be different,
 * better, and possible after this project.
 */

import { cn } from '@/lib/utils'
import { Sparkles, ArrowRight, Target, Zap, TrendingUp, Award } from 'lucide-react'
import { Section, GradientText } from '../core/Section'

const iconMap = {
  target: Target,
  zap: Zap,
  trending: TrendingUp,
  award: Award,
  sparkles: Sparkles
}

export function ProjectVision({ 
  title = "The Vision",
  subtitle,
  outcomes = [],
  children,
  className = '' 
}) {
  return (
    <Section id="vision" padding="lg" className={className}>
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5
          bg-[var(--brand-green)]/10 text-[var(--brand-green)] border border-[var(--brand-green)]/20">
          <Sparkles className="w-4 h-4" />
          The Transformation
        </span>
        
        <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
          {title}
        </h2>
        
        {subtitle && (
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Outcomes grid */}
      {outcomes.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-5 mb-10">
          {outcomes.map((outcome, i) => {
            const Icon = iconMap[outcome.icon] || Sparkles
            return (
              <div 
                key={i}
                className="p-6 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-sm 
                  border border-[var(--glass-border)] hover:border-[var(--brand-green)]/30
                  transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-teal)] w-fit mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                  {outcome.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  {outcome.description}
                </p>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Additional prose content */}
      {children && (
        <div className="prose prose-lg max-w-none text-[var(--text-secondary)]">
          {children}
        </div>
      )}
    </Section>
  )
}

// Before/After comparison strip
export function BeforeAfter({ before, after, className = '' }) {
  return (
    <div className={cn('grid sm:grid-cols-2 gap-6', className)}>
      {/* Before */}
      <div className="p-6 rounded-2xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 block">
          Before
        </span>
        <p className="text-[var(--text-secondary)]">{before}</p>
      </div>
      
      {/* Arrow (hidden on mobile) */}
      <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
        w-10 h-10 rounded-full bg-[var(--brand-green)] items-center justify-center">
        <ArrowRight className="w-5 h-5 text-white" />
      </div>
      
      {/* After */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--brand-green)]/10 to-[var(--brand-teal)]/10 
        border border-[var(--brand-green)]/20">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-green)] mb-3 block">
          After
        </span>
        <p className="text-[var(--text-primary)] font-medium">{after}</p>
      </div>
    </div>
  )
}
