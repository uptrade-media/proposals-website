// src/components/engage/EchoNudgeSettings.jsx
// Configure page-specific Echo nudges for proactive AI engagement

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Clock,
  MousePointer,
  ScrollText,
  Globe,
  MessageCircle,
  HelpCircle,
  Zap,
  GripVertical,
  Eye,
  ToggleLeft,
  X
} from 'lucide-react'

// Nudge trigger types
const NUDGE_TYPES = [
  { value: 'question', label: 'Conversation Starter', icon: MessageCircle, description: 'Invite user to start a conversation' },
  { value: 'help', label: 'Help Offer', icon: HelpCircle, description: 'Offer assistance based on page context' },
  { value: 'tip', label: 'Pro Tip', icon: Sparkles, description: 'Share relevant advice or insights' },
  { value: 'cta', label: 'Call to Action', icon: Zap, description: 'Encourage specific action' }
]

// Trigger conditions
const TRIGGER_CONDITIONS = [
  { value: 'time', label: 'Time on Page', icon: Clock, unit: 'seconds' },
  { value: 'scroll', label: 'Scroll Depth', icon: ScrollText, unit: '%' },
  { value: 'exit', label: 'Exit Intent', icon: MousePointer, unit: null }
]

// Default new nudge config
const DEFAULT_NUDGE = {
  pagePattern: '',
  initialMessage: '',
  suggestedPrompts: [''],
  nudgeMessage: '',
  nudgeDelaySeconds: 30,
  nudgeType: 'question',
  pageContext: '',
  skillHints: [],
  isActive: true,
  priority: 0
}

export default function EchoNudgeSettings({ projectId }) {
  const [nudges, setNudges] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingNudge, setEditingNudge] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Fetch nudges on mount
  useEffect(() => {
    if (projectId) {
      fetchNudges()
    }
  }, [projectId])

  const fetchNudges = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/.netlify/functions/engage-echo-config?projectId=${projectId}`)
      setNudges(response.data.configs || [])
    } catch (error) {
      console.error('Failed to fetch nudges:', error)
      toast.error('Failed to load Echo nudges')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingNudge({ ...DEFAULT_NUDGE })
    setIsDialogOpen(true)
  }

  const handleEdit = (nudge) => {
    // Convert snake_case to camelCase for editing
    setEditingNudge({
      id: nudge.id,
      pagePattern: nudge.page_pattern || '',
      initialMessage: nudge.initial_message || '',
      suggestedPrompts: nudge.suggested_prompts?.length ? nudge.suggested_prompts : [''],
      nudgeMessage: nudge.nudge_message || '',
      nudgeDelaySeconds: nudge.nudge_delay_seconds || 30,
      nudgeType: nudge.nudge_type || 'question',
      pageContext: nudge.page_context || '',
      skillHints: nudge.skill_hints || [],
      isActive: nudge.is_active !== false,
      priority: nudge.priority || 0
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingNudge.pagePattern) {
      toast.error('Page pattern is required')
      return
    }
    if (!editingNudge.nudgeMessage) {
      toast.error('Nudge message is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...editingNudge,
        projectId,
        // Filter empty prompts
        suggestedPrompts: editingNudge.suggestedPrompts.filter(p => p.trim())
      }

      if (editingNudge.id) {
        // Update existing
        await api.put('/.netlify/functions/engage-echo-config', payload)
        toast.success('Nudge updated')
      } else {
        // Create new
        await api.post('/.netlify/functions/engage-echo-config', payload)
        toast.success('Nudge created')
      }

      setIsDialogOpen(false)
      setEditingNudge(null)
      fetchNudges()
    } catch (error) {
      console.error('Failed to save nudge:', error)
      toast.error('Failed to save nudge')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (nudgeId) => {
    try {
      await api.delete(`/.netlify/functions/engage-echo-config?id=${nudgeId}`)
      toast.success('Nudge deleted')
      setDeleteConfirm(null)
      fetchNudges()
    } catch (error) {
      console.error('Failed to delete nudge:', error)
      toast.error('Failed to delete nudge')
    }
  }

  const handleToggleActive = async (nudge) => {
    try {
      await api.put('/.netlify/functions/engage-echo-config', {
        id: nudge.id,
        isActive: !nudge.is_active
      })
      fetchNudges()
    } catch (error) {
      console.error('Failed to toggle nudge:', error)
      toast.error('Failed to update nudge')
    }
  }

  const updateEditingField = (field, value) => {
    setEditingNudge(prev => ({ ...prev, [field]: value }))
  }

  const addSuggestedPrompt = () => {
    setEditingNudge(prev => ({
      ...prev,
      suggestedPrompts: [...prev.suggestedPrompts, '']
    }))
  }

  const updateSuggestedPrompt = (index, value) => {
    setEditingNudge(prev => ({
      ...prev,
      suggestedPrompts: prev.suggestedPrompts.map((p, i) => i === index ? value : p)
    }))
  }

  const removeSuggestedPrompt = (index) => {
    setEditingNudge(prev => ({
      ...prev,
      suggestedPrompts: prev.suggestedPrompts.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Echo Nudges</h3>
          <p className="text-sm text-muted-foreground">
            Configure page-specific AI prompts to proactively engage visitors
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Nudge
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Nudges appear after a delay to engage visitors with contextual AI assistance. 
          Configure different messages for different pages using URL patterns.
        </AlertDescription>
      </Alert>

      {/* Nudges List */}
      {nudges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-2">No nudges configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first nudge to proactively engage visitors
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Nudge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {nudges.map((nudge) => (
            <NudgeCard
              key={nudge.id}
              nudge={nudge}
              onEdit={() => handleEdit(nudge)}
              onToggle={() => handleToggleActive(nudge)}
              onDelete={() => setDeleteConfirm(nudge.id)}
            />
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNudge?.id ? 'Edit Nudge' : 'Create New Nudge'}
            </DialogTitle>
            <DialogDescription>
              Configure when and how Echo should proactively engage visitors
            </DialogDescription>
          </DialogHeader>

          {editingNudge && (
            <div className="space-y-6 py-4">
              {/* Page Pattern */}
              <div className="space-y-2">
                <Label htmlFor="pagePattern">Page URL Pattern *</Label>
                <Input
                  id="pagePattern"
                  placeholder="/pricing, /products/*, /contact"
                  value={editingNudge.pagePattern}
                  onChange={(e) => updateEditingField('pagePattern', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use * as wildcard. Examples: /pricing, /blog/*, /products/**
                </p>
              </div>

              {/* Nudge Type */}
              <div className="space-y-2">
                <Label>Nudge Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {NUDGE_TYPES.map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateEditingField('nudgeType', type.value)}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                          editingNudge.nudgeType === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <Icon className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Nudge Message */}
              <div className="space-y-2">
                <Label htmlFor="nudgeMessage">Nudge Message *</Label>
                <Textarea
                  id="nudgeMessage"
                  placeholder="Hi! 👋 I noticed you're looking at our pricing. Want me to help you find the right plan?"
                  value={editingNudge.nudgeMessage}
                  onChange={(e) => updateEditingField('nudgeMessage', e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  The message that appears in the widget to engage the visitor
                </p>
              </div>

              {/* Delay */}
              <div className="space-y-2">
                <Label htmlFor="delay">Show After (seconds)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="delay"
                    type="number"
                    min={5}
                    max={300}
                    value={editingNudge.nudgeDelaySeconds}
                    onChange={(e) => updateEditingField('nudgeDelaySeconds', parseInt(e.target.value) || 30)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">seconds on page</span>
                </div>
              </div>

              <Separator />

              {/* Suggested Prompts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Suggested Reply Buttons</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSuggestedPrompt}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {editingNudge.suggestedPrompts.map((prompt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={`Quick reply ${index + 1}`}
                        value={prompt}
                        onChange={(e) => updateSuggestedPrompt(index, e.target.value)}
                      />
                      {editingNudge.suggestedPrompts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSuggestedPrompt(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Quick reply buttons visitors can click instead of typing
                </p>
              </div>

              <Separator />

              {/* Page Context */}
              <div className="space-y-2">
                <Label htmlFor="pageContext">Page Context (for AI)</Label>
                <Textarea
                  id="pageContext"
                  placeholder="This is the pricing page. The user is likely comparing plans and may have questions about features, pricing tiers, or discounts."
                  value={editingNudge.pageContext}
                  onChange={(e) => updateEditingField('pageContext', e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Extra context to help Echo give more relevant responses on this page
                </p>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={String(editingNudge.priority)}
                  onValueChange={(value) => updateEditingField('priority', parseInt(value))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Normal</SelectItem>
                    <SelectItem value="1">High</SelectItem>
                    <SelectItem value="2">Highest</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher priority nudges take precedence when multiple patterns match
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable this nudge
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={editingNudge.isActive}
                  onCheckedChange={(checked) => updateEditingField('isActive', checked)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Nudge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Nudge?</DialogTitle>
            <DialogDescription>
              This will permanently delete this nudge configuration. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(deleteConfirm)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Nudge Card Component
function NudgeCard({ nudge, onEdit, onToggle, onDelete }) {
  const nudgeType = NUDGE_TYPES.find(t => t.value === nudge.nudge_type) || NUDGE_TYPES[0]
  const TypeIcon = nudgeType.icon

  return (
    <Card className={cn(
      'transition-opacity',
      !nudge.is_active && 'opacity-60'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg',
            nudge.is_active ? 'bg-primary/10' : 'bg-muted'
          )}>
            <TypeIcon className={cn(
              'h-5 w-5',
              nudge.is_active ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                {nudge.page_pattern}
              </code>
              <Badge variant={nudge.is_active ? 'default' : 'secondary'} className="text-xs">
                {nudge.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {nudge.priority > 0 && (
                <Badge variant="outline" className="text-xs">
                  Priority {nudge.priority}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {nudge.nudge_message}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {nudge.nudge_delay_seconds}s delay
              </span>
              <span className="flex items-center gap-1">
                <TypeIcon className="h-3 w-3" />
                {nudgeType.label}
              </span>
              {nudge.suggested_prompts?.length > 0 && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {nudge.suggested_prompts.length} quick replies
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <ToggleLeft className={cn(
                'h-4 w-4',
                nudge.is_active && 'text-primary'
              )} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
