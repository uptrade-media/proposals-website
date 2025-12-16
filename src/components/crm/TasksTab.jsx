/**
 * TasksTab - Glass-styled tasks list for CRM
 * Features: Task list, priority badges, completion toggle, due dates
 */
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Clock,
  Users,
  Sparkles,
  AlertCircle,
  ListTodo,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GlassCard, GlassEmptyState, StatusBadge } from './ui'

// Format relative time
function formatRelativeTime(date) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const days = Math.floor(diff / 86400000)
  
  if (days < 0) return `in ${Math.abs(days)}d`
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// Task Row Component
function TaskRow({ task, onComplete }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
  const isCompleted = task.status === 'completed'

  const priorityVariants = {
    urgent: 'error',
    high: 'warning',
    normal: 'default',
    low: 'default'
  }

  return (
    <GlassCard 
      padding="md" 
      className={cn(
        'transition-all duration-300',
        isCompleted && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Completion Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 rounded-full p-0 flex-shrink-0',
            isCompleted 
              ? 'text-[#4bbf39] hover:text-[#4bbf39]' 
              : 'text-[var(--text-tertiary)] hover:text-[#4bbf39]'
          )}
          onClick={() => !isCompleted && onComplete?.(task.id)}
        >
          <CheckCircle2 className="h-6 w-6" />
        </Button>
        
        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'font-medium text-[var(--text-primary)]',
              isCompleted && 'line-through text-[var(--text-tertiary)]'
            )}>
              {task.title}
            </span>
            {task.priority === 'urgent' && (
              <StatusBadge status="Urgent" variant="error" size="sm" />
            )}
            {task.priority === 'high' && (
              <StatusBadge status="High" variant="warning" size="sm" />
            )}
          </div>
          
          {task.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{task.description}</p>
          )}
          
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-2 flex-wrap">
            {task.contact?.name && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {task.contact.name}
              </span>
            )}
            {task.due_date && (
              <span className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-red-600 font-medium'
              )}>
                <Clock className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString()}
                {isOverdue && ' (overdue)'}
              </span>
            )}
            {task.ai_confidence && (
              <span className="flex items-center gap-1 text-[#39bfb0]">
                <Sparkles className="h-3 w-3" />
                {Math.round(task.ai_confidence * 100)}% AI
              </span>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

// Main TasksTab Component
export default function TasksTab({
  tasks = [],
  summary = {},
  isLoading = false,
  status = 'pending',
  onStatusChange,
  onCompleteTask
}) {
  return (
    <div className="space-y-4">
      {/* Filters & Summary */}
      <div className="flex items-center gap-4">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex-1 text-sm text-[var(--text-secondary)] flex items-center gap-3">
          {summary.urgent > 0 && (
            <span className="text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {summary.urgent} urgent
            </span>
          )}
          {summary.overdue > 0 && (
            <span className="text-amber-600 font-medium">{summary.overdue} overdue</span>
          )}
          <span>{summary.pending || 0} pending</span>
        </div>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            <p className="text-sm text-[var(--text-tertiary)]">Loading tasks...</p>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <GlassEmptyState
          icon={ListTodo}
          title="No tasks"
          description="AI-generated tasks from calls will appear here"
          size="lg"
        />
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={onCompleteTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}
