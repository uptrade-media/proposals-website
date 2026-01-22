/**
 * TimeTrackingPanel - Time tracking with timer, manual entries, and summaries
 */
import { useState, useEffect, useMemo } from 'react'
import { 
  Plus, Play, Pause, Clock, Calendar, DollarSign, FolderKanban,
  MoreVertical, Edit, Trash2, Loader2, Timer, TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
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

import useProjectsStore from '../../lib/projects-store'

const formatDuration = (minutes) => {
  if (!minutes) return '0h 0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
  })
}

const TimeTrackingPanel = ({ projects }) => {
  const {
    timeEntries,
    activeTimer,
    isLoading,
    fetchTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    startTimer,
    stopTimer,
    getTimeSummary,
  } = useProjectsStore()

  // UI State
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [timerDescription, setTimerDescription] = useState('')
  const [timerElapsed, setTimerElapsed] = useState(0)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, entry: null })
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [summary, setSummary] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    description: '',
    durationMinutes: '',
    hourlyRate: '',
    date: new Date().toISOString().split('T')[0],
  })

  // Timer tick effect
  useEffect(() => {
    let interval
    if (activeTimer) {
      // Calculate initial elapsed time
      const startTime = new Date(activeTimer.started_at).getTime()
      setTimerElapsed(Math.floor((Date.now() - startTime) / 1000))
      
      interval = setInterval(() => {
        setTimerElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } else {
      setTimerElapsed(0)
    }
    return () => clearInterval(interval)
  }, [activeTimer])

  // Load time entries when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchTimeEntries(selectedProjectId)
      loadSummary()
    }
  }, [selectedProjectId])

  const loadSummary = async () => {
    if (!selectedProjectId) return
    const data = await getTimeSummary(selectedProjectId)
    setSummary(data)
  }

  // Format elapsed time
  const formatElapsed = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Timer handlers
  const handleStartTimer = async () => {
    if (!selectedProjectId) {
      toast.error('Select a project first')
      return
    }
    
    try {
      await startTimer(selectedProjectId, timerDescription)
      toast.success('Timer started')
    } catch (err) {
      toast.error(err.message || 'Failed to start timer')
    }
  }

  const handleStopTimer = async () => {
    if (!activeTimer) return
    
    try {
      await stopTimer(activeTimer.project_id)
      toast.success('Timer stopped')
      setTimerDescription('')
      loadSummary()
    } catch (err) {
      toast.error(err.message || 'Failed to stop timer')
    }
  }

  // Form handlers
  const resetForm = () => {
    setFormData({
      projectId: selectedProjectId || '',
      description: '',
      durationMinutes: '',
      hourlyRate: '',
      date: new Date().toISOString().split('T')[0],
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.projectId || !formData.durationMinutes) return
    
    try {
      await createTimeEntry(formData.projectId, {
        description: formData.description,
        durationMinutes: parseInt(formData.durationMinutes),
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        date: formData.date,
      })
      toast.success('Time entry added')
      setCreateDialogOpen(false)
      resetForm()
      loadSummary()
    } catch (err) {
      toast.error(err.message || 'Failed to add time entry')
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!selectedEntry) return
    
    try {
      await updateTimeEntry(selectedEntry.project_id, selectedEntry.id, {
        description: formData.description,
        durationMinutes: parseInt(formData.durationMinutes),
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
      })
      toast.success('Time entry updated')
      setEditDialogOpen(false)
      resetForm()
      loadSummary()
    } catch (err) {
      toast.error(err.message || 'Failed to update time entry')
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.entry) return
    
    try {
      await deleteTimeEntry(deleteDialog.entry.project_id, deleteDialog.entry.id)
      toast.success('Time entry deleted')
      setDeleteDialog({ open: false, entry: null })
      loadSummary()
    } catch (err) {
      toast.error(err.message || 'Failed to delete time entry')
    }
  }

  const openEditDialog = (entry) => {
    setSelectedEntry(entry)
    setFormData({
      projectId: entry.project_id,
      description: entry.description || '',
      durationMinutes: entry.duration_minutes?.toString() || '',
      hourlyRate: entry.hourly_rate?.toString() || '',
      date: entry.created_at?.split('T')[0] || '',
    })
    setEditDialogOpen(true)
  }

  const openCreateDialog = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Time Tracking</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Track billable hours and project time
          </p>
        </div>
        <Button variant="outline" onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Manual Entry
        </Button>
      </div>

      {/* Project Selector */}
      <div className="flex gap-4">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <FolderKanban className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Select a project" />
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

      {/* Timer Card */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Timer Display */}
            <div className="text-center sm:text-left">
              <div className={`text-4xl font-mono font-bold ${activeTimer ? 'text-green-600' : 'text-[var(--text-primary)]'}`}>
                {formatElapsed(timerElapsed)}
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {activeTimer ? 'Timer running...' : 'Timer stopped'}
              </p>
            </div>

            {/* Timer Controls */}
            <div className="flex-1 w-full sm:w-auto">
              {!activeTimer ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="What are you working on?"
                    value={timerDescription}
                    onChange={(e) => setTimerDescription(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="glass-primary" 
                    onClick={handleStartTimer}
                    disabled={!selectedProjectId}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Timer
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-medium">{activeTimer.description || 'No description'}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Started {new Date(activeTimer.started_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleStopTimer}
                    className="gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Stop Timer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatDuration(summary.totalMinutes)}</p>
                <p className="text-xs text-[var(--text-secondary)]">Total Time</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold">
                  ${(summary.totalBillable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Billable</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Timer className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{summary.entryCount || 0}</p>
                <p className="text-xs text-[var(--text-secondary)]">Entries</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatDuration(summary.thisWeek || 0)}</p>
                <p className="text-xs text-[var(--text-secondary)]">This Week</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Entries List */}
      {!selectedProjectId ? (
        <Card>
          <CardContent className="py-8 text-center text-[var(--text-secondary)]">
            Select a project to view time entries
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : timeEntries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No time entries yet"
          description="Start the timer or add a manual entry"
          actionLabel="Add Entry"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="space-y-2">
          {timeEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-[var(--surface-secondary)]">
                  <Clock className="w-5 h-5 text-[var(--text-secondary)]" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {entry.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <span>{formatDate(entry.created_at)}</span>
                    {entry.hourly_rate && (
                      <span>${entry.hourly_rate}/hr</span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-mono font-semibold">
                    {formatDuration(entry.duration_minutes)}
                  </p>
                  {entry.hourly_rate && entry.duration_minutes && (
                    <p className="text-sm text-green-600">
                      ${((entry.duration_minutes / 60) * entry.hourly_rate).toFixed(2)}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => setDeleteDialog({ open: true, entry })}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Entry</DialogTitle>
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
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What did you work on?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                  placeholder="60"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                  placeholder="150.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="glass-primary" disabled={!formData.projectId || !formData.durationMinutes}>
                Add Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
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
        onOpenChange={(open) => setDeleteDialog({ open, entry: null })}
        title="Delete Time Entry"
        description="Are you sure you want to delete this time entry?"
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default TimeTrackingPanel
