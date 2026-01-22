// src/components/seo/SEOSchemaMarkup.jsx
// Schema Markup Generator - create and validate structured data
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { useSignalAccess } from '@/lib/signal-access'
import SignalUpgradeCard from './signal/SignalUpgradeCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Code, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  Copy,
  FileCode,
  Sparkles,
  FileText
} from 'lucide-react'

export default function SEOSchemaMarkup({ projectId }) {
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
    schemaStatus, 
    schemaLoading,
    generatedSchema,
    fetchSchemaStatus,
    generateSchema,
    pages
  } = useSeoStore()
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedPage, setSelectedPage] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    if (projectId) {
      fetchSchemaStatus(projectId)
    }
  }, [projectId])

  const handleGenerateSchema = async (pageId) => {
    setIsGenerating(true)
    setSelectedPage(pageId)
    try {
      await generateSchema(projectId, pageId)
    } catch (error) {
      console.error('Schema generation error:', error)
    }
    setIsGenerating(false)
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const status = schemaStatus

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Schema Markup</h2>
          <p className="text-muted-foreground">
            Generate and manage structured data for rich results
          </p>
        </div>
        <Button 
          onClick={() => fetchSchemaStatus(projectId)} 
          disabled={schemaLoading}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${schemaLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {status && (
        <>
          {/* Coverage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Schema Coverage</h4>
                  <span className="text-2xl font-bold">{status.coveragePercent || 0}%</span>
                </div>
                <Progress value={status.coveragePercent || 0} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {status.pagesWithSchema || 0} of {status.totalPages || 0} pages have schema
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-600">
                  {status.pagesWithSchema || 0}
                </p>
                <p className="text-sm text-green-600">With Schema</p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-yellow-600">
                  {status.pagesWithoutSchema || 0}
                </p>
                <p className="text-sm text-yellow-600">Missing Schema</p>
              </CardContent>
            </Card>
          </div>

          {/* Schema Types Distribution */}
          {status.schemaTypeCounts && Object.keys(status.schemaTypeCounts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Schema Types in Use</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(status.schemaTypeCounts).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-sm py-1 px-3">
                      <Code className="h-3 w-3 mr-1" />
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Priority Pages Missing Schema */}
          {status.priorityMissing?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Priority Pages Needing Schema
                </CardTitle>
                <CardDescription>
                  High-traffic pages that would benefit from structured data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {status.priorityMissing.map((page, i) => (
                    <div 
                      key={page.id || i}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{page.title || 'Untitled'}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {page.url?.replace('https://', '').substring(0, 40)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm text-muted-foreground">
                          {page.clicks_28d || 0} clicks
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateSchema(page.id)}
                          disabled={isGenerating && selectedPage === page.id}
                        >
                          {isGenerating && selectedPage === page.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-1" />
                              Generate
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Generated Schema Display */}
      {generatedSchema && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-purple-600" />
              Generated Schema: {generatedSchema.schemaType}
            </CardTitle>
            <CardDescription>
              Copy this code to your page's &lt;head&gt; section
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="json">
              <TabsList>
                <TabsTrigger value="json">JSON-LD</TabsTrigger>
                <TabsTrigger value="html">HTML Snippet</TabsTrigger>
              </TabsList>

              <TabsContent value="json">
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>
                      {JSON.stringify(generatedSchema.jsonLd, null, 2)}
                    </code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(
                      JSON.stringify(generatedSchema.jsonLd, null, 2),
                      'json'
                    )}
                  >
                    {copiedId === 'json' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="html">
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>
                      {generatedSchema.htmlSnippet}
                    </code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(
                      generatedSchema.htmlSnippet,
                      'html'
                    )}
                  >
                    {copiedId === 'html' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Rich Result Eligibility */}
            {generatedSchema.richResultEligibility?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Eligible for Rich Results:</h4>
                <div className="flex flex-wrap gap-2">
                  {generatedSchema.richResultEligibility.map((type, i) => (
                    <Badge key={i} className="bg-purple-100 text-purple-800">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {generatedSchema.recommendations?.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-medium mb-2">Enhancement Suggestions:</h4>
                <ul className="text-sm space-y-1">
                  {generatedSchema.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-600">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!status && !schemaLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Schema Data</h3>
            <p className="text-muted-foreground mb-4">
              Check your site's structured data coverage and generate new schema
            </p>
            <Button onClick={() => fetchSchemaStatus(projectId)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Coverage
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
