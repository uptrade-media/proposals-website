// src/components/signal/SignalModuleDashboard.jsx
// Main Signal Module dashboard - combines all Signal management components
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Settings,
  BookOpen,
  HelpCircle,
  Lightbulb,
  BarChart3,
  Power,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Code2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSignalStore } from '@/lib/signal-store'
import { cn } from '@/lib/utils'

// Sub-components
import SignalProfileEditor from './SignalProfileEditor'
import SignalKnowledgeManager from './SignalKnowledgeManager'
import SignalFAQManager from './SignalFAQManager'
import SignalLearningDashboard from './SignalLearningDashboard'
import SignalAnalytics from './SignalAnalytics'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Brain },
  { id: 'profile', label: 'Profile', icon: Settings },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'faqs', label: 'FAQs', icon: HelpCircle },
  { id: 'learning', label: 'Learning', icon: Lightbulb },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
]

export default function SignalModuleDashboard({ projectId, siteUrl, className }) {
  const {
    moduleConfig,
    moduleConfigLoading,
    moduleConfigError,
    fetchModuleConfig,
    enableSignal,
    disableSignal,
    knowledgeStats,
    faqsStats,
    suggestionsStats
  } = useSignalStore()

  const [activeTab, setActiveTab] = useState('overview')
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)

  // Fetch config on mount
  useEffect(() => {
    if (projectId) {
      fetchModuleConfig(projectId)
    }
  }, [projectId])

  const handleToggleSignal = async () => {
    setToggling(true)
    try {
      if (moduleConfig?.is_enabled) {
        await disableSignal(projectId)
      } else {
        await enableSignal(projectId)
      }
    } finally {
      setToggling(false)
    }
  }

  const handleCopyEmbed = () => {
    const embedCode = generateEmbedCode(projectId, moduleConfig)
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (moduleConfigLoading && !moduleConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (moduleConfigError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load Signal configuration: {moduleConfigError}
        </AlertDescription>
      </Alert>
    )
  }

  const isEnabled = moduleConfig?.is_enabled

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-xl',
            isEnabled ? 'bg-emerald-500/20' : 'bg-muted'
          )}>
            <Brain className={cn(
              'h-6 w-6',
              isEnabled ? 'text-emerald-400' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Signal AI
              <Badge variant={isEnabled ? 'default' : 'secondary'} className={cn(
                isEnabled && 'bg-emerald-500/20 text-emerald-400'
              )}>
                {isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              AI-powered chat widget and knowledge management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setEmbedDialogOpen(true)}
            disabled={!isEnabled}
            className="gap-2"
          >
            <Code2 className="h-4 w-4" />
            Get Embed Code
          </Button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
            <span className="text-sm text-muted-foreground">
              {isEnabled ? 'Signal is active' : 'Signal is off'}
            </span>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggleSignal}
              disabled={toggling}
            />
            {toggling && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          {TABS.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="mt-0">
            <OverviewTab 
              projectId={projectId}
              config={moduleConfig}
              knowledgeStats={knowledgeStats}
              faqsStats={faqsStats}
              suggestionsStats={suggestionsStats}
              onNavigate={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <SignalProfileEditor projectId={projectId} />
          </TabsContent>

          <TabsContent value="knowledge" className="mt-0">
            <SignalKnowledgeManager projectId={projectId} />
          </TabsContent>

          <TabsContent value="faqs" className="mt-0">
            <SignalFAQManager projectId={projectId} />
          </TabsContent>

          <TabsContent value="learning" className="mt-0">
            <SignalLearningDashboard projectId={projectId} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <SignalAnalytics projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Embed Code Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Signal Widget</DialogTitle>
            <DialogDescription>
              Add this code to your website to enable the Signal AI chat widget
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">
                <code>{generateEmbedCode(projectId, moduleConfig)}</code>
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2 gap-1"
                onClick={handleCopyEmbed}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Installation:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Copy the code above</li>
                <li>Paste it before the closing <code className="text-xs bg-muted px-1 rounded">&lt;/body&gt;</code> tag on your website</li>
                <li>The widget will appear in the bottom-right corner</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Overview tab component
function OverviewTab({ projectId, config, knowledgeStats, faqsStats, suggestionsStats, onNavigate }) {
  const stats = [
    {
      label: 'Knowledge Chunks',
      value: knowledgeStats?.total || 0,
      icon: BookOpen,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      tab: 'knowledge'
    },
    {
      label: 'FAQs',
      value: (faqsStats?.approved || 0) + (faqsStats?.pending || 0),
      subtitle: faqsStats?.pending > 0 ? `${faqsStats.pending} pending` : undefined,
      icon: HelpCircle,
      color: 'text-orange-400',
      bg: 'bg-orange-500/20',
      tab: 'faqs'
    },
    {
      label: 'Suggestions',
      value: suggestionsStats?.byStatus?.pending || 0,
      subtitle: 'pending review',
      icon: Lightbulb,
      color: 'text-purple-400',
      bg: 'bg-purple-500/20',
      tab: 'learning'
    },
    {
      label: 'Conversations',
      value: config?.stats?.conversations || 0,
      subtitle: 'this month',
      icon: BarChart3,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
      tab: 'analytics'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card 
            key={stat.label}
            className="cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => onNavigate(stat.tab)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full',
                  stat.bg
                )}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SEO Integration Status */}
      {config?.seoIntegration && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              SEO Integration Active
            </CardTitle>
            <CardDescription>
              Signal is using knowledge from your SEO module
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Site</p>
                <p className="font-medium">{config.seoIntegration.domain}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pages Indexed</p>
                <p className="font-medium">{config.seoIntegration.pagesCount || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Knowledge Items</p>
                <p className="font-medium">{config.seoIntegration.knowledgeCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => onNavigate('profile')}>
              <Settings className="h-5 w-5" />
              <span className="text-sm">Edit Profile</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => onNavigate('knowledge')}>
              <BookOpen className="h-5 w-5" />
              <span className="text-sm">Add Knowledge</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => onNavigate('faqs')}>
              <HelpCircle className="h-5 w-5" />
              <span className="text-sm">Manage FAQs</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => onNavigate('learning')}>
              <Lightbulb className="h-5 w-5" />
              <span className="text-sm">Review Suggestions</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Generate embed code
function generateEmbedCode(projectId, config) {
  const widgetConfig = {
    projectId,
    position: config?.widget_position || 'bottom-right',
    primaryColor: config?.widget_color || '#10b981',
    greeting: config?.widget_greeting || 'Hi! How can I help you today?'
  }

  return `<!-- Signal AI Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['SignalWidget']=o;w[o]=w[o]||function(){
    (w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','signal','https://portal.uptrademedia.com/widget/signal.js'));
  signal('init', ${JSON.stringify(widgetConfig, null, 2)});
</script>`
}
