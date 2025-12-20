/**
 * TenantContactDetail - Contact detail panel for tenant CRM
 * No calls tab, no proposals tab - just Overview, Emails, Notes, Tasks
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Globe,
  Calendar,
  Edit2,
  Save,
  Trash2,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  Circle,
  MessageSquare,
  FileText,
  User,
  TrendingUp,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { format, formatDistanceToNow } from 'date-fns'
import { TENANT_PIPELINE_STAGES } from './TenantPipelineKanban'

// Lead score display
function LeadScoreDisplay({ score }) {
  if (!score && score !== 0) return null
  
  const getConfig = (score) => {
    if (score >= 80) return { label: 'Hot Lead', color: 'text-red-600', bg: 'bg-red-500', icon: Zap }
    if (score >= 60) return { label: 'Warm Lead', color: 'text-orange-600', bg: 'bg-orange-500', icon: TrendingUp }
    if (score >= 40) return { label: 'Cool Lead', color: 'text-blue-600', bg: 'bg-blue-500', icon: null }
    return { label: 'Cold Lead', color: 'text-slate-600', bg: 'bg-slate-500', icon: null }
  }
  
  const config = getConfig(score)
  const Icon = config.icon
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            strokeWidth="4"
            stroke="var(--glass-border)"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            strokeWidth="4"
            stroke="currentColor"
            fill="none"
            className={config.color}
            strokeDasharray={`${(score / 100) * 125.6} 125.6`}
            strokeLinecap="round"
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-sm font-bold", config.color)}>
          {score}
        </span>
      </div>
      <div>
        <div className={cn("font-medium flex items-center gap-1", config.color)}>
          {Icon && <Icon className="h-4 w-4" />}
          {config.label}
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">Lead Score</p>
      </div>
    </div>
  )
}

// Note component
function NoteItem({ note, onDelete }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Clock className="h-3 w-3" />
          {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-[var(--text-tertiary)] hover:text-red-500"
          onClick={() => onDelete?.(note.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{note.content}</p>
    </div>
  )
}

// Task component
function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all",
      task.completed 
        ? "bg-[var(--glass-bg)]/50 border-[var(--glass-border)] opacity-60" 
        : "bg-[var(--glass-bg)] border-[var(--glass-border)]"
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle?.(task.id)}
          className="mt-0.5"
        >
          {task.completed ? (
            <CheckCircle2 className="h-5 w-5 text-[#4bbf39]" />
          ) : (
            <Circle className="h-5 w-5 text-[var(--text-tertiary)] hover:text-[#4bbf39]" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm",
            task.completed ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
          )}>
            {task.title}
          </p>
          {task.due_date && (
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              new Date(task.due_date) < new Date() && !task.completed
                ? "text-red-500"
                : "text-[var(--text-tertiary)]"
            )}>
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_date), 'MMM d, yyyy')}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-[var(--text-tertiary)] hover:text-red-500"
          onClick={() => onDelete?.(task.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// Email item
function EmailItem({ email }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm text-[var(--text-primary)]">{email.subject}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {email.direction === 'outbound' ? 'Sent' : 'Received'} • {format(new Date(email.sent_at || email.created_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <Badge variant="outline" className={cn(
          "text-xs",
          email.direction === 'outbound' 
            ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
            : "bg-green-500/10 text-green-600 border-green-500/20"
        )}>
          {email.direction === 'outbound' ? 'Sent' : 'Received'}
        </Badge>
      </div>
      <p className="text-sm text-[var(--text-secondary)] line-clamp-3">
        {email.body_preview || email.body?.slice(0, 200)}
      </p>
    </div>
  )
}

export default function TenantContactDetail({
  contact,
  onClose,
  onUpdate,
  onDelete,
  onSendEmail,
  signalEnabled = false
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [newNote, setNewNote] = useState('')
  const [newTask, setNewTask] = useState({ title: '', due_date: '' })
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isAddingTask, setIsAddingTask] = useState(false)
  
  // Mock data - in real app, fetch from API
  const [notes, setNotes] = useState([])
  const [tasks, setTasks] = useState([])
  const [emails, setEmails] = useState([])
  
  useEffect(() => {
    if (contact) {
      setEditData(contact)
      // Would fetch notes, tasks, emails here
      setNotes(contact.notes || [])
      setTasks(contact.tasks || [])
      setEmails(contact.emails || [])
    }
  }, [contact])

  if (!contact) return null
  
  const initials = contact.name
    ? contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : contact.email?.slice(0, 2).toUpperCase() || '??'
  
  const stageConfig = TENANT_PIPELINE_STAGES[contact.pipeline_stage] || TENANT_PIPELINE_STAGES.new_lead
  
  const handleSave = () => {
    onUpdate?.(editData)
    setIsEditing(false)
  }
  
  const handleAddNote = () => {
    if (!newNote.trim()) return
    const note = {
      id: Date.now(),
      content: newNote,
      created_at: new Date().toISOString()
    }
    setNotes([note, ...notes])
    setNewNote('')
    setIsAddingNote(false)
    // Would call API to save
  }
  
  const handleAddTask = () => {
    if (!newTask.title.trim()) return
    const task = {
      id: Date.now(),
      title: newTask.title,
      due_date: newTask.due_date || null,
      completed: false,
      created_at: new Date().toISOString()
    }
    setTasks([task, ...tasks])
    setNewTask({ title: '', due_date: '' })
    setIsAddingTask(false)
    // Would call API to save
  }
  
  const handleToggleTask = (taskId) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ))
    // Would call API to update
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={contact.avatar_url} />
              <AvatarFallback className="bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {contact.name || contact.email}
              </h2>
              {contact.company && (
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {contact.company}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[var(--text-tertiary)]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Stage selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Stage:</span>
          <Select
            value={contact.pipeline_stage || 'new_lead'}
            onValueChange={(value) => onUpdate?.({ ...contact, pipeline_stage: value })}
          >
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TENANT_PIPELINE_STAGES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", config.color)} />
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onSendEmail?.(contact)}
            className="bg-[#4bbf39] hover:bg-[#4bbf39]/90"
          >
            <Send className="h-4 w-4 mr-1" />
            Send Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="px-4 pt-2 justify-start bg-transparent border-b border-[var(--glass-border)]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[var(--glass-bg)]">
            <User className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="emails" className="data-[state=active]:bg-[var(--glass-bg)]">
            <Mail className="h-4 w-4 mr-1" />
            Emails
            {emails.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {emails.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-[var(--glass-bg)]">
            <FileText className="h-4 w-4 mr-1" />
            Notes
            {notes.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {notes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-[var(--glass-bg)]">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Tasks
            {tasks.filter(t => !t.completed).length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {tasks.filter(t => !t.completed).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 space-y-4 mt-0">
            {/* Lead Score */}
            {signalEnabled && contact.lead_score && (
              <LeadScoreDisplay score={contact.lead_score} />
            )}
            
            {/* Contact Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">Contact Information</h3>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[var(--text-tertiary)]">Name</label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-tertiary)]">Email</label>
                    <Input
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-tertiary)]">Phone</label>
                    <Input
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-tertiary)]">Company</label>
                    <Input
                      value={editData.company || ''}
                      onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-tertiary)]">Deal Value</label>
                    <Input
                      type="number"
                      value={editData.deal_value || ''}
                      onChange={(e) => setEditData({ ...editData, deal_value: parseFloat(e.target.value) || null })}
                      placeholder="$0.00"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="bg-[#4bbf39] hover:bg-[#4bbf39]/90">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <a href={`mailto:${contact.email}`} className="text-[#4bbf39] hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <span className="text-[var(--text-primary)]">{contact.phone}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <span className="text-[var(--text-primary)]">{contact.company}</span>
                    </div>
                  )}
                  {contact.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-[#4bbf39] hover:underline">
                        {contact.website}
                      </a>
                    </div>
                  )}
                  {contact.deal_value && (
                    <div className="mt-4 p-3 rounded-lg bg-[#4bbf39]/10 border border-[#4bbf39]/20">
                      <p className="text-xs text-[var(--text-tertiary)]">Deal Value</p>
                      <p className="text-xl font-semibold text-[#4bbf39]">
                        ${contact.deal_value.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Activity Timeline placeholder */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">Recent Activity</h3>
              <div className="p-4 text-center text-[var(--text-tertiary)] bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)]">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Activity timeline coming soon</p>
              </div>
            </div>
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails" className="p-4 space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                Email History ({emails.length})
              </h3>
              <Button
                size="sm"
                onClick={() => onSendEmail?.(contact)}
                className="bg-[#4bbf39] hover:bg-[#4bbf39]/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Compose
              </Button>
            </div>
            
            {emails.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-tertiary)] bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)]">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No emails yet</p>
                <Button
                  variant="link"
                  onClick={() => onSendEmail?.(contact)}
                  className="text-[#4bbf39]"
                >
                  Send the first email
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map(email => (
                  <EmailItem key={email.id} email={email} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="p-4 space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                Notes ({notes.length})
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddingNote(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>
            
            {isAddingNote && (
              <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a note..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddNote} size="sm" className="bg-[#4bbf39] hover:bg-[#4bbf39]/90">
                    Save
                  </Button>
                  <Button onClick={() => { setIsAddingNote(false); setNewNote('') }} size="sm" variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {notes.length === 0 && !isAddingNote ? (
              <div className="p-8 text-center text-[var(--text-tertiary)] bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)]">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <NoteItem 
                    key={note.id} 
                    note={note} 
                    onDelete={(id) => setNotes(notes.filter(n => n.id !== id))}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="p-4 space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                Tasks ({tasks.filter(t => !t.completed).length} pending)
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddingTask(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
            
            {isAddingTask && (
              <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-3">
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task description..."
                />
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddTask} size="sm" className="bg-[#4bbf39] hover:bg-[#4bbf39]/90">
                    Add Task
                  </Button>
                  <Button onClick={() => { setIsAddingTask(false); setNewTask({ title: '', due_date: '' }) }} size="sm" variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {tasks.length === 0 && !isAddingTask ? (
              <div className="p-8 text-center text-[var(--text-tertiary)] bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)]">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pending tasks first */}
                {tasks.filter(t => !t.completed).map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={handleToggleTask}
                    onDelete={(id) => setTasks(tasks.filter(t => t.id !== id))}
                  />
                ))}
                {/* Completed tasks */}
                {tasks.filter(t => t.completed).length > 0 && (
                  <>
                    <div className="text-xs text-[var(--text-tertiary)] pt-2">Completed</div>
                    {tasks.filter(t => t.completed).map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggle={handleToggleTask}
                        onDelete={(id) => setTasks(tasks.filter(t => t.id !== id))}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
      
      {/* Delete button at bottom */}
      <div className="p-4 border-t border-[var(--glass-border)]">
        <Button
          variant="ghost"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this contact?')) {
              onDelete?.(contact.id)
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Contact
        </Button>
      </div>
    </div>
  )
}
