// src/components/engage/EngageElementEditor.jsx
// Edit popup, nudge, banner, or toast element

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/lib/toast'
import api from '@/lib/api'
import {
  ArrowLeft,
  Save,
  Loader2,
  Eye,
  Play,
  Pause,
  Settings,
  Palette,
  Target,
  Clock,
  BarChart2,
  Sparkles,
  Plus,
  X,
  Trash2
} from 'lucide-react'

const POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top-bar', label: 'Top Bar' },
  { value: 'bottom-bar', label: 'Bottom Bar' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'slide-in', label: 'Slide In' }
]

const ANIMATIONS = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'scale', label: 'Scale' },
  { value: 'none', label: 'None' }
]

const TRIGGERS = [
  { value: 'time', label: 'Time Delay' },
  { value: 'scroll', label: 'Scroll Depth' },
  { value: 'exit', label: 'Exit Intent' },
  { value: 'load', label: 'Page Load' },
  { value: 'inactivity', label: 'Inactivity' }
]

const FREQUENCIES = [
  { value: 'once', label: 'Once Ever' },
  { value: 'session', label: 'Once Per Session' },
  { value: 'day', label: 'Once Per Day' },
  { value: 'week', label: 'Once Per Week' },
  { value: 'always', label: 'Always Show' }
]

const CTA_ACTIONS = [
  { value: 'link', label: 'Open Link' },
  { value: 'chat', label: 'Open Chat' },
  { value: 'scheduler', label: 'Open Scheduler' },
  { value: 'close', label: 'Close Element' },
  { value: 'custom', label: 'Custom Action' }
]

export default function EngageElementEditor({ elementId, onBack }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [element, setElement] = useState(null)
  const [activeTab, setActiveTab] = useState('content')

  useEffect(() => {
    if (elementId) {
      fetchElement()
    }
  }, [elementId])

  const fetchElement = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/.netlify/functions/engage-elements?elementId=${elementId}`)
      setElement(data.element)
    } catch (error) {
      console.error('Failed to fetch element:', error)
      toast.error('Failed to load element')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.put('/.netlify/functions/engage-elements', {
        elementId,
        ...element
      })
      toast.success('Element saved!')
    } catch (error) {
      console.error('Failed to save element:', error)
      toast.error('Failed to save element')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      await api.put('/.netlify/functions/engage-elements', {
        elementId,
        action: 'publish'
      })
      toast.success('Element published!')
      fetchElement()
    } catch (error) {
      toast.error('Failed to publish element')
    }
  }

  const handlePause = async () => {
    try {
      await api.put('/.netlify/functions/engage-elements', {
        elementId,
        action: 'pause'
      })
      toast.success('Element paused')
      fetchElement()
    } catch (error) {
      toast.error('Failed to pause element')
    }
  }

  const updateElement = (updates) => {
    setElement(prev => ({ ...prev, ...updates }))
  }

  const updateTriggerConfig = (key, value) => {
    setElement(prev => ({
      ...prev,
      trigger_config: {
        ...prev.trigger_config,
        [key]: value
      }
    }))
  }

  const addPagePattern = () => {
    const patterns = element.page_patterns || []
    updateElement({ page_patterns: [...patterns, '/*'] })
  }

  const removePagePattern = (index) => {
    const patterns = [...(element.page_patterns || [])]
    patterns.splice(index, 1)
    updateElement({ page_patterns: patterns })
  }

  const updatePagePattern = (index, value) => {
    const patterns = [...(element.page_patterns || [])]
    patterns[index] = value
    updateElement({ page_patterns: patterns })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!element) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Element not found</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <Input
              value={element.name}
              onChange={(e) => updateElement({ name: e.target.value })}
              className="text-xl font-semibold border-none p-0 h-auto focus-visible:ring-0"
              placeholder="Element name"
            />
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">
                {element.element_type}
              </Badge>
              {element.is_draft && <Badge variant="secondary">Draft</Badge>}
              {!element.is_draft && element.is_active && (
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              )}
              {!element.is_draft && !element.is_active && (
                <Badge variant="outline">Paused</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          
          {element.is_draft ? (
            <Button onClick={handlePublish}>
              <Play className="w-4 h-4 mr-2" />
              Publish
            </Button>
          ) : element.is_active ? (
            <Button variant="outline" onClick={handlePause}>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button onClick={handlePublish}>
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}
          
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="targeting" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Targeting
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Behavior
          </TabsTrigger>
          <TabsTrigger value="variants" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            A/B Testing
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>What message do you want to show?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  value={element.headline || ''}
                  onChange={(e) => updateElement({ headline: e.target.value })}
                  placeholder="Attention-grabbing headline"
                />
              </div>

              <div className="space-y-2">
                <Label>Body Text</Label>
                <Textarea
                  value={element.body || ''}
                  onChange={(e) => updateElement({ body: e.target.value })}
                  placeholder="Supporting message..."
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Call-to-Action Button</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Button Text</Label>
                    <Input
                      value={element.cta_text || ''}
                      onChange={(e) => updateElement({ cta_text: e.target.value })}
                      placeholder="Learn More"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Action</Label>
                    <Select
                      value={element.cta_action || 'link'}
                      onValueChange={(v) => updateElement({ cta_action: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CTA_ACTIONS.map(action => (
                          <SelectItem key={action.value} value={action.value}>
                            {action.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {element.cta_action === 'link' && (
                <div className="space-y-2">
                  <Label>Link URL</Label>
                  <Input
                    value={element.cta_url || ''}
                    onChange={(e) => updateElement({ cta_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Image URL (optional)</Label>
                <Input
                  value={element.image_url || ''}
                  onChange={(e) => updateElement({ image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Position & Animation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select
                    value={element.position || 'center'}
                    onValueChange={(v) => updateElement({ position: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map(pos => (
                        <SelectItem key={pos.value} value={pos.value}>
                          {pos.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Animation</Label>
                  <Select
                    value={element.animation || 'fade'}
                    onValueChange={(v) => updateElement({ animation: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMATIONS.map(anim => (
                        <SelectItem key={anim.value} value={anim.value}>
                          {anim.label}
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
                  <input
                    type="color"
                    value={element.theme?.accent || '#4bbf39'}
                    onChange={(e) => updateElement({
                      theme: { ...element.theme, accent: e.target.value }
                    })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={element.theme?.accent || '#4bbf39'}
                    onChange={(e) => updateElement({
                      theme: { ...element.theme, accent: e.target.value }
                    })}
                    className="w-32 font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Targeting Tab */}
        <TabsContent value="targeting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Targeting</CardTitle>
              <CardDescription>
                Specify which pages should show this element. Leave empty to show on all pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Show on Pages (URL patterns)</Label>
                {(element.page_patterns || []).map((pattern, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={pattern}
                      onChange={(e) => updatePagePattern(i, e.target.value)}
                      placeholder="/blog/*"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePagePattern(i)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPagePattern}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pattern
                </Button>
                <p className="text-xs text-muted-foreground">
                  Use * as wildcard. Example: /blog/* matches all blog pages.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Device Targeting</Label>
                <div className="flex items-center gap-4">
                  {['desktop', 'mobile', 'tablet'].map(device => (
                    <label key={device} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={element.device_targets?.includes(device)}
                        onChange={(e) => {
                          const current = element.device_targets || []
                          updateElement({
                            device_targets: e.target.checked
                              ? [...current, device]
                              : current.filter(d => d !== device)
                          })
                        }}
                        className="rounded"
                      />
                      <span className="capitalize">{device}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Visitor Types</Label>
                <div className="flex items-center gap-4">
                  {['new', 'returning'].map(type => (
                    <label key={type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={element.visitor_types?.includes(type)}
                        onChange={(e) => {
                          const current = element.visitor_types || []
                          updateElement({
                            visitor_types: e.target.checked
                              ? [...current, type]
                              : current.filter(t => t !== type)
                          })
                        }}
                        className="rounded"
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Tab */}
        <TabsContent value="behavior" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trigger Settings</CardTitle>
              <CardDescription>When should this element appear?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={element.trigger_type || 'time'}
                  onValueChange={(v) => updateElement({ trigger_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map(trigger => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {element.trigger_type === 'time' && (
                <div className="space-y-2">
                  <Label>Delay (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={element.trigger_config?.delay_seconds || 5}
                    onChange={(e) => updateTriggerConfig('delay_seconds', parseInt(e.target.value))}
                  />
                </div>
              )}

              {element.trigger_type === 'scroll' && (
                <div className="space-y-2">
                  <Label>Scroll Depth (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={element.trigger_config?.scroll_percent || 50}
                    onChange={(e) => updateTriggerConfig('scroll_percent', parseInt(e.target.value))}
                  />
                </div>
              )}

              {element.trigger_type === 'inactivity' && (
                <div className="space-y-2">
                  <Label>Inactivity Time (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={element.trigger_config?.inactivity_seconds || 30}
                    onChange={(e) => updateTriggerConfig('inactivity_seconds', parseInt(e.target.value))}
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Frequency Cap</Label>
                <Select
                  value={element.frequency_cap || 'session'}
                  onValueChange={(v) => updateElement({ frequency_cap: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(freq => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Schedule (optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      type="datetime-local"
                      value={element.start_date ? element.start_date.slice(0, 16) : ''}
                      onChange={(e) => updateElement({ 
                        start_date: e.target.value ? new Date(e.target.value).toISOString() : null 
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      type="datetime-local"
                      value={element.end_date ? element.end_date.slice(0, 16) : ''}
                      onChange={(e) => updateElement({ 
                        end_date: e.target.value ? new Date(e.target.value).toISOString() : null 
                      })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="variants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>A/B Test Variants</CardTitle>
              <CardDescription>
                Test different versions of this element to see what performs best.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {element.variants?.map((variant, i) => (
                <div key={variant.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={variant.is_control ? 'default' : 'outline'}>
                        Variant {variant.variant_name}
                      </Badge>
                      {variant.is_control && (
                        <span className="text-xs text-muted-foreground">(Control)</span>
                      )}
                      {variant.is_winner && (
                        <Badge className="bg-green-100 text-green-800">Winner</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {variant.traffic_percent}% traffic
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Impressions:</span>{' '}
                      <span className="font-medium">{variant.impressions || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Clicks:</span>{' '}
                      <span className="font-medium">{variant.clicks || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conv:</span>{' '}
                      <span className="font-medium">{variant.conversions || 0}</span>
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Variant
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
