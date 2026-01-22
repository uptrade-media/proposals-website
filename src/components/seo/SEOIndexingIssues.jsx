// src/components/seo/SEOIndexingIssues.jsx
// Display and manage GSC indexing issues
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw, 
  AlertTriangle, 
  XCircle,
  CheckCircle,
  Search,
  FileWarning,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function SEOIndexingIssues({ projectId }) {
  const { 
    indexingStatus, 
    indexingLoading, 
    indexingError,
    fetchIndexingStatus,
    analyzeIndexingIssues,
    inspectUrl,
    fetchSitemapsStatus
  } = useSeoStore()
  
  const [sitemaps, setSitemaps] = useState(null)
  const [inspecting, setInspecting] = useState(null)
  const [inspectionResult, setInspectionResult] = useState(null)

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    await analyzeIndexingIssues(projectId)
    const sitemapData = await fetchSitemapsStatus(projectId)
    setSitemaps(sitemapData)
  }

  const handleInspectUrl = async (url) => {
    setInspecting(url)
    try {
      const result = await inspectUrl(projectId, url)
      setInspectionResult({ url, ...result })
    } catch (err) {
      console.error('Inspection failed:', err)
    }
    setInspecting(null)
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const issues = indexingStatus?.issues || {}
  const recommendations = indexingStatus?.recommendations || []
  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + (arr?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Indexing Issues</h2>
          <p className="text-muted-foreground">
            Monitor and fix Google indexing problems
          </p>
        </div>
        <Button onClick={loadData} disabled={indexingLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${indexingLoading ? 'animate-spin' : ''}`} />
          {indexingLoading ? 'Analyzing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{issues.serverErrors?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Server Errors (5xx)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{issues.notFound?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Not Found (404)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{issues.canonicalIssues?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Canonical Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{indexingStatus?.totalPages || 0}</p>
                <p className="text-sm text-muted-foreground">Total Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Fixes</CardTitle>
            <CardDescription>
              Prioritized actions to improve indexing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border ${getSeverityColor(rec.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={rec.priority === 'critical' ? 'destructive' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                        <h4 className="font-medium">{rec.title}</h4>
                      </div>
                      <p className="text-sm mb-2">{rec.description}</p>
                      <p className="text-sm font-medium">Action: {rec.action}</p>
                      
                      {rec.affectedUrls?.length > 0 && (
                        <Accordion type="single" collapsible className="mt-2">
                          <AccordionItem value="urls" className="border-0">
                            <AccordionTrigger className="text-sm py-1">
                              View {rec.affectedUrls.length} affected URLs
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="text-sm space-y-1 mt-2">
                                {rec.affectedUrls.map((url, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <code className="text-xs bg-white/50 px-1 rounded flex-1 truncate">
                                      {url}
                                    </code>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleInspectUrl(url)}
                                      disabled={inspecting === url}
                                    >
                                      {inspecting === url ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Search className="w-3 h-3" />
                                      )}
                                    </Button>
                                    <a 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="hover:text-primary"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sitemap Status */}
      {sitemaps?.sitemaps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sitemap Status</CardTitle>
            <CardDescription>
              Status of submitted sitemaps in Google Search Console
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sitemaps.sitemaps.map((sitemap, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm truncate">{sitemap.path}</p>
                    <p className="text-xs text-muted-foreground">
                      Last submitted: {sitemap.lastSubmitted ? new Date(sitemap.lastSubmitted).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {sitemap.errors > 0 && (
                      <span className="text-red-500">{sitemap.errors} errors</span>
                    )}
                    {sitemap.warnings > 0 && (
                      <span className="text-yellow-500">{sitemap.warnings} warnings</span>
                    )}
                    <span className="text-green-500">{sitemap.contents?.[0]?.submitted || 0} URLs</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* URL Inspection Result Modal */}
      {inspectionResult && (
        <Card className="border-2 border-primary">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>URL Inspection Result</CardTitle>
              <CardDescription className="truncate max-w-md">
                {inspectionResult.url}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setInspectionResult(null)}>
              ✕
            </Button>
          </CardHeader>
          <CardContent>
            {inspectionResult.inspection && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Verdict</p>
                    <Badge variant={inspectionResult.inspection.verdict === 'PASS' ? 'default' : 'destructive'}>
                      {inspectionResult.inspection.verdict}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Coverage State</p>
                    <p className="font-medium">{inspectionResult.inspection.coverageState}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Crawled</p>
                    <p className="font-medium">
                      {inspectionResult.inspection.lastCrawlTime 
                        ? new Date(inspectionResult.inspection.lastCrawlTime).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Crawled As</p>
                    <p className="font-medium">{inspectionResult.inspection.crawledAs || 'Unknown'}</p>
                  </div>
                </div>

                {inspectionResult.fixes?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Recommended Fixes</h4>
                    <div className="space-y-2">
                      {inspectionResult.fixes.map((fix, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border ${getSeverityColor(fix.severity)}`}>
                          <p className="font-medium">{fix.title}</p>
                          <p className="text-sm mt-1">{fix.description}</p>
                          {fix.fix && (
                            <p className="text-sm mt-2 font-medium">Fix: {fix.fix}</p>
                          )}
                          {fix.code && (
                            <pre className="text-xs bg-black/10 p-2 rounded mt-2 overflow-x-auto">
                              {fix.code}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {inspectionResult.error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                <p className="font-medium">Inspection Failed</p>
                <p className="text-sm">{inspectionResult.error}</p>
                {inspectionResult.note && (
                  <p className="text-sm mt-2">{inspectionResult.note}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!indexingLoading && totalIssues === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Indexing Issues Found</h3>
            <p className="text-muted-foreground">
              All your pages appear to be indexed correctly.
            </p>
          </CardContent>
        </Card>
      )}

      {indexingError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-700">{indexingError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
