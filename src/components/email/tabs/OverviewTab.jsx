/**
 * OverviewTab - Email Platform Dashboard Overview
 * Code-split from EmailPlatform.jsx for better load performance
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Mail,
  Users,
  Zap,
  Plus,
  Send,
  Eye,
  Loader2,
  TrendingUp,
  MousePointerClick,
  Activity,
  Sparkles,
  Palette,
  ChevronRight,
  Tag,
  UserPlus
} from 'lucide-react'
import { useEmailPlatformStore } from '@/lib/email-platform-store'

export default function OverviewTab({ onNavigate }) {
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
