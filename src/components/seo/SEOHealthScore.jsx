// src/components/seo/SEOHealthScore.jsx
// Prominent health score with letter grade and actionable breakdown
import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  Code,
  Link2,
  Gauge,
  Target,
  ChevronRight,
  Zap,
  Shield,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * SEOHealthScore - The first thing users see
 * Shows overall letter grade with breakdown of factors
 */
export default function SEOHealthScore({ 
  site, 
  pages = [], 
  opportunities = [], 
  gscMetrics = {},
  cwvSummary = null,
  detailed = false,
  onViewDetails,
  onFixIssues 
}) {
  // Calculate component scores
  const scores = useMemo(() => {
    // Technical Score (0-100)
    let technicalScore = 100
    let technicalIssues = []
    
    // Check for technical issues in pages
    const pagesWithIssues = pages.filter(p => p.health_score && p.health_score < 60)
    const noindexPages = pages.filter(p => p.has_noindex)
    const brokenPages = pages.filter(p => p.http_status >= 400)
    const missingCanonicals = pages.filter(p => !p.canonical_url)
    
    if (brokenPages.length > 0) {
      technicalScore -= Math.min(30, brokenPages.length * 5)
      technicalIssues.push({ label: `${brokenPages.length} broken pages`, severity: 'critical', fixable: true })
    }
    if (noindexPages.length > 3) {
      technicalScore -= 10
      technicalIssues.push({ label: `${noindexPages.length} noindex pages`, severity: 'warning', fixable: true })
    }
    if (cwvSummary?.avgMobileScore && cwvSummary.avgMobileScore < 50) {
      technicalScore -= 15
      technicalIssues.push({ label: 'Poor Core Web Vitals', severity: 'warning', fixable: false })
    }
    
    // Content Score (0-100)
    let contentScore = 100
    let contentIssues = []
    
    const missingTitles = pages.filter(p => !p.title || p.title.length === 0)
    const missingDescriptions = pages.filter(p => !p.meta_description)
    const thinContent = pages.filter(p => p.word_count && p.word_count < 300)
    const duplicateTitles = findDuplicates(pages.map(p => p.title).filter(Boolean))
    
    if (missingTitles.length > 0) {
      contentScore -= Math.min(25, missingTitles.length * 5)
      contentIssues.push({ label: `${missingTitles.length} missing titles`, severity: 'critical', fixable: true })
    }
    if (missingDescriptions.length > 0) {
      contentScore -= Math.min(20, missingDescriptions.length * 3)
      contentIssues.push({ label: `${missingDescriptions.length} missing descriptions`, severity: 'warning', fixable: true })
    }
    if (thinContent.length > 0) {
      contentScore -= Math.min(15, thinContent.length * 2)
      contentIssues.push({ label: `${thinContent.length} thin content pages`, severity: 'warning', fixable: false })
    }
    if (duplicateTitles > 0) {
      contentScore -= duplicateTitles * 3
      contentIssues.push({ label: `${duplicateTitles} duplicate titles`, severity: 'warning', fixable: true })
    }
    
    // Performance Score (0-100) - Based on GSC metrics
    let performanceScore = 70 // Default if no data
    let performanceIssues = []
    
    if (gscMetrics.ctr?.value !== undefined) {
      const ctr = gscMetrics.ctr.value * 100
      if (ctr < 1) {
        performanceScore = 40
        performanceIssues.push({ label: 'Very low CTR (<1%)', severity: 'critical', fixable: true })
      } else if (ctr < 2) {
        performanceScore = 60
        performanceIssues.push({ label: 'Low CTR - improve titles', severity: 'warning', fixable: true })
      } else if (ctr >= 5) {
        performanceScore = 95
      } else {
        performanceScore = 70 + (ctr * 5)
      }
    }
    
    if (gscMetrics.position?.value && gscMetrics.position.value > 20) {
      performanceScore -= 10
      performanceIssues.push({ label: 'Average position > 20', severity: 'warning', fixable: false })
    }
    
    // Authority Score (0-100) - Placeholder for backlinks
    let authorityScore = 60 // Default
    let authorityIssues = []
    
    const internalLinksAvg = pages.length > 0 
      ? pages.reduce((sum, p) => sum + (p.internal_links_in || 0), 0) / pages.length 
      : 0
    
    if (internalLinksAvg < 3) {
      authorityScore -= 20
      authorityIssues.push({ label: 'Weak internal linking', severity: 'warning', fixable: true })
    }
    
    // Calculate overall
    const overall = Math.round(
      (technicalScore * 0.25) + 
      (contentScore * 0.35) + 
      (performanceScore * 0.25) + 
      (authorityScore * 0.15)
    )
    
    return {
      overall: Math.max(0, Math.min(100, overall)),
      technical: { score: Math.max(0, Math.min(100, technicalScore)), issues: technicalIssues },
      content: { score: Math.max(0, Math.min(100, contentScore)), issues: contentIssues },
      performance: { score: Math.max(0, Math.min(100, performanceScore)), issues: performanceIssues },
      authority: { score: Math.max(0, Math.min(100, authorityScore)), issues: authorityIssues }
    }
  }, [pages, opportunities, gscMetrics, cwvSummary])

  // Get letter grade
  const getGrade = (score) => {
    if (score >= 90) return { letter: 'A', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' }
    if (score >= 80) return { letter: 'B', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' }
    if (score >= 70) return { letter: 'C', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' }
    if (score >= 60) return { letter: 'D', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' }
    return { letter: 'F', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' }
  }

  const grade = getGrade(scores.overall)
  const allIssues = [
    ...scores.technical.issues,
    ...scores.content.issues,
    ...scores.performance.issues,
    ...scores.authority.issues
  ]
  const fixableIssues = allIssues.filter(i => i.fixable)
  const criticalIssues = allIssues.filter(i => i.severity === 'critical')

  return (
    <>
    <Card className={cn('border-2 overflow-hidden', grade.border)}>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Grade - Fixed width, centered */}
          <div className="flex flex-col items-center justify-center px-6 shrink-0">
            <div className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center text-5xl font-bold',
              grade.bg, grade.color
            )}>
              {grade.letter}
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mt-2">SEO Health</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{scores.overall}/100</p>
          </div>

          {/* Score Breakdown - Flexible, minimum width for content */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <ScoreBar 
              icon={Shield} 
              label="Technical" 
              score={scores.technical.score} 
              issues={scores.technical.issues.length}
            />
            <ScoreBar 
              icon={FileText} 
              label="Content" 
              score={scores.content.score} 
              issues={scores.content.issues.length}
            />
            <ScoreBar 
              icon={Target} 
              label="Performance" 
              score={scores.performance.score} 
              issues={scores.performance.issues.length}
            />
            <ScoreBar 
              icon={Link2} 
              label="Authority" 
              score={scores.authority.score} 
              issues={scores.authority.issues.length}
            />
          </div>

          {/* Quick Actions - Fixed width on large screens, full width on mobile */}
          <div className="flex flex-col gap-2 w-full lg:w-[180px] shrink-0">
            {criticalIssues.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm font-medium text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {criticalIssues.length} Critical Issues
                </p>
              </div>
            )}
            
            {fixableIssues.length > 0 && (
              <Button 
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
                onClick={() => onFixIssues?.(fixableIssues)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Fix {fixableIssues.length} Issues
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails?.('health')}
            >
              View Full Report
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Top Issues Preview */}
        {allIssues.length > 0 && !detailed && (
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Top Issues to Fix:</p>
            <div className="flex flex-wrap gap-2">
              {allIssues.slice(0, 4).map((issue, i) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className={cn(
                    'text-xs',
                    issue.severity === 'critical' 
                      ? 'border-red-500/30 text-red-400' 
                      : 'border-yellow-500/30 text-yellow-400'
                  )}
                >
                  {issue.fixable && <Zap className="h-3 w-3 mr-1" />}
                  {issue.label}
                </Badge>
              ))}
              {allIssues.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{allIssues.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Detailed Breakdown - Only shown when detailed={true} */}
    {detailed && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Technical Issues */}
        {scores.technical.issues.length > 0 && (
          <Card className="bg-[var(--bg-secondary)]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-[var(--accent-primary)]" />
                Technical Issues ({scores.technical.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scores.technical.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  {issue.severity === 'critical' ? (
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)]">{issue.label}</p>
                    {issue.fixable && (
                      <Badge variant="outline" className="mt-1 text-xs bg-green-500/10 border-green-500/30 text-green-400">
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-fixable
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Content Issues */}
        {scores.content.issues.length > 0 && (
          <Card className="bg-[var(--bg-secondary)]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--accent-primary)]" />
                Content Issues ({scores.content.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scores.content.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  {issue.severity === 'critical' ? (
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)]">{issue.label}</p>
                    {issue.fixable && (
                      <Badge variant="outline" className="mt-1 text-xs bg-green-500/10 border-green-500/30 text-green-400">
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-fixable
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Performance Issues */}
        {scores.performance.issues.length > 0 && (
          <Card className="bg-[var(--bg-secondary)]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-[var(--accent-primary)]" />
                Performance Issues ({scores.performance.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scores.performance.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  {issue.severity === 'critical' ? (
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)]">{issue.label}</p>
                    {issue.fixable && (
                      <Badge variant="outline" className="mt-1 text-xs bg-green-500/10 border-green-500/30 text-green-400">
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-fixable
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Authority Issues */}
        {scores.authority.issues.length > 0 && (
          <Card className="bg-[var(--bg-secondary)]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-[var(--accent-primary)]" />
                Authority Issues ({scores.authority.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scores.authority.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  {issue.severity === 'critical' ? (
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)]">{issue.label}</p>
                    {issue.fixable && (
                      <Badge variant="outline" className="mt-1 text-xs bg-green-500/10 border-green-500/30 text-green-400">
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-fixable
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    )}
  </>
  )
}

// Score bar component
function ScoreBar({ icon: Icon, label, score, issues }) {
  const getColor = (score) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className="font-medium text-[var(--text-primary)]">{score}</span>
      </div>
      <div className="h-2 bg-[var(--glass-bg)] rounded-full overflow-hidden">
        <div 
          className={cn('h-full rounded-full transition-all', getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      {issues > 0 && (
        <p className="text-xs text-[var(--text-tertiary)]">{issues} issue{issues > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}

// Helper to find duplicates
function findDuplicates(arr) {
  const seen = new Set()
  let duplicates = 0
  for (const item of arr) {
    if (seen.has(item)) duplicates++
    seen.add(item)
  }
  return duplicates
}
