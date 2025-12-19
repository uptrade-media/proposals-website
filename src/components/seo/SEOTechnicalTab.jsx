// src/components/seo/SEOTechnicalTab.jsx
// Technical tab - Core Web Vitals, crawl issues, schema validation, technical audits
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Gauge,
  Clock,
  Zap,
  Image,
  Link2,
  Code,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  FileCode,
  Lock,
  Globe,
  Server
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useSeoStore, useSignalAccess } from '@/lib/seo-store'
import { SignalAutoFixCard, SignalUpgradeCard } from './signal'

// Core Web Vital gauge
function CWVGauge({ label, value, unit = '', status, threshold }) {
  const getColor = (status) => {
    if (status === 'good') return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', progress: 'bg-emerald-500' }
    if (status === 'needs-improvement') return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', progress: 'bg-yellow-500' }
    return { bg: 'bg-red-500/20', text: 'text-red-400', progress: 'bg-red-500' }
  }

  const colors = getColor(status)
  const percentage = threshold ? Math.min((value / threshold) * 100, 100) : 50

  return (
    <div className="p-4 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
        <Badge variant="outline" className={cn('text-xs', colors.bg, colors.text)}>
          {status?.replace('-', ' ')}
        </Badge>
      </div>
      <div className={cn('text-2xl font-bold mb-2', colors.text)}>
        {value !== null && value !== undefined ? `${value}${unit}` : '--'}
      </div>
      <Progress 
        value={100 - percentage} 
        className="h-1.5 bg-[var(--glass-border)]"
        indicatorClassName={colors.progress}
      />
    </div>
  )
}

// Issue card with expandable details
function IssueCard({ issue, onFix, hasSignal }) {
  const [isOpen, setIsOpen] = useState(false)

  const getIcon = (type) => {
    switch (type) {
      case 'performance': return Gauge
      case 'security': return Lock
      case 'seo': return Globe
      case 'accessibility': return AlertCircle
      case 'schema': return FileCode
      default: return AlertTriangle
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  const Icon = getIcon(issue.type)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        'rounded-lg border transition-colors',
        'bg-[var(--glass-bg)] border-[var(--glass-border)]',
        isOpen && 'border-[var(--accent-primary)]/30'
      )}>
        <CollapsibleTrigger className="w-full p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
              issue.severity === 'critical' ? 'bg-red-500/20' : 
              issue.severity === 'high' ? 'bg-orange-500/20' : 'bg-yellow-500/20'
            )}>
              <Icon className={cn(
                'h-4 w-4',
                issue.severity === 'critical' ? 'text-red-400' : 
                issue.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'
              )} />
            </div>

            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-[var(--text-primary)]">
                  {issue.title}
                </span>
                <Badge variant="outline" className={cn('text-xs', getSeverityColor(issue.severity))}>
                  {issue.severity}
                </Badge>
              </div>
              <p className="text-sm text-[var(--text-tertiary)] line-clamp-1">
                {issue.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {issue.affectedCount && (
                <Badge variant="secondary" className="text-xs">
                  {issue.affectedCount} pages
                </Badge>
              )}
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-[var(--glass-border)]">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {issue.details || issue.description}
            </p>

            {issue.affectedUrls && issue.affectedUrls.length > 0 && (
              <div className="mb-4">
                <span className="text-xs font-medium text-[var(--text-tertiary)] mb-2 block">
                  Affected URLs:
                </span>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {issue.affectedUrls.slice(0, 5).map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline"
                    >
                      {new URL(url).pathname}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                  {issue.affectedUrls.length > 5 && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      +{issue.affectedUrls.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {issue.recommendation && (
              <div className="p-3 rounded-lg bg-[var(--surface-raised)] mb-4">
                <span className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">
                  Recommendation:
                </span>
                <p className="text-sm text-[var(--text-secondary)]">
                  {issue.recommendation}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {issue.autoFixable && hasSignal ? (
                <Button size="sm" onClick={() => onFix(issue)}>
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Auto-Fix
                </Button>
              ) : (
                <Button size="sm" variant="outline">
                  Learn More
                </Button>
              )}
              {issue.docUrl && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={issue.docUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Docs
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Schema validation card
function SchemaCard({ schema, onView }) {
  const hasErrors = schema.errors > 0
  const hasWarnings = schema.warnings > 0

  return (
    <div 
      className={cn(
        'p-4 rounded-lg border cursor-pointer transition-colors',
        'bg-[var(--glass-bg)] border-[var(--glass-border)]',
        'hover:border-[var(--accent-primary)]/30'
      )}
      onClick={() => onView(schema)}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
          hasErrors ? 'bg-red-500/20' : hasWarnings ? 'bg-yellow-500/20' : 'bg-emerald-500/20'
        )}>
          <FileCode className={cn(
            'h-4 w-4',
            hasErrors ? 'text-red-400' : hasWarnings ? 'text-yellow-400' : 'text-emerald-400'
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-[var(--text-primary)]">
              {schema.type}
            </span>
            <Badge variant="outline" className="text-xs">
              {schema.pageCount} pages
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {hasErrors && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertCircle className="h-3 w-3" />
                {schema.errors} errors
              </span>
            )}
            {hasWarnings && (
              <span className="flex items-center gap-1 text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                {schema.warnings} warnings
              </span>
            )}
            {!hasErrors && !hasWarnings && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Valid
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
      </div>
    </div>
  )
}

export default function SEOTechnicalTab({
  siteId,
  cwvSummary,
  issues = [],
  schemaValidation = [],
  crawlStats,
  onRunAudit,
  onFixIssue,
  onViewSchema,
  isLoading = false
}) {
  const hasSignal = useSignalAccess()
  const { signalLearning, applySignalAutoFixes } = useSeoStore()
  
  const [activeTab, setActiveTab] = useState('overview')

  // Calculate issue stats
  const issueStats = useMemo(() => {
    const critical = issues.filter(i => i.severity === 'critical').length
    const high = issues.filter(i => i.severity === 'high').length
    const medium = issues.filter(i => i.severity === 'medium').length
    const low = issues.filter(i => i.severity === 'low').length
    return { critical, high, medium, low, total: issues.length }
  }, [issues])

  // Auto-fixable technical issues
  const technicalAutoFixes = useMemo(() => {
    return signalLearning?.recommendations
      ?.filter(r => r.type === 'technical' && r.autoFixable)
      ?.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        affectedPages: r.pageCount,
        risk: r.risk || 'low'
      })) || []
  }, [signalLearning])

  // Group issues by type
  const groupedIssues = useMemo(() => {
    const groups = {}
    issues.forEach(issue => {
      const type = issue.type || 'other'
      if (!groups[type]) groups[type] = []
      groups[type].push(issue)
    })
    return groups
  }, [issues])

  return (
    <div className="space-y-6">
      {/* Core Web Vitals */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[var(--accent-primary)]" />
              Core Web Vitals
            </CardTitle>
            <Button size="sm" variant="outline" onClick={onRunAudit} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Re-run Audit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CWVGauge
              label="Largest Contentful Paint"
              value={cwvSummary?.lcp}
              unit="s"
              status={cwvSummary?.lcpStatus || 'needs-improvement'}
              threshold={4}
            />
            <CWVGauge
              label="First Input Delay"
              value={cwvSummary?.fid}
              unit="ms"
              status={cwvSummary?.fidStatus || 'good'}
              threshold={300}
            />
            <CWVGauge
              label="Cumulative Layout Shift"
              value={cwvSummary?.cls}
              unit=""
              status={cwvSummary?.clsStatus || 'needs-improvement'}
              threshold={0.25}
            />
          </div>

          {/* Additional metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-[var(--surface-raised)] text-center">
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {cwvSummary?.performanceScore ?? '--'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Performance</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-raised)] text-center">
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {cwvSummary?.seoScore ?? '--'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">SEO</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-raised)] text-center">
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {cwvSummary?.accessibilityScore ?? '--'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Accessibility</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-raised)] text-center">
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {cwvSummary?.bestPracticesScore ?? '--'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Best Practices</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signal Auto-Fix */}
      {hasSignal && technicalAutoFixes.length > 0 && (
        <SignalAutoFixCard
          fixes={technicalAutoFixes}
          onApplyAll={(ids) => applySignalAutoFixes(siteId, ids)}
        />
      )}

      {/* Issues Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/20">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{issueStats.critical}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/20">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{issueStats.high}</p>
                <p className="text-xs text-[var(--text-tertiary)]">High</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{issueStats.medium}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Medium</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{issueStats.low}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Low</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {crawlStats?.pagesIndexed ?? '--'}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">Indexed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">All Issues</TabsTrigger>
          <TabsTrigger value="schema">
            Schema
            {schemaValidation.some(s => s.errors > 0) && (
              <Badge variant="secondary" className="ml-2 text-xs bg-red-500/20 text-red-400">
                !
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="crawl">Crawl Stats</TabsTrigger>
        </TabsList>

        {/* All Issues */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {!hasSignal && issues.length > 0 && (
            <SignalUpgradeCard 
              feature="autofix"
              variant="compact"
              onUpgrade={() => window.open('/pricing', '_blank')}
            />
          )}

          {Object.entries(groupedIssues).map(([type, typeIssues]) => (
            <div key={type} className="space-y-3">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] capitalize flex items-center gap-2">
                {type} Issues
                <Badge variant="secondary" className="text-xs">{typeIssues.length}</Badge>
              </h3>
              <div className="grid gap-3">
                {typeIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    hasSignal={hasSignal}
                    onFix={onFixIssue}
                  />
                ))}
              </div>
            </div>
          ))}

          {issues.length === 0 && (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
              <p className="text-[var(--text-primary)] font-medium">
                No technical issues found
              </p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Your site is technically healthy
              </p>
            </div>
          )}
        </TabsContent>

        {/* Schema Validation */}
        <TabsContent value="schema" className="mt-4 space-y-4">
          {schemaValidation.length > 0 ? (
            <div className="grid gap-3">
              {schemaValidation.map((schema) => (
                <SchemaCard
                  key={schema.type}
                  schema={schema}
                  onView={onViewSchema}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <FileCode className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
              <p className="text-[var(--text-secondary)]">
                No structured data found
              </p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Add Schema.org markup to improve search appearance
              </p>
            </div>
          )}
        </TabsContent>

        {/* Crawl Stats */}
        <TabsContent value="crawl" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {crawlStats?.totalPages ?? '--'}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">Total Pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-emerald-400">
                  {crawlStats?.pagesIndexed ?? '--'}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">Indexed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-yellow-400">
                  {crawlStats?.pagesBlocked ?? '--'}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">Blocked</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-red-400">
                  {crawlStats?.pagesError ?? '--'}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">Errors</p>
              </CardContent>
            </Card>
          </div>

          {crawlStats?.lastCrawl && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Last Crawl</span>
                  <span className="text-sm text-[var(--text-primary)]">
                    {new Date(crawlStats.lastCrawl).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
