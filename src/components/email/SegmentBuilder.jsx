/**
 * SegmentBuilder - Conditions-based subscriber filtering
 * Visual segment creation with AND/OR logic
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Users,
  Filter,
  Sparkles,
  Save,
  Eye,
  GripVertical,
  ChevronDown,
  Mail,
  MousePointerClick,
  Tag,
  Calendar,
  Globe,
  Smartphone,
  ShoppingCart,
  Star,
  Clock,
  AlertCircle
} from 'lucide-react'
import './styles/liquid-glass.css'

// Condition types with their operators
const CONDITION_TYPES = {
  email_activity: {
    label: 'Email Activity',
    icon: Mail,
    color: 'blue',
    fields: [
      { value: 'opened_campaign', label: 'Opened campaign' },
      { value: 'clicked_campaign', label: 'Clicked in campaign' },
      { value: 'not_opened', label: 'Did not open' },
      { value: 'open_rate', label: 'Open rate' },
      { value: 'click_rate', label: 'Click rate' },
    ],
    operators: {
      opened_campaign: ['any', 'specific', 'in_last'],
      clicked_campaign: ['any', 'specific', 'in_last'],
      not_opened: ['any', 'specific', 'in_last'],
      open_rate: ['greater_than', 'less_than', 'equals'],
      click_rate: ['greater_than', 'less_than', 'equals'],
    }
  },
  subscriber_data: {
    label: 'Subscriber Data',
    icon: Users,
    color: 'purple',
    fields: [
      { value: 'email', label: 'Email address' },
      { value: 'name', label: 'Name' },
      { value: 'subscribed_date', label: 'Subscribed date' },
      { value: 'source', label: 'Signup source' },
      { value: 'list', label: 'List membership' },
    ],
    operators: {
      email: ['contains', 'not_contains', 'starts_with', 'ends_with'],
      name: ['contains', 'not_contains', 'is', 'is_not'],
      subscribed_date: ['before', 'after', 'in_last', 'more_than'],
      source: ['is', 'is_not'],
      list: ['is_member', 'is_not_member'],
    }
  },
  engagement: {
    label: 'Engagement Score',
    icon: Star,
    color: 'amber',
    fields: [
      { value: 'engagement_level', label: 'Engagement level' },
      { value: 'total_opens', label: 'Total opens' },
      { value: 'total_clicks', label: 'Total clicks' },
      { value: 'last_engaged', label: 'Last engaged' },
    ],
    operators: {
      engagement_level: ['is', 'is_not'],
      total_opens: ['greater_than', 'less_than', 'equals'],
      total_clicks: ['greater_than', 'less_than', 'equals'],
      last_engaged: ['in_last', 'more_than'],
    }
  },
  location: {
    label: 'Location',
    icon: Globe,
    color: 'cyan',
    fields: [
      { value: 'country', label: 'Country' },
      { value: 'city', label: 'City' },
      { value: 'timezone', label: 'Timezone' },
    ],
    operators: {
      country: ['is', 'is_not', 'is_one_of'],
      city: ['is', 'is_not', 'contains'],
      timezone: ['is', 'is_not'],
    }
  },
  tags: {
    label: 'Tags',
    icon: Tag,
    color: 'green',
    fields: [
      { value: 'has_tag', label: 'Has tag' },
      { value: 'not_has_tag', label: 'Does not have tag' },
    ],
    operators: {
      has_tag: ['is', 'is_one_of'],
      not_has_tag: ['is', 'is_one_of'],
    }
  },
  device: {
    label: 'Device',
    icon: Smartphone,
    color: 'indigo',
    fields: [
      { value: 'device_type', label: 'Device type' },
      { value: 'email_client', label: 'Email client' },
    ],
    operators: {
      device_type: ['is', 'is_not'],
      email_client: ['is', 'is_not', 'is_one_of'],
    }
  },
}

const OPERATOR_LABELS = {
  any: 'any',
  specific: 'specific campaign',
  in_last: 'in the last',
  more_than: 'more than',
  greater_than: 'is greater than',
  less_than: 'is less than',
  equals: 'equals',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  is: 'is',
  is_not: 'is not',
  is_one_of: 'is one of',
  before: 'before',
  after: 'after',
  is_member: 'is member of',
  is_not_member: 'is not member of',
}

// Single condition row
function ConditionRow({ condition, onUpdate, onRemove, isFirst, conjunction, onConjunctionChange }) {
  const categoryConfig = CONDITION_TYPES[condition.category]
  const Icon = categoryConfig?.icon || Filter
  
  const availableOperators = categoryConfig?.operators?.[condition.field] || []
  
  return (
    <div className="relative">
      {/* Conjunction (AND/OR) */}
      {!isFirst && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border shadow-sm">
            <button
              onClick={() => onConjunctionChange('and')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                conjunction === 'and' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-muted-foreground hover:bg-gray-100'
              }`}
            >
              AND
            </button>
            <button
              onClick={() => onConjunctionChange('or')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                conjunction === 'or' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'text-muted-foreground hover:bg-gray-100'
              }`}
            >
              OR
            </button>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3 p-4 glass-card hover:shadow-lg transition-shadow group">
        {/* Drag handle */}
        <div className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Category indicator */}
        <div className={`p-2 rounded-lg bg-${categoryConfig?.color || 'gray'}-100`}>
          <Icon className={`h-4 w-4 text-${categoryConfig?.color || 'gray'}-600`} />
        </div>
        
        {/* Category select */}
        <Select 
          value={condition.category} 
          onValueChange={(v) => onUpdate({ ...condition, category: v, field: '', operator: '', value: '' })}
        >
          <SelectTrigger className="w-40 glass-input">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONDITION_TYPES).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <config.icon className="h-4 w-4" />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Field select */}
        <Select 
          value={condition.field}
          onValueChange={(v) => onUpdate({ ...condition, field: v, operator: '', value: '' })}
        >
          <SelectTrigger className="w-40 glass-input">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {categoryConfig?.fields?.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Operator select */}
        <Select 
          value={condition.operator}
          onValueChange={(v) => onUpdate({ ...condition, operator: v })}
        >
          <SelectTrigger className="w-40 glass-input">
            <SelectValue placeholder="Select operator" />
          </SelectTrigger>
          <SelectContent>
            {availableOperators.map((op) => (
              <SelectItem key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Value input */}
        <Input
          value={condition.value}
          onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
          placeholder="Enter value..."
          className="flex-1 glass-input"
        />
        
        {/* Remove button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function SegmentBuilder({ open, onOpenChange, onSave, existingSegment }) {
  const [name, setName] = useState(existingSegment?.name || '')
  const [conditions, setConditions] = useState(existingSegment?.conditions || [
    { id: 1, category: 'email_activity', field: '', operator: '', value: '', conjunction: 'and' }
  ])
  const [matchedCount, setMatchedCount] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const addCondition = () => {
    setConditions([
      ...conditions,
      { 
        id: Date.now(), 
        category: 'email_activity', 
        field: '', 
        operator: '', 
        value: '',
        conjunction: 'and'
      }
    ])
  }

  const updateCondition = (id, updates) => {
    setConditions(conditions.map(c => c.id === id ? updates : c))
  }

  const removeCondition = (id) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter(c => c.id !== id))
    }
  }

  const updateConjunction = (id, conjunction) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, conjunction } : c))
  }

  const calculateMatches = async () => {
    setIsCalculating(true)
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000))
    setMatchedCount(Math.floor(Math.random() * 500) + 100)
    setIsCalculating(false)
  }

  const handleSave = () => {
    if (name && conditions.length > 0) {
      onSave({
        name,
        conditions,
        matchedCount,
        createdAt: new Date().toISOString()
      })
      onOpenChange(false)
    }
  }

  // Preset segments
  const presets = [
    { name: 'Highly Engaged', description: 'Open rate > 50%', icon: Star },
    { name: 'New Subscribers', description: 'Joined in last 30 days', icon: Users },
    { name: 'Inactive', description: 'No opens in 90 days', icon: Clock },
    { name: 'Mobile Users', description: 'Opens on mobile devices', icon: Smartphone },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-panel border-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Create Segment
          </DialogTitle>
          <DialogDescription>
            Define conditions to create a dynamic subscriber segment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Segment Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">Segment Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Highly Engaged Subscribers"
              className="glass-input"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Presets</label>
            <div className="grid grid-cols-4 gap-3">
              {presets.map((preset, i) => (
                <button
                  key={i}
                  className="glass-card p-3 text-left hover:shadow-lg transition-all group"
                  onClick={() => {
                    setName(preset.name)
                    // Would set conditions based on preset
                  }}
                >
                  <preset.icon className="h-5 w-5 text-indigo-600 mb-2" />
                  <p className="font-medium text-sm">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Conditions</label>
              <Button variant="outline" size="sm" onClick={addCondition} className="gap-1">
                <Plus className="h-4 w-4" />
                Add Condition
              </Button>
            </div>
            
            <div className="space-y-2">
              {conditions.map((condition, index) => (
                <ConditionRow
                  key={condition.id}
                  condition={condition}
                  onUpdate={(updates) => updateCondition(condition.id, updates)}
                  onRemove={() => removeCondition(condition.id)}
                  isFirst={index === 0}
                  conjunction={condition.conjunction}
                  onConjunctionChange={(conj) => updateConjunction(condition.id, conj)}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="glass-accent p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium">
                    {isCalculating ? 'Calculating...' : matchedCount !== null ? (
                      <span><strong>{matchedCount}</strong> subscribers match this segment</span>
                    ) : 'Calculate matching subscribers'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Preview how many subscribers will be in this segment
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={calculateMatches}
                disabled={isCalculating}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                {isCalculating ? 'Calculating...' : 'Preview'}
              </Button>
            </div>
          </div>

          {/* Tips */}
          <div className="flex items-start gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-200/50">
            <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Pro Tips</p>
              <ul className="text-sm text-amber-800 mt-1 space-y-1">
                <li>• Use AND to narrow down your segment (must match all conditions)</li>
                <li>• Use OR to broaden your segment (match any condition)</li>
                <li>• Segments update automatically as subscriber data changes</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || conditions.length === 0} className="gap-2">
            <Save className="h-4 w-4" />
            Save Segment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
