/**
 * CreativePipelinePanel - Kanban-style board for creative requests
 */
import { useState, useEffect, useMemo } from 'react'
import { 
  Plus, Palette, FileImage, Video, PenTool, Megaphone, Globe, Mail,
  MoreVertical, Edit, Eye, Upload, Loader2, Calendar, User, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
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

import useProjectsStore, { 
  CREATIVE_STATUS_CONFIG, 
  CREATIVE_REQUEST_TYPES 
} from '../../lib/projects-store'

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
  })
}

// Icon map for request types
const typeIcons = {
  social_graphics: Palette,
  blog_images: FileImage,
  video_content: Video,
  brand_assets: PenTool,
  ad_creative: Megaphone,
  web_graphics: Globe,
  email_templates: Mail,
  other: Palette,
}

// Priority config
const priorityConfig = {
  urgent: { label: 'Urgent', class: 'bg-red-100 text-red-700' },
  high: { label: 'High', class: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', class: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Low', class: 'bg-slate-100 text-slate-700' },
}

// Create a lookup object from CREATIVE_REQUEST_TYPES array
const REQUEST_TYPE_LABELS = CREATIVE_REQUEST_TYPES.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

// Kanban columns (subset for cleaner view)
const KANBAN_COLUMNS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'in_review', label: 'In Review' },
  { key: 'revisions_requested', label: 'Revisions' },
  { key: 'approved', label: 'Approved' },
  { key: 'completed', label: 'Completed' },
]

const CreativePipelinePanel = ({ projects }) => {
  const {
    creativeRequests,
    isLoading,
    fetchCreativeRequests,
    createCreativeRequest,
    updateCreativeRequest,
    uploadCreativeVersion,
  } = useProjectsStore()

  // UI State
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [viewMode, setViewMode] = useState('kanban') // 'kanban' | 'list'

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    requestType: '',
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    requirements: '',
  })

  // Load creative requests when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchCreativeRequests(selectedProjectId)
    }
  }, [selectedProjectId])

  // Group requests by status for Kanban
  const requestsByStatus = useMemo(() => {
    const grouped = {}
    KANBAN_COLUMNS.forEach(col => {
      grouped[col.key] = creativeRequests.filter(r => r.status === col.key)
    })
    return grouped
  }, [creativeRequests])

  // Form handlers
  const resetForm = () => {
    setFormData({
      projectId: selectedProjectId || '',
      requestType: '',
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      requirements: '',
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.projectId || !formData.title || !formData.requestType) return
    
    try {
      await createCreativeRequest(formData.projectId, {
        requestType: formData.requestType,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        requirements: formData.requirements ? { notes: formData.requirements } : null,
      })
      toast.success('Creative request created')
      setCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to create request')
    }
  }

  const handleStatusChange = async (request, newStatus) => {
    try {
      await updateCreativeRequest(request.project_id, request.id, { status: newStatus })
      toast.success(`Moved to ${CREATIVE_STATUS_CONFIG[newStatus]?.label || newStatus}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const openDetailDialog = (request) => {
    setSelectedRequest(request)
    setDetailDialogOpen(true)
  }

  const openCreateDialog = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  // Creative Request Card Component
  const CreativeCard = ({ request }) => {
    const TypeIcon = typeIcons[request.request_type] || Palette
    const statusConfig = CREATIVE_STATUS_CONFIG[request.status] || {}
    const prioConfig = priorityConfig[request.priority] || priorityConfig.medium
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow mb-3"
        onClick={() => openDetailDialog(request)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${statusConfig.bgClass || 'bg-gray-100'}`}>
              <TypeIcon className={`w-4 h-4 ${statusConfig.iconClass || 'text-gray-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{request.title}</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Badge className={`text-xs ${prioConfig.class}`}>
              {prioConfig.label}
            </Badge>
            {request.due_date && (
              <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Calendar className="w-3 h-3" />
                {formatDate(request.due_date)}
              </div>
            )}
          </div>

          {request.versions_count > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-[var(--text-secondary)]">
              <FileImage className="w-3 h-3" />
              {request.versions_count} version{request.versions_count > 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Kanban Column Component
  const KanbanColumn = ({ column, requests }) => {
    const statusConfig = CREATIVE_STATUS_CONFIG[column.key] || {}
    
    return (
      <div className="flex-1 min-w-[280px] max-w-[320px]">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${statusConfig.dotClass || 'bg-gray-400'}`} />
          <h3 className="font-medium text-sm">{column.label}</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {requests.length}
          </Badge>
        </div>
        
        <div className="bg-[var(--surface-secondary)] rounded-lg p-3 min-h-[200px]">
          {requests.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
              No requests
            </p>
          ) : (
            requests.map(request => (
              <CreativeCard key={request.id} request={request} />
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Creative Pipeline</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Track design requests and creative assets
          </p>
        </div>
        <Button variant="glass-primary" onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Project Selector */}
      <div className="flex gap-4">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-full sm:w-[250px]">
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

      {/* Content */}
      {!selectedProjectId ? (
        <Card>
          <CardContent className="py-8 text-center text-[var(--text-secondary)]">
            Select a project to view creative requests
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : creativeRequests.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No creative requests"
          description="Create your first design request"
          actionLabel="New Request"
          onAction={openCreateDialog}
        />
      ) : (
        /* Kanban Board */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(column => (
            <KanbanColumn 
              key={column.key} 
              column={column} 
              requests={requestsByStatus[column.key] || []} 
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Creative Request</DialogTitle>
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
              <Label>Request Type *</Label>
              <Select 
                value={formData.requestType} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, requestType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CREATIVE_REQUEST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
                placeholder="e.g., Instagram Post Graphics"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what you need..."
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

            <div className="space-y-2">
              <Label>Requirements / Notes</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                placeholder="Dimensions, colors, brand guidelines..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="glass-primary" 
                disabled={!formData.projectId || !formData.title || !formData.requestType}
              >
                Create Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {(() => {
                    const TypeIcon = typeIcons[selectedRequest.request_type] || Palette
                    return <TypeIcon className="w-5 h-5 text-[var(--brand-primary)]" />
                  })()}
                  <DialogTitle>{selectedRequest.title}</DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status & Priority */}
                <div className="flex items-center gap-3">
                  <Badge className={CREATIVE_STATUS_CONFIG[selectedRequest.status]?.badgeClass || 'bg-gray-100'}>
                    {CREATIVE_STATUS_CONFIG[selectedRequest.status]?.label || selectedRequest.status}
                  </Badge>
                  <Badge className={priorityConfig[selectedRequest.priority]?.class || ''}>
                    {priorityConfig[selectedRequest.priority]?.label || 'Medium'}
                  </Badge>
                </div>

                {/* Description */}
                {selectedRequest.description && (
                  <div>
                    <Label className="text-[var(--text-secondary)]">Description</Label>
                    <p className="mt-1">{selectedRequest.description}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-[var(--text-secondary)]">Type</Label>
                    <p className="mt-1">
                      {REQUEST_TYPE_LABELS[selectedRequest.request_type] || selectedRequest.request_type}
                    </p>
                  </div>
                  <div>
                    <Label className="text-[var(--text-secondary)]">Due Date</Label>
                    <p className="mt-1">{formatDate(selectedRequest.due_date)}</p>
                  </div>
                  <div>
                    <Label className="text-[var(--text-secondary)]">Created</Label>
                    <p className="mt-1">{formatDate(selectedRequest.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-[var(--text-secondary)]">Versions</Label>
                    <p className="mt-1">{selectedRequest.versions_count || 0}</p>
                  </div>
                </div>

                {/* Quick Status Actions */}
                <div className="border-t pt-4">
                  <Label className="text-[var(--text-secondary)]">Move to</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {KANBAN_COLUMNS.filter(c => c.key !== selectedRequest.status).map(column => (
                      <Button
                        key={column.key}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleStatusChange(selectedRequest, column.key)
                          setDetailDialogOpen(false)
                        }}
                      >
                        <ArrowRight className="w-3 h-3 mr-1" />
                        {column.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CreativePipelinePanel
