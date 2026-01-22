/**
 * TaskDetailDrawer - Slide-out panel for viewing and editing task details
 * 
 * Features:
 * - Full task editing
 * - Checklist management
 * - Assignee selection
 * - File attachments
 * - Activity timeline
 */
import { useState, useEffect, useMemo } from 'react'
import {
  X, Calendar, Clock, Users, Tag, Paperclip, Plus,
  CheckCircle2, Circle, AlertTriangle, Trash2, Edit,
  ChevronDown, Save, MoreVertical,
  Search, Radio, Star, Zap, ShoppingCart, BookOpen, Mail, ListTodo
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  UPTRADE_TASK_STATUS_CONFIG,
  UPTRADE_TASK_PRIORITY_CONFIG,
  UPTRADE_TASK_MODULE_CONFIG,
} from '@/lib/projects-v2-store'

// Module icon mapping (matches Sidebar.jsx)
const MODULE_ICONS = {
  Search, Radio, Star, Zap, ShoppingCart, BookOpen, Users, Mail, ListTodo,
}

export function TaskDetailDrawer({
  task,
  isOpen,
  onClose,
  teamMembers = [],
  onSave,
  onComplete,
  onDelete,
  onAddChecklistItem,
  onToggleChecklistItem,
  onRemoveChecklistItem,
  isNew = false,
  enabledModules = [], // Array of enabled module keys from project features
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    module: '',
    due_date: null,
    due_time: '',
    assigned_to: [],
    tags: [],
    estimated_hours: '',
  })
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'not_started',
        priority: task.priority || 'medium',
        module: task.module || '',
        due_date: task.due_date ? parseISO(task.due_date) : null,
        due_time: task.due_time || '',
        assigned_to: task.assigned_to || [],
        tags: task.tags || [],
        estimated_hours: task.estimated_hours?.toString() || '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'not_started',
        priority: 'medium',
        module: '',
        due_date: null,
        due_time: '',
        assigned_to: [],
        tags: [],
        estimated_hours: '',
      })
    }
  }, [task])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleToggleAssignee = (userId) => {
    setFormData(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(userId)
        ? prev.assigned_to.filter(id => id !== userId)
        : [...prev.assigned_to, userId]
    }))
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Task title is required')
      return
    }

    setIsSaving(true)
    try {
      await onSave?.({
        ...formData,
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      })
      toast.success(isNew ? 'Task created' : 'Task updated')
      onClose?.()
    } catch (error) {
      toast.error('Failed to save task')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddChecklistItem = async (e) => {
    e.preventDefault()
    if (!newChecklistItem.trim() || !task?.id) return

    try {
      await onAddChecklistItem?.(task.id, newChecklistItem.trim())
      setNewChecklistItem('')
    } catch (error) {
      toast.error('Failed to add checklist item')
    }
  }

  const assignedMembers = useMemo(() => {
    return formData.assigned_to
      .map(id => teamMembers.find(m => m.id === id))
      .filter(Boolean)
  }, [formData.assigned_to, teamMembers])

  const checklistProgress = useMemo(() => {
    if (!task?.checklist?.length) return null
    const completed = task.checklist.filter(item => item.completed).length
    return { completed, total: task.checklist.length, percentage: Math.round((completed / task.checklist.length) * 100) }
  }, [task?.checklist])

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle>{isNew ? 'New Task' : 'Edit Task'}</SheetTitle>
            <div className="flex items-center gap-2">
              {!isNew && task && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onComplete?.(task.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {task.status === 'completed' ? 'Reopen' : 'Complete'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => {
                        onDelete?.(task.id)
                        onClose?.()
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Title */}
            <div>
              <Input
                placeholder="Task title..."
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="text-lg font-medium border-0 px-0 h-auto focus-visible:ring-0"
              />
            </div>

            {/* Status & Priority */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UPTRADE_TASK_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-block w-2 h-2 rounded-full",
                            config.color.replace('text-', 'bg-').replace('-700', '-500')
                          )} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UPTRADE_TASK_PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <Badge variant="secondary" className={config.color}>
                          {config.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Module */}
            <div>
              <Label className="text-xs text-muted-foreground">Module</Label>
              <Select 
                value={formData.module || 'none'} 
                onValueChange={(v) => handleChange('module', v === 'none' ? '' : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select module..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.entries(UPTRADE_TASK_MODULE_CONFIG)
                    .filter(([key]) => {
                      // Always show 'general' and 'prospects'
                      if (key === 'general' || key === 'prospects') return true
                      // Show if module is in enabledModules array
                      return enabledModules.length === 0 || enabledModules.includes(key)
                    })
                    .map(([key, config]) => {
                      const Icon = MODULE_ICONS[config.iconName] || ListTodo
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {config.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date & Time */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start mt-1 font-normal",
                        !formData.due_date && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {formData.due_date ? format(formData.due_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(date) => handleChange('due_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="w-32">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Input
                  type="time"
                  value={formData.due_time}
                  onChange={(e) => handleChange('due_time', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                placeholder="Add a description..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="mt-1 min-h-[100px]"
              />
            </div>

            {/* Assignees */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Assignees</Label>
              <div className="flex flex-wrap gap-2">
                {assignedMembers.map((member) => (
                  <Badge
                    key={member.id}
                    variant="secondary"
                    className="pl-1 pr-2 py-1 cursor-pointer hover:bg-destructive/10"
                    onClick={() => handleToggleAssignee(member.id)}
                  >
                    <Avatar className="h-5 w-5 mr-1.5">
                      <AvatarImage src={member.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {member.full_name}
                    <X className="h-3 w-3 ml-1.5 opacity-50" />
                  </Badge>
                ))}
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="space-y-1">
                      {teamMembers.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => handleToggleAssignee(member.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                            formData.assigned_to.includes(member.id) && "bg-primary/10"
                          )}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="text-[10px]">
                              {member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 text-left">{member.full_name}</span>
                          {formData.assigned_to.includes(member.id) && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Estimated Hours */}
            <div>
              <Label className="text-xs text-muted-foreground">Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
                value={formData.estimated_hours}
                onChange={(e) => handleChange('estimated_hours', e.target.value)}
                className="mt-1 w-32"
              />
            </div>

            <Separator />

            {/* Checklist */}
            {!isNew && task && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">Checklist</Label>
                  {checklistProgress && (
                    <span className="text-xs text-muted-foreground">
                      {checklistProgress.completed}/{checklistProgress.total} ({checklistProgress.percentage}%)
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {checklistProgress && (
                  <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${checklistProgress.percentage}%` }}
                    />
                  </div>
                )}

                {/* Checklist items */}
                <div className="space-y-1 mb-3">
                  {task.checklist?.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-2 py-1"
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => onToggleChecklistItem?.(task.id, item.id)}
                      />
                      <span className={cn(
                        "flex-1 text-sm",
                        item.completed && "line-through text-muted-foreground"
                      )}>
                        {item.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => onRemoveChecklistItem?.(task.id, item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add item */}
                <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                  <Input
                    placeholder="Add item..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" variant="secondary" size="sm" disabled={!newChecklistItem.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isNew ? 'Create Task' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default TaskDetailDrawer
