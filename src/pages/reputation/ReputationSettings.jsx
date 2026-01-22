/**
 * Reputation Settings
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Configure reputation management:
 * - Platform connections
 * - AI response settings
 * - Notification preferences
 * - Response templates
 * - CRM triggers
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Settings, Plug, Bot, Bell, FileText, Zap, 
  Plus, Trash2, Save, ExternalLink, Key 
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useReputationStore } from '@/lib/reputation-store'
import useAuthStore from '@/lib/auth-store'
import { useToast } from '@/hooks/use-toast'

// Platform config with OAuth requirements
const platformOptions = [
  { value: 'google', label: 'Google Business Profile', icon: '🔵', requiresOAuth: true, canRespond: true },
  { value: 'yelp', label: 'Yelp', icon: '🔴', requiresOAuth: false, canRespond: false },
  { value: 'facebook', label: 'Facebook', icon: '🔷', requiresOAuth: true, canRespond: true },
  { value: 'trustpilot', label: 'Trustpilot', icon: '🟢', requiresOAuth: true, canRespond: true, requiresPaidPlan: true },
]

// Platforms Tab
function PlatformsTab() {
  const [showConnect, setShowConnect] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('')
  
  // Yelp search state
  const [yelpSearchName, setYelpSearchName] = useState('')
  const [yelpSearchLocation, setYelpSearchLocation] = useState('')
  const [yelpResults, setYelpResults] = useState([])
  const [yelpSearching, setYelpSearching] = useState(false)
  const [selectedYelpBusiness, setSelectedYelpBusiness] = useState(null)

  const { 
    platforms, 
    platformsLoading, 
    fetchPlatforms, 
    getOAuthUrl,
    searchYelpBusiness,
    connectYelpBusiness,
    disconnectPlatform, 
    syncPlatform 
  } = useReputationStore()
  const { toast } = useToast()

  useEffect(() => {
    fetchPlatforms()
    
    // Check for OAuth callback in URL
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    
    if (connected) {
      toast({ title: `${connected} connected successfully!` })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
      fetchPlatforms()
    }
    if (error) {
      toast({ title: 'Connection failed', description: error, variant: 'destructive' })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Reset dialog state when platform changes
  useEffect(() => {
    setYelpResults([])
    setSelectedYelpBusiness(null)
    setYelpSearchName('')
    setYelpSearchLocation('')
  }, [selectedPlatform])

  const handleConnect = async () => {
    if (!selectedPlatform) return
    
    const config = platformOptions.find(p => p.value === selectedPlatform)
    
    // OAuth-based platforms (Google, Facebook)
    if (config?.requiresOAuth) {
      setConnecting(true)
      try {
        const { url } = await getOAuthUrl(selectedPlatform)
        // Redirect to OAuth provider
        window.location.href = url
      } catch (error) {
        toast({ title: 'Failed to start OAuth', description: error.message, variant: 'destructive' })
        setConnecting(false)
      }
      return
    }
    
    // Yelp - requires search and select
    if (selectedPlatform === 'yelp' && selectedYelpBusiness) {
      setConnecting(true)
      try {
        await connectYelpBusiness(selectedYelpBusiness.id, selectedYelpBusiness.name)
        toast({ title: 'Yelp connected' })
        setShowConnect(false)
        resetDialog()
      } catch (error) {
        toast({ title: 'Failed to connect', description: error.message, variant: 'destructive' })
      } finally {
        setConnecting(false)
      }
      return
    }

    toast({ title: 'Please complete the connection steps', variant: 'destructive' })
  }

  const handleYelpSearch = async () => {
    if (!yelpSearchName || !yelpSearchLocation) {
      toast({ title: 'Please enter business name and location', variant: 'destructive' })
      return
    }
    
    setYelpSearching(true)
    try {
      const results = await searchYelpBusiness(yelpSearchName, yelpSearchLocation)
      setYelpResults(results || [])
      if (results?.length === 0) {
        toast({ title: 'No businesses found', description: 'Try a different search' })
      }
    } catch (error) {
      toast({ title: 'Search failed', description: error.message, variant: 'destructive' })
    } finally {
      setYelpSearching(false)
    }
  }

  const resetDialog = () => {
    setSelectedPlatform('')
    setYelpResults([])
    setSelectedYelpBusiness(null)
    setYelpSearchName('')
    setYelpSearchLocation('')
  }

  const handleDisconnect = async (platformId) => {
    if (!confirm('Disconnect this platform? This will revoke access tokens.')) return
    try {
      await disconnectPlatform(platformId, true)
      toast({ title: 'Platform disconnected' })
    } catch (error) {
      toast({ title: 'Failed to disconnect', description: error.message, variant: 'destructive' })
    }
  }

  const handleSync = async (platformId) => {
    try {
      const result = await syncPlatform(platformId)
      if (result.success) {
        toast({ 
          title: 'Sync complete', 
          description: `${result.newReviews} new, ${result.updatedReviews} updated` 
        })
      } else {
        toast({ title: 'Sync failed', description: result.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' })
    }
  }

  if (platformsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  const selectedConfig = platformOptions.find(p => p.value === selectedPlatform)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Connect review platforms to monitor your online reputation</p>
        <Button onClick={() => setShowConnect(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Connect Platform
        </Button>
      </div>

      {platforms.length > 0 ? (
        <div className="space-y-3">
          {platforms.map((platform) => {
            const config = platformOptions.find(p => p.value === platform.platformType)
            return (
              <Card key={platform.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config?.icon || '⚪'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{platform.platformName || config?.label || platform.platformType}</span>
                          {!config?.canRespond && (
                            <Badge variant="outline" className="text-xs">Read-only</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {platform.totalReviews || 0} reviews • {platform.averageRating?.toFixed(1) || 'N/A'} avg
                          {platform.lastSyncAt && (
                            <span> • Synced {new Date(platform.lastSyncAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        {platform.syncError && (
                          <div className="text-xs text-red-500 mt-1">{platform.syncError}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {platform.isConnected ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSync(platform.id)}
                        disabled={!platform.isConnected}
                      >
                        Sync
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDisconnect(platform.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Plug className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No platforms connected</p>
              <p className="text-sm">Connect your first platform to start monitoring reviews</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showConnect} onOpenChange={(open) => { setShowConnect(open); if (!open) resetDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect Platform</DialogTitle>
            <DialogDescription>
              Select a review platform to connect
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platformOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {opt.icon} {opt.label}
                        {!opt.canRespond && <span className="text-xs text-muted-foreground">(read-only)</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* OAuth platforms info */}
            {selectedConfig?.requiresOAuth && (
              <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                <p className="font-medium mb-2">🔐 OAuth Connection</p>
                <p className="text-muted-foreground">
                  Clicking "Connect" will redirect you to {selectedConfig.label} to authorize access. 
                  {selectedConfig.canRespond && ' You\'ll be able to respond to reviews directly from this dashboard.'}
                </p>
                {selectedConfig.requiresPaidPlan && (
                  <p className="text-amber-600 dark:text-amber-400 mt-2 text-xs">
                    ⚠️ Requires a paid {selectedConfig.label} Business account for API access.
                  </p>
                )}
              </div>
            )}

            {/* Yelp search */}
            {selectedPlatform === 'yelp' && (
              <div className="space-y-3">
                <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">⚠️ Yelp Limitation</p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                    Yelp does not allow responding to reviews via API. You can view reviews but must respond directly on Yelp.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Business Name</Label>
                  <Input
                    value={yelpSearchName}
                    onChange={(e) => setYelpSearchName(e.target.value)}
                    placeholder="e.g., Uptrade Media"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>City or Location</Label>
                  <Input
                    value={yelpSearchLocation}
                    onChange={(e) => setYelpSearchLocation(e.target.value)}
                    placeholder="e.g., Denver, CO"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleYelpSearch}
                  disabled={yelpSearching || !yelpSearchName || !yelpSearchLocation}
                  className="w-full"
                >
                  {yelpSearching ? 'Searching...' : 'Search Yelp'}
                </Button>

                {yelpResults.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {yelpResults.map((biz) => (
                      <div 
                        key={biz.id}
                        onClick={() => setSelectedYelpBusiness(biz)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedYelpBusiness?.id === biz.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-muted-foreground/50'
                        }`}
                      >
                        <div className="font-medium">{biz.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {biz.address} • {biz.rating}⭐ ({biz.reviewCount} reviews)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConnect(false); resetDialog(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleConnect} 
              disabled={
                !selectedPlatform || 
                connecting ||
                (selectedPlatform === 'yelp' && !selectedYelpBusiness)
              }
            >
              {connecting ? 'Connecting...' : selectedConfig?.requiresOAuth ? 'Connect with OAuth' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// AI Settings Tab
function AISettingsTab() {
  const { settings, settingsLoading, fetchSettings, updateSettings } = useReputationStore()
  const { toast } = useToast()
  const [localSettings, setLocalSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings)
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings(localSettings)
      toast({ title: 'Settings saved' })
    } catch (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (settingsLoading || !localSettings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  const updateLocal = (key, value) => {
    setLocalSettings({ ...localSettings, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Brand Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brand Voice</CardTitle>
          <CardDescription>Configure how AI generates responses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Voice Style</Label>
            <Select 
              value={localSettings.brandVoice || 'professional'} 
              onValueChange={(v) => updateLocal('brandVoice', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {localSettings.brandVoice === 'custom' && (
            <div className="grid gap-2">
              <Label>Custom Voice Notes</Label>
              <Textarea
                value={localSettings.customVoiceNotes || ''}
                onChange={(e) => updateLocal('customVoiceNotes', e.target.value)}
                placeholder="Describe your brand voice..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Business Name</Label>
              <Input
                value={localSettings.businessName || ''}
                onChange={(e) => updateLocal('businessName', e.target.value)}
                placeholder="Your Business Name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Sign Responses As</Label>
              <Input
                value={localSettings.ownerName || ''}
                onChange={(e) => updateLocal('ownerName', e.target.value)}
                placeholder="e.g., John, The Team"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Response Automation</CardTitle>
          <CardDescription>Configure automatic response behavior by rating</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{'⭐'.repeat(rating)}</span>
                <span className="text-muted-foreground">{rating} star reviews</span>
              </div>
              <Select
                value={localSettings[`rating${rating}Action`] || 'queue'}
                onValueChange={(v) => updateLocal(`rating${rating}Action`, v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-respond</SelectItem>
                  <SelectItem value="queue">Queue for review</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                  <SelectItem value="ignore">Ignore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-response delay</Label>
                <p className="text-sm text-muted-foreground">Wait before posting automated responses</p>
              </div>
              <Select
                value={(localSettings.autoResponseDelayMinutes || 5).toString()}
                onValueChange={(v) => updateLocal('autoResponseDelayMinutes', parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Immediate</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SEO Integration</CardTitle>
          <CardDescription>Include SEO keywords in responses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Use SEO Keywords</Label>
              <p className="text-sm text-muted-foreground">Naturally include keywords from your SEO module</p>
            </div>
            <Switch
              checked={localSettings.useSeoKeywords || false}
              onCheckedChange={(v) => updateLocal('useSeoKeywords', v)}
            />
          </div>
          {localSettings.useSeoKeywords && (
            <div className="grid gap-2">
              <Label>Max Keywords per Response</Label>
              <Select
                value={(localSettings.maxKeywordsPerResponse || 2).toString()}
                onValueChange={(v) => updateLocal('maxKeywordsPerResponse', parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}

// Notifications Tab
function NotificationsTab() {
  const { settings, settingsLoading, fetchSettings, updateSettings } = useReputationStore()
  const { toast } = useToast()
  const [localSettings, setLocalSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings)
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings(localSettings)
      toast({ title: 'Notification settings saved' })
    } catch (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (settingsLoading || !localSettings) {
    return <Skeleton className="h-48" />
  }

  const updateLocal = (key, value) => {
    setLocalSettings({ ...localSettings, [key]: value })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Preferences</CardTitle>
          <CardDescription>Get alerted about reviews that need attention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Notification Email</Label>
            <Input
              type="email"
              value={localSettings.notificationEmail || ''}
              onChange={(e) => updateLocal('notificationEmail', e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Negative Reviews</Label>
                <p className="text-sm text-muted-foreground">Alert on 1-2 star reviews</p>
              </div>
              <Switch
                checked={localSettings.notifyOnNegative || false}
                onCheckedChange={(v) => updateLocal('notifyOnNegative', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Positive Reviews</Label>
                <p className="text-sm text-muted-foreground">Alert on 4-5 star reviews</p>
              </div>
              <Switch
                checked={localSettings.notifyOnPositive || false}
                onCheckedChange={(v) => updateLocal('notifyOnPositive', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Unanswered Review Reminder</Label>
                <p className="text-sm text-muted-foreground">Alert when reviews go unanswered</p>
              </div>
              <Select
                value={(localSettings.notifyOnUnansweredHours || 48).toString()}
                onValueChange={(v) => updateLocal('notifyOnUnansweredHours', parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Disabled</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}

// Templates Tab
function TemplatesTab() {
  const { templates, templatesLoading, fetchTemplates, createTemplate, deleteTemplate } = useReputationStore()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', category: 'positive', templateText: '' })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleCreate = async () => {
    try {
      await createTemplate(newTemplate)
      toast({ title: 'Template created' })
      setShowForm(false)
      setNewTemplate({ name: '', category: 'positive', templateText: '' })
    } catch (error) {
      toast({ title: 'Failed to create', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (templateId) => {
    if (!confirm('Delete this template?')) return
    try {
      await deleteTemplate(templateId)
      toast({ title: 'Template deleted' })
    } catch (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' })
    }
  }

  if (templatesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Create reusable response templates</p>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {templates.length > 0 ? (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{template.name}</span>
                      <Badge variant="outline">{template.category}</Badge>
                      {template.isDefault && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.templateText}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No templates yet</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Response Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Template Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., Thank You Response"
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive Reviews</SelectItem>
                  <SelectItem value="negative">Negative Reviews</SelectItem>
                  <SelectItem value="neutral">Neutral Reviews</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Template Text</Label>
              <Textarea
                value={newTemplate.templateText}
                onChange={(e) => setNewTemplate({ ...newTemplate, templateText: e.target.value })}
                placeholder="Write your template..."
                className="min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Credentials Tab (Admin only)
function CredentialsTab() {
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [credentialSource, setCredentialSource] = useState(null)
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    apiKey: '',
    redirectUri: '',
  })

  const { currentOrg } = useAuthStore()
  const { getCredentialSource, saveOrgCredentials, deleteOrgCredentials } = useReputationStore()
  const { toast } = useToast()

  const checkCredentialSource = async (platform) => {
    if (!platform) return
    try {
      const source = await getCredentialSource(platform)
      setCredentialSource(source)
    } catch (error) {
      console.error('Failed to check credentials:', error)
    }
  }

  useEffect(() => {
    if (selectedPlatform) {
      checkCredentialSource(selectedPlatform)
      setCredentials({ clientId: '', clientSecret: '', apiKey: '', redirectUri: '' })
    }
  }, [selectedPlatform])

  const handleSave = async () => {
    if (!selectedPlatform || !currentOrg?.id) return
    
    setSaving(true)
    try {
      await saveOrgCredentials(currentOrg.id, selectedPlatform, credentials)
      toast({ title: 'Credentials saved', description: 'OAuth credentials updated for this organization' })
      checkCredentialSource(selectedPlatform)
      setCredentials({ clientId: '', clientSecret: '', apiKey: '', redirectUri: '' })
    } catch (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPlatform || !currentOrg?.id) return
    if (!confirm('Delete custom credentials? This will revert to global Uptrade credentials.')) return
    
    setSaving(true)
    try {
      await deleteOrgCredentials(currentOrg.id, selectedPlatform)
      toast({ title: 'Credentials deleted', description: 'Now using default Uptrade credentials' })
      checkCredentialSource(selectedPlatform)
    } catch (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const isYelp = selectedPlatform === 'yelp'
  const hasCustomCreds = credentialSource?.source !== 'global'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            OAuth Credentials
          </CardTitle>
          <CardDescription>
            Configure custom OAuth credentials for your organization. Leave blank to use Uptrade's default credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Platform</Label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select a platform" />
              </SelectTrigger>
              <SelectContent>
                {platformOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.icon} {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlatform && credentialSource && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">
                <span className="font-medium">Current source:</span>{' '}
                {credentialSource.source === 'global' && 'Using Uptrade default credentials'}
                {credentialSource.source === 'org' && 'Using organization-level credentials'}
                {credentialSource.source === 'platform' && 'Using platform-specific credentials'}
              </p>
            </div>
          )}

          {selectedPlatform && (
            <>
              {isYelp ? (
                <div className="grid gap-2">
                  <Label>Yelp API Key</Label>
                  <Input
                    type="password"
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                    placeholder="Enter your Yelp Fusion API key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{' '}
                    <a href="https://www.yelp.com/developers" target="_blank" rel="noopener noreferrer" className="underline">
                      Yelp Fusion
                    </a>
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label>Client ID / App ID</Label>
                    <Input
                      type="password"
                      value={credentials.clientId}
                      onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                      placeholder="Enter OAuth Client ID"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Client Secret / App Secret</Label>
                    <Input
                      type="password"
                      value={credentials.clientSecret}
                      onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                      placeholder="Enter OAuth Client Secret"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Redirect URI (optional)</Label>
                    <Input
                      value={credentials.redirectUri}
                      onChange={(e) => setCredentials({ ...credentials, redirectUri: e.target.value })}
                      placeholder="https://api.uptrademedia.com/api/reputation/oauth/callback"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use the default redirect URI. Only change if white-labeling.
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Credentials
                </Button>
                {hasCustomCreds && (
                  <Button variant="outline" onClick={handleDelete} disabled={saving}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revert to Default
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-1">Google Business Profile</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
              <li>Create a project and enable "Business Profile APIs"</li>
              <li>Create OAuth 2.0 credentials (Web application)</li>
              <li>Set redirect URI to your callback URL</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium mb-1">Facebook</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Facebook Developers</a></li>
              <li>Create an app and add "Facebook Login" product</li>
              <li>Configure OAuth redirect URI</li>
              <li>Request necessary permissions (pages_read_engagement, etc.)</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium mb-1">Trustpilot</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Requires a Trustpilot Business account</li>
              <li>Apply for API access at <a href="https://developers.trustpilot.com" target="_blank" rel="noopener noreferrer" className="underline">Trustpilot Developers</a></li>
              <li>Create an application and get API Key/Secret</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReputationSettings() {
  const { isSuperAdmin, currentOrg } = useAuthStore()
  // Show credentials tab for super admins or org-level users
  const showCredentialsTab = isSuperAdmin || currentOrg?.userRole === 'admin'

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reputation Settings</h1>
        <p className="text-muted-foreground">Configure your reputation management preferences</p>
      </div>

      <Tabs defaultValue="platforms" className="space-y-6">
        <TabsList className={`grid w-full ${showCredentialsTab ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="platforms" className="flex items-center gap-2">
            <Plug className="w-4 h-4" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          {showCredentialsTab && (
            <TabsTrigger value="credentials" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Credentials
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="platforms">
          <PlatformsTab />
        </TabsContent>

        <TabsContent value="ai">
          <AISettingsTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>

        {showCredentialsTab && (
          <TabsContent value="credentials">
            <CredentialsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
