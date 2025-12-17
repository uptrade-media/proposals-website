// src/components/seo/SEOLocalSeo.jsx
// Local SEO Analysis - GBP optimization, NAP consistency, citations
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  MapPin, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building2,
  Phone,
  Globe,
  Star,
  Map,
  FileText
} from 'lucide-react'

export default function SEOLocalSeo({ siteId }) {
  const { 
    localSeoAnalysis, 
    localSeoLoading, 
    fetchLocalSeoAnalysis,
    analyzeLocalSeo 
  } = useSeoStore()
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (siteId) {
      fetchLocalSeoAnalysis(siteId)
    }
  }, [siteId])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      await analyzeLocalSeo(siteId)
    } catch (error) {
      console.error('Local SEO analysis error:', error)
    }
    setIsAnalyzing(false)
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const analysis = localSeoAnalysis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Local SEO Analysis</h2>
          <p className="text-muted-foreground">
            Optimize for local search and Google Business Profile
          </p>
        </div>
        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing || localSeoLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      {analysis ? (
        <>
          {/* Overall Score */}
          {analysis.overallScore !== undefined && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-8">
                  <div className={`flex items-center justify-center w-28 h-28 rounded-full ${getScoreBg(analysis.overallScore)}`}>
                    <div className="text-center">
                      <span className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                        {analysis.overallScore}
                      </span>
                      <span className="text-sm text-muted-foreground block">/100</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Local SEO Health</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      {analysis.overallScore >= 80 
                        ? 'Your local SEO is in great shape!'
                        : analysis.overallScore >= 60
                        ? 'Good foundation, but room for improvement'
                        : 'Significant optimization needed for local visibility'
                      }
                    </p>
                    <Progress value={analysis.overallScore} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Scores Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ScoreCard
              icon={Building2}
              title="GBP Optimization"
              score={analysis.gbpScore}
              details={analysis.gbpDetails}
            />
            <ScoreCard
              icon={FileText}
              title="NAP Consistency"
              score={analysis.napScore}
              details={analysis.napDetails}
            />
            <ScoreCard
              icon={Globe}
              title="Citations"
              score={analysis.citationsScore}
              details={analysis.citationsDetails}
            />
            <ScoreCard
              icon={Map}
              title="Service Areas"
              score={analysis.serviceAreaScore}
              details={analysis.serviceAreaDetails}
            />
          </div>

          {/* GBP Optimization */}
          {analysis.gbpOptimization && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Google Business Profile
                </CardTitle>
                <CardDescription>
                  Optimization recommendations for your GBP listing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.gbpOptimization.recommendations?.map((rec, i) => (
                    <div 
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        rec.status === 'good' ? 'bg-green-50' :
                        rec.status === 'warning' ? 'bg-yellow-50' : 'bg-red-50'
                      }`}
                    >
                      {rec.status === 'good' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : rec.status === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{rec.title}</p>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* NAP Consistency */}
          {analysis.napConsistency && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  NAP Consistency
                </CardTitle>
                <CardDescription>
                  Name, Address, Phone consistency across the web
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{analysis.napConsistency.consistentCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Consistent</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {analysis.napConsistency.inconsistentCount || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Inconsistent</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{analysis.napConsistency.totalChecked || 0}</p>
                    <p className="text-sm text-muted-foreground">Sources Checked</p>
                  </div>
                </div>

                {analysis.napConsistency.issues?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Issues Found:</h4>
                    {analysis.napConsistency.issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span>{issue.source}: {issue.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Service Areas */}
          {analysis.serviceAreas && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Service Area Coverage
                </CardTitle>
                <CardDescription>
                  Local content coverage for target service areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.serviceAreas.map((area, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className={`h-5 w-5 ${area.hasLandingPage ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-medium">{area.name}</p>
                          <p className="text-sm text-muted-foreground">{area.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {area.hasLandingPage ? (
                          <Badge variant="outline" className="bg-green-50">Has Page</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50">Needs Page</Badge>
                        )}
                        {area.rankingPosition && (
                          <span className="text-sm text-muted-foreground">
                            Rank: #{area.rankingPosition}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI Local SEO Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{rec.title}</h4>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      {rec.action && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <strong>Action:</strong> {rec.action}
                        </div>
                      )}
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
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Local SEO Analysis</h3>
            <p className="text-muted-foreground mb-4">
              Analyze your local search presence and optimization opportunities
            </p>
            <Button onClick={handleAnalyze}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper component for score cards
function ScoreCard({ icon: Icon, title, score, details }) {
  const getColor = (s) => {
    if (s >= 80) return 'text-green-600'
    if (s >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBg = (s) => {
    if (s >= 80) return 'bg-green-50 border-green-200'
    if (s >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <Card className={score !== undefined ? getBg(score) : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-medium">{title}</h4>
        </div>
        {score !== undefined ? (
          <>
            <p className={`text-3xl font-bold ${getColor(score)}`}>{score}</p>
            {details && (
              <p className="text-sm text-muted-foreground mt-1">{details}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Not analyzed</p>
        )}
      </CardContent>
    </Card>
  )
}
