// src/components/seo/SEOTechnicalAudit.jsx
// Technical SEO Hub - Core Web Vitals, Indexing, Schema, Internal Links
import { useState, useEffect, useMemo } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { useSignalAccess } from '@/lib/signal-access'
import SignalUpgradeCard from './signal/SignalUpgradeCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Shield,
  Zap,
  Smartphone,
  Globe,
  FileCode,
  Link2,
  Monitor,
  Search,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  EyeOff,
  FileX,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * SEOTechnicalAudit - Technical SEO Hub
 * Uses existing data from pages & CWV instead of broken API
 */
export default function SEOTechnicalAudit({ 
  projectId, 
  pages = [], 
  cwvSummary = null,
  onRefresh 
}) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()

  // Show upgrade prompt if no Signal access
  if (!hasSignalAccess) {
    return (
      <div className="p-6">
        <SignalUpgradeCard feature="default" variant="default" />
      </div>
    )
  }

  const { 
    fetchCwvSummary,
    crawlSitemap,
    fetchPages
  } = useSeoStore()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculate technical audit data from existing page data
  const auditData = useMemo(() => {
    if (!pages.length) {
      return null
    }

    // Indexing Analysis
    const indexedPages = pages.filter(p => p.index_status === 'indexed' || p.is_indexed)
    const notIndexedPages = pages.filter(p => p.index_status === 'not_indexed' || (!p.is_indexed && !p.has_noindex))
    const noindexPages = pages.filter(p => p.has_noindex)
    const blockedPages = pages.filter(p => p.robots_blocked)
    const errorPages = pages.filter(p => p.http_status >= 400)
    const redirectPages = pages.filter(p => p.http_status >= 300 && p.http_status < 400)

    // Content Analysis
    const missingTitles = pages.filter(p => !p.title || p.title.trim() === '')
    const missingDescriptions = pages.filter(p => !p.meta_description || p.meta_description.trim() === '')
    const missingH1 = pages.filter(p => !p.h1)
    const duplicateTitles = findDuplicates(pages.map(p => p.title).filter(Boolean))
    const thinContent = pages.filter(p => p.word_count && p.word_count < 300)

    // Schema Analysis
    const pagesWithSchema = pages.filter(p => p.has_schema || p.schema_types?.length > 0)
    const schemaTypes = [...new Set(pages.flatMap(p => p.schema_types || []))]

    // Internal Linking Analysis
    const orphanPages = pages.filter(p => (p.internal_links_in || 0) === 0)
    const avgInternalLinks = pages.length > 0 
      ? pages.reduce((sum, p) => sum + (p.internal_links_in || 0), 0) / pages.length 
      : 0
    const wellLinkedPages = pages.filter(p => (p.internal_links_in || 0) >= 5)

    // CWV Analysis
    const cwvStatus = getCwvStatus(cwvSummary)

    // Calculate overall score
    let score = 100
    const issues = []
    const warnings = []
    const passed = []

    // Critical issues (high impact)
    if (errorPages.length > 0) {
      score -= Math.min(25, errorPages.length * 5)
      issues.push({ type: 'error', message: `${errorPages.length} pages returning errors (4xx/5xx)`, count: errorPages.length })
    }
    if (notIndexedPages.length > pages.length * 0.3) {
      score -= 15
      issues.push({ type: 'indexing', message: `${notIndexedPages.length} pages not indexed`, count: notIndexedPages.length })
    }
    if (cwvStatus === 'poor') {
      score -= 15
      issues.push({ type: 'cwv', message: 'Poor Core Web Vitals scores', count: 1 })
    }

    // Warnings (medium impact)
    if (missingTitles.length > 0) {
      score -= Math.min(10, missingTitles.length * 2)
      warnings.push({ type: 'title', message: `${missingTitles.length} pages missing titles`, count: missingTitles.length })
    }
    if (missingDescriptions.length > 0) {
      score -= Math.min(10, missingDescriptions.length)
      warnings.push({ type: 'description', message: `${missingDescriptions.length} pages missing meta descriptions`, count: missingDescriptions.length })
    }
    if (orphanPages.length > 0) {
      score -= Math.min(10, orphanPages.length)
      warnings.push({ type: 'orphan', message: `${orphanPages.length} orphan pages (no internal links)`, count: orphanPages.length })
    }
    if (duplicateTitles > 0) {
      score -= duplicateTitles * 2
      warnings.push({ type: 'duplicate', message: `${duplicateTitles} duplicate page titles`, count: duplicateTitles })
    }
    if (cwvStatus === 'needs-improvement') {
      score -= 5
      warnings.push({ type: 'cwv', message: 'Core Web Vitals need improvement', count: 1 })
    }

    // Passed checks
    if (errorPages.length === 0) passed.push('No broken pages detected')
    if (missingTitles.length === 0) passed.push('All pages have titles')
    if (missingDescriptions.length === 0) passed.push('All pages have meta descriptions')
    if (pagesWithSchema.length >= pages.length * 0.5) passed.push('Good schema coverage')
    if (cwvStatus === 'good') passed.push('Core Web Vitals passing')
    if (orphanPages.length === 0) passed.push('No orphan pages')
    if (indexedPages.length >= pages.length * 0.8) passed.push('Good indexing coverage')

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      warnings,
      passed,
      indexing: {
        total: pages.length,
        indexed: indexedPages.length,
        notIndexed: notIndexedPages.length,
        noindex: noindexPages.length,
        blocked: blockedPages.length,
        errors: errorPages.length,
        redirects: redirectPages.length,
        pages: { indexed: indexedPages, notIndexed: notIndexedPages, noindex: noindexPages, errors: errorPages }
      },
      content: {
        missingTitles,
        missingDescriptions,
        missingH1,
        duplicateTitles,
        thinContent
      },
      schema: {
        pagesWithSchema: pagesWithSchema.length,
        totalPages: pages.length,
        coverage: pages.length > 0 ? (pagesWithSchema.length / pages.length * 100).toFixed(0) : 0,
        types: schemaTypes
      },
      internalLinks: {
        orphanPages,
        avgLinks: avgInternalLinks.toFixed(1),
        wellLinked: wellLinkedPages.length
      },
      cwv: cwvSummary
    }
  }, [pages, cwvSummary])

  const handleRefresh = async () => {
    if (!projectId) return
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchPages(projectId, { limit: 100 }),
        fetchCwvSummary(projectId)
      ])
      onRefresh?.()
    } finally {
      setIsRefreshing(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    if (score >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-green-500/20 border-green-500/30'
    if (score >= 70) return 'bg-yellow-500/20 border-yellow-500/30'
    if (score >= 50) return 'bg-orange-500/20 border-orange-500/30'
    return 'bg-red-500/20 border-red-500/30'
  }

  const getGrade = (score) => {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  // Empty state
  if (!pages.length && !isRefreshing) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">No Pages Analyzed</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Crawl your sitemap to analyze technical SEO factors like Core Web Vitals, indexing, and internal linking.
          </p>
          <Button onClick={() => crawlSitemap(projectId)}>
            <Globe className="mr-2 h-4 w-4" />
            Crawl Sitemap
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Technical SEO</h2>
          <p className="text-muted-foreground">
            Core Web Vitals, indexing status, schema, and internal linking
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>

      {/* Score Overview */}
      {auditData && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Overall Score */}
          <Card className={cn('border-2', getScoreBg(auditData.score))}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold',
                  getScoreBg(auditData.score), getScoreColor(auditData.score)
                )}>
                  {getGrade(auditData.score)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Technical Score</p>
                  <p className={cn('text-3xl font-bold', getScoreColor(auditData.score))}>
                    {auditData.score}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{auditData.issues.length}</p>
                  <p className="text-sm text-muted-foreground">Critical Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{auditData.warnings.length}</p>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{auditData.passed.length}</p>
                  <p className="text-sm text-muted-foreground">Passed Checks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="overview" className="gap-2">
            <Shield className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="cwv" className="gap-2">
            <Zap className="h-4 w-4" />
            Core Web Vitals
          </TabsTrigger>
          <TabsTrigger value="indexing" className="gap-2">
            <Search className="h-4 w-4" />
            Indexing
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <Link2 className="h-4 w-4" />
            Internal Links
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Issues & Warnings */}
          {auditData?.issues.length > 0 && (
            <Card className="border-red-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-400">
                  <XCircle className="h-5 w-5" />
                  Critical Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditData.issues.map((issue, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                      <span className="text-foreground">{issue.message}</span>
                      <Badge variant="destructive">{issue.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {auditData?.warnings.length > 0 && (
            <Card className="border-yellow-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditData.warnings.map((warning, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                      <span className="text-foreground">{warning.message}</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400">{warning.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {auditData?.passed.length > 0 && (
            <Card className="border-green-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  Passed Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {auditData.passed.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                      <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-foreground">{check}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={Search}
              label="Indexed"
              value={`${auditData?.indexing.indexed || 0}/${auditData?.indexing.total || 0}`}
              status={auditData?.indexing.indexed >= auditData?.indexing.total * 0.8 ? 'good' : 'warning'}
            />
            <MetricCard
              icon={FileCode}
              label="Schema Coverage"
              value={`${auditData?.schema.coverage || 0}%`}
              status={auditData?.schema.coverage >= 50 ? 'good' : 'warning'}
            />
            <MetricCard
              icon={Link2}
              label="Avg Internal Links"
              value={auditData?.internalLinks.avgLinks || '0'}
              status={parseFloat(auditData?.internalLinks.avgLinks) >= 3 ? 'good' : 'warning'}
            />
            <MetricCard
              icon={Zap}
              label="CWV Status"
              value={getCwvStatus(auditData?.cwv)}
              status={getCwvStatus(auditData?.cwv)}
            />
          </div>
        </TabsContent>

        {/* Core Web Vitals Tab */}
        <TabsContent value="cwv" className="space-y-4">
          <CwvSection cwvSummary={auditData?.cwv} />
        </TabsContent>

        {/* Indexing Tab */}
        <TabsContent value="indexing" className="space-y-4">
          <IndexingSection data={auditData?.indexing} />
        </TabsContent>

        {/* Internal Links Tab */}
        <TabsContent value="links" className="space-y-4">
          <InternalLinksSection data={auditData?.internalLinks} pages={pages} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ================== SUB-COMPONENTS ==================

function MetricCard({ icon: Icon, label, value, status }) {
  const statusStyles = {
    good: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    poor: 'bg-red-500/10 border-red-500/30',
    'needs-improvement': 'bg-yellow-500/10 border-yellow-500/30',
    unknown: 'bg-muted/30 border-border/50'
  }

  return (
    <Card className={cn('border', statusStyles[status] || statusStyles.unknown)}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold text-foreground capitalize">{value}</p>
      </CardContent>
    </Card>
  )
}

function CwvSection({ cwvSummary }) {
  if (!cwvSummary) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            Core Web Vitals data not yet available. 
            <br />
            <span className="text-sm">Data is collected from Google PageSpeed Insights.</span>
          </p>
        </CardContent>
      </Card>
    )
  }

  const metrics = [
    { 
      key: 'lcp', 
      label: 'Largest Contentful Paint', 
      unit: 's',
      good: 2.5, 
      poor: 4,
      description: 'Loading performance - measures when the largest content element becomes visible'
    },
    { 
      key: 'cls', 
      label: 'Cumulative Layout Shift', 
      unit: '',
      good: 0.1, 
      poor: 0.25,
      description: 'Visual stability - measures how much the page layout shifts'
    },
    { 
      key: 'fid', 
      label: 'First Input Delay', 
      unit: 'ms',
      good: 100, 
      poor: 300,
      description: 'Interactivity - measures time from first interaction to response'
    },
    { 
      key: 'ttfb', 
      label: 'Time to First Byte', 
      unit: 'ms',
      good: 800, 
      poor: 1800,
      description: 'Server response time - measures how fast the server responds'
    }
  ]

  return (
    <div className="space-y-4">
      {/* Mobile vs Desktop Toggle would go here */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mobile Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <CwvGauge score={cwvSummary.avgMobileScore} />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {cwvSummary.avgMobileScore || '-'}
                </p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Desktop Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <CwvGauge score={cwvSummary.avgDesktopScore} />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {cwvSummary.avgDesktopScore || '-'}
                </p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core Web Vitals Breakdown</CardTitle>
          <CardDescription>Performance metrics that affect user experience and SEO</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map(metric => {
              const mobileValue = cwvSummary[`mobile${metric.key.toUpperCase()}`]
              const desktopValue = cwvSummary[`desktop${metric.key.toUpperCase()}`]
              
              return (
                <CwvMetricCard 
                  key={metric.key}
                  metric={metric}
                  mobileValue={mobileValue}
                  desktopValue={desktopValue}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CwvGauge({ score }) {
  const getColor = (s) => {
    if (s >= 90) return 'text-green-400'
    if (s >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getBgColor = (s) => {
    if (s >= 90) return 'stroke-green-500'
    if (s >= 50) return 'stroke-yellow-500'
    return 'stroke-red-500'
  }

  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - ((score || 0) / 100) * circumference

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          strokeWidth="6"
          className="fill-none stroke-border/50"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('fill-none transition-all duration-500', getBgColor(score))}
        />
      </svg>
      <span className={cn(
        'absolute inset-0 flex items-center justify-center text-sm font-bold',
        getColor(score)
      )}>
        {score || '-'}
      </span>
    </div>
  )
}

function CwvMetricCard({ metric, mobileValue, desktopValue }) {
  const getStatus = (value) => {
    if (value === undefined || value === null) return 'unknown'
    if (value <= metric.good) return 'good'
    if (value <= metric.poor) return 'warning'
    return 'poor'
  }

  const statusColors = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    poor: 'text-red-400',
    unknown: 'text-muted-foreground'
  }

  const formatValue = (val) => {
    if (val === undefined || val === null) return '-'
    if (metric.unit === 's') return `${val.toFixed(2)}s`
    if (metric.unit === 'ms') return `${Math.round(val)}ms`
    return val.toFixed(3)
  }

  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-foreground">{metric.label}</p>
          <p className="text-xs text-muted-foreground">{metric.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className={cn('font-mono font-bold', statusColors[getStatus(mobileValue)])}>
            {formatValue(mobileValue)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span className={cn('font-mono font-bold', statusColors[getStatus(desktopValue)])}>
            {formatValue(desktopValue)}
          </span>
        </div>
      </div>
      <div className="flex gap-2 mt-2 text-xs">
        <span className="text-green-400">Good: ≤{metric.good}{metric.unit}</span>
        <span className="text-red-400">Poor: &gt;{metric.poor}{metric.unit}</span>
      </div>
    </div>
  )
}

function IndexingSection({ data }) {
  if (!data) return null

  const sections = [
    { key: 'indexed', label: 'Indexed', icon: CheckCircle, color: 'green', pages: data.pages?.indexed || [] },
    { key: 'notIndexed', label: 'Not Indexed', icon: EyeOff, color: 'yellow', pages: data.pages?.notIndexed || [] },
    { key: 'noindex', label: 'Noindex Set', icon: Eye, color: 'blue', pages: data.pages?.noindex || [] },
    { key: 'errors', label: 'Errors', icon: FileX, color: 'red', pages: data.pages?.errors || [] },
  ]

  return (
    <div className="space-y-4">
      {/* Coverage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indexing Coverage</CardTitle>
          <CardDescription>How Google is indexing your pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">
                {data.indexed} of {data.total} pages indexed
              </span>
              <span className="text-foreground font-medium">
                {data.total > 0 ? Math.round(data.indexed / data.total * 100) : 0}%
              </span>
            </div>
            <Progress 
              value={data.total > 0 ? (data.indexed / data.total * 100) : 0} 
              className="h-2"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sections.map(section => (
              <div 
                key={section.key}
                className={cn(
                  'p-3 rounded-lg border',
                  section.color === 'green' && 'bg-green-500/10 border-green-500/30',
                  section.color === 'yellow' && 'bg-yellow-500/10 border-yellow-500/30',
                  section.color === 'blue' && 'bg-blue-500/10 border-blue-500/30',
                  section.color === 'red' && 'bg-red-500/10 border-red-500/30'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <section.icon className={cn(
                    'h-4 w-4',
                    section.color === 'green' && 'text-green-400',
                    section.color === 'yellow' && 'text-yellow-400',
                    section.color === 'blue' && 'text-blue-400',
                    section.color === 'red' && 'text-red-400'
                  )} />
                  <span className="text-sm text-muted-foreground">{section.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {data[section.key] || 0}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pages Not Indexed */}
      {data.notIndexed > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-400">
              <EyeOff className="h-5 w-5" />
              Pages Not Indexed ({data.notIndexed})
            </CardTitle>
            <CardDescription>
              These pages are not appearing in Google search results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.pages?.notIndexed?.slice(0, 10).map((page, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-sm text-foreground truncate flex-1">
                    {page.path || page.url}
                  </span>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Request Index
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
              {data.notIndexed > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{data.notIndexed - 10} more pages
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InternalLinksSection({ data, pages = [] }) {
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Link2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.avgLinks}</p>
                <p className="text-sm text-muted-foreground">Avg Links Per Page</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.wellLinked}</p>
                <p className="text-sm text-muted-foreground">Well-Linked Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={data.orphanPages?.length > 0 ? 'border-yellow-500/30' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                data.orphanPages?.length > 0 ? 'bg-yellow-500/20' : 'bg-green-500/20'
              )}>
                <AlertCircle className={cn(
                  'h-5 w-5',
                  data.orphanPages?.length > 0 ? 'text-yellow-400' : 'text-green-400'
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {data.orphanPages?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Orphan Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orphan Pages List */}
      {data.orphanPages?.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-400">
              <AlertCircle className="h-5 w-5" />
              Orphan Pages
            </CardTitle>
            <CardDescription>
              Pages with no internal links pointing to them - harder for users and search engines to discover
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.orphanPages.slice(0, 10).map((page, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {page.title || page.path || page.url}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {page.path || page.url}
                    </p>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-400 ml-2">
                    {page.internal_links_in || 0} links
                  </Badge>
                </div>
              ))}
              {data.orphanPages.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{data.orphanPages.length - 10} more orphan pages
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Linked Pages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Most Linked Pages</CardTitle>
          <CardDescription>Pages with the most internal links pointing to them</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pages
              .filter(p => p.internal_links_in > 0)
              .sort((a, b) => (b.internal_links_in || 0) - (a.internal_links_in || 0))
              .slice(0, 5)
              .map((page, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {page.title || page.path || page.url}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {page.path}
                    </p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 ml-2">
                    {page.internal_links_in} links
                  </Badge>
                </div>
              ))}
            {pages.filter(p => p.internal_links_in > 0).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No internal link data available. Crawl your sitemap to analyze internal linking.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ================== HELPERS ==================

function findDuplicates(arr) {
  const counts = {}
  arr.forEach(item => {
    if (item) counts[item] = (counts[item] || 0) + 1
  })
  return Object.values(counts).filter(c => c > 1).length
}

function getCwvStatus(cwv) {
  if (!cwv) return 'unknown'
  const score = cwv.avgMobileScore || cwv.avgDesktopScore
  if (!score) return 'unknown'
  if (score >= 90) return 'good'
  if (score >= 50) return 'needs-improvement'
  return 'poor'
}
