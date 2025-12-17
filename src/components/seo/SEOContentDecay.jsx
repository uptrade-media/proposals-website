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
  ExternalLink
} from 'lucide-react'

export default function SEOContentDecay({ siteId }) {
  const { 
    decayingContent, 
    decaySummary,
    decayLoading, 
    fetchContentDecay,
    detectContentDecay 
  } = useSeoStore()
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (siteId) {
      fetchContentDecay(siteId)
    }
  }, [siteId])

  const handleDetectDecay = async () => {
    setIsAnalyzing(true)
    try {
      await detectContentDecay(siteId)
    } catch (error) {
      console.error('Decay detection error:', error)
    }
    setIsAnalyzing(false)
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      default: return 'secondary'
    }
  }

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200'
      case 'high': return 'bg-orange-50 border-orange-200'
      case 'medium': return 'bg-yellow-50 border-yellow-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Decay Detection</h2>
          <p className="text-muted-foreground">
            Identify content losing rankings and traffic for refresh
          </p>
        </div>
        <Button 
          onClick={handleDetectDecay} 
          disabled={isAnalyzing || decayLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Detect Decay'}
        </Button>
      </div>

      {/* Summary Cards */}
      {decaySummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{decaySummary.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Decaying Pages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {decaySummary.critical || 0}
                </p>
                <p className="text-sm text-red-600">Critical</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {decaySummary.high || 0}
                </p>
                <p className="text-sm text-orange-600">High Priority</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {decaySummary.medium || 0}
                </p>
                <p className="text-sm text-yellow-600">Medium Priority</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Decaying Content List */}
      {decayingContent?.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Content Needing Refresh</CardTitle>
            <CardDescription>
              Pages with declining performance - prioritized by impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {decayingContent.map((page, i) => (
                <div 
                  key={page.pageId || i} 
                  className={`border rounded-lg p-4 ${getSeverityBg(page.severity)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityColor(page.severity)}>
                          {page.severity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {page.pageType || 'page'}
                        </span>
                      </div>
                      <h4 className="font-semibold line-clamp-1">
                        {page.title || page.url}
                      </h4>
                      <a 
                        href={page.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {page.url?.replace('https://', '').substring(0, 50)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <MetricChange
                      label="Clicks"
                      before={page.metrics?.earlierClicks}
                      after={page.metrics?.recentClicks}
                      change={page.metrics?.clicksChange}
                    />
                    <MetricChange
                      label="Impressions"
                      before={page.metrics?.earlierImpressions}
                      after={page.metrics?.recentImpressions}
                      change={page.metrics?.impressionsChange}
                    />
                    <MetricChange
                      label="Position"
                      before={page.metrics?.earlierPosition}
                      after={page.metrics?.recentPosition}
                      change={page.metrics?.positionChange}
                      inverse
                    />
                  </div>

                  {/* Decay Factors */}
                  {page.decayFactors?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {page.decayFactors.map((factor, j) => (
                        <Badge key={j} variant="outline" className="text-xs">
                          {factor.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Decaying Content Detected</h3>
            <p className="text-muted-foreground mb-4">
              Your content is performing well! Run detection to check for decay.
            </p>
            <Button onClick={handleDetectDecay}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Detection
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper component for metric changes
function MetricChange({ label, before, after, change, inverse = false }) {
  const isNegative = inverse ? change > 0 : change < 0
  const changeColor = isNegative ? 'text-red-600' : 'text-green-600'
  const Icon = isNegative ? ArrowDown : ArrowUp

  return (
    <div className="text-center p-2 bg-white/50 rounded">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1">
        <span className="text-sm font-medium">{before || 0}</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-sm font-medium">{after || 0}</span>
      </div>
      {change !== undefined && (
        <div className={`flex items-center justify-center gap-1 ${changeColor} text-xs`}>
          <Icon className="h-3 w-3" />
          {Math.abs(change)}%
        </div>
      )}
    </div>
  )
}
