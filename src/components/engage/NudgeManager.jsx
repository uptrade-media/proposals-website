// src/components/engage/NudgeManager.jsx
// Comprehensive nudge (contextual popup) management with A/B testing and Signal optimization
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  TrendingUp,
  Zap,
  Brain,
  Settings,
  ChevronRight,
  X,
  Save,
  AlertCircle,
  Check,
  Activity,
  Sparkles,
  BarChart3,
  Target,
  Clock,
  Mouse,
  Scroll,
  Flame,
  BookOpen,
  Lightbulb,
  Users,
  Hourglass,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// Nudge types with icons
const NUDGE_TYPES = [
  { value: 'question', label: 'Question', icon: HelpCircle, description: 'Ask a question to start conversation', color: 'text-blue-500' },
  { value: 'offer', label: 'Offer', icon: Gift, description: 'Present a specific offer or CTA', color: 'text-green-500' },
  { value: 'insight', label: 'Insight', icon: Lightbulb, description: 'Share a relevant insight about the page', color: 'text-yellow-500' },
  { value: 'social_proof', label: 'Social Proof', icon: Users, description: 'Show recent activity or testimonials', color: 'text-purple-500' },
  { value: 'urgency', label: 'Urgency', icon: Flame, description: 'Limited time or scarcity messaging', color: 'text-orange-500' },
]

const TRIGGER_TYPES = [
  { value: 'time', label: 'Time Delay', icon: Clock, description: 'Show after X seconds on page' },
  { value: 'scroll', label: 'Scroll Depth', icon: Scroll, description: 'Show at X% scroll depth' },
  { value: 'exit_intent', label: 'Exit Intent', icon: AlertCircle, description: 'Show when user moves to leave' },
  { value: 'click', label: 'Click Trigger', icon: Mouse, description: 'Show on specific element click' },
  { value: 'behavior', label: 'Behavior', icon: Activity, description: 'Based on user actions (visits, time)' },
]

const NUDGE_POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'center-left', label: 'Center Left' },
  { value: 'center', label: 'Center' },
  { value: 'center-right', label: 'Center Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' },
]

function HelpCircle(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
}

function Gift(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M12 5v13M2 10h20"/></svg>
}

// Nudge Editor Modal
function NudgeEditorModal({ nudge, isOpen, onClose, onSave, signalEnabled, tenantFeatures }) {
  const [formData, setFormData] = useState(nudge || getDefaultNudge())
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (nudge) {
      setFormData(nudge)
    }
  }, [nudge])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-40 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {nudge ? 'Edit Nudge' : 'Create New Nudge'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Design a contextual nudge to guide visitors
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="m-0">
          <TabsList className="w-full rounded-none border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="triggers" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="targeting" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Targeting
            </TabsTrigger>
            {tenantFeatures?.abTesting && (
              <TabsTrigger value="variants" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                A/B Test
              </TabsTrigger>
            )}
            {signalEnabled && (
              <TabsTrigger value="signal" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Signal
              </TabsTrigger>
            )}
          </TabsList>

          <div className="p-6 space-y-6">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              <div>
                <Label htmlFor="name">Nudge Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 'Pricing Page CTA'"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Nudge Type</Label>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {NUDGE_TYPES.map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.value}
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={cn(
                          'p-3 rounded-lg border-2 transition-all text-left',
                          formData.type === type.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={cn('w-4 h-4 mt-0.5', type.color)} />
                          <div>
                            <div className="font-medium text-sm text-slate-900 dark:text-white">{type.label}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{type.description}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <Label>Position</Label>
                <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUDGE_POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <Label htmlFor="active" className="font-medium">Active</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Show this nudge to visitors</p>
                </div>
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="Main message"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Supporting text"
                  rows="3"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cta_text">CTA Text</Label>
                  <Input
                    id="cta_text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="Button text"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="cta_url">CTA URL/Action</Label>
                  <Input
                    id="cta_url"
                    value={formData.ctaUrl}
                    onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                    placeholder="URL or action ID"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="image_url">Image URL (optional)</Label>
                <Input
                  id="image_url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="mt-2"
                />
              </div>
            </TabsContent>

            {/* Triggers Tab */}
            <TabsContent value="triggers" className="space-y-4">
              <div>
                <Label>Primary Trigger</Label>
                <Select value={formData.triggerType} onValueChange={(value) => setFormData({ ...formData, triggerType: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        <div className="flex items-center gap-2">
                          <trigger.icon className="w-4 h-4" />
                          {trigger.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.triggerType === 'time' && (
                <div>
                  <Label htmlFor="delay">Delay (seconds)</Label>
                  <Input
                    id="delay"
                    type="number"
                    min="0"
                    value={formData.triggerConfig?.delaySeconds || 3}
                    onChange={(e) => setFormData({
                      ...formData,
                      triggerConfig: { ...formData.triggerConfig, delaySeconds: parseInt(e.target.value) }
                    })}
                    className="mt-2"
                  />
                </div>
              )}

              {formData.triggerType === 'scroll' && (
                <div>
                  <Label htmlFor="scroll">Scroll Depth (%)</Label>
                  <Input
                    id="scroll"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.triggerConfig?.scrollDepth || 25}
                    onChange={(e) => setFormData({
                      ...formData,
                      triggerConfig: { ...formData.triggerConfig, scrollDepth: parseInt(e.target.value) }
                    })}
                    className="mt-2"
                  />
                </div>
              )}

              {formData.triggerType === 'behavior' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="visits">Page Visits Needed</Label>
                    <Input
                      id="visits"
                      type="number"
                      min="1"
                      value={formData.triggerConfig?.minVisits || 1}
                      onChange={(e) => setFormData({
                        ...formData,
                        triggerConfig: { ...formData.triggerConfig, minVisits: parseInt(e.target.value) }
                      })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeOnPage">Time on Page (seconds)</Label>
                    <Input
                      id="timeOnPage"
                      type="number"
                      min="0"
                      value={formData.triggerConfig?.minTimeOnPage || 10}
                      onChange={(e) => setFormData({
                        ...formData,
                        triggerConfig: { ...formData.triggerConfig, minTimeOnPage: parseInt(e.target.value) }
                      })}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Frequency Cap</Label>
                  <Select
                    value={formData.frequencyCap}
                    onValueChange={(value) => setFormData({ ...formData, frequencyCap: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">Once per Session</SelectItem>
                      <SelectItem value="day">Once per Day</SelectItem>
                      <SelectItem value="week">Once per Week</SelectItem>
                      <SelectItem value="ever">Once Ever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maxImpressions">Max Impressions (0 = unlimited)</Label>
                  <Input
                    id="maxImpressions"
                    type="number"
                    min="0"
                    value={formData.maxImpressions || 0}
                    onChange={(e) => setFormData({ ...formData, maxImpressions: parseInt(e.target.value) })}
                    className="mt-2"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Targeting Tab */}
            <TabsContent value="targeting" className="space-y-4">
              <div>
                <Label htmlFor="pagePattern">Page Pattern</Label>
                <Input
                  id="pagePattern"
                  value={formData.pagePattern}
                  onChange={(e) => setFormData({ ...formData, pagePattern: e.target.value })}
                  placeholder="e.g., /pricing/* or /services/web-design"
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Use * as wildcard. Empty = all pages
                </p>
              </div>

              <div>
                <Label>Device Targeting</Label>
                <div className="space-y-2 mt-2">
                  {['desktop', 'tablet', 'mobile'].map((device) => (
                    <div key={device} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`device-${device}`}
                        checked={formData.deviceTargets?.includes(device)}
                        onChange={(e) => {
                          const devices = formData.deviceTargets || []
                          setFormData({
                            ...formData,
                            deviceTargets: e.target.checked
                              ? [...devices, device]
                              : devices.filter((d) => d !== device)
                          })
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`device-${device}`} className="capitalize cursor-pointer">{device}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Visitor Type</Label>
                <div className="space-y-2 mt-2">
                  {['new', 'returning'].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`visitor-${type}`}
                        checked={formData.visitorTypes?.includes(type)}
                        onChange={(e) => {
                          const types = formData.visitorTypes || []
                          setFormData({
                            ...formData,
                            visitorTypes: e.target.checked
                              ? [...types, type]
                              : types.filter((t) => t !== type)
                          })
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`visitor-${type}`} className="capitalize cursor-pointer">{type} visitors</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Traffic Source (optional)</Label>
                <div className="space-y-2 mt-2">
                  {['organic', 'paid', 'social', 'direct'].map((source) => (
                    <div key={source} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`source-${source}`}
                        checked={formData.trafficSources?.includes(source)}
                        onChange={(e) => {
                          const sources = formData.trafficSources || []
                          setFormData({
                            ...formData,
                            trafficSources: e.target.checked
                              ? [...sources, source]
                              : sources.filter((s) => s !== source)
                          })
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`source-${source}`} className="capitalize cursor-pointer">{source}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* A/B Testing Tab */}
            {tenantFeatures?.abTesting && (
              <TabsContent value="variants" className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">A/B Testing</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Create variants to test different headlines, messages, and designs
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Number of Variants</Label>
                  <Select
                    value={String(formData.variantsCount || 1)}
                    onValueChange={(value) => setFormData({ ...formData, variantsCount: parseInt(value) })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n === 1 ? 'No A/B Test' : `${n} Variants`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Traffic will be automatically split between variants. Winner determined by conversion rate.
                  </p>
                </div>
              </TabsContent>
            )}

            {/* Signal Optimization Tab */}
            {signalEnabled && (
              <TabsContent value="signal" className="space-y-4">
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-900 dark:text-purple-100">Signal AI Optimization</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                        Let Signal AI optimize timing, content, and targeting based on visitor behavior
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <Label htmlFor="signal-enabled" className="font-medium">Enable AI Optimization</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Signal will analyze and optimize this nudge
                    </p>
                  </div>
                  <Switch
                    id="signal-enabled"
                    checked={formData.signalOptimization?.enabled}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      signalOptimization: { ...formData.signalOptimization, enabled: checked }
                    })}
                  />
                </div>

                {formData.signalOptimization?.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label>Optimization Focus</Label>
                      <Select
                        value={formData.signalOptimization?.focus || 'conversion'}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          signalOptimization: { ...formData.signalOptimization, focus: value }
                        })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conversion">Maximize Conversions</SelectItem>
                          <SelectItem value="engagement">Maximize Engagement</SelectItem>
                          <SelectItem value="clicks">Maximize Clicks</SelectItem>
                          <SelectItem value="balance">Balance All Metrics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>AI Can Adjust</Label>
                      {['timing', 'content', 'targeting', 'design'].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`signal-${item}`}
                            defaultChecked
                            onChange={(e) => {
                              const adjustments = formData.signalOptimization?.adjustments || []
                              setFormData({
                                ...formData,
                                signalOptimization: {
                                  ...formData.signalOptimization,
                                  adjustments: e.target.checked
                                    ? [...adjustments, item]
                                    : adjustments.filter((a) => a !== item)
                                }
                              })
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`signal-${item}`} className="capitalize cursor-pointer">{item}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <h4 className="font-medium text-sm text-slate-900 dark:text-white mb-2">How it works:</h4>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>• Signal analyzes visitor interactions with your nudges</li>
                    <li>• Tests variations automatically when A/B testing enabled</li>
                    <li>• Adjusts timing and targeting based on conversion data</li>
                    <li>• Provides recommendations for improvements</li>
                  </ul>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="gap-2">
            <Save className="w-4 h-4" />
            {nudge ? 'Update Nudge' : 'Create Nudge'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Nudge List Item
function NudgeCard({ nudge, onEdit, onDuplicate, onDelete, onToggle, stats }) {
  const nudgeType = NUDGE_TYPES.find((t) => t.value === nudge.type)
  const Icon = nudgeType?.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'p-4 rounded-xl border-2 transition-all group cursor-pointer',
        nudge.isActive
          ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
      )}
      onClick={() => onEdit(nudge)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn('p-2 rounded-lg', nudgeType?.color?.replace('text-', 'bg-').replace('500', '100'))}>
            {Icon && <Icon className={cn('w-5 h-5', nudgeType?.color)} />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{nudge.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{nudgeType?.label}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle(nudge)
          }}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {nudge.isActive ? (
            <Eye className="w-5 h-5 text-slate-400" />
          ) : (
            <EyeOff className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {nudge.headline && <p className="text-sm text-slate-700 dark:text-slate-300">{nudge.headline}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{nudge.triggerType}</Badge>
          <Badge variant="outline" className="text-xs">{nudge.position}</Badge>
          {nudge.frequencyCap && <Badge variant="outline" className="text-xs">{nudge.frequencyCap}</Badge>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 mb-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Impressions</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.impressions || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Clicks</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.clicks || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">CTR</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(nudge)
          }}
          className="gap-1"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate(nudge)
          }}
          className="gap-1"
        >
          <Copy className="w-4 h-4" />
          Clone
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(nudge)
          }}
          className="gap-1 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>
    </motion.div>
  )
}

// Default nudge factory
function getDefaultNudge() {
  return {
    id: null,
    name: '',
    type: 'question',
    position: 'bottom-right',
    headline: '',
    message: '',
    ctaText: '',
    ctaUrl: '',
    imageUrl: '',
    triggerType: 'time',
    triggerConfig: { delaySeconds: 3 },
    pagePattern: '',
    deviceTargets: ['desktop', 'tablet', 'mobile'],
    visitorTypes: ['new', 'returning'],
    trafficSources: [],
    frequencyCap: 'session',
    maxImpressions: 0,
    isActive: true,
    variantsCount: 1,
    signalOptimization: { enabled: false },
  }
}

// Main Nudge Manager Component
export default function NudgeManager({ projectId, signalEnabled, tenantFeatures = {} }) {
  const [nudges, setNudges] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedNudge, setSelectedNudge] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [stats, setStats] = useState({})
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    fetchNudges()
  }, [projectId])

  const fetchNudges = async () => {
    try {
      setLoading(true)
      // Placeholder - implement actual API call
      // const { data } = await api.get(`/engage/nudges?projectId=${projectId}`)
      // setNudges(data.nudges)
      setNudges([])
    } catch (error) {
      console.error('Failed to fetch nudges:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (nudgeData) => {
    try {
      // Implement API call
      // if (nudgeData.id) {
      //   await api.put(`/engage/nudges/${nudgeData.id}`, nudgeData)
      // } else {
      //   await api.post(`/engage/nudges`, { ...nudgeData, projectId })
      // }
      
      if (nudgeData.id) {
        setNudges(nudges.map((n) => (n.id === nudgeData.id ? nudgeData : n)))
      } else {
        setNudges([...nudges, { ...nudgeData, id: Date.now() }])
      }
      
      setIsModalOpen(false)
      setSelectedNudge(null)
    } catch (error) {
      console.error('Failed to save nudge:', error)
    }
  }

  const handleDelete = async (nudge) => {
    if (confirm('Are you sure? This cannot be undone.')) {
      try {
        // await api.delete(`/engage/nudges/${nudge.id}`)
        setNudges(nudges.filter((n) => n.id !== nudge.id))
      } catch (error) {
        console.error('Failed to delete nudge:', error)
      }
    }
  }

  const handleDuplicate = (nudge) => {
    const cloned = { ...nudge, id: null, name: `${nudge.name} (Copy)` }
    setSelectedNudge(cloned)
    setIsModalOpen(true)
  }

  const filteredNudges = activeFilter === 'active' ? nudges.filter((n) => n.isActive) : nudges

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Nudge Manager
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Create contextual popups to guide visitors at the right moment
          </p>
        </div>
        <Button onClick={() => {
          setSelectedNudge(null)
          setIsModalOpen(true)
        }} className="gap-2">
          <Plus className="w-4 h-4" />
          New Nudge
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{nudges.length}</div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Active Nudges</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {nudges.filter((n) => n.signalOptimization?.enabled).length}
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">AI Optimized</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {nudges.filter((n) => n.variantsCount > 1).length}
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">A/B Testing</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {nudges.filter((n) => !n.isActive).length}
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">Paused</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'active'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeFilter === filter
                ? 'bg-blue-500 dark:bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {filter === 'all' ? 'All Nudges' : 'Active Only'}
          </button>
        ))}
      </div>

      {/* Nudges Grid */}
      <AnimatePresence mode="popLayout">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            <p className="text-slate-500 dark:text-slate-400 mt-3">Loading nudges...</p>
          </div>
        ) : filteredNudges.length === 0 ? (
          <Card className="border-dashed bg-slate-50/50 dark:bg-slate-800/50">
            <CardContent className="py-12 text-center">
              <Zap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No nudges yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">Create your first nudge to get started</p>
              <Button onClick={() => {
                setSelectedNudge(null)
                setIsModalOpen(true)
              }} className="gap-2">
                <Plus className="w-4 h-4" />
                Create First Nudge
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNudges.map((nudge) => (
              <NudgeCard
                key={nudge.id}
                nudge={nudge}
                onEdit={(n) => {
                  setSelectedNudge(n)
                  setIsModalOpen(true)
                }}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onToggle={(n) => {
                  setNudges(nudges.map((nd) =>
                    nd.id === n.id ? { ...nd, isActive: !nd.isActive } : nd
                  ))
                }}
                stats={stats[nudge.id]}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <NudgeEditorModal
        nudge={selectedNudge}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedNudge(null)
        }}
        onSave={handleSave}
        signalEnabled={signalEnabled}
        tenantFeatures={tenantFeatures}
      />
    </div>
  )
}
