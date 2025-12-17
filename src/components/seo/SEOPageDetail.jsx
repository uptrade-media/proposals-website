// src/components/seo/SEOPageDetail.jsx
// Detailed view for a single page
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw,
  ExternalLink,
  Loader2,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Target,
  Zap,
  Copy,
  Edit,
  Save
} from 'lucide-react'
import { useSeoStore } from '@/lib/seo-store'

export default function SEOPageDetail({ page, site }) {
  const { crawlPage } = useSeoStore()
  const [crawling, setCrawling] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  const [newTitle, setNewTitle] = useState(page.managed_title || page.title || '')
  const [newMeta, setNewMeta] = useState(page.managed_meta_description || page.meta_description || '')

  const handleCrawl = async () => {
    setCrawling(true)
    try {
      await crawlPage(page.id)
    } finally {
      setCrawling(false)
    }
  }

  const getHealthBadge = (score) => {
    if (score === null || score === undefined) {
      return <Badge variant="outline">Not analyzed</Badge>
    }
    if (score >= 80) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Good ({score})</Badge>
    }
    if (score >= 60) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Needs Work ({score})</Badge>
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Poor ({score})</Badge>
  }

  const getIndexStatusBadge = (status) => {
    switch (status) {
      case 'indexed':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Indexed
          </Badge>
        )
      case 'not-indexed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Not Indexed
          </Badge>
        )
      case 'blocked':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Blocked
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-'
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getChangeIndicator = (current, previous, inverse = false) => {
    if (!previous || current === previous) return null
    const isPositive = inverse ? current < previous : current > previous
    const change = Math.abs(((current - previous) / previous) * 100).toFixed(1)
    
    return (
      <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {change}%
      </span>
    )
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const getTitleLengthStatus = (length) => {
    if (!length) return { color: 'text-red-400', message: 'Missing' }
    if (length < 30) return { color: 'text-yellow-400', message: 'Too short' }
    if (length > 60) return { color: 'text-yellow-400', message: 'Too long' }
    return { color: 'text-green-400', message: 'Good' }
  }

  const getMetaLengthStatus = (length) => {
    if (!length) return { color: 'text-red-400', message: 'Missing' }
    if (length < 120) return { color: 'text-yellow-400', message: 'Too short' }
    if (length > 160) return { color: 'text-yellow-400', message: 'Too long' }
    return { color: 'text-green-400', message: 'Good' }
  }

  const titleStatus = getTitleLengthStatus(page.title_length)
  const metaStatus = getMetaLengthStatus(page.meta_description_length)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-6 w-6 text-[var(--accent-primary)]" />
            <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
              {page.title || page.path}
            </h2>
            {getHealthBadge(page.seo_health_score)}
          </div>
          <a 
            href={page.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1"
          >
            {page.path}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCrawl}
            disabled={crawling}
          >
            {crawling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-crawl Page
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(page.url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Page
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">Clicks (28d)</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {formatNumber(page.clicks_28d)}
              </span>
              {getChangeIndicator(page.clicks_28d, page.clicks_prev_28d)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">Impressions</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {formatNumber(page.impressions_28d)}
              </span>
              {getChangeIndicator(page.impressions_28d, page.impressions_prev_28d)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">Position</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {page.avg_position_28d?.toFixed(1) || '-'}
              </span>
              {getChangeIndicator(page.avg_position_28d, page.avg_position_prev_28d, true)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">CTR</div>
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {page.ctr_28d ? `${page.ctr_28d.toFixed(1)}%` : '-'}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">Index Status</div>
            <div className="mt-1">
              {getIndexStatusBadge(page.index_status)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="opportunities">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Metadata</CardTitle>
                <CardDescription>What's live on the page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Title</span>
                    <span className={`text-xs ${titleStatus.color}`}>
                      {page.title_length || 0} chars - {titleStatus.message}
                    </span>
                  </div>
                  <div className="p-3 rounded bg-[var(--glass-bg)] text-sm text-[var(--text-primary)]">
                    {page.title || <span className="text-red-400 italic">Missing</span>}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Meta Description</span>
                    <span className={`text-xs ${metaStatus.color}`}>
                      {page.meta_description_length || 0} chars - {metaStatus.message}
                    </span>
                  </div>
                  <div className="p-3 rounded bg-[var(--glass-bg)] text-sm text-[var(--text-primary)]">
                    {page.meta_description || <span className="text-red-400 italic">Missing</span>}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">H1</span>
                  <div className="p-3 rounded bg-[var(--glass-bg)] text-sm text-[var(--text-primary)] mt-1">
                    {page.h1 || <span className="text-red-400 italic">Missing</span>}
                    {page.h1_count > 1 && (
                      <Badge className="ml-2 bg-yellow-500/20 text-yellow-400">
                        {page.h1_count} H1s found
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Page Signals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Page Signals</CardTitle>
                <CardDescription>Content and technical health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Word Count</span>
                    <span className={`text-sm font-medium ${
                      page.word_count && page.word_count >= 300 
                        ? 'text-green-400' 
                        : 'text-yellow-400'
                    }`}>
                      {page.word_count || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Internal Links Out</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {page.internal_links_out || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Internal Links In</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {page.internal_links_in || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">External Links</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {page.external_links || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Images</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {page.images_count || 0}
                      {page.images_without_alt > 0 && (
                        <span className="text-yellow-400 ml-1">
                          ({page.images_without_alt} missing alt)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Schema Markup</span>
                    <span className={`text-sm font-medium ${page.has_schema ? 'text-green-400' : 'text-[var(--text-tertiary)]'}`}>
                      {page.has_schema ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-[var(--text-secondary)]">Canonical</span>
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                      {page.canonical_url || 'Self'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PageSpeed Scores */}
          {page.performance_score !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">PageSpeed Insights</CardTitle>
                <CardDescription>
                  Last checked: {page.pagespeed_last_checked_at 
                    ? new Date(page.pagespeed_last_checked_at).toLocaleDateString()
                    : 'Never'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Performance', score: page.performance_score },
                    { label: 'SEO', score: page.seo_score },
                    { label: 'Accessibility', score: page.accessibility_score },
                    { label: 'Best Practices', score: page.best_practices_score }
                  ].map(({ label, score }) => (
                    <div key={label} className="text-center">
                      <div className={`
                        inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold
                        ${score >= 90 ? 'bg-green-500/20 text-green-400' :
                          score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'}
                      `}>
                        {score || '-'}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metadata" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage Metadata</CardTitle>
              <CardDescription>
                Edit optimized metadata for this page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Optimized Title</span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {newTitle.length}/60 characters
                  </span>
                </div>
                <Textarea
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter optimized title..."
                  className="resize-none"
                  rows={2}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Optimized Meta Description</span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {newMeta.length}/160 characters
                  </span>
                </div>
                <Textarea
                  value={newMeta}
                  onChange={(e) => setNewMeta(e.target.value)}
                  placeholder="Enter optimized meta description..."
                  className="resize-none"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <Card>
            <CardContent className="py-8 text-center text-[var(--text-tertiary)]">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Content analysis coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="mt-6">
          <Card>
            <CardContent className="py-8 text-center text-[var(--text-tertiary)]">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Connect Google Search Console to see queries</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-6">
          <Card>
            <CardContent className="py-8 text-center text-[var(--text-tertiary)]">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No issues detected for this page</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
