// src/components/seo/SEOCollaboration.jsx
// Team + Client collaboration: Tasks, Comments, Approvals, Activity
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import {
  CheckCircle,
  Circle,
  Clock,
  MessageSquare,
  Plus,
  User,
  Users,
  ListTodo,
  CheckSquare,
  AlertCircle,
  Send,
  MoreHorizontal,
  Calendar,
  ArrowRight,
  Sparkles,
  FileText,
  Activity,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Trash2,
  Reply,
  Flag
} from 'lucide-react'
import { portalApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'

// Priority badge colors
const PRIORITY_COLORS = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
}

// Status badge colors
const STATUS_COLORS = {
  todo: 'bg-gray-500/20 text-gray-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  review: 'bg-purple-500/20 text-purple-400',
  blocked: 'bg-red-500/20 text-red-400',
  done: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-gray-500/20 text-gray-500',
}

// Task type icons
const TASK_TYPE_ICONS = {
  general: ListTodo,
  title_update: FileText,
  meta_update: FileText,
  content_update: Edit3,
  schema_add: Sparkles,
  internal_link: ArrowRight,
  technical_fix: AlertCircle,
  review: CheckSquare,
  approval: ThumbsUp,
}

export default function SEOCollaboration({ projectId }) {
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [approvals, setApprovals] = useState([])
  const [activity, setActivity] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  
  const user = useAuthStore(state => state.user)

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [tasksRes, approvalsRes, activityRes, teamRes] = await Promise.all([
        portalApi.seo.getTasks(projectId),
        portalApi.seo.getApprovals(projectId),
        portalApi.seo.getActivity(projectId),
        portalApi.seo.getTeamMembers(projectId),
      ])
      setTasks(tasksRes.data || [])
      setApprovals(approvalsRes || { data: [], pending_count: 0 })
      setActivity(activityRes.data || [])
      setTeamMembers(teamRes.data || [])
    } catch (error) {
      console.error('Failed to load collaboration data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const pendingApprovals = approvals.pending_count || 0
  const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length
  const myTasks = tasks.filter(t => t.assigned_to === user?.id && t.status !== 'done').length

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={ListTodo}
          label="Open Tasks"
          value={openTasks}
          color="blue"
        />
        <StatCard
          icon={User}
          label="My Tasks"
          value={myTasks}
          color="purple"
        />
        <StatCard
          icon={ThumbsUp}
          label="Pending Approvals"
          value={pendingApprovals}
          color={pendingApprovals > 0 ? 'orange' : 'gray'}
        />
        <StatCard
          icon={Activity}
          label="This Week"
          value={activity.filter(a => {
            const date = new Date(a.created_at)
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return date >= weekAgo
          }).length}
          suffix="actions"
          color="green"
        />
      </div>

      {/* Main Content */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Team Collaboration</CardTitle>
              <CardDescription>Tasks, approvals, and activity for your SEO project</CardDescription>
            </div>
            <Button onClick={() => setShowNewTaskModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[var(--surface-elevated)]">
              <TabsTrigger value="tasks" className="gap-2">
                <ListTodo className="h-4 w-4" />
                Tasks
                {openTasks > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {openTasks}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approvals" className="gap-2">
                <ThumbsUp className="h-4 w-4" />
                Approvals
                {pendingApprovals > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-orange-500/20 text-orange-400">
                    {pendingApprovals}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-4">
              <TasksTab
                tasks={tasks}
                teamMembers={teamMembers}
                projectId={projectId}
                onRefresh={loadData}
              />
            </TabsContent>

            <TabsContent value="approvals" className="mt-4">
              <ApprovalsTab
                approvals={approvals.data || []}
                projectId={projectId}
                onRefresh={loadData}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <ActivityTab activity={activity} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* New Task Modal */}
      <NewTaskModal
        open={showNewTaskModal}
        onOpenChange={setShowNewTaskModal}
        projectId={projectId}
        teamMembers={teamMembers}
        onCreated={loadData}
      />
    </div>
  )
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, suffix, color }) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    orange: 'text-orange-400 bg-orange-500/20',
    green: 'text-green-400 bg-green-500/20',
    gray: 'text-gray-400 bg-gray-500/20',
  }

  return (
    <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {value}
              {suffix && <span className="text-sm font-normal text-[var(--text-secondary)] ml-1">{suffix}</span>}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Tasks Tab
function TasksTab({ tasks, teamMembers, projectId, onRefresh }) {
  const [filter, setFilter] = useState('all')
  
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return task.status !== 'cancelled'
    if (filter === 'open') return !['done', 'cancelled'].includes(task.status)
    if (filter === 'done') return task.status === 'done'
    return true
  })

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await portalApi.seo.updateTask(taskId, { status: newStatus })
      onRefresh()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <ListTodo className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
        <p className="text-[var(--text-secondary)] mb-4">
          Create tasks to track SEO work for your team
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'open' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('open')}
        >
          Open
        </Button>
        <Button
          variant={filter === 'done' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('done')}
        >
          Completed
        </Button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              teamMembers={teamMembers}
              onStatusChange={handleStatusChange}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Task Item
function TaskItem({ task, teamMembers, onStatusChange }) {
  const TypeIcon = TASK_TYPE_ICONS[task.task_type] || ListTodo
  const assignee = teamMembers.find(m => m.id === task.assigned_to)

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'p-4 rounded-lg border transition-colors',
        'bg-[var(--surface-elevated)] border-[var(--glass-border)]',
        'hover:border-[var(--accent-primary)]/50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Toggle */}
        <button
          onClick={() => onStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
          className="mt-0.5"
        >
          {task.status === 'done' ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <Circle className="h-5 w-5 text-[var(--text-tertiary)] hover:text-[var(--accent-primary)]" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TypeIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className={cn(
              'font-medium',
              task.status === 'done' && 'line-through text-[var(--text-tertiary)]'
            )}>
              {task.title}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={PRIORITY_COLORS[task.priority]}>
              {task.priority}
            </Badge>
            <Badge className={STATUS_COLORS[task.status]}>
              {task.status.replace('_', ' ')}
            </Badge>
            
            {task.due_date && (
              <span className={cn(
                'text-xs flex items-center gap-1',
                isOverdue ? 'text-red-400' : 'text-[var(--text-tertiary)]'
              )}>
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}

            {task.page_url && (
              <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {new URL(task.page_url).pathname}
              </span>
            )}
          </div>
        </div>

        {/* Assignee */}
        {assignee && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={assignee.avatar_url} />
            <AvatarFallback>
              {assignee.full_name?.charAt(0) || assignee.email?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </motion.div>
  )
}

// Approvals Tab
function ApprovalsTab({ approvals, projectId, onRefresh }) {
  const [deciding, setDeciding] = useState(null)

  const handleDecide = async (approvalId, decision) => {
    setDeciding(approvalId)
    try {
      await portalApi.seo.decideApproval(approvalId, { decision })
      onRefresh()
    } catch (error) {
      console.error('Failed to decide approval:', error)
    } finally {
      setDeciding(null)
    }
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending')
  const decidedApprovals = approvals.filter(a => a.status !== 'pending')

  if (approvals.length === 0) {
    return (
      <div className="text-center py-12">
        <ThumbsUp className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium mb-2">No approval requests</h3>
        <p className="text-[var(--text-secondary)]">
          Changes requiring approval will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pendingApprovals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            Pending ({pendingApprovals.length})
          </h3>
          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <ApprovalItem
                key={approval.id}
                approval={approval}
                onDecide={handleDecide}
                deciding={deciding === approval.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Decided */}
      {decidedApprovals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            History
          </h3>
          <div className="space-y-3">
            {decidedApprovals.slice(0, 10).map((approval) => (
              <ApprovalItem
                key={approval.id}
                approval={approval}
                decided
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Approval Item
function ApprovalItem({ approval, onDecide, deciding, decided }) {
  return (
    <Card className="bg-[var(--surface-elevated)] border-[var(--glass-border)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{approval.change_type.replace('_', ' ')}</Badge>
              <span className="text-sm text-[var(--text-secondary)]">
                {approval.field}
              </span>
            </div>

            {/* Change Preview */}
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-[var(--glass-bg)] mb-3">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Current</p>
                <p className="text-sm line-clamp-2">
                  {approval.current_value || <span className="text-[var(--text-tertiary)]">(empty)</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Proposed</p>
                <p className="text-sm line-clamp-2 text-green-400">{approval.proposed_value}</p>
              </div>
            </div>

            {approval.ai_reasoning && (
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                <Sparkles className="h-3 w-3 inline mr-1" />
                {approval.ai_reasoning}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <span>Requested by {approval.requester_name || 'Unknown'}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}</span>
            </div>
          </div>

          {/* Actions */}
          {!decided && approval.status === 'pending' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDecide(approval.id, 'rejected')}
                disabled={deciding}
                className="text-red-400 hover:text-red-400 hover:bg-red-500/20"
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => onDecide(approval.id, 'approved')}
                disabled={deciding}
                className="bg-green-600 hover:bg-green-700"
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          )}

          {decided && (
            <Badge className={approval.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
              {approval.status}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Activity Tab
function ActivityTab({ activity }) {
  if (activity.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium mb-2">No activity yet</h3>
        <p className="text-[var(--text-secondary)]">
          Team activity will appear here as changes are made
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-1">
        {activity.map((item, index) => (
          <ActivityItem key={item.id} item={item} isLast={index === activity.length - 1} />
        ))}
      </div>
    </ScrollArea>
  )
}

// Activity Item
function ActivityItem({ item, isLast }) {
  const getActionIcon = (action) => {
    const icons = {
      page_created: FileText,
      page_updated: Edit3,
      title_changed: FileText,
      meta_changed: FileText,
      task_created: ListTodo,
      task_assigned: User,
      task_completed: CheckCircle,
      comment_added: MessageSquare,
      approval_requested: ThumbsUp,
      approval_decided: CheckSquare,
      sprint_started: Flag,
      sprint_completed: CheckCircle,
    }
    return icons[action] || Activity
  }

  const Icon = getActionIcon(item.action)

  return (
    <div className="flex gap-3 pb-4">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className="p-2 rounded-full bg-[var(--surface-elevated)] border border-[var(--glass-border)]">
          <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-[var(--glass-border)] mt-2" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-1">
          {item.actor_name && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={item.actor_avatar} />
              <AvatarFallback className="text-[10px]">
                {item.actor_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-sm font-medium">{item.actor_name || 'System'}</span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{item.title}</p>
        {item.description && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1">{item.description}</p>
        )}
      </div>
    </div>
  )
}

// New Task Modal
function NewTaskModal({ open, onOpenChange, projectId, teamMembers, onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'general',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      await portalApi.seo.createTask(projectId, {
        ...formData,
        assigned_to: formData.assigned_to || undefined,
        due_date: formData.due_date || undefined,
      })
      onOpenChange(false)
      onCreated()
      setFormData({
        title: '',
        description: '',
        task_type: 'general',
        priority: 'medium',
        assigned_to: '',
        due_date: '',
      })
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>
            Create a task for yourself or assign to a team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Update homepage meta description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about what needs to be done..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="title_update">Title Update</SelectItem>
                  <SelectItem value="meta_update">Meta Description</SelectItem>
                  <SelectItem value="content_update">Content Update</SelectItem>
                  <SelectItem value="schema_add">Add Schema</SelectItem>
                  <SelectItem value="internal_link">Internal Link</SelectItem>
                  <SelectItem value="technical_fix">Technical Fix</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.title.trim() || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Comments Panel (for use in PageDetail, etc.)
export function CommentsPanel({ projectId, entityType, entityId }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const user = useAuthStore(state => state.user)

  useEffect(() => {
    loadComments()
  }, [projectId, entityType, entityId])

  const loadComments = async () => {
    try {
      const query = { [`${entityType}_id`]: entityId }
      const response = await portalApi.seo.getComments(projectId, query)
      setComments(response || [])
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await portalApi.seo.createComment(projectId, {
        content: newComment,
        [`${entityType}_id`]: entityId,
      })
      setNewComment('')
      loadComments()
    } catch (error) {
      console.error('Failed to create comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Comments ({comments.length})
      </h3>

      {/* Comment List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.author_avatar} />
              <AvatarFallback>
                {comment.author_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{comment.author_name || 'Unknown'}</span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.is_edited && (
                  <span className="text-xs text-[var(--text-tertiary)]">(edited)</span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* New Comment */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
