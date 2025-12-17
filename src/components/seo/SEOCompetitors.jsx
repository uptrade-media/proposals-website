// src/components/seo/SEOCompetitors.jsx
// Competitor Analysis - track and analyze competitor SEO strategies
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  RefreshCw, 
  Plus,
  Globe,
  TrendingUp,
  Target,
  FileText,
  ExternalLink,
  BarChart3
} from 'lucide-react'

export default function SEOCompetitors({ siteId }) {
  const { 
    competitors, 
    competitorsLoading, 
    fetchCompetitors,
    analyzeCompetitor
  } = useSeoStore()
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [newCompetitor, setNewCompetitor] = useState('')
  const [analyzingId, setAnalyzingId] = useState(null)

  useEffect(() => {
    if (siteId) {
      fetchCompetitors(siteId)
    }
  }, [siteId])

  const handleAddCompetitor = async () => {
    if (!newCompetitor.trim()) return
    setIsAnalyzing(true)
    try {
      // Clean domain
      let domain = newCompetitor.trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
      
      await analyzeCompetitor(siteId, domain)
      setNewCompetitor('')
    } catch (error) {
      console.error('Add competitor error:', error)
    }
    setIsAnalyzing(false)
  }

  const handleReanalyze = async (competitorDomain) => {
    setAnalyzingId(competitorDomain)
    try {
      await analyzeCompetitor(siteId, competitorDomain)
    } catch (error) {
      console.error('Reanalyze error:', error)
    }
    setAnalyzingId(null)
  }

  const getOverlapColor = (overlap) => {
    if (overlap >= 70) return 'text-red-600'
    if (overlap >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Competitor Analysis</h2>
          <p className="text-muted-foreground">
            Track competitor SEO strategies and find opportunities
          </p>
        </div>
      </div>

      {/* Add Competitor */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter competitor domain (e.g., competitor.com)"
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor()}
              className="flex-1"
            />
            <Button onClick={handleAddCompetitor} disabled={!newCompetitor.trim() || isAnalyzing}>
              {isAnalyzing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Add Competitor'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Competitors List */}
      {competitors?.length > 0 ? (
        <div className="space-y-4">
          {competitors.map((competitor, i) => (
            <Card key={competitor.id || i}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {competitor.competitor_domain}
                        <a 
                          href={`https://${competitor.competitor_domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </CardTitle>
                      <CardDescription>
                        Last analyzed: {competitor.last_analyzed 
                          ? new Date(competitor.last_analyzed).toLocaleDateString()
                          : 'Never'
                        }
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReanalyze(competitor.competitor_domain)}
                    disabled={analyzingId === competitor.competitor_domain}
                  >
                    <RefreshCw className={`h-4 w-4 ${analyzingId === competitor.competitor_domain ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className={`text-2xl font-bold ${getOverlapColor(competitor.keyword_overlap_percent || 0)}`}>
                      {competitor.keyword_overlap_percent || 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Keyword Overlap</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {competitor.shared_keywords || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Shared Keywords</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {competitor.competitor_only_keywords || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Their Keywords</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {competitor.our_only_keywords || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Our Keywords</p>
                  </div>
                </div>

                {/* Overlap Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Keyword Competition</span>
                    <span className={getOverlapColor(competitor.keyword_overlap_percent || 0)}>
                      {competitor.keyword_overlap_percent || 0}% overlap
                    </span>
                  </div>
                  <Progress value={competitor.keyword_overlap_percent || 0} className="h-2" />
                </div>

                {/* Content Gaps */}
                {competitor.content_gaps?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      Content Gaps (Topics they rank for, we don't)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {competitor.content_gaps.slice(0, 10).map((gap, j) => (
                        <Badge key={j} variant="outline" className="bg-purple-50">
                          {typeof gap === 'string' ? gap : gap.keyword || gap.topic}
                        </Badge>
                      ))}
                      {competitor.content_gaps.length > 10 && (
                        <Badge variant="outline">+{competitor.content_gaps.length - 10} more</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Winning Keywords */}
                {competitor.keywords_we_beat?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Keywords We're Winning
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {competitor.keywords_we_beat.slice(0, 8).map((kw, j) => (
                        <Badge key={j} variant="outline" className="bg-green-50">
                          {typeof kw === 'string' ? kw : kw.keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                {competitor.ai_insights && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      AI Strategic Insights
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {typeof competitor.ai_insights === 'string' 
                        ? competitor.ai_insights 
                        : competitor.ai_insights.summary || 'Analysis complete'}
                    </p>
                    {competitor.ai_insights.recommendations?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {competitor.ai_insights.recommendations.slice(0, 3).map((rec, j) => (
                          <li key={j} className="text-sm flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            {typeof rec === 'string' ? rec : rec.recommendation || rec.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Competitors Tracked</h3>
            <p className="text-muted-foreground mb-4">
              Add competitors to analyze their SEO strategies and find opportunities
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
