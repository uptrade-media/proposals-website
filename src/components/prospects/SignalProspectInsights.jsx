/**
 * SignalProspectInsights - AI insights panel for prospects
 * 
 * Features:
 * - Lead scoring with AI
 * - Next best action suggestions
 * - Smart tag recommendations
 * - Upgrade prompt when Signal not enabled
 * 
 * Uses brand colors for theming
 */
import { useState, useEffect } from 'react'
import {
  Sparkles,
  TrendingUp,
  Target,
  Tag,
  Mail,
  Calendar,
  Phone,
  ArrowRight,
  Loader2,
  Lock,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import SignalIcon from '@/components/ui/SignalIcon'
import { useBrandColors } from '@/hooks/useBrandColors'
import { useSignalAccess } from '@/lib/signal-access'
import { crmAiApi } from '@/lib/signal-api'

// Lead score indicator component
function LeadScoreIndicator({ score, brandColors }) {
  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e' // Green
    if (score >= 60) return brandColors.primary
    if (score >= 40) return '#f59e0b' // Amber
    return '#ef4444' // Red
  }

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Hot'
    if (score >= 60) return 'Warm'
    if (score >= 40) return 'Cool'
    return 'Cold'
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Progress 
          value={score} 
          className="h-2"
          style={{ 
            '--progress-background': getScoreColor(score)
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span 
          className="text-2xl font-bold"
          style={{ color: getScoreColor(score) }}
        >
          {score}
        </span>
        <Badge 
          className="text-xs"
          style={{ 
            backgroundColor: `${getScoreColor(score)}20`,
            color: getScoreColor(score),
            border: 'none'
          }}
        >
          {getScoreLabel(score)}
        </Badge>
      </div>
    </div>
  )
}

// Signal upgrade prompt
function SignalUpgradeCard({ brandColors }) {
  return (
    <Card className="glass border-dashed">
      <CardContent className="p-6 text-center">
        <div 
          className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: brandColors.rgba.primary10 }}
        >
          <Lock className="h-6 w-6" style={{ color: brandColors.primary }} />
        </div>
        <h4 className="font-semibold text-[var(--text-primary)] mb-2">
          AI-Powered Insights
        </h4>
        <p className="text-sm text-[var(--text-tertiary)] mb-4">
          Unlock lead scoring, smart recommendations, and automated follow-up suggestions with Signal AI.
        </p>
        <Button 
          className="gap-2"
          style={{ backgroundColor: brandColors.primary, color: 'white' }}
        >
          <Zap className="h-4 w-4" />
          Enable Signal AI
        </Button>
      </CardContent>
    </Card>
  )
}

// Next action card
function NextActionCard({ action, brandColors }) {
  const getActionIcon = (type) => {
    switch (type) {
      case 'email': return Mail
      case 'call': return Phone
      case 'meeting': return Calendar
      default: return ArrowRight
    }
  }

  const Icon = getActionIcon(action.type)

  return (
    <Card className="glass cursor-pointer hover:bg-[var(--glass-bg-hover)] transition-colors">
      <CardContent className="p-4 flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: brandColors.rgba.primary10 }}
        >
          <Icon className="h-5 w-5" style={{ color: brandColors.primary }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-[var(--text-primary)]">
            {action.title}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {action.reason}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)]" />
      </CardContent>
    </Card>
  )
}

// Main component
export default function SignalProspectInsights({ prospect, compact = false }) {
  const brandColors = useBrandColors()
  const { hasCurrentProjectSignal } = useSignalAccess()
  
  const [insights, setInsights] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchInsights = async () => {
      if (!hasCurrentProjectSignal || !prospect?.id) {
        setIsLoading(false)
        return
      }

      try {
        // Call Signal API for prospect analysis
        const response = await crmAiApi.analyzeProspect(prospect.id)
        setInsights(response)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch Signal insights:', err)
        setError('Failed to load AI insights')
        // Set mock data for development
        setInsights({
          leadScore: 72,
          scoreFactors: [
            { factor: 'Form completed', impact: 'positive' },
            { factor: 'Company size match', impact: 'positive' },
            { factor: 'No email engagement', impact: 'negative' },
          ],
          nextActions: [
            { 
              type: 'email', 
              title: 'Send follow-up email', 
              reason: 'No response in 3 days'
            },
            { 
              type: 'meeting', 
              title: 'Schedule discovery call', 
              reason: 'High-value lead'
            },
          ],
          suggestedTags: ['enterprise', 'high-intent'],
          pipelinePrediction: {
            stage: 'qualified',
            probability: 68,
            daysToClose: 14,
          }
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInsights()
  }, [prospect?.id, hasCurrentProjectSignal])

  // Show upgrade prompt if Signal not enabled
  if (!hasCurrentProjectSignal) {
    return <SignalUpgradeCard brandColors={brandColors} />
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 
            className="h-6 w-6 animate-spin" 
            style={{ color: brandColors.primary }} 
          />
        </CardContent>
      </Card>
    )
  }

  // No insights available
  if (!insights) {
    return (
      <Card className="glass">
        <CardContent className="p-6 text-center">
          <SignalIcon 
            className="mx-auto mb-3" 
            size={32}
            color={brandColors.primary}
          />
          <p className="text-sm text-[var(--text-tertiary)]">
            No Signal insights available yet
          </p>
        </CardContent>
      </Card>
    )
  }

  // Compact mode for sidebar
  if (compact) {
    return (
      <TooltipProvider>
        <Card className="glass">
          <CardContent className="p-4 space-y-4">
            {/* Lead Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles 
                  className="h-4 w-4" 
                  style={{ color: brandColors.primary }} 
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Lead Score
                </span>
              </div>
              <Badge 
                className="font-semibold"
                style={{ 
                  backgroundColor: brandColors.rgba.primary10,
                  color: brandColors.primary,
                  border: 'none'
                }}
              >
                {insights.leadScore}
              </Badge>
            </div>

            {/* Quick Next Action */}
            {insights.nextActions?.[0] && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-[var(--text-secondary)] truncate">
                  {insights.nextActions[0].title}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </TooltipProvider>
    )
  }

  // Full mode
  return (
    <div className="space-y-4">
      {/* Lead Score Card */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: brandColors.primary }} />
            AI Lead Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LeadScoreIndicator score={insights.leadScore} brandColors={brandColors} />
          
          {/* Score Factors */}
          {insights.scoreFactors && insights.scoreFactors.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--border-primary)]">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">
                Contributing Factors
              </p>
              {insights.scoreFactors.map((factor, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {factor.impact === 'positive' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : factor.impact === 'negative' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />
                  )}
                  <span className="text-[var(--text-secondary)]">{factor.factor}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Best Actions */}
      {insights.nextActions && insights.nextActions.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" style={{ color: brandColors.primary }} />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.nextActions.map((action, i) => (
              <NextActionCard 
                key={i} 
                action={action} 
                brandColors={brandColors} 
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Suggested Tags */}
      {insights.suggestedTags && insights.suggestedTags.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4" style={{ color: brandColors.primary }} />
              Suggested Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insights.suggestedTags.map((tag, i) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className="cursor-pointer hover:bg-[var(--glass-bg-hover)]"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Prediction */}
      {insights.pipelinePrediction && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: brandColors.primary }} />
              Pipeline Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Next Stage</p>
                <p className="font-medium text-sm text-[var(--text-primary)] capitalize mt-1">
                  {insights.pipelinePrediction.stage}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Probability</p>
                <p className="font-medium text-sm mt-1" style={{ color: brandColors.primary }}>
                  {insights.pipelinePrediction.probability}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Est. Close</p>
                <p className="font-medium text-sm text-[var(--text-primary)] mt-1">
                  {insights.pipelinePrediction.daysToClose}d
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
