/**
 * ApprovalsPanel - Pending approvals with approve/reject/request changes actions
 */
import { useState, useEffect } from 'react'
import { 
  Check, X, MessageSquare, Clock, FileText, Image, Video, 
  Palette, AlertTriangle, Loader2, Eye, ChevronDown, User,
  Calendar, FolderKanban
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Badge } from '../ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '../ui/select'
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent
} from '../ui/collapsible'
import EmptyState from '../EmptyState'

import useProjectsStore from '../../lib/projects-store'

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
  })
}

const formatRelativeTime = (date) => {
  if (!date) return '—'
  const now = new Date()
  const then = new Date(date)
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

// Approval item type icons
const typeIcons = {
  creative_request: Palette,
  proposal: FileText,
  invoice: FileText,
  content: FileText,
  design: Image,
  video: Video,
  other: AlertTriangle,
}

const typeLabels = {
  creative_request: 'Creative Request',
  proposal: 'Proposal',
  invoice: 'Invoice',
  content: 'Content',
  design: 'Design',
  video: 'Video',
  other: 'Other',
}

const ApprovalsPanel = ({ projects }) => {
  const {
    pendingApprovals,
    isLoading,
    fetchPendingApprovals,
    approveItem,
    rejectItem,
    requestChanges,
  } = useProjectsStore()

  // UI State
  const [selectedProjectId, setSelectedProjectId] = useState('all')
  const [actionDialog, setActionDialog] = useState({ open: false, type: null, item: null })
  const [actionNote, setActionNote] = useState('')
  const [expandedItems, setExpandedItems] = useState(new Set())

  // Load approvals
  useEffect(() => {
    const projectId = selectedProjectId === 'all' ? null : selectedProjectId
    fetchPendingApprovals(projectId)
  }, [selectedProjectId])

  // Toggle expansion
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  // Action handlers
  const handleApprove = async () => {
    if (!actionDialog.item) return
    
    try {
      await approveItem(actionDialog.item.id, actionNote || null)
      toast.success('Item approved')
      setActionDialog({ open: false, type: null, item: null })
      setActionNote('')
    } catch (err) {
      toast.error(err.message || 'Failed to approve')
    }
  }

  const handleReject = async () => {
    if (!actionDialog.item) return
    
    try {
      await rejectItem(actionDialog.item.id, actionNote || 'Rejected')
      toast.success('Item rejected')
      setActionDialog({ open: false, type: null, item: null })
      setActionNote('')
    } catch (err) {
      toast.error(err.message || 'Failed to reject')
    }
  }

  const handleRequestChanges = async () => {
    if (!actionDialog.item || !actionNote.trim()) {
      toast.error('Please provide feedback')
      return
    }
    
    try {
      await requestChanges(actionDialog.item.id, actionNote)
      toast.success('Changes requested')
      setActionDialog({ open: false, type: null, item: null })
      setActionNote('')
    } catch (err) {
      toast.error(err.message || 'Failed to request changes')
    }
  }

  const openActionDialog = (type, item) => {
    setActionDialog({ open: true, type, item })
    setActionNote('')
  }

  // Get project name by ID
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId)
    return project?.title || 'Unknown Project'
  }

  // Approval Card Component
  const ApprovalCard = ({ item }) => {
    const TypeIcon = typeIcons[item.item_type] || AlertTriangle
    const isExpanded = expandedItems.has(item.id)
    
    return (
      <Card className="overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
          <CardContent className="p-0">
            {/* Header - Always visible */}
            <CollapsibleTrigger asChild>
              <div className="p-4 cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <TypeIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{item.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[item.item_type] || item.item_type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <FolderKanban className="w-3 h-3" />
                        {getProjectName(item.project_id)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(item.submitted_at || item.created_at)}
                      </span>
                      {item.submitted_by_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.submitted_by_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronDown className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>

            {/* Expanded Content */}
            <CollapsibleContent>
              <div className="px-4 pb-4 border-t">
                {/* Description */}
                {item.description && (
                  <div className="mt-4">
                    <Label className="text-[var(--text-secondary)] text-xs">Description</Label>
                    <p className="mt-1 text-sm">{item.description}</p>
                  </div>
                )}

                {/* Preview Link */}
                {item.preview_url && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <a href={item.preview_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4 mr-2" />
                        View Preview
                      </a>
                    </Button>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  {item.due_date && (
                    <div>
                      <Label className="text-[var(--text-secondary)] text-xs">Due Date</Label>
                      <p className="mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.due_date)}
                      </p>
                    </div>
                  )}
                  {item.version && (
                    <div>
                      <Label className="text-[var(--text-secondary)] text-xs">Version</Label>
                      <p className="mt-1">v{item.version}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="glass-primary"
                    size="sm"
                    onClick={() => openActionDialog('approve', item)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActionDialog('changes', item)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Request Changes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => openActionDialog('reject', item)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pending Approvals</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Review and approve creative requests, proposals, and content
          </p>
        </div>
        {pendingApprovals.length > 0 && (
          <Badge variant="outline" className="h-fit">
            {pendingApprovals.length} pending
          </Badge>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <FolderKanban className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by project" />
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
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : pendingApprovals.length === 0 ? (
        <EmptyState
          icon={Check}
          title="All caught up!"
          description="No pending approvals at the moment"
        />
      ) : (
        <div className="space-y-3">
          {pendingApprovals.map((item) => (
            <ApprovalCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, type: null, item: null })
            setActionNote('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve Item'}
              {actionDialog.type === 'reject' && 'Reject Item'}
              {actionDialog.type === 'changes' && 'Request Changes'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {actionDialog.item && (
              <Card className="bg-[var(--surface-secondary)]">
                <CardContent className="p-3">
                  <p className="font-medium">{actionDialog.item.title}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {getProjectName(actionDialog.item.project_id)}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>
                {actionDialog.type === 'approve' && 'Approval Note (optional)'}
                {actionDialog.type === 'reject' && 'Rejection Reason (optional)'}
                {actionDialog.type === 'changes' && 'Feedback *'}
              </Label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  actionDialog.type === 'approve' ? 'Add a note...' :
                  actionDialog.type === 'reject' ? 'Reason for rejection...' :
                  'Describe the changes needed...'
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialog({ open: false, type: null, item: null })}
            >
              Cancel
            </Button>
            
            {actionDialog.type === 'approve' && (
              <Button variant="glass-primary" onClick={handleApprove}>
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
            
            {actionDialog.type === 'reject' && (
              <Button 
                variant="destructive" 
                onClick={handleReject}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            )}
            
            {actionDialog.type === 'changes' && (
              <Button 
                variant="glass-primary" 
                onClick={handleRequestChanges}
                disabled={!actionNote.trim()}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Feedback
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ApprovalsPanel
