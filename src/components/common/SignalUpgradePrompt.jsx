// src/components/common/SignalUpgradePrompt.jsx
// Shown when a user tries to access Signal-only features without access
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Lock, ArrowRight, Brain, Zap, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useBrandColors from '@/hooks/useBrandColors'

const FEATURE_BENEFITS = {
  'ai-insights': {
    title: 'Signal SEO Insights',
    description: 'Get Signal-powered analysis of your pages with actionable recommendations.',
    benefits: ['Page-level Signal analysis', 'Automated recommendations', 'Priority scoring']
  },
  'blog-brain': {
    title: 'Blog Signal Brain',
    description: 'Signal that understands your content strategy and generates high-impact blog ideas.',
    benefits: ['Signal content ideation', 'Topic clustering', 'SEO-optimized outlines']
  },
  'content-briefs': {
    title: 'Signal Content Briefs',
    description: 'Generate comprehensive content briefs that writers can follow to create SEO-optimized content.',
    benefits: ['Keyword targeting', 'Competitor analysis', 'Outline generation']
  },
  'schema': {
    title: 'Schema Markup Generator',
    description: 'Automatically generate JSON-LD structured data for better search visibility.',
    benefits: ['Auto-generated schemas', 'Rich snippet eligibility', 'Validation included']
  },
  'internal-links': {
    title: 'Internal Link Suggestions',
    description: 'AI analyzes your site structure to recommend strategic internal links.',
    benefits: ['Link equity distribution', 'Topic relevance matching', 'One-click implementation']
  },
  'technical': {
    title: 'AI Technical Audit',
    description: 'Comprehensive technical SEO analysis with prioritized fixes.',
    benefits: ['Crawl analysis', 'Issue prioritization', 'Fix instructions']
  },
  'local-seo': {
    title: 'Local SEO AI',
    description: 'Optimize your local presence with AI-powered recommendations.',
    benefits: ['GBP optimization', 'Citation analysis', 'Review response drafts']
  },
  'quick-wins': {
    title: 'Quick Wins',
    description: 'AI identifies the highest-impact SEO improvements you can make right now.',
    benefits: ['Effort vs impact scoring', 'Step-by-step guides', 'Predicted results']
  },
  default: {
    title: 'Signal AI Features',
    description: 'Unlock AI-powered SEO tools that automate and enhance your optimization workflow.',
    benefits: ['AI recommendations', 'Automated insights', 'Smart prioritization']
  }
}

export function SignalUpgradePrompt({ 
  feature = 'default',
  title,
  description,
  compact = false,
  showBenefits = true,
  onUpgradeClick
}) {
  const navigate = useNavigate()
  const { primary, primaryHover } = useBrandColors()
  
  const featureConfig = FEATURE_BENEFITS[feature] || FEATURE_BENEFITS.default
  const displayTitle = title || featureConfig.title
  const displayDescription = description || featureConfig.description
  
  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick()
    } else {
      navigate('/settings/billing')
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
        <div className="p-2 rounded-full bg-violet-500/20">
          <Lock className="h-4 w-4 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">{displayTitle}</p>
          <p className="text-xs text-[var(--text-secondary)] truncate">{displayDescription}</p>
        </div>
        <Button 
          size="sm" 
          onClick={handleUpgrade}
          className="shrink-0"
          style={{ backgroundColor: primary }}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Upgrade
        </Button>
      </div>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto p-3 rounded-full bg-violet-500/10 w-fit mb-2">
          <Brain className="h-8 w-8 text-violet-500" />
        </div>
        <CardTitle className="text-xl text-[var(--text-primary)]">
          {displayTitle}
        </CardTitle>
        <CardDescription className="text-[var(--text-secondary)]">
          {displayDescription}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {showBenefits && featureConfig.benefits && (
          <div className="space-y-3">
            {featureConfig.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="p-1.5 rounded-full bg-violet-500/10">
                  <Zap className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{benefit}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            className="flex-1"
            onClick={handleUpgrade}
            style={{ backgroundColor: primary }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade to Signal
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => window.open('https://uptrademedia.com/signal', '_blank')}
          >
            Learn More
          </Button>
        </div>
        
        <p className="text-xs text-center text-[var(--text-tertiary)]">
          Signal AI unlocks 20+ AI-powered SEO tools across all your projects
        </p>
      </CardContent>
    </Card>
  )
}

// Higher-order component to wrap Signal-dependent features
export function withSignalGuard(WrappedComponent, options = {}) {
  const { feature, compact = false } = options
  
  return function SignalGuardedComponent(props) {
    // Import dynamically to avoid circular deps
    const { useSignalAccess } = require('@/lib/signal-access')
    const { hasAccess, hasCurrentProjectSignal } = useSignalAccess()
    
    // Check if feature requires current project Signal
    const requiresCurrentProject = options.requireCurrentProject ?? false
    const hasRequiredAccess = requiresCurrentProject ? hasCurrentProjectSignal : hasAccess
    
    if (!hasRequiredAccess) {
      return (
        <SignalUpgradePrompt 
          feature={feature}
          compact={compact}
          {...(options.promptProps || {})}
        />
      )
    }
    
    return <WrappedComponent {...props} />
  }
}

export default SignalUpgradePrompt
