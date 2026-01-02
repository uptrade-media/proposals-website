// src/components/signal/SignalEngagementInsights.jsx
// Display Signal-powered engagement insights and recommendations

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Smartphone,
  Monitor,
  Zap,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

export default function SignalEngagementInsights({ projectId }) {
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [dateRange, setDateRange] = useState(30)

  useEffect(() => {
    fetchInsights()
  }, [projectId, dateRange])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      const res = await api.post('/.netlify/functions/signal-analyze-engagement', {
        projectId,
        dateRange
      })
      
      setInsights(res.data.insights || [])
    } catch (error) {
      console.error('Failed to fetch engagement insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    await fetchInsights()
    setAnalyzing(false)
  }

  const getInsightIcon = (type) => {
    switch (type) {
      case 'trigger_performance':
      case 'trigger_recommendation':
        return <Zap className="h-5 w-5" />
      case 'device_behavior':
      case 'device_conversion':
        return <Smartphone className="h-5 w-5" />
      case 'timing_optimization':
        return <Clock className="h-5 w-5" />
      default:
        return <Lightbulb className="h-5 w-5" />
    }
  }

  const getImpactColor = (impact) => {
    if (impact >= 0.7) return 'text-red-500'
    if (impact >= 0.5) return 'text-orange-500'
    return 'text-yellow-500'
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          Analyzing engagement patterns...
        </CardContent>
      </Card>
    )
  }

  const highImpact = insights.filter(i => i.impact >= 0.6)
  const mediumImpact = insights.filter(i => i.impact >= 0.4 && i.impact < 0.6)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Signal Engagement Intelligence
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered insights from your visitor behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-1.5 border rounded-md text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button onClick={handleAnalyze} disabled={analyzing} size="sm">
            <RefreshCw className={cn("h-4 w-4 mr-1", analyzing && "animate-spin")} />
            {analyzing ? 'Analyzing' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {insights.length > 0 && (
        <Alert className="border-purple-200 bg-purple-50">
          <Brain className="h-4 w-4 text-purple-600" />
          <AlertDescription>
            <strong>Signal identified {insights.length} optimization opportunities</strong>
            {highImpact.length > 0 && ` including ${highImpact.length} high-impact recommendation${highImpact.length > 1 ? 's' : ''}`}
          </AlertDescription>
        </Alert>
      )}

      {/* High Impact Insights */}
      {highImpact.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              High Impact Opportunities
            </CardTitle>
            <CardDescription>
              These changes could significantly improve your conversion rates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {highImpact.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} priority="high" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Insights */}
      <Card>
        <CardHeader>
          <CardTitle>All Insights</CardTitle>
          <CardDescription>
            Patterns detected from {dateRange} days of data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Not enough data yet. Check back after you have more traffic.
            </p>
          ) : (
            insights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InsightCard({ insight, priority }) {
  const getIcon = (type) => {
    switch (type) {
      case 'trigger_performance':
      case 'trigger_recommendation':
        return <Zap className="h-4 w-4" />
      case 'device_behavior':
      case 'device_conversion':
        return <Smartphone className="h-4 w-4" />
      case 'timing_optimization':
        return <Clock className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const getImpactBadge = () => {
    if (insight.impact >= 0.7) {
      return <Badge variant="destructive">High Impact</Badge>
    }
    if (insight.impact >= 0.5) {
      return <Badge className="bg-orange-100 text-orange-700">Medium Impact</Badge>
    }
    return <Badge variant="outline">Low Impact</Badge>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-lg p-4",
        priority === 'high' && "border-orange-300 bg-orange-50/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "rounded-full p-2",
          priority === 'high' ? "bg-orange-100" : "bg-purple-100"
        )}>
          {getIcon(insight.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold">{insight.message}</h4>
            {getImpactBadge()}
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            {insight.recommendation}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Confidence:</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full",
                      insight.confidence >= 0.8 ? "bg-green-500" : "bg-yellow-500"
                    )}
                    style={{ width: `${insight.confidence * 100}%` }}
                  />
                </div>
                <span>{(insight.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            {insight.data && (
              <div className="flex items-center gap-2">
                {Object.entries(insight.data).slice(0, 2).map(([key, value]) => (
                  <span key={key} className="flex items-center gap-1">
                    <span className="font-medium">{key}:</span>
                    <span>{value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button size="sm" variant="ghost">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
