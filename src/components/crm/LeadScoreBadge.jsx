// src/components/crm/LeadScoreBadge.jsx
// Visual lead score indicator with breakdown tooltip

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Phone, Mail, Globe, Zap, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Score color thresholds
function getScoreColor(score) {
  if (score >= 80) return 'bg-green-500 text-white'
  if (score >= 60) return 'bg-yellow-500 text-black'
  if (score >= 40) return 'bg-orange-500 text-white'
  return 'bg-gray-400 text-white'
}

function getScoreLabel(score) {
  if (score >= 80) return 'Hot'
  if (score >= 60) return 'Warm'
  if (score >= 40) return 'Cool'
  return 'Cold'
}

function getTrendIcon(trend) {
  if (trend === 'rising') return <TrendingUp className="h-3 w-3 text-green-500" />
  if (trend === 'falling') return <TrendingDown className="h-3 w-3 text-red-500" />
  return <Minus className="h-3 w-3 text-gray-400" />
}

// Score breakdown bar
function ScoreBar({ label, value, maxValue = 25, icon: Icon, color }) {
  const percentage = Math.min(100, (value / maxValue) * 100)
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={cn("h-3 w-3", color)} />
      <span className="w-16 text-gray-600">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", color.replace('text-', 'bg-'))}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-6 text-right text-gray-500">{value}</span>
    </div>
  )
}

export default function LeadScoreBadge({ 
  score = 0, 
  trend = 'stable',
  breakdown = null,
  size = 'md',
  showLabel = true,
  className
}) {
  const colorClass = getScoreColor(score)
  const label = getScoreLabel(score)
  
  const sizeClasses = {
    sm: 'h-5 w-5 text-[10px]',
    md: 'h-7 w-7 text-xs',
    lg: 'h-9 w-9 text-sm'
  }
  
  const Badge = (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div 
        className={cn(
          "rounded-full flex items-center justify-center font-bold",
          colorClass,
          sizeClasses[size]
        )}
      >
        {score}
      </div>
      
      {showLabel && (
        <div className="flex items-center gap-0.5">
          <span className={cn(
            "text-xs font-medium",
            score >= 60 ? "text-green-600" : "text-gray-500"
          )}>
            {label}
          </span>
          {getTrendIcon(trend)}
        </div>
      )}
    </div>
  )
  
  // If no breakdown data, just return the badge
  if (!breakdown) {
    return Badge
  }
  
  // With breakdown, wrap in tooltip
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            {Badge}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start"
          className="w-64 p-3 bg-white border shadow-lg"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-semibold text-gray-900">Lead Score Breakdown</span>
              <div className={cn(
                "px-2 py-0.5 rounded text-xs font-bold",
                colorClass
              )}>
                {score}/100
              </div>
            </div>
            
            <div className="space-y-2">
              <ScoreBar 
                label="Calls" 
                value={breakdown.callScore || 0} 
                icon={Phone}
                color="text-blue-500"
              />
              <ScoreBar 
                label="Email" 
                value={breakdown.emailScore || 0} 
                icon={Mail}
                color="text-purple-500"
              />
              <ScoreBar 
                label="Website" 
                value={breakdown.websiteScore || 0} 
                icon={Globe}
                color="text-green-500"
              />
              <ScoreBar 
                label="Engage" 
                value={breakdown.engagementScore || 0} 
                icon={Zap}
                color="text-orange-500"
              />
              <ScoreBar 
                label="Recency" 
                value={breakdown.recencyScore || 0} 
                icon={Clock}
                color="text-gray-500"
              />
            </div>
            
            {breakdown.factors && Object.keys(breakdown.factors).some(k => 
              breakdown.factors[k]?.signals?.length > 0
            ) && (
              <div className="pt-2 border-t">
                <p className="text-[10px] text-gray-400 mb-1">Top Signals:</p>
                <div className="space-y-0.5">
                  {Object.values(breakdown.factors)
                    .flatMap(f => f.signals || [])
                    .slice(0, 3)
                    .map((signal, i) => (
                      <p key={i} className="text-[10px] text-gray-600">• {signal}</p>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
