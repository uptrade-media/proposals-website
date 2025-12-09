/**
 * WhyUs - Why Uptrade Media is the right partner
 * 
 * Establishes credibility without being salesy.
 * Focus on relevant experience and approach.
 */

import { cn } from '@/lib/utils'
import { Award, Users, Zap, Shield, CheckCircle2 } from 'lucide-react'
import { Section } from '../core/Section'

export function WhyUs({ 
  title = "Why Uptrade Media",
  points = [],
  stats = [],
  className = '' 
}) {
  return (
    <Section id="why-us" padding="md" variant="accent" className={className}>
      <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-8">
        {title}
      </h2>
      
      {/* Stats strip */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {stats.map((stat, i) => (
            <div key={i} className="text-center p-4 rounded-xl bg-white/60 dark:bg-white/5">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-teal)] bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-[var(--text-tertiary)] mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Credibility points */}
      {points.length > 0 && (
        <div className="space-y-4">
          {points.map((point, i) => (
            <div 
              key={i}
              className="flex items-start gap-4 p-5 rounded-xl bg-white/60 dark:bg-white/5 
                border border-[var(--glass-border)]"
            >
              <CheckCircle2 className="w-5 h-5 text-[var(--brand-green)] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                  {point.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// Compact credibility strip
export function CredibilityStrip({ items = [], className = '' }) {
  return (
    <div className={cn(
      'flex flex-wrap justify-center gap-6 py-6 px-4 rounded-xl',
      'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
      className
    )}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <item.icon className="w-4 h-4 text-[var(--brand-green)]" />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
