// src/components/seo/SEOContentDecay.jsx
// Content Decay Detection - identify and refresh declining content
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingDown, 
  RefreshCw, 
  AlertTriangle,
  FileText,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Loader2,
  Sparkles,
  Clock,
  Info,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SEOContentDecay({ projectId }) {
  const { 
    decayingContent, 
    decaySummary,
    decayLoading, 
    fetchContentDecay,
    detectContentDecay 
  } = useSeoStore()
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchContentDecay(projectId)
    }
  }, [projectId])

  const handleDetectDecay = async () => {
    setIsAnalyzing(true)
    setAnalysisComplete(false)
    try {
      await detectContentDecay(projectId)
      setAnalysisComplete(true)
      // Auto-refresh after detection
      await fetchContentDecay(projectId)
    } catch (error) {
      console.error('Decay detection error:', error)
    }
    setIsAnalyzing(false)
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/30'
      case 'high': return 'bg-orange-500/10 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30'
      default: return 'bg-muted/30 border-border/50'
    }
  }

  // Loading state
  if (decayLoading && !decayingContent?.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Content Decay Detection</h2>
            <p className="text-muted-foreground">
              Identify content losing rankings and traffic for refresh
            </p>
          </div>
        </div>
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-10 w-10 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading content decay analysis...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Content Decay Detection</h2>
          <p className="text-muted-foreground">
            Identify content losing rankings and traffic for refresh
          </p>
        </div>
        <Button 
          onClick={handleDetectDecay} 
          disabled={isAnalyzing}
          className={isAnalyzing ? '' : 'bg-primary hover:bg-primary/90'}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Run AI Analysis
            </>
          )}
        </Button>
      </div>

      {/* Analysis in Progress */}
      {isAnalyzing && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">AI Analysis in Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing page performance trends from Google Search Console...
                </p>
                <div className="mt-2">
                  <Progress value={undefined} className="h-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Complete Toast */}
      {analysisComplete && !isAnalyzing && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-foreground">Analysis complete!</span>
              <button 
                onClick={() => setAnalysisComplete(false)}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {decaySummary && (decaySummary.totalDecaying > 0 || decaySummary.total > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {decaySummary.totalDecaying || decaySummary.total || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Decaying Pages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">
                  {decaySummary.critical || 0}
                </p>
                <p className="text-sm text-red-400">Critical</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-400">
                  {decaySummary.high || 0}
                </p>
                <p className="text-sm text-orange-400">High Priority</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">
                  {decaySummary.medium || 0}
                </p>
                <p className="text-sm text-yellow-400">Medium Priority</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Decaying Content List */}
      {decayingContent?.length > 0 ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Content Needing Refresh</CardTitle>
            <CardDescription className="text-muted-foreground">
              Pages with declining performance - prioritized by impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {decayingContent.map((page, i) => (
                <div 
                  key={page.id || page.pageId || i} 
                  className={cn(
                    'border rounded-lg p-4',
                    getSeverityBg(page.decay_severity || page.severity)
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={getSeverityColor(page.decay_severity || page.severity)}>
                          {page.decay_severity || page.severity || 'medium'}
                        </Badge>
                        {page.last_updated && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Updated {new Date(page.last_updated).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-foreground truncate">
                        {page.title || page.path || 'Untitled Page'}
                      </h4>
                      <a 
                        href={page.url || `https://${page.path}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {(page.url || page.path)?.replace('https://', '').substring(0, 50)}
                        {(page.url || page.path)?.length > 50 && '...'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Metrics - show if available */}
                  {(page.metrics || page.clicks_change !== undefined) && (
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <MetricChange
                        label="Clicks"
                        before={page.metrics?.earlierClicks || page.clicks_before}
                        after={page.metrics?.recentClicks || page.clicks_after}
                        change={page.metrics?.clicksChange || page.clicks_change}
                      />
                      <MetricChange
                        label="Impressions"
                        before={page.metrics?.earlierImpressions || page.impressions_before}
                        after={page.metrics?.recentImpressions || page.impressions_after}
                        change={page.metrics?.impressionsChange || page.impressions_change}
                      />
                      <MetricChange
                        label="Position"
                        before={page.metrics?.earlierPosition || page.position_before}
                        after={page.metrics?.recentPosition || page.position_after}
                        change={page.metrics?.positionChange || page.position_change}
                        inverse
                      />
                    </div>
                  )}

                  {/* Decay Factors */}
                  {(page.decayFactors?.length > 0 || page.decay_reasons) && (
                    <div className="flex flex-wrap gap-2">
                      {(page.decayFactors || page.decay_reasons?.split(',') || []).map((factor, j) => (
                        <Badge key={j} variant="outline" className="text-xs border-border/50 text-muted-foreground">
                          {String(factor).replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                    <Button size="sm" variant="outline" className="text-xs">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh Content
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-12 text-center">
            <div className="p-4 bg-green-500/10 rounded-full w-fit mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              No Decaying Content Detected
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Great news! Your content is performing well. Run analysis periodically to catch 
              any performance drops early.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={handleDetectDecay} disabled={isAnalyzing}>
                <Sparkles className="mr-2 h-4 w-4" />
                Run Fresh Analysis
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-muted/30 rounded-lg max-w-md mx-auto">
              <div className="flex items-start gap-3 text-left">
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">How decay detection works</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We compare your page performance over 28-day periods using Google Search Console data. 
                    Pages with significant drops in clicks, impressions, or rankings are flagged for refresh.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper component for metric changes
function MetricChange({ label, before, after, change, inverse = false }) {
  const hasData = before !== undefined || after !== undefined || change !== undefined
  if (!hasData) return null
  
  const isNegative = inverse ? change > 0 : change < 0
  const changeColor = isNegative ? 'text-red-400' : 'text-green-400'
  const Icon = isNegative ? ArrowDown : ArrowUp

  return (
    <div className="text-center p-2 bg-muted/30 rounded border border-border/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1">
        <span className="text-sm font-medium text-muted-foreground">{before ?? '-'}</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-sm font-medium text-foreground">{after ?? '-'}</span>
      </div>
      {change !== undefined && change !== null && (
        <div className={`flex items-center justify-center gap-1 ${changeColor} text-xs mt-1`}>
          <Icon className="h-3 w-3" />
          {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  )
}
