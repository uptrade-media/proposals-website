/**
 * ProblemStatement - Why this project needs to happen
 * 
 * Articulates the current pain points and challenges.
 * Creates urgency and validates the client's decision to seek help.
 */

import { cn } from '@/lib/utils'
import { AlertTriangle, TrendingDown, Clock, Users, DollarSign } from 'lucide-react'
import { Section } from '../core/Section'

const iconMap = {
  warning: AlertTriangle,
  trending: TrendingDown,
  time: Clock,
  users: Users,
  money: DollarSign
}

export function ProblemStatement({ 
  title = "The Challenge",
  subtitle,
  problems = [],
  children,
  className = '' 
}) {
  return (
    <Section id="challenge" padding="lg" variant="elevated" className={className}>
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5
          bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4" />
          Current State
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
      
      {/* Problem cards */}
      {problems.length > 0 && (
        <div className="grid gap-4 mb-10">
          {problems.map((problem, i) => {
            const Icon = iconMap[problem.icon] || AlertTriangle
            return (
              <div 
                key={i}
                className="flex gap-4 p-5 rounded-xl bg-[var(--surface-primary)] border border-[var(--glass-border)]"
              >
                <div className="p-2.5 rounded-lg bg-amber-500/10 h-fit">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                    {problem.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                    {problem.description}
                  </p>
                  {problem.impact && (
                    <p className="text-amber-600 text-sm font-medium mt-2">
                      Impact: {problem.impact}
                    </p>
                  )}
                </div>
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

// Simpler inline problem list
export function ProblemList({ problems = [], className = '' }) {
  return (
    <ul className={cn('space-y-3', className)}>
      {problems.map((problem, i) => (
        <li key={i} className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <span className="text-[var(--text-secondary)]">{problem}</span>
        </li>
      ))}
    </ul>
  )
}
