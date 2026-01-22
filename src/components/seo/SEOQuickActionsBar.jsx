// src/components/seo/SEOQuickActionsBar.jsx
// Quick actions toolbar for common SEO operations
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  Globe, 
  Target, 
  Brain, 
  Zap,
  Search,
  FileCode,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSeoStore } from '@/lib/seo-store'

/**
 * Quick Actions Bar - One-click actions for common SEO tasks
 * Shows on dashboard overview for easy access
 */
export default function SEOQuickActionsBar({ 
  projectId, 
  domain,
  onActionComplete,
  className 
}) {
  const {
    crawlSitemap,
    detectOpportunities,
    runAiBrain,
    fetchPages,
    fetchOpportunities,
    fetchGscOverview,
    fetchGscQueries,
    fetchCwvSummary
  } = useSeoStore()

  const [actionStates, setActionStates] = useState({})

  const setActionState = (actionId, state) => {
    setActionStates(prev => ({ ...prev, [actionId]: state }))
  }

  const handleAction = async (actionId, actionFn, successMessage) => {
    setActionState(actionId, 'loading')
    try {
      await actionFn()
      setActionState(actionId, 'success')
      onActionComplete?.(actionId, successMessage)
      // Reset after delay
      setTimeout(() => setActionState(actionId, null), 2000)
    } catch (error) {
      console.error(`Action ${actionId} failed:`, error)
      setActionState(actionId, 'error')
      setTimeout(() => setActionState(actionId, null), 3000)
    }
  }

  const actions = [
    {
      id: 'sync-gsc',
      label: 'Sync GSC',
      icon: RefreshCw,
      description: 'Fetch latest Search Console data',
      action: async () => {
        if (domain) {
          await fetchGscOverview(domain)
          await fetchGscQueries(domain, { limit: 50 })
        }
      }
    },
    {
      id: 'crawl-sitemap',
      label: 'Crawl Sitemap',
      icon: Globe,
      description: 'Re-crawl all pages from sitemap',
      action: async () => {
        if (projectId) {
          await crawlSitemap(projectId)
          await fetchPages(projectId, { limit: 100 })
        }
      }
    },
    {
      id: 'detect-opportunities',
      label: 'Find Opportunities',
      icon: Target,
      description: 'Scan for quick wins and issues',
      action: async () => {
        if (projectId) {
          await detectOpportunities(projectId)
          await fetchOpportunities(projectId, { limit: 20, status: 'open' })
        }
      }
    },
    {
      id: 'run-ai',
      label: 'AI Analysis',
      icon: Brain,
      description: 'Run comprehensive AI analysis',
      variant: 'accent',
      action: async () => {
        if (projectId) {
          await runAiBrain(projectId, { analysisType: 'comprehensive' })
        }
      }
    },
    {
      id: 'refresh-cwv',
      label: 'Check CWV',
      icon: Zap,
      description: 'Refresh Core Web Vitals',
      action: async () => {
        if (projectId) {
          await fetchCwvSummary(projectId)
        }
      }
    }
  ]

  const getButtonState = (actionId) => {
    const state = actionStates[actionId]
    if (state === 'loading') return { disabled: true, icon: Loader2, className: 'animate-spin' }
    if (state === 'success') return { disabled: false, icon: CheckCircle, className: 'text-green-400' }
    if (state === 'error') return { disabled: false, icon: AlertCircle, className: 'text-red-400' }
    return { disabled: false, icon: null, className: '' }
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {actions.map(action => {
        const state = getButtonState(action.id)
        const Icon = state.icon || action.icon
        
        return (
          <Button
            key={action.id}
            variant={action.variant === 'accent' ? 'default' : 'outline'}
            size="sm"
            disabled={state.disabled}
            onClick={() => handleAction(action.id, action.action, `${action.label} complete`)}
            className={cn(
              action.variant === 'accent' && 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90',
              'relative group'
            )}
            title={action.description}
          >
            <Icon className={cn('h-4 w-4 mr-2', state.className)} />
            {action.label}
            
            {/* Tooltip on hover */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {action.description}
            </span>
          </Button>
        )
      })}
    </div>
  )
}

/**
 * Compact version for use in header/toolbar
 */
export function SEOQuickActionsCompact({ projectId, domain, onActionComplete }) {
  const { crawlSitemap, detectOpportunities, runAiBrain, fetchGscOverview, fetchGscQueries } = useSeoStore()
  const [running, setRunning] = useState(false)

  const handleFullScan = async () => {
    setRunning(true)
    try {
      await Promise.all([
        domain && fetchGscOverview(domain),
        domain && fetchGscQueries(domain, { limit: 50 }),
        projectId && crawlSitemap(projectId),
        projectId && detectOpportunities(projectId)
      ])
      onActionComplete?.('full-scan', 'Full scan complete')
    } catch (error) {
      console.error('Full scan failed:', error)
    }
    setRunning(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFullScan}
      disabled={running}
    >
      {running ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {running ? 'Scanning...' : 'Full Scan'}
    </Button>
  )
}
