// src/components/signal/SignalABInsights.jsx
// Display Signal-powered A/B test insights and recommendations

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Sparkles,
  Target,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Zap,
  Brain,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { engageAiApi } from '@/lib/signal-api'

export default function SignalABInsights({ projectId, projectId }) {
  const [insights, setInsights] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [projectId])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      const res = await engageAiApi.analyzeTests({
        autoPromote: false
      })
      
      setInsights(res.results || [])
      setSuggestions(res.suggestions || [])
    } catch (error) {
      console.error('Failed to fetch A/B insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    await fetchInsights()
    setAnalyzing(false)
  }

  const handleAutoPromote = async (elementId) => {
    try {
      await engageAiApi.analyzeTests({
        elementId,
        autoPromote: true
      })
      await fetchInsights()
    } catch (error) {
      console.error('Failed to promote winner:', error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Analyzing A/B tests...
        </CardContent>
      </Card>
    )
  }

  const significantResults = insights.filter(i => i.isSignificant)
  const potentialWinners = insights.filter(i => i.confidence >= 90 && !i.promoted)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Signal A/B Test Intelligence
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered analysis and optimization recommendations
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={analyzing}>
          {analyzing ? 'Analyzing...' : 'Refresh Analysis'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{insights.length}</p>
                <p className="text-sm text-muted-foreground">Tests Analyzed</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{significantResults.length}</p>
                <p className="text-sm text-muted-foreground">Significant Winners</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{suggestions.length}</p>
                <p className="text-sm text-muted-foreground">AI Suggestions</p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Potential Winners - Ready to Promote */}
      {potentialWinners.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>{potentialWinners.length} test{potentialWinners.length > 1 ? 's have' : ' has'} clear winners</strong> ready to promote
          </AlertDescription>
        </Alert>
      )}

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Statistical analysis of your A/B tests (minimum 100 views required)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No active A/B tests with sufficient data to analyze
            </p>
          ) : (
            insights.map((insight) => (
              <motion.div
                key={`${insight.elementId}-${insight.variantId}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{insight.elementName}</h4>
                      {insight.isSignificant && (
                        <Badge variant="success" className="bg-green-100 text-green-700">
                          <Target className="h-3 w-3 mr-1" />
                          Winner Detected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {insight.variantName} vs Control
                    </p>

                    {/* Conversion Rates */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Control</p>
                        <p className="text-lg font-semibold">{insight.conversionRates.control}</p>
                        <p className="text-xs text-muted-foreground">{insight.sampleSize.control} views</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Variant</p>
                        <p className="text-lg font-semibold text-blue-600">{insight.conversionRates.variant}</p>
                        <p className="text-xs text-muted-foreground">{insight.sampleSize.variant} views</p>
                      </div>
                    </div>

                    {/* Lift & Confidence */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Lift</span>
                        <span className={`font-semibold ${insight.lift > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {insight.lift > 0 ? '+' : ''}{insight.lift.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-semibold">{insight.confidence.toFixed(1)}%</span>
                      </div>
                      <Progress value={insight.confidence} className="h-2" />
                    </div>
                  </div>

                  {insight.isSignificant && !insight.promoted && (
                    <Button
                      size="sm"
                      onClick={() => handleAutoPromote(insight.elementId)}
                      className="ml-4"
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Promote Winner
                    </Button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Optimization Suggestions
            </CardTitle>
            <CardDescription>
              Patterns learned from your winning variants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="rounded-full bg-purple-100 p-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{suggestion.recommendation}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
                    <span>Success Rate: {(suggestion.successRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
