// src/components/seo/signal/SignalUpgradeCard.jsx
// Shown to users without Signal access - prompts upgrade
import { motion } from 'framer-motion'
import { Sparkles, Brain, Zap, FileText, ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const FEATURE_MESSAGES = {
  insights: {
    title: 'AI-Powered Insights',
    description: 'Get personalized recommendations tailored to your site',
    icon: Brain
  },
  autofix: {
    title: 'Auto-Fix Issues',
    description: 'Let Signal automatically fix common SEO issues',
    icon: Zap
  },
  brief: {
    title: 'Content Briefs',
    description: 'Generate content briefs based on your business context',
    icon: FileText
  },
  suggest: {
    title: 'AI Suggestions',
    description: 'Get AI title and meta description suggestions',
    icon: Sparkles
  },
  default: {
    title: 'Unlock Signal AI',
    description: 'Get personalized recommendations, auto-fixes, and an AI that learns your business over time',
    icon: Sparkles
  }
}

export default function SignalUpgradeCard({
  feature = 'default',
  variant = 'default', // 'default' | 'inline' | 'compact'
  onUpgrade,
  onContactSales,
  className
}) {
  const featureInfo = FEATURE_MESSAGES[feature] || FEATURE_MESSAGES.default
  const Icon = featureInfo.icon

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-gradient-to-r from-emerald-500/10 to-teal-500/10',
        'border border-emerald-500/20',
        className
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
          <Sparkles className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {featureInfo.title}
          </p>
        </div>
        <Button size="sm" variant="ghost" className="text-emerald-400" onClick={onUpgrade}>
          Upgrade
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center justify-between gap-4 p-4 rounded-lg',
        'bg-gradient-to-r from-emerald-500/5 to-teal-500/5',
        'border border-emerald-500/20',
        className
      )}>
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">{featureInfo.title}</p>
            <p className="text-sm text-[var(--text-secondary)]">{featureInfo.description}</p>
          </div>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" onClick={onUpgrade}>
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Upgrade
        </Button>
      </div>
    )
  }

  // Default full card
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        'overflow-hidden',
        'border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5',
        className
      )}>
        <CardContent className="py-8 px-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
            <Sparkles className="h-8 w-8 text-emerald-400" />
          </div>
          
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Unlock Signal AI
          </h3>
          
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Get personalized recommendations, auto-fixes, and an AI that learns your business over time.
          </p>

          <div className="grid gap-3 text-left max-w-sm mx-auto mb-6">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Signal remembers</p>
                <p className="text-xs text-[var(--text-tertiary)]">Your site history and what works</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Auto-fix issues</p>
                <p className="text-xs text-[var(--text-tertiary)]">One-click fixes for common problems</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Content briefs</p>
                <p className="text-xs text-[var(--text-tertiary)]">Tailored to your business</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={onUpgrade}>
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade to Signal
            </Button>
            {onContactSales && (
              <Button variant="outline" onClick={onContactSales}>
                <Mail className="h-4 w-4 mr-2" />
                Contact Sales
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
