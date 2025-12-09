/**
 * AuditCallout - Highlight audit findings in redesign proposals
 * 
 * Shows current performance scores with clear "before/after" framing.
 * Creates urgency with visual score comparisons.
 */

import { cn } from '@/lib/utils'
import { 
  AlertTriangle, 
  TrendingUp, 
  Gauge, 
  Smartphone, 
  Search, 
  Accessibility,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { Section } from '../core/Section'

// Score ring visualization
function ScoreRing({ score, size = 120, label, status = 'current' }) {
  const radius = (size - 12) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference
  
  const getScoreColor = (score) => {
    if (score >= 90) return { stroke: '#22c55e', bg: 'bg-green-500', text: 'text-green-600' }
    if (score >= 50) return { stroke: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-600' }
    return { stroke: '#ef4444', bg: 'bg-red-500', text: 'text-red-600' }
  }
  
  const colors = getScoreColor(score)
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000"
          />
        </svg>
        
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-3xl font-bold', colors.text)}>{score}</span>
          <span className="text-xs text-[var(--text-tertiary)]">/100</span>
        </div>
      </div>
      
      {label && (
        <span className="mt-3 text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      )}
      
      {status === 'current' && score < 50 && (
        <span className="mt-1 text-xs text-red-600 font-medium">Needs Work</span>
      )}
      {status === 'target' && (
        <span className="mt-1 text-xs text-green-600 font-medium">Target</span>
      )}
    </div>
  )
}

// Main audit callout section
export function AuditCallout({
  title = "Your Current Performance",
  subtitle = "Based on Google Lighthouse analysis",
  currentScores = {},
  targetScores = {},
  auditDate,
  children,
  className = ''
}) {
  const metrics = [
    { key: 'performance', label: 'Performance', icon: Gauge },
    { key: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { key: 'bestPractices', label: 'Best Practices', icon: CheckCircle2 },
    { key: 'seo', label: 'SEO', icon: Search }
  ]

  return (
    <Section id="audit" padding="lg" variant="dark" className={className}>
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5
          bg-red-500/20 text-red-400 border border-red-500/30">
          <AlertTriangle className="w-4 h-4" />
          Audit Results
        </span>
        
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          {title}
        </h2>
        
        <p className="text-gray-400">
          {subtitle}
          {auditDate && <span className="ml-2">• {new Date(auditDate).toLocaleDateString()}</span>}
        </p>
      </div>
      
      {/* Current vs Target comparison */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8">
        <div className="grid sm:grid-cols-2 gap-8">
          {/* Current scores */}
          <div>
            <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-gray-400 mb-6">
              Current State
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {metrics.map(({ key, label }) => (
                currentScores[key] !== undefined && (
                  <ScoreRing 
                    key={key}
                    score={currentScores[key]} 
                    label={label}
                    status="current"
                    size={100}
                  />
                )
              ))}
            </div>
          </div>
          
          {/* Arrow divider */}
          <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            w-12 h-12 rounded-full bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-teal)] 
            items-center justify-center">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
          
          {/* Target scores */}
          <div>
            <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-green-400 mb-6">
              After Rebuild
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {metrics.map(({ key, label }) => (
                targetScores[key] !== undefined && (
                  <ScoreRing 
                    key={key}
                    score={targetScores[key]} 
                    label={label}
                    status="target"
                    size={100}
                  />
                )
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional context */}
      {children && (
        <div className="mt-8 prose prose-invert max-w-none">
          {children}
        </div>
      )}
    </Section>
  )
}

// Inline score comparison card
export function ScoreComparison({
  metric,
  currentScore,
  targetScore,
  icon: Icon = Gauge,
  impact,
  className = ''
}) {
  const improvement = targetScore - currentScore
  
  return (
    <div className={cn(
      'p-5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]',
      className
    )}>
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-[var(--brand-green)]/10">
          <Icon className="w-5 h-5 text-[var(--brand-green)]" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--text-primary)] mb-2">{metric}</h4>
          
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              'text-2xl font-bold',
              currentScore >= 90 ? 'text-green-600' :
              currentScore >= 50 ? 'text-amber-600' : 'text-red-600'
            )}>
              {currentScore}
            </span>
            <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-2xl font-bold text-green-600">
              {targetScore}
            </span>
            <span className="text-sm font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
              +{improvement}
            </span>
          </div>
          
          {impact && (
            <p className="text-sm text-[var(--text-secondary)]">{impact}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Critical issues list from audit
export function AuditIssues({
  title = "Critical Issues Found",
  issues = [],
  className = ''
}) {
  return (
    <div className={cn(
      'p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
      className
    )}>
      <h3 className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-400 mb-4">
        <AlertTriangle className="w-5 h-5" />
        {title}
      </h3>
      
      <ul className="space-y-3">
        {issues.map((issue, i) => (
          <li key={i} className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[var(--text-primary)] font-medium">{issue.title}</span>
              {issue.description && (
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{issue.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// What good scores mean
export function ScoreImpact({
  title = "What 90+ Scores Mean for Your Business",
  impacts = [],
  className = ''
}) {
  const defaultImpacts = [
    { 
      icon: Zap, 
      title: 'Faster Load Times', 
      description: 'Pages load in under 2 seconds, keeping visitors engaged' 
    },
    { 
      icon: Search, 
      title: 'Better Search Rankings', 
      description: 'Google prioritizes fast, accessible sites in search results' 
    },
    { 
      icon: Smartphone, 
      title: 'Mobile Excellence', 
      description: 'Flawless experience on every device and connection speed' 
    },
    { 
      icon: TrendingUp, 
      title: 'Higher Conversions', 
      description: 'Every 100ms improvement can increase conversions by 1%' 
    }
  ]
  
  const items = impacts.length > 0 ? impacts : defaultImpacts
  
  return (
    <div className={cn('py-8', className)}>
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 text-center">
        {title}
      </h3>
      
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((item, i) => {
          const Icon = item.icon || CheckCircle2
          return (
            <div 
              key={i}
              className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 
                border border-green-200 dark:border-green-800"
            >
              <div className="p-2 rounded-lg bg-green-500/20">
                <Icon className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] text-sm mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
