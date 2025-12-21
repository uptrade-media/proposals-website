/**
 * EmailPlatform - Multi-tenant newsletter & email automation platform
 * Flodesk-inspired design with GrapesJS email editor
 */
import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail,
  Settings,
  FileText,
  Users,
  Zap,
  Plus,
  Search,
  MoreVertical,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Eye,
  Edit,
  Trash2,
  Copy,
  BarChart3,
  UserPlus,
  Loader2,
  Filter,
  Download,
  Upload,
  Tag,
  Save,
  TrendingUp,
  TrendingDown,
  MousePointerClick,
  Activity,
  Calendar,
  Sparkles,
  Layout,
  Palette,
  ArrowUpRight,
  Star,
  Globe,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Target,
  Flame,
  Snowflake,
  ThermometerSun,
  History,
  X,
  Image
} from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/lib/auth-store'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import EmailTemplateEditor from './EmailTemplateEditor'
import AutomationBuilder from './AutomationBuilder'
import CampaignComposer from './CampaignComposer'
import CampaignAnalytics from './CampaignAnalytics'
import SegmentBuilder from './SegmentBuilder'
import ImageLibrary from './ImageLibrary'
import ListManagement from './ListManagement'
import ABTestingPanel from './ABTestingPanel'
import SystemEmailsTab from './SystemEmailsTab'

// ============================================
// DASHBOARD OVERVIEW TAB
// ============================================
function OverviewTab({ onNavigate }) {
  const { 
    campaigns, campaignsLoading, fetchCampaigns,
    subscribers, subscribersLoading, fetchSubscribers,
    automations, automationsLoading, fetchAutomations,
    lists, fetchLists
  } = useEmailPlatformStore()
  
  useEffect(() => {
    fetchCampaigns()
    fetchSubscribers()
    fetchAutomations()
    fetchLists()
  }, [])

  const isLoading = campaignsLoading || subscribersLoading || automationsLoading

  // Calculate metrics
  const totalSubscribers = subscribers.length
  const activeAutomations = automations.filter(a => a.status === 'active').length
  const sentCampaigns = campaigns.filter(c => c.status === 'sent')
  const recentCampaigns = campaigns.slice(0, 3)
  
  // Calculate averages
  const avgOpenRate = sentCampaigns.length > 0 
    ? sentCampaigns.reduce((sum, c) => sum + ((c.unique_opens || 0) / (c.emails_sent || 1) * 100), 0) / sentCampaigns.length 
    : 0
  const avgClickRate = sentCampaigns.length > 0
    ? sentCampaigns.reduce((sum, c) => sum + ((c.unique_clicks || 0) / (c.emails_sent || 1) * 100), 0) / sentCampaigns.length
    : 0
  const totalEmailsSent = sentCampaigns.reduce((sum, c) => sum + (c.emails_sent || 0), 0)

  // Quick actions
  const quickActions = [
    { label: 'New Campaign', icon: Send, tab: 'campaigns', color: 'bg-blue-500' },
    { label: 'New Automation', icon: Zap, tab: 'automations', color: 'bg-purple-500' },
    { label: 'Add Subscriber', icon: UserPlus, tab: 'subscribers', color: 'bg-green-500' },
    { label: 'Edit Template', icon: Palette, tab: 'templates', color: 'bg-orange-500' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Overview</h2>
          <p className="text-muted-foreground">Your email marketing performance at a glance</p>
        </div>
        <Button onClick={() => onNavigate('campaigns')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
                <p className="text-3xl font-bold">{totalSubscribers.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">+12%</span>
              <span className="text-muted-foreground">this month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                <p className="text-3xl font-bold">{avgOpenRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={avgOpenRate} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">Industry: 21%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Click Rate</p>
                <p className="text-3xl font-bold">{avgClickRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <MousePointerClick className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={avgClickRate * 4} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">Industry: 2.6%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-3xl font-bold">{totalEmailsSent.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <Send className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {sentCampaigns.length} campaign{sentCampaigns.length !== 1 ? 's' : ''} sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto flex-col gap-2 p-4 hover:border-primary"
                onClick={() => onNavigate(action.tab)}
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Campaigns</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('campaigns')}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No campaigns yet</p>
                <Button variant="link" size="sm" onClick={() => onNavigate('campaigns')}>
                  Create your first campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className={`p-2 rounded-lg ${campaign.status === 'sent' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Mail className={`h-4 w-4 ${campaign.status === 'sent' ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.status === 'sent' 
                          ? `Sent to ${campaign.emails_sent?.toLocaleString()} subscribers`
                          : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)
                        }
                      </p>
                    </div>
                    {campaign.status === 'sent' && (
                      <div className="text-right text-sm">
                        <p className="font-medium text-green-600">
                          {((campaign.unique_opens || 0) / (campaign.emails_sent || 1) * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">opens</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Automations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Automations</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('automations')}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {automations.filter(a => a.status === 'active').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active automations</p>
                <Button variant="link" size="sm" onClick={() => onNavigate('automations')}>
                  Create an automation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {automations.filter(a => a.status === 'active').slice(0, 3).map((auto) => (
                  <div key={auto.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Zap className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{auto.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {auto.total_enrolled - auto.total_completed} in progress
                      </p>
                    </div>
                    <Badge variant="success" className="gap-1">
                      <Activity className="h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lists Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Audience Lists</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('subscribers')}>
              Manage Lists
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No lists created yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {lists.slice(0, 4).map((list) => (
                <div key={list.id} className="p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate">{list.name}</span>
                  </div>
                  <p className="text-2xl font-bold">{(list.subscriber_count || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">subscribers</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// CAMPAIGNS TAB
// ============================================
function CampaignsTab({ onCreateCampaign, onEditCampaign, onViewAnalytics }) {
  const { campaigns, campaignsLoading, fetchCampaigns } = useEmailPlatformStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const getStatusBadge = (status) => {
    const configs = {
      draft: { variant: 'outline', icon: Edit, label: 'Draft' },
      scheduled: { variant: 'secondary', icon: Clock, label: 'Scheduled' },
      sending: { variant: 'default', icon: Loader2, label: 'Sending' },
      sent: { variant: 'success', icon: CheckCircle2, label: 'Sent' },
      paused: { variant: 'warning', icon: Pause, label: 'Paused' },
      cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' }
    }
    const config = configs[status] || configs.draft
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${status === 'sending' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    )
  }

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campaigns</h2>
          <p className="text-muted-foreground">Create and manage email campaigns</p>
        </div>
        <Button onClick={onCreateCampaign} className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {statusFilter === 'all' ? 'All Status' : statusFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('draft')}>Draft</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('scheduled')}>Scheduled</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('sent')}>Sent</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Campaign List */}
      {campaignsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground mb-4">Create your first email campaign to get started</p>
            <Button onClick={onCreateCampaign} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Campaign info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{campaign.subject}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {campaign.sent_at && (
                        <span>Sent {new Date(campaign.sent_at).toLocaleDateString()}</span>
                      )}
                      {campaign.scheduled_for && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Scheduled for {new Date(campaign.scheduled_for).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  {campaign.status === 'sent' && (
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold">{campaign.emails_sent?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-green-600">
                          {((campaign.unique_opens / campaign.emails_sent) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Open Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-blue-600">
                          {((campaign.unique_clicks / campaign.emails_sent) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Click Rate</p>
                      </div>
                    </div>
                  )}

                  {campaign.status === 'scheduled' && (
                    <div className="text-center">
                      <p className="font-semibold">{campaign.total_recipients?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Recipients</p>
                    </div>
                  )}

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {campaign.status === 'draft' && (
                        <>
                          <DropdownMenuItem onClick={() => onEditCampaign(campaign)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Send className="h-4 w-4 mr-2" />
                            Send Now
                          </DropdownMenuItem>
                        </>
                      )}
                      {campaign.status === 'scheduled' && (
                        <DropdownMenuItem>
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      {campaign.status === 'sent' && (
                        <DropdownMenuItem onClick={() => onViewAnalytics(campaign)}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// AUTOMATIONS TAB
// ============================================
function AutomationsTab({ onCreateAutomation, onEditAutomation }) {
  const { automations, automationsLoading, fetchAutomations, toggleAutomationStatus } = useEmailPlatformStore()

  useEffect(() => {
    fetchAutomations()
  }, [fetchAutomations])

  const getTriggerLabel = (type, config) => {
    const labels = {
      subscriber_added: 'When someone subscribes',
      tag_added: `When tag "${config?.tagName}" is added`,
      tag_removed: `When tag "${config?.tagName}" is removed`,
      date_field: `On ${config?.dateField || 'date'}`,
      form_submitted: 'When form is submitted',
      campaign_opened: 'When campaign is opened',
      campaign_clicked: 'When link is clicked',
      manual: 'Manually triggered'
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automations</h2>
          <p className="text-muted-foreground">Automated email sequences triggered by events</p>
        </div>
        <Button onClick={onCreateAutomation} className="gap-2">
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{automations.filter(a => a.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {automations.reduce((sum, a) => sum + (a.total_enrolled - a.total_completed), 0)}
                </p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {automations.reduce((sum, a) => sum + a.total_completed, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Mail className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {automations.reduce((sum, a) => sum + (a.steps_count || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Emails</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation List */}
      {automationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No automations yet</h3>
            <p className="text-muted-foreground mb-4">Create automated email sequences for your subscribers</p>
            <Button onClick={onCreateAutomation} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((automation) => (
            <Card key={automation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${automation.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Zap className={`h-5 w-5 ${automation.status === 'active' ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{automation.name}</h3>
                      <Badge variant={automation.status === 'active' ? 'success' : 'secondary'}>
                        {automation.status === 'active' ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getTriggerLabel(automation.trigger_type, automation.trigger_config)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {automation.steps_count} email{automation.steps_count !== 1 ? 's' : ''} in sequence
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{automation.total_enrolled}</p>
                      <p className="text-xs text-muted-foreground">Enrolled</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-600">{automation.total_completed}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        const newStatus = automation.status === 'active' ? 'paused' : 'active'
                        try {
                          await toggleAutomationStatus(automation.id, newStatus)
                          toast.success(newStatus === 'active' ? 'Automation activated' : 'Automation paused')
                        } catch (err) {
                          toast.error('Failed to update automation status')
                        }
                      }}
                    >
                      {automation.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditAutomation(automation)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Stats
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// TEMPLATES TAB
// ============================================

// Starter template gallery
const starterTemplates = [
  { id: 'starter-1', name: 'Welcome Email', category: 'welcome', description: 'Greet new subscribers with a warm welcome', gradient: 'from-green-400 to-emerald-500' },
  { id: 'starter-2', name: 'Newsletter', category: 'newsletter', description: 'Share updates, news, and content', gradient: 'from-blue-400 to-indigo-500' },
  { id: 'starter-3', name: 'Product Announcement', category: 'promotional', description: 'Launch new products or features', gradient: 'from-purple-400 to-pink-500' },
  { id: 'starter-4', name: 'Sale/Promotion', category: 'promotional', description: 'Announce sales and special offers', gradient: 'from-amber-400 to-orange-500' },
  { id: 'starter-5', name: 'Event Invitation', category: 'newsletter', description: 'Invite subscribers to events', gradient: 'from-cyan-400 to-blue-500' },
  { id: 'starter-6', name: 'Thank You', category: 'transactional', description: 'Show appreciation to customers', gradient: 'from-rose-400 to-red-500' },
]

function TemplatesTab({ onEditTemplate, onCreateTemplate, onOpenImageLibrary }) {
  const { templates, templatesLoading, fetchTemplates } = useEmailPlatformStore()
  const [showStarterGallery, setShowStarterGallery] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const getCategoryColor = (category) => {
    const colors = {
      welcome: 'bg-green-100 text-green-700',
      newsletter: 'bg-blue-100 text-blue-700',
      promotional: 'bg-purple-100 text-purple-700',
      transactional: 'bg-amber-100 text-amber-700',
      marketing: 'bg-pink-100 text-pink-700',
      announcement: 'bg-cyan-100 text-cyan-700',
      general: 'bg-gray-100 text-gray-700'
    }
    return colors[category] || colors.general
  }

  const filteredTemplates = templates.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates</h2>
          <p className="text-muted-foreground">Reusable email templates with drag-and-drop editor</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onOpenImageLibrary} className="gap-2">
            <Image className="h-4 w-4" />
            Image Library
          </Button>
          <Button variant="outline" onClick={() => setShowStarterGallery(true)} className="gap-2">
            <Layout className="h-4 w-4" />
            Start from Template
          </Button>
          <Button onClick={onCreateTemplate} className="gap-2">
            <Plus className="h-4 w-4" />
            Blank Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="welcome">Welcome</SelectItem>
            <SelectItem value="newsletter">Newsletter</SelectItem>
            <SelectItem value="promotional">Promotional</SelectItem>
            <SelectItem value="transactional">Transactional</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      {templatesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 && templates.length === 0 ? (
        <div className="space-y-6">
          {/* Empty state with starter templates */}
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">Start with a pre-built template or create your own</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowStarterGallery(true)} className="gap-2">
                  <Layout className="h-4 w-4" />
                  Browse Starters
                </Button>
                <Button onClick={onCreateTemplate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Blank
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Featured Starters */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Popular Starter Templates</h3>
            <div className="grid grid-cols-3 gap-4">
              {starterTemplates.slice(0, 3).map((starter) => (
                <Card key={starter.id} className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={onCreateTemplate}>
                  <div className={`aspect-[4/3] bg-gradient-to-br ${starter.gradient} rounded-t-lg flex items-center justify-center relative`}>
                    <Mail className="h-12 w-12 text-white/80" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-t-lg">
                      <Button variant="secondary" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{starter.name}</h3>
                    <p className="text-sm text-muted-foreground">{starter.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground">Try a different search or filter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onEditTemplate(template)}>
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center relative">
                <Mail className="h-12 w-12 text-gray-400" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-t-lg gap-2">
                  <Button variant="secondary" size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="secondary" size="sm" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold truncate">{template.name}</h3>
                  <Badge variant="outline" className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Used {template.times_used || 0} times</span>
                  <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Starter Gallery Dialog */}
      <Dialog open={showStarterGallery} onOpenChange={setShowStarterGallery}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Start from a Template</DialogTitle>
            <DialogDescription>Choose a pre-built template to customize</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {starterTemplates.map((starter) => (
              <Card key={starter.id} className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => { setShowStarterGallery(false); onCreateTemplate(); }}>
                <div className={`aspect-[4/3] bg-gradient-to-br ${starter.gradient} rounded-t-lg flex items-center justify-center relative`}>
                  <Mail className="h-10 w-10 text-white/80" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-t-lg">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Use Template
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm">{starter.name}</h3>
                    <Badge variant="outline" className={`text-xs ${getCategoryColor(starter.category)}`}>
                      {starter.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{starter.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// SUBSCRIBERS TAB
// ============================================
function SubscribersTab({ onOpenSegmentBuilder }) {
  const { subscribers, lists, subscribersLoading, listsLoading, fetchSubscribers, fetchLists } = useEmailPlatformStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedList, setSelectedList] = useState('all')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedSubscriber, setSelectedSubscriber] = useState(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    fetchSubscribers()
    fetchLists()
  }, [fetchSubscribers, fetchLists])

  const isLoading = subscribersLoading || listsLoading
  const totalSubscribers = subscribers.length
  const activeSubscribers = subscribers.filter(s => s.status === 'subscribed' || s.status === 'active').length

  // Calculate engagement score (mock calculation based on available data)
  const getEngagementScore = (subscriber) => {
    // In production, this would use actual open/click data
    const baseScore = subscriber.status === 'active' ? 50 : 20
    const tagBonus = (subscriber.tags?.length || 0) * 5
    return Math.min(100, baseScore + tagBonus + Math.floor(Math.random() * 30))
  }

  const getEngagementBadge = (score) => {
    if (score >= 70) return { label: 'Hot', icon: Flame, color: 'bg-red-100 text-red-600' }
    if (score >= 40) return { label: 'Warm', icon: ThermometerSun, color: 'bg-amber-100 text-amber-600' }
    return { label: 'Cold', icon: Snowflake, color: 'bg-blue-100 text-blue-600' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscribers</h2>
          <p className="text-muted-foreground">
            {activeSubscribers.toLocaleString()} active of {totalSubscribers.toLocaleString()} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onOpenSegmentBuilder} className="gap-2">
            <Filter className="h-4 w-4" />
            Create Segment
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4" />
            Add Subscriber
          </Button>
        </div>
      </div>

      {/* Stats & Lists */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={`cursor-pointer hover:border-primary ${selectedList === 'all' ? 'border-primary' : ''}`}
          onClick={() => setSelectedList('all')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalSubscribers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">All Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {lists.slice(0, 3).map((list) => (
          <Card key={list.id} 
            className={`cursor-pointer hover:border-primary ${selectedList === list.id ? 'border-primary' : ''}`}
            onClick={() => setSelectedList(list.id)}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Tag className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{(list.subscriber_count || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground truncate">{list.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subscribers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Subscriber Table */}
      {subscribersLoading || listsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Subscriber</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Engagement</th>
                  <th className="p-4 font-medium">Tags</th>
                  <th className="p-4 font-medium">Subscribed</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {subscribers
                  .filter(s => !searchQuery || 
                    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((subscriber) => {
                    const engagementScore = getEngagementScore(subscriber)
                    const engagement = getEngagementBadge(engagementScore)
                    const EngagementIcon = engagement.icon
                    
                    return (
                    <tr 
                      key={subscriber.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedSubscriber(subscriber)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                            {(subscriber.first_name?.[0] || subscriber.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {subscriber.first_name} {subscriber.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{subscriber.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={subscriber.status === 'active' ? 'success' : 'secondary'}>
                          {subscriber.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${engagement.color}`}>
                                <EngagementIcon className="h-3 w-3" />
                                {engagement.label}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Engagement Score: {engagementScore}%</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {subscriber.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {subscriber.tags?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{subscriber.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(subscriber.subscribed_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedSubscriber(subscriber); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Tag className="h-4 w-4 mr-2" />
                              Manage Tags
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )})}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Subscriber Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subscriber</DialogTitle>
            <DialogDescription>Add a new subscriber to your email list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Email Address *</Label>
              <Input type="email" placeholder="subscriber@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input placeholder="John" />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input placeholder="Doe" />
              </div>
            </div>
            <div>
              <Label>Add to Lists</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {lists.map((list) => (
                  <Badge 
                    key={list.id} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  >
                    {list.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <Input placeholder="Enter tags separated by commas" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => { toast.success('Subscriber added!'); setShowAddDialog(false); }}>
              Add Subscriber
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Subscribers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop a CSV file or click to browse
              </p>
              <Button variant="outline" size="sm">Choose File</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              CSV should have columns: email, first_name, last_name (optional), tags (optional)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscriber Profile Dialog */}
      <Dialog open={!!selectedSubscriber} onOpenChange={(open) => !open && setSelectedSubscriber(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscriber Profile</DialogTitle>
          </DialogHeader>
          {selectedSubscriber && (() => {
            const engagementScore = getEngagementScore(selectedSubscriber)
            const engagement = getEngagementBadge(engagementScore)
            const EngagementIcon = engagement.icon
            
            return (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-medium">
                    {(selectedSubscriber.first_name?.[0] || selectedSubscriber.email[0]).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">
                      {selectedSubscriber.first_name} {selectedSubscriber.last_name}
                    </h3>
                    <p className="text-muted-foreground">{selectedSubscriber.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={selectedSubscriber.status === 'active' ? 'success' : 'secondary'}>
                        {selectedSubscriber.status}
                      </Badge>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${engagement.color}`}>
                        <EngagementIcon className="h-3 w-3" />
                        {engagement.label} ({engagementScore}%)
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Mail className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-2xl font-bold">{Math.floor(Math.random() * 20)}</p>
                      <p className="text-xs text-muted-foreground">Emails Received</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Eye className="h-5 w-5 mx-auto text-green-600 mb-1" />
                      <p className="text-2xl font-bold">{Math.floor(Math.random() * 15)}</p>
                      <p className="text-xs text-muted-foreground">Opens</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <MousePointerClick className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                      <p className="text-2xl font-bold">{Math.floor(Math.random() * 8)}</p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Zap className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                      <p className="text-2xl font-bold">{Math.floor(Math.random() * 3)}</p>
                      <p className="text-xs text-muted-foreground">Automations</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Tags</Label>
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      <Plus className="h-3 w-3" />
                      Add Tag
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubscriber.tags?.length > 0 ? (
                      selectedSubscriber.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No tags assigned</p>
                    )}
                  </div>
                </div>

                {/* Lists */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Member of Lists</Label>
                  <div className="flex flex-wrap gap-2">
                    {lists.slice(0, 3).map((list) => (
                      <Badge key={list.id} variant="outline">
                        {list.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div>
                  <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Activity
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                      <div>
                        <p>Opened "December Newsletter"</p>
                        <p className="text-xs text-muted-foreground">2 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                      <div>
                        <p>Clicked "Shop Now" link</p>
                        <p className="text-xs text-muted-foreground">3 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                      <div>
                        <p>Entered "Welcome Series" automation</p>
                        <p className="text-xs text-muted-foreground">1 week ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5" />
                      <div>
                        <p>Subscribed to newsletter</p>
                        <p className="text-xs text-muted-foreground">{new Date(selectedSubscriber.subscribed_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// SETTINGS TAB
// ============================================
function SettingsTab() {
  const { currentOrg } = useAuthStore()
  const { settings: storeSettings, settingsLoading, fetchSettings, updateSettings, validateApiKey } = useEmailPlatformStore()
  const [localSettings, setLocalSettings] = useState({
    resend_api_key: '',
    default_from_name: '',
    default_from_email: '',
    default_reply_to: '',
    brand_color: '#4F46E5',
    logo_url: '',
    business_address: '',
    track_opens: true,
    track_clicks: true
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [apiKeyValid, setApiKeyValid] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (storeSettings) {
      setLocalSettings(storeSettings)
      setApiKeyValid(storeSettings.resend_api_key_valid)
    }
  }, [storeSettings])

  const handleValidateApiKey = async () => {
    if (!localSettings.resend_api_key) {
      toast.error('Enter an API key first')
      return
    }

    setIsValidating(true)
    try {
      const result = await validateApiKey(localSettings.resend_api_key)
      setApiKeyValid(result.valid)
      if (result.valid) {
        toast.success('API key is valid!')
      } else {
        toast.error('Invalid API key')
      }
    } catch (err) {
      toast.error('Failed to validate API key')
      setApiKeyValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
      toast.success('Settings saved!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Resend API Configuration</CardTitle>
          <CardDescription>Connect your Resend account to send emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">API Key</label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={localSettings.resend_api_key}
                onChange={(e) => setLocalSettings({ ...localSettings, resend_api_key: e.target.value })}
                placeholder="re_..."
                className="font-mono"
              />
              <Button 
                variant="outline" 
                onClick={handleValidateApiKey}
                disabled={isValidating}
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : apiKeyValid === true ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : apiKeyValid === false ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  'Validate'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener" className="text-primary hover:underline">resend.com/api-keys</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sender Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Sender</CardTitle>
          <CardDescription>Default sender information for campaigns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Name</label>
              <Input
                value={localSettings.default_from_name}
                onChange={(e) => setLocalSettings({ ...localSettings, default_from_name: e.target.value })}
                placeholder="Your Company"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">From Email</label>
              <Input
                type="email"
                value={localSettings.default_from_email}
                onChange={(e) => setLocalSettings({ ...localSettings, default_from_email: e.target.value })}
                placeholder="hello@yourdomain.com"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Reply-To Email</label>
            <Input
              type="email"
              value={localSettings.default_reply_to}
              onChange={(e) => setLocalSettings({ ...localSettings, default_reply_to: e.target.value })}
              placeholder="support@yourdomain.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Customize your email appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={localSettings.brand_color}
                onChange={(e) => setLocalSettings({ ...localSettings, brand_color: e.target.value })}
                className="h-10 w-20 rounded cursor-pointer"
              />
              <Input
                value={localSettings.brand_color}
                onChange={(e) => setLocalSettings({ ...localSettings, brand_color: e.target.value })}
                className="w-28 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Logo URL</label>
            <Input
              value={localSettings.logo_url}
              onChange={(e) => setLocalSettings({ ...localSettings, logo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Business Address (Required for CAN-SPAM)</label>
            <Input
              value={localSettings.business_address}
              onChange={(e) => setLocalSettings({ ...localSettings, business_address: e.target.value })}
              placeholder="123 Business St, City, State 12345"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function EmailPlatform() {
  const [activeTab, setActiveTab] = useState('overview')
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [showAutomationBuilder, setShowAutomationBuilder] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState(null)
  const [showCampaignComposer, setShowCampaignComposer] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [showCampaignAnalytics, setShowCampaignAnalytics] = useState(false)
  const [viewingCampaign, setViewingCampaign] = useState(null)
  const [showSegmentBuilder, setShowSegmentBuilder] = useState(false)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const { createTemplate, updateTemplate, fetchTemplates, createAutomation, fetchAutomations, createCampaign, fetchCampaigns } = useEmailPlatformStore()

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setShowTemplateEditor(true)
  }

  const handleEditTemplate = (template) => {
    setEditingTemplate(template)
    setShowTemplateEditor(true)
  }

  const handleSaveTemplate = async (templateData) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData)
      } else {
        await createTemplate(templateData)
      }
      fetchTemplates() // Refresh the list
      setShowTemplateEditor(false)
    } catch (err) {
      throw err
    }
  }

  const handleCreateAutomation = () => {
    setEditingAutomation(null)
    setShowAutomationBuilder(true)
  }

  const handleEditAutomation = (automation) => {
    setEditingAutomation(automation)
    setShowAutomationBuilder(true)
  }

  const handleSaveAutomation = async (automationData) => {
    try {
      await createAutomation(automationData)
      fetchAutomations() // Refresh the list
      setShowAutomationBuilder(false)
    } catch (err) {
      throw err
    }
  }

  const handleCreateCampaign = () => {
    setEditingCampaign(null)
    setShowCampaignComposer(true)
  }

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign)
    setShowCampaignComposer(true)
  }

  const handleSaveCampaign = async (campaignData) => {
    try {
      await createCampaign(campaignData)
      fetchCampaigns() // Refresh the list
      setShowCampaignComposer(false)
    } catch (err) {
      throw err
    }
  }

  const handleViewCampaignAnalytics = (campaign) => {
    setViewingCampaign(campaign)
    setShowCampaignAnalytics(true)
  }

  const handleSaveSegment = (segmentData) => {
    toast.success(`Segment "${segmentData.name}" created successfully`)
    setShowSegmentBuilder(false)
  }

  const handleSelectImage = (image) => {
    // This will be called when an image is selected from the library
    // Can be used to insert into editor or store reference
    toast.success(`Image "${image.name}" selected`)
    setShowImageLibrary(false)
  }

  // Show full-screen campaign analytics
  if (showCampaignAnalytics) {
    return (
      <CampaignAnalytics
        campaign={viewingCampaign}
        onBack={() => setShowCampaignAnalytics(false)}
      />
    )
  }

  // Show full-screen campaign composer
  if (showCampaignComposer) {
    return (
      <CampaignComposer
        campaign={editingCampaign}
        onSave={handleSaveCampaign}
        onBack={() => setShowCampaignComposer(false)}
        onEditTemplate={handleEditTemplate}
      />
    )
  }

  // Show full-screen automation builder
  if (showAutomationBuilder) {
    return (
      <AutomationBuilder
        automation={editingAutomation}
        onSave={handleSaveAutomation}
        onBack={() => setShowAutomationBuilder(false)}
      />
    )
  }

  // Show full-screen template editor
  if (showTemplateEditor) {
    return (
      <EmailTemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onBack={() => setShowTemplateEditor(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Email Platform</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Create newsletters, automate sequences, and grow your audience
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-9 max-w-5xl">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="automations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Automations</span>
          </TabsTrigger>
          <TabsTrigger value="system-emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Subscribers</span>
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Lists</span>
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">A/B Tests</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignsTab 
            onCreateCampaign={handleCreateCampaign}
            onEditCampaign={handleEditCampaign}
            onViewAnalytics={handleViewCampaignAnalytics}
          />
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          <AutomationsTab 
            onCreateAutomation={handleCreateAutomation}
            onEditAutomation={handleEditAutomation}
          />
        </TabsContent>

        <TabsContent value="system-emails" className="mt-6">
          <SystemEmailsTab />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesTab 
            onEditTemplate={handleEditTemplate}
            onCreateTemplate={handleCreateTemplate}
            onOpenImageLibrary={() => setShowImageLibrary(true)}
          />
        </TabsContent>

        <TabsContent value="subscribers" className="mt-6">
          <SubscribersTab 
            onOpenSegmentBuilder={() => setShowSegmentBuilder(true)}
          />
        </TabsContent>

        <TabsContent value="lists" className="mt-6">
          <ListManagement />
        </TabsContent>

        <TabsContent value="testing" className="mt-6">
          <ABTestingPanel />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SegmentBuilder
        open={showSegmentBuilder}
        onOpenChange={setShowSegmentBuilder}
        onSave={handleSaveSegment}
      />

      <ImageLibrary
        open={showImageLibrary}
        onOpenChange={setShowImageLibrary}
        onSelect={handleSelectImage}
      />
    </div>
  )
}
