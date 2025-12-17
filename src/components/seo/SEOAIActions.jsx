/**
 * SEO AI Actions Panel
 * 
 * Quick action center for AI-powered SEO operations:
 * - One-click fixes for common issues
 * - Bulk optimization triggers
 * - AI recommendation queue
 * - Auto-apply settings
 */
import { useState } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Zap,
  Brain,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Play,
  Pause,
  Settings,
  TrendingUp,
  FileText,
  Link2,
  Code,
  Target,
  Sparkles,
  Loader2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const QUICK_ACTIONS = [
  {
    id: 'optimize-titles',
    title: 'Optimize All Titles',
    description: 'AI generates optimized titles for pages with low CTR or missing keywords',
    icon: FileText,
    impact: 'high',
    effort: 'instant',
    jobType: 'ai-optimize-titles'
  },
  {
    id: 'fix-meta-descriptions',
    title: 'Fix Meta Descriptions',
    description: 'Generate compelling meta descriptions for pages missing or have weak ones',
    icon: Target,
    impact: 'high',
    effort: 'instant',
    jobType: 'ai-optimize-metas'
  },
  {
    id: 'generate-schema',
    title: 'Generate Schema Markup',
    description: 'Add structured data to all pages for enhanced SERP features',
    icon: Code,
    impact: 'medium',
    effort: 'quick',
    jobType: 'ai-generate-schema'
  },
  {
    id: 'internal-links',
    title: 'Suggest Internal Links',
    description: 'Find opportunities to add internal links between related content',
    icon: Link2,
    impact: 'medium',
    effort: 'quick',
    jobType: 'ai-internal-links'
  },
  {
    id: 'content-gaps',
    title: 'Identify Content Gaps',
    description: 'Discover topics competitors rank for that you don\'t cover',
    icon: TrendingUp,
    impact: 'high',
    effort: 'medium',
    jobType: 'ai-content-gaps'
  },
  {
    id: 'full-analysis',
    title: 'Full AI Analysis',
    description: 'Comprehensive site analysis with prioritized recommendations',
    icon: Brain,
    impact: 'high',
    effort: 'significant',
    jobType: 'ai-analyze'
  }
]

export default function SEOAIActions({ siteId }) {
  const [runningActions, setRunningActions] = useState({})
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const { 
    startBackgroundJob, 
    checkJobStatus,
    aiRecommendations,
    applyRecommendation,
    isApplying
  } = useSeoStore()

  const handleRunAction = async (action) => {
    setRunningActions(prev => ({ ...prev, [action.id]: 'starting' }))

    try {
      const job = await startBackgroundJob(action.jobType, { siteId })
      
      if (job?.id) {
        setRunningActions(prev => ({ ...prev, [action.id]: 'running' }))
        
        // Poll for completion
        const pollInterval = setInterval(async () => {
          const status = await checkJobStatus(job.id)
          
          if (status?.status === 'completed') {
            clearInterval(pollInterval)
            setRunningActions(prev => ({ ...prev, [action.id]: 'completed' }))
            setTimeout(() => {
              setRunningActions(prev => {
                const updated = { ...prev }
                delete updated[action.id]
                return updated
              })
            }, 3000)
          } else if (status?.status === 'failed') {
            clearInterval(pollInterval)
            setRunningActions(prev => ({ ...prev, [action.id]: 'failed' }))
          }
        }, 2000)
      }
    } catch (error) {
      console.error('Action failed:', error)
      setRunningActions(prev => ({ ...prev, [action.id]: 'failed' }))
    }
  }

  const getActionStatus = (actionId) => runningActions[actionId]

  const pendingRecommendations = aiRecommendations?.filter(r => r.status === 'pending') || []
  const autoFixableCount = pendingRecommendations.filter(r => r.autoFixable).length

  return (
    <div className="space-y-6">
      {/* Header with Auto-Apply Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            AI Quick Actions
          </h2>
          <p className="text-sm text-muted-foreground">
            One-click AI-powered optimizations
          </p>
        </div>

        <div className="flex items-center gap-4">
          {autoFixableCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {autoFixableCount} auto-fixable
            </Badge>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Auto-apply safe fixes</span>
            <Switch
              checked={autoApplyEnabled}
              onCheckedChange={setAutoApplyEnabled}
            />
          </div>

          <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => {
          const status = getActionStatus(action.id)
          const Icon = action.icon

          return (
            <Card 
              key={action.id} 
              className={`relative overflow-hidden ${
                status === 'running' ? 'border-blue-500' : ''
              }`}
            >
              {status === 'running' && (
                <div className="absolute top-0 left-0 right-0">
                  <Progress value={undefined} className="h-1 rounded-none" />
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      action.impact === 'high' ? 'bg-green-100' :
                      action.impact === 'medium' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        action.impact === 'high' ? 'text-green-600' :
                        action.impact === 'medium' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{action.title}</CardTitle>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {action.impact} impact
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {action.effort}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {action.description}
                </p>

                <Button
                  className="w-full"
                  size="sm"
                  disabled={status === 'running' || status === 'starting'}
                  onClick={() => handleRunAction(action)}
                >
                  {status === 'starting' && (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  )}
                  {status === 'running' && (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  )}
                  {status === 'completed' && (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Completed!
                    </>
                  )}
                  {status === 'failed' && (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                      Failed - Retry
                    </>
                  )}
                  {!status && (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pending Recommendations */}
      {pendingRecommendations.length > 0 && (
        <>
          <Separator />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Recommendations ({pendingRecommendations.length})
              </h3>
              <Button variant="outline" size="sm" disabled={autoFixableCount === 0}>
                <Sparkles className="h-4 w-4 mr-2" />
                Apply All Safe Fixes ({autoFixableCount})
              </Button>
            </div>

            <div className="space-y-2">
              {pendingRecommendations.slice(0, 5).map((rec) => (
                <Card key={rec.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={rec.priority === 'critical' ? 'destructive' : 
                                 rec.priority === 'high' ? 'default' : 'secondary'}
                      >
                        {rec.priority}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{rec.title}</p>
                        <p className="text-xs text-muted-foreground">{rec.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rec.autoFixable && (
                        <Badge variant="outline" className="text-xs bg-green-50">
                          <Zap className="h-3 w-3 mr-1" />
                          Auto-fix
                        </Badge>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => applyRecommendation(rec.id)}
                        disabled={isApplying}
                      >
                        Apply
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {pendingRecommendations.length > 5 && (
                <Button variant="link" className="w-full">
                  View all {pendingRecommendations.length} recommendations
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Actions Settings</DialogTitle>
            <DialogDescription>
              Configure how AI recommendations are applied
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-apply safe fixes</p>
                <p className="text-sm text-muted-foreground">
                  Automatically apply low-risk optimizations
                </p>
              </div>
              <Switch
                checked={autoApplyEnabled}
                onCheckedChange={setAutoApplyEnabled}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="font-medium">Safe fix categories:</p>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Title optimizations', checked: true },
                  { label: 'Meta description updates', checked: true },
                  { label: 'Schema markup additions', checked: true },
                  { label: 'Canonical URL fixes', checked: true },
                  { label: 'Internal link suggestions', checked: false }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <Switch defaultChecked={item.checked} />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email notifications</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when actions complete
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettings(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
