// src/components/seo/SEOInternalLinks.jsx
// Internal Linking Analysis - optimize site structure and PageRank flow
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Link2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  FileText,
  Target,
  Network
} from 'lucide-react'

export default function SEOInternalLinks({ siteId }) {
  const { 
    internalLinksAnalysis, 
    internalLinksLoading, 
    fetchInternalLinksAnalysis,
    analyzeInternalLinks 
  } = useSeoStore()
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (siteId) {
      fetchInternalLinksAnalysis(siteId)
    }
  }, [siteId])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      await analyzeInternalLinks(siteId)
    } catch (error) {
      console.error('Internal links analysis error:', error)
    }
    setIsAnalyzing(false)
  }

  const analysis = internalLinksAnalysis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Internal Linking Analysis</h2>
          <p className="text-muted-foreground">
            Optimize site structure and PageRank flow
          </p>
        </div>
        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing || internalLinksLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze Links'}
        </Button>
      </div>

      {analysis ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Network className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold">{analysis.totalLinks || 0}</p>
                <p className="text-sm text-muted-foreground">Total Internal Links</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{analysis.avgLinksPerPage?.toFixed(1) || 0}</p>
                <p className="text-sm text-muted-foreground">Avg Links/Page</p>
              </CardContent>
            </Card>

            <Card className={analysis.orphanPages?.length > 0 ? 'bg-red-50 border-red-200' : ''}>
              <CardContent className="pt-6 text-center">
                <p className={`text-3xl font-bold ${analysis.orphanPages?.length > 0 ? 'text-red-600' : ''}`}>
                  {analysis.orphanPages?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Orphan Pages</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{analysis.hubPages?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Hub Pages</p>
              </CardContent>
            </Card>
          </div>

          {/* Link Health Score */}
          {analysis.linkHealthScore !== undefined && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Internal Link Health</h4>
                      <span className="text-2xl font-bold">{analysis.linkHealthScore}/100</span>
                    </div>
                    <Progress value={analysis.linkHealthScore} className="h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orphan Pages */}
          {analysis.orphanPages?.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Orphan Pages
                </CardTitle>
                <CardDescription>
                  Pages with no internal links pointing to them
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.orphanPages.slice(0, 10).map((page, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-600" />
                        <div>
                          <p className="font-medium text-sm">{page.title || page.url}</p>
                          <p className="text-xs text-muted-foreground">
                            {page.url?.substring(0, 50)}...
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">No Links</Badge>
                    </div>
                  ))}
                  {analysis.orphanPages.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{analysis.orphanPages.length - 10} more orphan pages
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hub Pages */}
          {analysis.hubPages?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Hub Pages
                </CardTitle>
                <CardDescription>
                  Important pages with many outbound links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.hubPages.slice(0, 10).map((page, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{page.title || page.url}</p>
                          <p className="text-xs text-muted-foreground">
                            {page.url?.substring(0, 50)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-green-100">
                          {page.outboundLinks} links
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Link Suggestions */}
          {analysis.linkSuggestions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Recommended Internal Links
                </CardTitle>
                <CardDescription>
                  AI-suggested links to improve site structure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.linkSuggestions.map((suggestion, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">From:</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {suggestion.fromPage}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">To:</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {suggestion.toPage}
                          </p>
                        </div>
                      </div>
                      {suggestion.anchorText && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Suggested anchor:</span>
                          <Badge variant="outline">{suggestion.anchorText}</Badge>
                        </div>
                      )}
                      {suggestion.reason && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {suggestion.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pages with Few Links */}
          {analysis.lowLinkPages?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Pages Needing More Links
                </CardTitle>
                <CardDescription>
                  Important pages with too few internal links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.lowLinkPages.slice(0, 10).map((page, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{page.title || page.url}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {page.clicks ? `${page.clicks} clicks/month` : 'Low traffic'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">
                        {page.inboundLinks || 0} links
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analysis Available</h3>
            <p className="text-muted-foreground mb-4">
              Analyze your internal linking structure to find optimization opportunities
            </p>
            <Button onClick={handleAnalyze}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Analyze Internal Links
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
