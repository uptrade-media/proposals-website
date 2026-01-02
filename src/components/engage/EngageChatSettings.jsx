// src/components/engage/EngageChatSettings.jsx
// Configure the live chat widget for a project

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import {
  MessageCircle,
  Settings,
  Palette,
  Users,
  Clock,
  Zap,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  HelpCircle,
  User,
  Sparkles,
  X,
  Plus
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import EchoNudgeSettings from './EchoNudgeSettings'

// Widget icon options
const WIDGET_ICONS = [
  { value: 'chat', label: 'Chat Bubble', icon: MessageCircle },
  { value: 'message', label: 'Message', icon: MessageSquare },
  { value: 'help', label: 'Help', icon: HelpCircle },
  { value: 'user', label: 'Person', icon: User }
]

// Form field options
const FORM_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' }
]

// Days of the week
const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' }
]

// Common timezones
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'UTC', label: 'UTC' }
]

// Default business hours
const DEFAULT_BUSINESS_HOURS = {
  timezone: 'America/New_York',
  enabled: false,
  schedule: {
    mon: { enabled: true, start: '09:00', end: '17:00' },
    tue: { enabled: true, start: '09:00', end: '17:00' },
    wed: { enabled: true, start: '09:00', end: '17:00' },
    thu: { enabled: true, start: '09:00', end: '17:00' },
    fri: { enabled: true, start: '09:00', end: '17:00' },
    sat: { enabled: false, start: '09:00', end: '17:00' },
    sun: { enabled: false, start: '09:00', end: '17:00' }
  }
}

export default function EngageChatSettings({ projectId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [signalEnabled, setSignalEnabled] = useState(false)
  const [project, setProject] = useState(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Fetch config on mount
  useEffect(() => {
    if (projectId) {
      fetchConfig()
    }
  }, [projectId])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/.netlify/functions/engage-chat-config?projectId=${projectId}`)
      
      // Initialize business_hours if null
      const configWithDefaults = {
        ...data.config,
        business_hours: data.config.business_hours || DEFAULT_BUSINESS_HOURS
      }
      
      setConfig(configWithDefaults)
      setSignalEnabled(data.signalEnabled)
      setProject(data.project)
      
      // Fetch team members if org is available
      if (data.project?.org?.id) {
        fetchTeamMembers(data.project.org.id)
      }
    } catch (error) {
      console.error('Failed to fetch chat config:', error)
      toast.error('Failed to load chat settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async (orgId) => {
    try {
      setLoadingMembers(true)
      const { data } = await api.get(`/.netlify/functions/admin-org-members?organizationId=${orgId}`)
      setTeamMembers(data.members || [])
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  // Helper functions for custom assignees
  const toggleAssignee = (contactId) => {
    const current = config.custom_assignees || []
    if (current.includes(contactId)) {
      updateConfig({ custom_assignees: current.filter(id => id !== contactId) })
    } else {
      updateConfig({ custom_assignees: [...current, contactId] })
    }
  }

  const isAssigned = (contactId) => {
    return (config.custom_assignees || []).includes(contactId)
  }

  // Helper functions for business hours
  const updateBusinessHours = (updates) => {
    updateConfig({
      business_hours: { ...config.business_hours, ...updates }
    })
  }

  const updateDaySchedule = (day, updates) => {
    updateConfig({
      business_hours: {
        ...config.business_hours,
        schedule: {
          ...config.business_hours?.schedule,
          [day]: { ...config.business_hours?.schedule?.[day], ...updates }
        }
      }
    })
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.put('/.netlify/functions/engage-chat-config', {
        projectId,
        config
      })
      toast.success('Chat settings saved!')
    } catch (error) {
      console.error('Failed to save chat config:', error)
      toast.error(error.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const toggleRequiredField = (field) => {
    const required = config.form_required_fields || []
    const optional = config.form_optional_fields || []
    
    if (required.includes(field)) {
      // Move to optional
      updateConfig({
        form_required_fields: required.filter(f => f !== field),
        form_optional_fields: [...optional, field]
      })
    } else if (optional.includes(field)) {
      // Remove entirely
      updateConfig({
        form_optional_fields: optional.filter(f => f !== field)
      })
    } else {
      // Add as required
      updateConfig({
        form_required_fields: [...required, field]
      })
    }
  }

  const getFieldState = (field) => {
    if (config?.form_required_fields?.includes(field)) return 'required'
    if (config?.form_optional_fields?.includes(field)) return 'optional'
    return 'hidden'
  }

  const copyEmbedCode = () => {
    const code = `<script src="${window.location.origin}/engage-widget.js" data-project="${projectId}" async></script>`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Embed code copied!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load chat settings</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Live Chat Widget
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure the chat widget for {project?.title || 'this project'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Enable Widget */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Chat Widget</Label>
              <p className="text-sm text-muted-foreground">
                Show the chat widget on your website
              </p>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(checked) => updateConfig({ is_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {config.is_enabled && (
        <>
          {/* Chat Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Chat Mode
              </CardTitle>
              <CardDescription>
                Choose how visitors interact with your chat widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {/* Live Chat Only */}
                <div
                  className={cn(
                    'p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    config.chat_mode === 'live_only'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                  onClick={() => updateConfig({ chat_mode: 'live_only' })}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0',
                      config.chat_mode === 'live_only'
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    )}>
                      {config.chat_mode === 'live_only' && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Live Chat Only</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Visitors fill out a form, and you respond from the portal.
                        Simple and effective for human-only support.
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Chat with Handoff */}
                <div
                  className={cn(
                    'p-4 rounded-lg border-2 transition-colors',
                    !signalEnabled && 'opacity-60',
                    config.chat_mode === 'ai'
                      ? 'border-primary bg-primary/5'
                      : 'border-border',
                    signalEnabled && 'cursor-pointer hover:border-muted-foreground/50'
                  )}
                  onClick={() => signalEnabled && updateConfig({ chat_mode: 'ai' })}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0',
                      config.chat_mode === 'ai'
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    )}>
                      {config.chat_mode === 'ai' && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        AI Chat with Handoff
                        <Badge variant="outline" className="text-xs">
                          Signal
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI responds instantly using your knowledge base.
                        Visitors can request human handoff anytime.
                      </p>
                      {!signalEnabled && (
                        <Alert className="mt-3">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Enable Signal for this project to use AI chat.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">
                <Settings className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="w-4 h-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="form">
                <MessageSquare className="w-4 h-4 mr-2" />
                Form
              </TabsTrigger>
              <TabsTrigger value="routing">
                <Users className="w-4 h-4 mr-2" />
                Routing
              </TabsTrigger>
              <TabsTrigger value="nudges">
                <Sparkles className="w-4 h-4 mr-2" />
                Nudges
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-open widget</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically open the widget after a delay
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          placeholder="Off"
                          value={config.auto_open_delay || ''}
                          onChange={(e) => updateConfig({ 
                            auto_open_delay: e.target.value ? parseInt(e.target.value) : null 
                          })}
                        />
                        <span className="text-sm text-muted-foreground">seconds</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Play sound on new message</Label>
                        <p className="text-xs text-muted-foreground">
                          Alert visitors when agents reply
                        </p>
                      </div>
                      <Switch
                        checked={config.play_sound_on_message}
                        onCheckedChange={(checked) => updateConfig({ play_sound_on_message: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show unread indicator</Label>
                        <p className="text-xs text-muted-foreground">
                          Show badge when there are unread messages
                        </p>
                      </div>
                      <Switch
                        checked={config.show_unread_indicator}
                        onCheckedChange={(checked) => updateConfig({ show_unread_indicator: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show "Powered by Uptrade"</Label>
                        <p className="text-xs text-muted-foreground">
                          Display branding on the widget
                        </p>
                      </div>
                      <Switch
                        checked={config.show_powered_by}
                        onCheckedChange={(checked) => updateConfig({ show_powered_by: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Settings (only show when chat_mode is 'ai') */}
              {config.chat_mode === 'ai' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Chat Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Initial AI Message</Label>
                      <Textarea
                        placeholder="Hi! 👋 How can I help you today?"
                        value={config.initial_message || ''}
                        onChange={(e) => updateConfig({ initial_message: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable human handoff</Label>
                        <p className="text-xs text-muted-foreground">
                          Allow visitors to request a human agent
                        </p>
                      </div>
                      <Switch
                        checked={config.handoff_enabled}
                        onCheckedChange={(checked) => updateConfig({ handoff_enabled: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select
                        value={config.position}
                        onValueChange={(value) => updateConfig({ position: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select
                        value={config.widget_icon}
                        onValueChange={(value) => updateConfig({ widget_icon: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WIDGET_ICONS.map(icon => (
                            <SelectItem key={icon.value} value={icon.value}>
                              <div className="flex items-center gap-2">
                                <icon.icon className="w-4 h-4" />
                                {icon.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        className="w-12 h-10 p-1 cursor-pointer"
                        value={config.theme?.accent || '#4bbf39'}
                        onChange={(e) => updateConfig({ 
                          theme: { ...config.theme, accent: e.target.value } 
                        })}
                      />
                      <Input
                        value={config.theme?.accent || '#4bbf39'}
                        onChange={(e) => updateConfig({ 
                          theme: { ...config.theme, accent: e.target.value } 
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative h-48 bg-muted rounded-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-background to-muted" />
                    {/* Widget Preview */}
                    <div 
                      className={cn(
                        'absolute bottom-4',
                        config.position === 'bottom-right' ? 'right-4' : 'left-4'
                      )}
                    >
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: config.theme?.accent || '#4bbf39' }}
                      >
                        {(() => {
                          const IconComponent = WIDGET_ICONS.find(i => i.value === config.widget_icon)?.icon || MessageCircle
                          return <IconComponent className="w-6 h-6 text-white" />
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Form Tab */}
            <TabsContent value="form" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Form</CardTitle>
                  <CardDescription>
                    {config.chat_mode === 'ai' 
                      ? 'Shown when visitors request human handoff'
                      : 'Shown when visitors open the chat widget'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Form Heading</Label>
                    <Input
                      placeholder="Chat with our team"
                      value={config.form_heading || ''}
                      onChange={(e) => updateConfig({ form_heading: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Form Description</Label>
                    <Textarea
                      placeholder="Leave your info and we'll respond shortly."
                      value={config.form_description || ''}
                      onChange={(e) => updateConfig({ form_description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Form Fields</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Click to cycle: Required → Optional → Hidden
                    </p>
                    <div className="grid gap-2">
                      {FORM_FIELDS.map(field => {
                        const state = getFieldState(field.value)
                        return (
                          <div
                            key={field.value}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                              state === 'required' && 'bg-primary/5 border-primary/30',
                              state === 'optional' && 'bg-muted border-muted-foreground/20',
                              state === 'hidden' && 'opacity-50'
                            )}
                            onClick={() => toggleRequiredField(field.value)}
                          >
                            <span className="font-medium">{field.label}</span>
                            <Badge variant={state === 'required' ? 'default' : 'outline'}>
                              {state}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show message field</Label>
                      <p className="text-xs text-muted-foreground">
                        "How can we help?" textarea
                      </p>
                    </div>
                    <Switch
                      checked={config.form_show_message}
                      onCheckedChange={(checked) => updateConfig({ form_show_message: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Submit Button Text</Label>
                    <Input
                      placeholder="Start Chat"
                      value={config.form_submit_text || ''}
                      onChange={(e) => updateConfig({ form_submit_text: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Routing Tab */}
            <TabsContent value="routing" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Chat Routing</CardTitle>
                  <CardDescription>
                    Choose who receives chat messages and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Route chats to</Label>
                    <Select
                      value={config.routing_type}
                      onValueChange={(value) => updateConfig({ routing_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project">Project Team</SelectItem>
                        <SelectItem value="org">Organization Admins</SelectItem>
                        <SelectItem value="uptrade">Uptrade Media Team</SelectItem>
                        <SelectItem value="custom">Custom Assignment</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {config.routing_type === 'project' && 'Members assigned to this project will receive chats'}
                      {config.routing_type === 'org' && 'Organization administrators will receive chats'}
                      {config.routing_type === 'uptrade' && 'Uptrade Media team will handle all chats'}
                      {config.routing_type === 'custom' && 'Select specific team members below'}
                    </p>
                  </div>

                  {config.routing_type === 'custom' && (
                    <div className="space-y-3">
                      <Label>Custom Assignees</Label>
                      <p className="text-xs text-muted-foreground">
                        Select team members who will receive chat notifications
                      </p>
                      
                      {loadingMembers ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading team members...
                        </div>
                      ) : teamMembers.length === 0 ? (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            No team members found. Add members to your organization first.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          {/* Selected assignees */}
                          {(config.custom_assignees || []).length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {(config.custom_assignees || []).map(contactId => {
                                const member = teamMembers.find(m => m.contact?.id === contactId)
                                if (!member) return null
                                return (
                                  <Badge key={contactId} variant="secondary" className="pl-1 pr-1 gap-1">
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src={member.contact?.avatar} />
                                      <AvatarFallback className="text-[10px]">
                                        {getInitials(member.contact?.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs">{member.contact?.name}</span>
                                    <button
                                      onClick={() => toggleAssignee(contactId)}
                                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                          
                          {/* Available team members */}
                          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                            {teamMembers
                              .filter(m => !isAssigned(m.contact?.id))
                              .map(member => (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => toggleAssignee(member.contact?.id)}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left transition-colors"
                                >
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={member.contact?.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(member.contact?.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {member.contact?.name || member.contact?.email}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {member.contact?.email}
                                    </p>
                                  </div>
                                  <Plus className="w-4 h-4 text-muted-foreground" />
                                </button>
                              ))}
                            {teamMembers.filter(m => !isAssigned(m.contact?.id)).length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                All team members are assigned
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Business Hours
                  </CardTitle>
                  <CardDescription>
                    Configure availability for human handoff (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Enable business hours */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Restrict to business hours</Label>
                      <p className="text-xs text-muted-foreground">
                        Only offer human handoff during specified hours
                      </p>
                    </div>
                    <Switch
                      checked={config.business_hours?.enabled || false}
                      onCheckedChange={(checked) => updateBusinessHours({ enabled: checked })}
                    />
                  </div>

                  {config.business_hours?.enabled && (
                    <>
                      <Separator />
                      
                      {/* Timezone */}
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Select
                          value={config.business_hours?.timezone || 'America/New_York'}
                          onValueChange={(value) => updateBusinessHours({ timezone: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONES.map(tz => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Weekly schedule */}
                      <div className="space-y-2">
                        <Label>Weekly Schedule</Label>
                        <div className="border rounded-lg divide-y">
                          {DAYS_OF_WEEK.map(day => {
                            const daySchedule = config.business_hours?.schedule?.[day.value] || {
                              enabled: day.value !== 'sat' && day.value !== 'sun',
                              start: '09:00',
                              end: '17:00'
                            }
                            
                            return (
                              <div key={day.value} className="flex items-center gap-4 p-3">
                                <div className="w-24">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={daySchedule.enabled}
                                      onCheckedChange={(checked) => 
                                        updateDaySchedule(day.value, { enabled: checked })
                                      }
                                    />
                                    <span className={cn(
                                      'text-sm font-medium',
                                      !daySchedule.enabled && 'text-muted-foreground'
                                    )}>
                                      {day.label.slice(0, 3)}
                                    </span>
                                  </div>
                                </div>
                                
                                {daySchedule.enabled ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      type="time"
                                      value={daySchedule.start}
                                      onChange={(e) => 
                                        updateDaySchedule(day.value, { start: e.target.value })
                                      }
                                      className="w-28"
                                    />
                                    <span className="text-muted-foreground">to</span>
                                    <Input
                                      type="time"
                                      value={daySchedule.end}
                                      onChange={(e) => 
                                        updateDaySchedule(day.value, { end: e.target.value })
                                      }
                                      className="w-28"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Closed</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Offline behavior */}
                      <div className="space-y-2">
                        <Label>Outside business hours</Label>
                        <Select
                          value={config.offline_mode || 'show_form'}
                          onValueChange={(value) => updateConfig({ offline_mode: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="show_form">Show "Leave a message" form</SelectItem>
                            <SelectItem value="ai_only">AI chat only (no handoff option)</SelectItem>
                            <SelectItem value="hide_handoff">Hide handoff button</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          What happens when visitors request human help outside business hours
                        </p>
                      </div>
                    </>
                  )}

                  {!config.business_hours?.enabled && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Human handoff is available 24/7. Enable business hours to restrict availability.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Echo Nudges Tab */}
            <TabsContent value="nudges" className="space-y-4 mt-4">
              <EchoNudgeSettings projectId={projectId} />
            </TabsContent>
          </Tabs>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Embed Code
              </CardTitle>
              <CardDescription>
                Add this script to your website to display the chat widget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                  <code>{`<script src="${window.location.origin}/engage-widget.js" data-project="${projectId}" async></script>`}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={copyEmbedCode}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
