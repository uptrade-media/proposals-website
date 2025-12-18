// src/pages/client/ClientSEODashboard.jsx
// Read-only SEO dashboard for tenants (clients)
// Shows performance metrics, top keywords, wins, and recommendations
// AI features are gated behind feature flag

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Eye, 
  MousePointer,
  Target,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileText,
  Sparkles,
  Crown,
  Lock
} from 'lucide-react'
import axios from 'axios'
import useAuthStore from '@/lib/auth-store'
import Navigation from '@/pages/Navigation'

// Simple line chart component for trends
function TrendChart({ data, color = 'blue' }) {
  if (!data || data.length === 0) return null
  
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((val - min) / range) * 100
    return `${x},${y}`
  }).join(' ')
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={`var(--${color})`}
        strokeWidth="2"
        points={points}
      />
    </svg>
  )
}

// Metric card with trend
function MetricCard({ title, value, previousValue, suffix = '', icon: Icon, loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    )
  }
  
  const change = previousValue ? ((value - previousValue) / previousValue * 100) : 0
  const isPositive = change > 0
  const isNeutral = Math.abs(change) < 1
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </div>
        {previousValue !== undefined && (
          <p className={`text-xs flex items-center gap-1 ${
            isNeutral ? 'text-muted-foreground' : 
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isNeutral ? <Minus className="h-3 w-3" /> : 
              isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}% vs last period
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function ClientSEODashboard() {
  const { user, currentOrg } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [topKeywords, setTopKeywords] = useState([])
  const [topPages, setTopPages] = useState([])
  const [recentWins, setRecentWins] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [aiEnabled, setAiEnabled] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    loadDashboardData()
  }, [currentOrg])
  
  async function loadDashboardData() {
    if (!currentOrg?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Fetch all data in parallel
      const [overviewRes, keywordsRes, pagesRes, winsRes, recsRes, featuresRes] = await Promise.all([
        axios.get(`/api/seo/client/overview`),
        axios.get(`/api/seo/client/keywords?limit=10`),
        axios.get(`/api/seo/client/pages?limit=10&sortBy=clicks`),
        axios.get(`/api/seo/client/wins?limit=5`),
        axios.get(`/api/seo/client/recommendations?status=pending&limit=10`),
        axios.get(`/api/seo/client/features`)
      ])
      
      setOverview(overviewRes.data)
      setTopKeywords(keywordsRes.data.keywords || [])
      setTopPages(pagesRes.data.pages || [])
      setRecentWins(winsRes.data.wins || [])
      setRecommendations(recsRes.data.recommendations || [])
      setAiEnabled(featuresRes.data.aiEnabled || false)
    } catch (err) {
      console.error('Failed to load SEO data:', err)
      setError('Failed to load SEO data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }
  
  // Position change indicator
  function PositionChange({ current, previous }) {
    if (!previous) return <span className="text-muted-foreground">—</span>
    const change = previous - current // Lower is better for position
    if (Math.abs(change) < 0.5) return <span className="text-muted-foreground">—</span>
    if (change > 0) return <span className="text-green-600 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />+{change.toFixed(0)}</span>
    return <span className="text-red-600 flex items-center gap-1"><ArrowDownRight className="h-3 w-3" />{change.toFixed(0)}</span>
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SEO Performance</h1>
            <p className="text-muted-foreground">
              Your website's search engine optimization metrics
            </p>
          </div>
          {aiEnabled && (
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI Insights Enabled
            </Badge>
          )}
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Clicks (28d)"
            value={overview?.clicks_28d || 0}
            previousValue={overview?.clicks_prev_28d}
            icon={MousePointer}
            loading={loading}
          />
          <MetricCard
            title="Impressions (28d)"
            value={overview?.impressions_28d || 0}
            previousValue={overview?.impressions_prev_28d}
            icon={Eye}
            loading={loading}
          />
          <MetricCard
            title="Avg. Position"
            value={overview?.avg_position?.toFixed(1) || '—'}
            previousValue={overview?.avg_position_prev}
            icon={Target}
            loading={loading}
          />
          <MetricCard
            title="CTR"
            value={overview?.ctr ? (overview.ctr * 100).toFixed(1) : '—'}
            suffix="%"
            previousValue={overview?.ctr_prev ? overview.ctr_prev * 100 : undefined}
            icon={TrendingUp}
            loading={loading}
          />
        </div>
        
        {/* Tabs for different sections */}
        <Tabs defaultValue="keywords" className="space-y-4">
          <TabsList>
            <TabsTrigger value="keywords">Top Keywords</TabsTrigger>
            <TabsTrigger value="pages">Top Pages</TabsTrigger>
            <TabsTrigger value="wins">Recent Wins</TabsTrigger>
            <TabsTrigger value="recommendations">
              Recommendations
              {recommendations.length > 0 && (
                <Badge variant="secondary" className="ml-2">{recommendations.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Top Keywords */}
          <TabsContent value="keywords">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Top Keywords
                </CardTitle>
                <CardDescription>
                  Your best performing search queries in the last 28 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : topKeywords.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No keyword data available yet. Check back once Google Search Console is connected.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground border-b pb-2">
                      <div className="col-span-5">Keyword</div>
                      <div className="col-span-2 text-right">Clicks</div>
                      <div className="col-span-2 text-right">Impressions</div>
                      <div className="col-span-2 text-right">Position</div>
                      <div className="col-span-1 text-right">Trend</div>
                    </div>
                    {topKeywords.map((kw, i) => (
                      <div key={i} className="grid grid-cols-12 gap-4 py-2 border-b last:border-0">
                        <div className="col-span-5 font-medium truncate" title={kw.query}>
                          {kw.query}
                        </div>
                        <div className="col-span-2 text-right">{kw.clicks?.toLocaleString()}</div>
                        <div className="col-span-2 text-right">{kw.impressions?.toLocaleString()}</div>
                        <div className="col-span-2 text-right">{kw.position?.toFixed(1)}</div>
                        <div className="col-span-1 text-right">
                          <PositionChange current={kw.position} previous={kw.position_prev} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Top Pages */}
          <TabsContent value="pages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Top Pages
                </CardTitle>
                <CardDescription>
                  Your best performing pages by clicks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : topPages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No page data available yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground border-b pb-2">
                      <div className="col-span-6">Page</div>
                      <div className="col-span-2 text-right">Clicks</div>
                      <div className="col-span-2 text-right">Impressions</div>
                      <div className="col-span-2 text-right">CTR</div>
                    </div>
                    {topPages.map((page, i) => (
                      <div key={i} className="grid grid-cols-12 gap-4 py-2 border-b last:border-0">
                        <div className="col-span-6 font-medium truncate" title={page.url}>
                          {page.url?.replace(/^https?:\/\/[^/]+/, '') || page.path}
                        </div>
                        <div className="col-span-2 text-right">{page.clicks?.toLocaleString()}</div>
                        <div className="col-span-2 text-right">{page.impressions?.toLocaleString()}</div>
                        <div className="col-span-2 text-right">{(page.ctr * 100).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Recent Wins */}
          <TabsContent value="wins">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Recent SEO Wins
                </CardTitle>
                <CardDescription>
                  Improvements we've achieved for your site
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : recentWins.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    We're working on improvements! Check back soon to see your wins.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentWins.map((win, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{win.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{win.description}</p>
                          {win.impact && (
                            <Badge variant="secondary" className="mt-2">
                              {win.impact}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(win.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Recommendations */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Recommendations
                  {!aiEnabled && <Lock className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
                <CardDescription>
                  {aiEnabled 
                    ? "AI-powered suggestions to improve your rankings"
                    : "Upgrade to AI Insights to unlock personalized recommendations"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!aiEnabled ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                      <Crown className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Unlock AI-Powered SEO Insights</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Get personalized recommendations powered by AI that analyzes your specific site, 
                      competitors, and industry to find the best opportunities for growth.
                    </p>
                    <Button>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Learn About AI Insights
                    </Button>
                  </div>
                ) : loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : recommendations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No pending recommendations. Your site is looking great!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={
                                rec.priority === 'critical' ? 'destructive' :
                                rec.priority === 'high' ? 'default' : 'secondary'
                              }>
                                {rec.priority}
                              </Badge>
                              <Badge variant="outline">{rec.category}</Badge>
                            </div>
                            <p className="font-medium">{rec.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            <Clock className="h-3 w-3 mr-1" />
                            {rec.effort}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Monthly Report CTA */}
        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <h3 className="font-semibold">Monthly SEO Reports</h3>
              <p className="text-sm text-muted-foreground">
                Receive detailed monthly performance reports via email
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Reports Enabled
            </Badge>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
