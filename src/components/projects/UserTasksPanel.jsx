/**
 * UserTasksPanel - Personal tasks for all user types
 * 
 * Features:
 * - Personal task management
 * - Category organization
 * - Quick add
 * - Today/Upcoming/Completed views
 * - Drag-to-reorder (TODO)
 */
import { useState, useMemo, useCallback } from 'react'
import { 
  Plus, Search, Calendar, CheckCircle2, Circle, Clock, Tag,
  MoreHorizontal, Trash2, Edit2, Star, StarOff, X
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast, isThisWeek, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

// Store
import { useUserTasksStore, priorityConfig } from '@/lib/projects-v2-store'

// Priority color classes
const PRIORITY_RING = {
  urgent: 'ring-2 ring-red-500',
  high: 'ring-2 ring-orange-500',
  normal: '',
  low: 'ring-2 ring-slate-300',
}

// Task grouping helpers
function groupTasksByDate(tasks) {
  const today = []
  const tomorrow = []
  const thisWeek = []
  const later = []
  const noDueDate = []

  tasks.forEach(task => {
    if (!task.due_date) {
      noDueDate.push(task)
      return
    }

    const dueDate = parseISO(task.due_date)
    if (isToday(dueDate)) {
      today.push(task)
    } else if (isTomorrow(dueDate)) {
      tomorrow.push(task)
    } else if (isThisWeek(dueDate)) {
      thisWeek.push(task)
    } else {
      later.push(task)
    }
  })

  return { today, tomorrow, thisWeek, later, noDueDate }
}

// Individual task row
function TaskRow({ 
  task, 
  categories,
  onToggle, 
  onEdit, 
  onDelete, 
  onToggleStar,
  onCategoryChange,
}) {
  const [isHovered, setIsHovered] = useState(false)

  const category = categories?.find(c => c.id === task.category_id)
  const dueDate = task.due_date ? parseISO(task.due_date) : null
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !task.completed_at

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors",
        task.completed_at && "opacity-60",
        isOverdue && "bg-red-50 dark:bg-red-950/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox */}
      <div 
        className={cn(
          "mt-0.5 rounded-full",
          !task.completed_at && PRIORITY_RING[task.priority || 'normal']
        )}
      >
        <Checkbox
          checked={!!task.completed_at}
          onCheckedChange={() => onToggle(task.id)}
          className={cn(
            "rounded-full h-5 w-5",
            task.completed_at && "data-[state=checked]:bg-green-500"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          task.completed_at && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        
        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1">
          {dueDate && (
            <span className={cn(
              "text-xs flex items-center gap-1",
              isOverdue ? "text-red-500" : "text-muted-foreground"
            )}>
              <Calendar className="h-3 w-3" />
              {isToday(dueDate) ? 'Today' : 
               isTomorrow(dueDate) ? 'Tomorrow' : 
               format(dueDate, 'MMM d')}
            </span>
          )}
          
          {category && (
            <Badge 
              variant="outline" 
              className="text-xs h-5"
              style={{ 
                borderColor: category.color,
                color: category.color,
              }}
            >
              {category.name}
            </Badge>
          )}
        </div>

        {task.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {task.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className={cn(
        "flex items-center gap-1 transition-opacity",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onToggleStar(task.id)}
        >
          {task.is_starred ? (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          ) : (
            <StarOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(task.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// Task group section
function TaskGroup({ title, tasks, categories, ...handlers }) {
  if (!tasks?.length) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 mb-2">
        {title} ({tasks.length})
      </h3>
      <div className="space-y-1">
        {tasks.map(task => (
          <TaskRow 
            key={task.id} 
            task={task} 
            categories={categories}
            {...handlers} 
          />
        ))}
      </div>
    </div>
  )
}

// Task edit dialog
function TaskEditDialog({ 
  task, 
  isOpen, 
  onClose, 
  categories, 
  onSave,
  onAddCategory,
}) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    notes: task?.notes || '',
    due_date: task?.due_date || null,
    priority: task?.priority || 'normal',
    category_id: task?.category_id || null,
    is_starred: task?.is_starred || false,
  })

  const [calendarOpen, setCalendarOpen] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    onSave(formData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task?.id ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What do you need to do?"
              autoFocus
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add details..."
              rows={3}
            />
          </div>

          {/* Due Date & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formData.due_date 
                      ? format(parseISO(formData.due_date), 'MMM d, yyyy')
                      : 'Set date'
                    }
                    {formData.due_date && (
                      <X 
                        className="h-4 w-4 ml-auto" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setFormData({ ...formData, due_date: null })
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={formData.due_date ? parseISO(formData.due_date) : undefined}
                    onSelect={(date) => {
                      setFormData({ 
                        ...formData, 
                        due_date: date ? format(date, 'yyyy-MM-dd') : null 
                      })
                      setCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", config.color)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select 
              value={formData.category_id || 'none'} 
              onValueChange={(v) => setFormData({ 
                ...formData, 
                category_id: v === 'none' ? null : v 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Starred */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="starred"
              checked={formData.is_starred}
              onCheckedChange={(checked) => setFormData({ ...formData, is_starred: checked })}
            />
            <Label htmlFor="starred" className="cursor-pointer">
              Mark as important
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {task?.id ? 'Save Changes' : 'Add Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Quick add input
function QuickAddTask({ onAdd, placeholder = "Add a task..." }) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!value.trim()) return
    onAdd({ title: value.trim() })
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          "pr-10 transition-all",
          isFocused && "ring-2 ring-primary"
        )}
      />
      {value.trim() && (
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </form>
  )
}

export default function UserTasksPanel({
  activeView = 'all',
  activeCategoryId = null,
  showCompleted = false,
}) {
  const {
    tasks,
    categories,
    stats,
    isLoading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    toggleStar,
  } = useUserTasksStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Filter tasks based on view
  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    // Filter by completion
    if (!showCompleted) {
      result = result.filter(t => !t.completed_at)
    }

    // Filter by category
    if (activeCategoryId) {
      result = result.filter(t => t.category_id === activeCategoryId)
    }

    // Filter by view
    if (activeView === 'today') {
      result = result.filter(t => t.due_date && isToday(parseISO(t.due_date)))
    } else if (activeView === 'starred') {
      result = result.filter(t => t.is_starred)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query)
      )
    }

    // Sort: starred first, then by due date, then by creation
    result.sort((a, b) => {
      // Starred first
      if (a.is_starred && !b.is_starred) return -1
      if (!a.is_starred && b.is_starred) return 1
      
      // Then by due date
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date)
      }
      
      // Then by creation
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return result
  }, [tasks, activeView, activeCategoryId, showCompleted, searchQuery])

  // Group tasks for display
  const groupedTasks = useMemo(() => {
    if (activeView === 'today' || activeCategoryId || searchQuery) {
      // Show flat list for specific views
      return null
    }
    return groupTasksByDate(filteredTasks)
  }, [filteredTasks, activeView, activeCategoryId, searchQuery])

  // Handlers
  const handleQuickAdd = useCallback(async (data) => {
    await createTask({
      ...data,
      category_id: activeCategoryId,
    })
  }, [createTask, activeCategoryId])

  const handleToggle = useCallback(async (taskId) => {
    await toggleComplete(taskId)
  }, [toggleComplete])

  const handleToggleStar = useCallback(async (taskId) => {
    await toggleStar(taskId)
  }, [toggleStar])

  const handleEdit = useCallback((task) => {
    setEditingTask(task)
    setIsEditDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (taskId) => {
    await deleteTask(taskId)
  }, [deleteTask])

  const handleSave = useCallback(async (data) => {
    if (editingTask?.id) {
      await updateTask(editingTask.id, data)
    } else {
      await createTask(data)
    }
  }, [editingTask, createTask, updateTask])

  // Loading state
  if (isLoading && !tasks.length) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  const taskHandlers = {
    onToggle: handleToggle,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onToggleStar: handleToggleStar,
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b shrink-0 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9"
          />
        </div>

        {/* Quick Add */}
        <QuickAddTask onAdd={handleQuickAdd} />
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'No tasks match your search'
                  : activeView === 'today'
                    ? 'No tasks due today'
                    : 'No tasks yet'}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => {
                  setEditingTask(null)
                  setIsEditDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
          ) : groupedTasks ? (
            // Grouped view
            <>
              <TaskGroup 
                title="Today" 
                tasks={groupedTasks.today} 
                categories={categories}
                {...taskHandlers} 
              />
              <TaskGroup 
                title="Tomorrow" 
                tasks={groupedTasks.tomorrow} 
                categories={categories}
                {...taskHandlers} 
              />
              <TaskGroup 
                title="This Week" 
                tasks={groupedTasks.thisWeek} 
                categories={categories}
                {...taskHandlers} 
              />
              <TaskGroup 
                title="Later" 
                tasks={groupedTasks.later} 
                categories={categories}
                {...taskHandlers} 
              />
              <TaskGroup 
                title="No Due Date" 
                tasks={groupedTasks.noDueDate} 
                categories={categories}
                {...taskHandlers} 
              />
            </>
          ) : (
            // Flat list
            <div className="space-y-1">
              {filteredTasks.map(task => (
                <TaskRow 
                  key={task.id} 
                  task={task} 
                  categories={categories}
                  {...taskHandlers} 
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <TaskEditDialog
        task={editingTask}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setEditingTask(null)
        }}
        categories={categories}
        onSave={handleSave}
      />
    </div>
  )
}

// Named export for convenience
export { UserTasksPanel }
