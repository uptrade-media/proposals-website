// src/components/seo/SEOContentTab.jsx
// Content tab - briefs, AI generation, thin content, decay opportunities
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Sparkles, 
  TrendingDown,
  AlertTriangle,
  Plus,
  ChevronRight,
  Clock,
  Target,
  BarChart3,
  Wand2,
  Edit3,
  Eye,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useSeoStore, useSignalAccess } from '@/lib/seo-store'
import { SignalUpgradeCard, SignalAutoFixCard } from './signal'

// Content score card
function ContentScoreCard({ page, onView, onOptimize, hasSignal }) {
  const getPath = (url) => {
    try {
      return new URL(url).pathname
    } catch {
      return url
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-emerald-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--accent-primary)]/30 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm text-[var(--text-primary)] truncate">
              {getPath(page.url)}
            </span>
            {page.decay && (
              <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 text-xs">
                <TrendingDown className="h-3 w-3 mr-1" />
                Decaying
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
            {page.meta_title || 'Untitled Page'}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-[var(--text-tertiary)]">Content Score</span>
              <div className="flex-1 max-w-[100px]">
                <Progress 
                  value={page.content_score || 0} 
                  className="h-1.5 bg-[var(--glass-border)]"
                  indicatorClassName={getProgressColor(page.content_score || 0)}
                />
              </div>
              <span className={cn('text-sm font-medium', getScoreColor(page.content_score || 0))}>
                {page.content_score || 0}
              </span>
            </div>
            
            {page.word_count && (
              <span className="text-xs text-[var(--text-tertiary)]">
                {page.word_count.toLocaleString()} words
              </span>
            )}
          </div>

          {page.issues && page.issues.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {page.issues.slice(0, 3).map((issue, idx) => (
                <Badge key={idx} variant="outline" className="text-xs text-yellow-400 border-yellow-500/30">
                  {issue}
                </Badge>
              ))}
              {page.issues.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{page.issues.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {hasSignal ? (
            <Button size="sm" onClick={() => onOptimize(page)}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Optimize
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => onView(page)}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              View
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Content brief card
function ContentBriefCard({ brief, onView, onEdit }) {
  return (
    <Card className="hover:border-[var(--accent-primary)]/30 transition-colors cursor-pointer" onClick={() => onView(brief)}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-[var(--text-primary)] mb-1 line-clamp-1">
              {brief.title}
            </h4>
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-2">
              {brief.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {brief.targetKeyword}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {brief.createdAt}
              </span>
            </div>
          </div>
          <Badge variant="outline" className={cn(
            'shrink-0',
            brief.status === 'draft' && 'text-yellow-400 border-yellow-500/30',
            brief.status === 'published' && 'text-emerald-400 border-emerald-500/30',
            brief.status === 'in-progress' && 'text-blue-400 border-blue-500/30'
          )}>
            {brief.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SEOContentTab({
  siteId,
  pages = [],
  contentBriefs = [],
  decayingPages = [],
  thinContentPages = [],
  onViewPage,
  onOptimizePage,
  onCreateBrief,
  onViewBrief,
  onRefresh,
  isLoading = false
}) {
  const hasSignal = useSignalAccess()
  const { signalLearning, applySignalAutoFixes } = useSeoStore()
  
  const [activeTab, setActiveTab] = useState('overview')

  // Calculate stats
  const stats = useMemo(() => {
    const avgScore = pages.length > 0 
      ? Math.round(pages.reduce((sum, p) => sum + (p.content_score || 0), 0) / pages.length)
      : 0
    const needsWork = pages.filter(p => (p.content_score || 0) < 60).length
    const optimized = pages.filter(p => (p.content_score || 0) >= 80).length
    return { avgScore, needsWork, optimized, total: pages.length }
  }, [pages])

  // Auto-fixable content issues
  const contentAutoFixes = useMemo(() => {
    return signalLearning?.recommendations
      ?.filter(r => r.type === 'content' && r.autoFixable)
      ?.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        affectedPages: r.pageCount,
        risk: r.risk || 'low'
      })) || []
  }, [signalLearning])

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg',
                stats.avgScore >= 80 ? 'bg-emerald-500/20' : stats.avgScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
              )}>
                <BarChart3 className={cn(
                  'h-5 w-5',
                  stats.avgScore >= 80 ? 'text-emerald-400' : stats.avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.avgScore}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Avg Content Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/20">
                <TrendingDown className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{decayingPages.length}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Decaying Pages</p>
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
                <p className="text-2xl font-bold text-[var(--text-primary)]">{thinContentPages.length}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Thin Content</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
                <FileText className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{contentBriefs.length}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Content Briefs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signal Auto-Fix Card */}
      {hasSignal && contentAutoFixes.length > 0 && (
        <SignalAutoFixCard
          fixes={contentAutoFixes}
          onApplyAll={(ids) => applySignalAutoFixes(siteId, ids)}
        />
      )}

      {/* Signal Upgrade for non-Signal users */}
      {!hasSignal && (
        <SignalUpgradeCard 
          feature="brief"
          variant="inline"
          onUpgrade={() => window.open('/pricing', '_blank')}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="decay">
              Decay
              {decayingPages.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs bg-orange-500/20 text-orange-400">
                  {decayingPages.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="thin">
              Thin Content
              {thinContentPages.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs bg-yellow-500/20 text-yellow-400">
                  {thinContentPages.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="briefs">Briefs</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            {hasSignal && (
              <Button size="sm" onClick={onCreateBrief}>
                <Plus className="h-4 w-4 mr-2" />
                New Brief
              </Button>
            )}
          </div>
        </div>

        {/* Overview - All pages by content score */}
        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="grid gap-3">
            {pages
              .sort((a, b) => (a.content_score || 0) - (b.content_score || 0))
              .slice(0, 10)
              .map((page) => (
                <ContentScoreCard
                  key={page.id}
                  page={page}
                  hasSignal={hasSignal}
                  onView={onViewPage}
                  onOptimize={onOptimizePage}
                />
              ))}
          </div>

          {pages.length > 10 && (
            <Button variant="outline" className="w-full" onClick={() => setActiveTab('all')}>
              View All {pages.length} Pages
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </TabsContent>

        {/* Decaying Pages */}
        <TabsContent value="decay" className="mt-0 space-y-4">
          {decayingPages.length > 0 ? (
            <div className="grid gap-3">
              {decayingPages.map((page) => (
                <ContentScoreCard
                  key={page.id}
                  page={{ ...page, decay: true }}
                  hasSignal={hasSignal}
                  onView={onViewPage}
                  onOptimize={onOptimizePage}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <TrendingDown className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
              <p className="text-[var(--text-secondary)]">
                No decaying content detected
              </p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Content that loses traffic over time will appear here
              </p>
            </div>
          )}
        </TabsContent>

        {/* Thin Content */}
        <TabsContent value="thin" className="mt-0 space-y-4">
          {thinContentPages.length > 0 ? (
            <div className="grid gap-3">
              {thinContentPages.map((page) => (
                <ContentScoreCard
                  key={page.id}
                  page={page}
                  hasSignal={hasSignal}
                  onView={onViewPage}
                  onOptimize={onOptimizePage}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
              <p className="text-[var(--text-secondary)]">
                No thin content pages found
              </p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Pages with less than 300 words will appear here
              </p>
            </div>
          )}
        </TabsContent>

        {/* Content Briefs */}
        <TabsContent value="briefs" className="mt-0 space-y-4">
          {!hasSignal ? (
            <SignalUpgradeCard 
              feature="brief"
              onUpgrade={() => window.open('/pricing', '_blank')}
            />
          ) : contentBriefs.length > 0 ? (
            <div className="grid gap-4">
              {contentBriefs.map((brief) => (
                <ContentBriefCard
                  key={brief.id}
                  brief={brief}
                  onView={onViewBrief}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-[var(--glass-border)] rounded-lg">
              <Wand2 className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
              <p className="text-[var(--text-secondary)] mb-4">
                No content briefs yet
              </p>
              <Button onClick={onCreateBrief}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Brief
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
