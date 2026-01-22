/**
 * TasksPanel - Task management with filters and project grouping
 */
import { useState, useEffect, useMemo } from 'react'
import { 
  Plus, Search as SearchIcon, Filter, CheckCircle2, Circle, Clock,
  AlertCircle, Calendar, User, FolderKanban, MoreVertical, Edit,
  Trash2, Loader2, GripVertical
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '../ui/select'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator
} from '../ui/dropdown-menu'
import EmptyState from '../EmptyState'
import ConfirmDialog from '../ConfirmDialog'

import useProjectsStore, { TASK_STATUS_CONFIG } from '../../lib/projects-store'

const formatDate = (date) => {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
  })
}

const getDueDateStatus = (dueDate) => {
  if (!dueDate) return null
  const today = new Date()
  const due = new Date(dueDate)
  const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  
  if (daysUntil < 0) return { label: 'Overdue', color: 'text-red-600 bg-red-50' }
  if (daysUntil === 0) return { label: 'Today', color: 'text-orange-600 bg-orange-50' }
  if (daysUntil === 1) return { label: 'Tomorrow', color: 'text-amber-600 bg-amber-50' }
  return null
}

const TasksPanel = ({ projects }) => {
  const {
    tasks,
    isLoading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
  } = useProjectsStore()

  // UI State
  const [selectedProjectId, setSelectedProjectId] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, task: null })
  const [selectedTask, setSelectedTask] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  })

  // Load tasks for selected project
  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== 'all') {
      fetchTasks(selectedProjectId)
    }
  }, [selectedProjectId])

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let list = tasks
    
    if (statusFilter !== 'all') {
      list = list.filter(t => t.status === statusFilter)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      list = list.filter(t => 
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }
    
    return list.sort((a, b) => {
      // Sort by completion, then priority, then due date
      if (a.completed_at && !b.completed_at) return 1
      if (!a.completed_at && b.completed_at) return -1
      
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
      if (priorityDiff !== 0) return priorityDiff
      
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date)
      }
      return 0
    })
  }, [tasks, statusFilter, searchQuery])

  // Form handlers
  const resetForm = () => {
    setFormData({
      projectId: selectedProjectId !== 'all' ? selectedProjectId : '',
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.projectId || !formData.title) return
    
    try {
      await createTask(formData.projectId, {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
      })
      toast.success('Task created')
      setCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to create task')
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!selectedTask) return
    
    try {
      await updateTask(selectedTask.project_id, selectedTask.id, {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
      })
      toast.success('Task updated')
      setEditDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to update task')
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.task) return
    
    try {
      await deleteTask(deleteDialog.task.project_id, deleteDialog.task.id)
      toast.success('Task deleted')
      setDeleteDialog({ open: false, task: null })
    } catch (err) {
      toast.error(err.message || 'Failed to delete task')
    }
  }

  const handleToggleComplete = async (task) => {
    try {
      await toggleTaskComplete(task.project_id, task.id)
    } catch (err) {
      toast.error('Failed to update task')
    }
  }

  const openEditDialog = (task) => {
    setSelectedTask(task)
    setFormData({
      projectId: task.project_id,
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.due_date?.split('T')[0] || '',
    })
    setEditDialogOpen(true)
  }

  const openCreateDialog = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  const getPriorityBadge = (priority) => {
    const config = {
      urgent: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-blue-100 text-blue-700',
      low: 'bg-gray-100 text-gray-700',
    }
    return config[priority] || config.medium
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage tasks across all projects
          </p>
        </div>
        <Button variant="glass-primary" onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <FolderKanban className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.filter(p => !p.is_tenant).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(TASK_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tasks List */}
      {selectedProjectId === 'all' ? (
        <Card>
          <CardContent className="py-8 text-center text-[var(--text-secondary)]">
            Select a project to view tasks
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No tasks yet"
          description="Create a task to start tracking work"
          actionLabel="Create Task"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const dueDateStatus = getDueDateStatus(task.due_date)
            const isCompleted = !!task.completed_at
            
            return (
              <Card 
                key={task.id} 
                className={`transition-opacity ${isCompleted ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => handleToggleComplete(task)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${isCompleted ? 'line-through text-[var(--text-secondary)]' : ''}`}>
                        {task.title}
                      </span>
                      <Badge className={`text-xs ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </Badge>
                      {dueDateStatus && !isCompleted && (
                        <Badge className={`text-xs ${dueDateStatus.color}`}>
                          {dueDateStatus.label}
                        </Badge>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-tertiary)]">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                      {task.assigned_to_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assigned_to_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(task)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => setDeleteDialog({ open: true, task })}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select 
                value={formData.projectId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, projectId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.filter(p => !p.is_tenant).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Task details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="glass-primary" disabled={!formData.projectId || !formData.title}>
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="glass-primary">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, task: null })}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteDialog.task?.title}"?`}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default TasksPanel
