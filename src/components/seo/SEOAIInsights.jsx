// src/components/seo/SEOAIInsights.jsx
// AI-powered SEO insights and recommendations
// Shows training status, knowledge base, and actionable recommendations
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Brain,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Wand2,
  RefreshCw,
  Target,
  FileText,
  Link2,
  Code,
  TrendingUp,
  ChevronRight,
  Play,
  Zap,
  BookOpen,
  Building2,
  MapPin,
  Users,
  Tag
} from 'lucide-react'
import { useSeoStore, selectPendingRecommendations, selectHighImpactRecommendations, selectAutoFixableRecommendations } from '@/lib/seo-store'

export default function SEOAIInsights({ site, onSelectPage }) {
  const {
    aiRecommendations,
    aiRecommendationsLoading,
    aiRecommendationsError,
    siteKnowledge,
    siteKnowledgeLoading,
    aiTrainingStatus,
    aiAnalysisInProgress,
    trainSite,
    fetchSiteKnowledge,
    runAiBrain,
    fetchAiRecommendations,
    applyRecommendation,
    applyRecommendations,
    dismissRecommendation
  } = useSeoStore()

  const [activeTab, setActiveTab] = useState('recommendations')
  const [applying, setApplying] = useState({})
  const [batchApplying, setBatchApplying] = useState(false)

  // Fetch knowledge and recommendations on mount
  useEffect(() => {
    if (site?.id) {
      fetchSiteKnowledge(site.id)
      fetchAiRecommendations(site.id)
    }
  }, [site?.id])

  // Derived data
  const pendingRecs = aiRecommendations.filter(r => r.status === 'pending')
  const highImpactRecs = pendingRecs.filter(r => r.impact === 'high' || r.impact === 'critical')
  const autoFixableRecs = pendingRecs.filter(r => r.auto_fixable)

  const handleTrainSite = async () => {
    try {
      await trainSite(site.id)
    } catch (error) {
      console.error('Training failed:', error)
    }
  }

  const handleRunAnalysis = async () => {
    try {
      await runAiBrain(site.id, { analysisType: 'comprehensive' })
    } catch (error) {
      console.error('Analysis failed:', error)
    }
  }

  const handleApply = async (recId) => {
    setApplying(prev => ({ ...prev, [recId]: true }))
    try {
      await applyRecommendation(recId)
    } catch (error) {
      console.error('Apply failed:', error)
    } finally {
      setApplying(prev => ({ ...prev, [recId]: false }))
    }
  }

  const handleDismiss = async (recId) => {
    try {
      await dismissRecommendation(recId)
    } catch (error) {
      console.error('Dismiss failed:', error)
    }
  }

  const handleBatchApply = async () => {
    const autoFixIds = autoFixableRecs.map(r => r.id)
    if (autoFixIds.length === 0) return
    
    setBatchApplying(true)
    try {
      await applyRecommendations(autoFixIds)
    } catch (error) {
      console.error('Batch apply failed:', error)
    } finally {
      setBatchApplying(false)
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'title':
      case 'meta':
        return <FileText className="h-4 w-4" />
      case 'content':
        return <BookOpen className="h-4 w-4" />
      case 'schema':
        return <Code className="h-4 w-4" />
      case 'internal_link':
        return <Link2 className="h-4 w-4" />
      case 'keyword':
        return <Target className="h-4 w-4" />
      case 'technical':
        return <Wand2 className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  // Training required state
  if (!siteKnowledge && aiTrainingStatus !== 'training') {
    return (
      <Card className="border-dashed border-[var(--accent-primary)]/30">
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-[var(--accent-primary)]" />
          <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
            Train AI on Your Website
          </h3>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Before the AI can provide intelligent recommendations, it needs to learn about your business, 
            services, and content by analyzing your website.
          </p>
          <Button 
            onClick={handleTrainSite} 
            disabled={siteKnowledgeLoading}
            className="bg-gradient-to-r from-[var(--accent-primary)] to-purple-500"
          >
            {siteKnowledgeLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Training in Progress...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Start AI Training
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Training in progress
  if (aiTrainingStatus === 'training') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="relative">
            <Brain className="h-12 w-12 mx-auto mb-4 text-[var(--accent-primary)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
            AI Training in Progress
          </h3>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto">
            Analyzing your website content, services, locations, and competitive positioning. 
            This may take a few minutes...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--accent-primary)]/20 to-purple-500/20">
            <Brain className="h-6 w-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">AI SEO Brain</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Intelligent recommendations powered by your business context
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {autoFixableRecs.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBatchApply}
              disabled={batchApplying}
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              {batchApplying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Auto-Fix {autoFixableRecs.length} Issues
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRunAnalysis}
            disabled={aiAnalysisInProgress}
          >
            {aiAnalysisInProgress ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-analyze
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[var(--bg-secondary)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Pending</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{pendingRecs.length}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-yellow-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">High Impact</p>
                <p className="text-2xl font-bold text-orange-400">{highImpactRecs.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Auto-Fixable</p>
                <p className="text-2xl font-bold text-green-400">{autoFixableRecs.length}</p>
              </div>
              <Wand2 className="h-8 w-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--bg-secondary)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Applied</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {aiRecommendations.filter(r => r.status === 'applied').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[var(--bg-secondary)]">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          {aiRecommendationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
            </div>
          ) : pendingRecs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">All Caught Up!</h3>
                <p className="text-[var(--text-secondary)]">
                  No pending recommendations. Run a new analysis to find more opportunities.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRecs.map(rec => (
                <Card key={rec.id} className="bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-[var(--bg-primary)]">
                          {getCategoryIcon(rec.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-[var(--text-primary)] truncate">
                              {rec.title}
                            </h4>
                            <Badge className={getImpactColor(rec.impact)}>
                              {rec.impact}
                            </Badge>
                            {rec.auto_fixable && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <Wand2 className="h-3 w-3 mr-1" />
                                Auto-fix
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                            {rec.description}
                          </p>
                          {rec.page && (
                            <button 
                              onClick={() => onSelectPage?.(rec.page.id)}
                              className="text-xs text-[var(--accent-primary)] hover:underline mt-1 flex items-center gap-1"
                            >
                              {rec.page.url.replace(/^https?:\/\/[^/]+/, '')}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                          {rec.suggested_value && (
                            <div className="mt-2 p-2 rounded bg-[var(--bg-primary)] text-xs">
                              <span className="text-[var(--text-tertiary)]">Suggested: </span>
                              <span className="text-[var(--text-secondary)]">
                                {(() => {
                                  if (typeof rec.suggested_value === 'string') {
                                    return rec.suggested_value.length > 100 
                                      ? rec.suggested_value.substring(0, 100) + '...'
                                      : rec.suggested_value
                                  } else if (Array.isArray(rec.suggested_value)) {
                                    // Handle arrays (e.g., keywords array)
                                    return rec.suggested_value
                                      .map(item => typeof item === 'object' ? item.name || item.keyword || JSON.stringify(item) : String(item))
                                      .join(', ')
                                      .substring(0, 100) + (rec.suggested_value.length > 3 ? '...' : '')
                                  } else {
                                    // Handle objects
                                    const str = JSON.stringify(rec.suggested_value)
                                    return str.length > 100 ? str.substring(0, 100) + '...' : str
                                  }
                                })()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismiss(rec.id)}
                          className="text-[var(--text-tertiary)] hover:text-red-400"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApply(rec.id)}
                          disabled={applying[rec.id]}
                          className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90"
                        >
                          {applying[rec.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Apply
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-4 mt-4">
          {siteKnowledge ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Business Info */}
              <Card className="bg-[var(--bg-secondary)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Business Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Business Name</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {siteKnowledge.business_name || 'Not detected'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Industry</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {siteKnowledge.industry || 'Not detected'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Target Audience</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {siteKnowledge.target_audience || 'Not detected'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Services */}
              <Card className="bg-[var(--bg-secondary)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {siteKnowledge.services?.slice(0, 8).map((service, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {siteKnowledge.services?.length > 8 && (
                      <Badge variant="outline" className="text-xs text-[var(--text-tertiary)]">
                        +{siteKnowledge.services.length - 8} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Locations */}
              <Card className="bg-[var(--bg-secondary)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Service Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {siteKnowledge.service_areas?.slice(0, 6).map((area, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                    {siteKnowledge.service_areas?.length > 6 && (
                      <Badge variant="outline" className="text-xs text-[var(--text-tertiary)]">
                        +{siteKnowledge.service_areas.length - 6} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* USPs */}
              <Card className="bg-[var(--bg-secondary)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Unique Selling Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {siteKnowledge.unique_selling_points?.slice(0, 4).map((usp, i) => (
                      <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-400 mt-1 shrink-0" />
                        {usp}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Training Status */}
              <Card className="bg-[var(--bg-secondary)] col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          AI Trained Successfully
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Last updated: {new Date(siteKnowledge.updated_at).toLocaleDateString()}
                          {' • '}{siteKnowledge.pages_analyzed || 0} pages analyzed
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleTrainSite}
                      disabled={siteKnowledgeLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-train
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 mx-auto mb-4 text-[var(--text-tertiary)]" />
                <p className="text-[var(--text-secondary)]">
                  No knowledge base found. Train the AI to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
