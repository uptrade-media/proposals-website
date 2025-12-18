// src/components/seo/SEOQuickWins.jsx
// Top 3 one-click fixes with estimated impact
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Zap,
  CheckCircle,
  Loader2,
  TrendingUp,
  FileText,
  Code,
  Link2,
  Target,
  ArrowRight,
  Sparkles,
  Play
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSeoStore } from '@/lib/seo-store'

/**
 * SEOQuickWins - Actionable one-click fixes
 * Shows highest-impact fixes that can be done immediately
 */
export default function SEOQuickWins({ site, onViewAll }) {
  const { 
    aiRecommendations,
    applyRecommendation,
    applyRecommendations,
    opportunities
  } = useSeoStore()

  const [applying, setApplying] = useState({})
  const [applyingAll, setApplyingAll] = useState(false)

  // Get auto-fixable, high-impact recommendations
  const quickWins = [
    ...aiRecommendations
      .filter(r => r.status === 'pending' && r.auto_fixable)
      .map(r => ({
        id: r.id,
        type: 'recommendation',
        title: r.title,
        description: r.description,
        category: r.category,
        impact: r.impact,
        impactEstimate: r.impact_estimate || '+5-15% traffic'
      })),
    ...opportunities
      .filter(o => o.status === 'open' && o.auto_fixable)
      .map(o => ({
        id: o.id,
        type: 'opportunity',
        title: o.title,
        description: o.description,
        category: o.type,
        impact: o.priority,
        impactEstimate: o.impact_estimate || '+3-10% clicks'
      }))
  ]
    .sort((a, b) => {
      const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return (impactOrder[a.impact] || 3) - (impactOrder[b.impact] || 3)
    })
    .slice(0, 3)

  const handleApply = async (item) => {
    setApplying(prev => ({ ...prev, [item.id]: true }))
    try {
      if (item.type === 'recommendation') {
        await applyRecommendation(item.id)
      }
      // For opportunities, we'd call a different function
    } catch (error) {
      console.error('Failed to apply:', error)
    } finally {
      setApplying(prev => ({ ...prev, [item.id]: false }))
    }
  }

  const handleApplyAll = async () => {
    setApplyingAll(true)
    try {
      const recIds = quickWins.filter(w => w.type === 'recommendation').map(w => w.id)
      if (recIds.length > 0) {
        await applyRecommendations(site.id, recIds)
      }
    } catch (error) {
      console.error('Failed to apply all:', error)
    } finally {
      setApplyingAll(false)
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'metadata': return FileText
      case 'schema': return Code
      case 'internal_links': return Link2
      case 'content': return FileText
      default: return Target
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

  if (quickWins.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" />
          <p className="text-lg font-medium text-[var(--text-primary)]">All Caught Up!</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            No quick wins available. Your site is in great shape.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            Quick Wins
            <Badge variant="outline" className="text-xs ml-2">
              {quickWins.length} available
            </Badge>
          </CardTitle>
          {quickWins.length > 1 && (
            <Button 
              size="sm"
              onClick={handleApplyAll}
              disabled={applyingAll}
              className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
            >
              {applyingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Fix All ({quickWins.length})
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quickWins.map((win, index) => {
            const Icon = getCategoryIcon(win.category)
            const isApplying = applying[win.id]
            
            return (
              <div 
                key={win.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg transition-all',
                  'bg-[var(--glass-bg)] hover:bg-[var(--surface-elevated)]',
                  isApplying && 'opacity-50'
                )}
              >
                {/* Number & Icon */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[var(--glass-bg)] flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">
                    {win.title}
                  </p>
                  <p className="text-sm text-[var(--text-tertiary)] truncate">
                    {win.description}
                  </p>
                </div>

                {/* Impact */}
                <div className="text-right">
                  <Badge className={getImpactColor(win.impact)}>
                    {win.impact}
                  </Badge>
                  <p className="text-xs text-green-400 mt-1 flex items-center justify-end gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {win.impactEstimate}
                  </p>
                </div>

                {/* Action */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApply(win)}
                  disabled={isApplying}
                  className="shrink-0"
                >
                  {isApplying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Fix
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        {/* View All Link */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-3"
          onClick={onViewAll}
        >
          View all recommendations
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
