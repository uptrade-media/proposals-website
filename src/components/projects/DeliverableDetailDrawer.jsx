/**
 * DeliverableDetailDrawer - Detailed view and actions for deliverables
 * 
 * Features:
 * - Full deliverable preview (images, PDFs, files)
 * - Version history
 * - Comments/feedback
 * - Approval workflow actions
 * - Edit capabilities for admins
 */
import { useState, useMemo, useCallback } from 'react'
import { 
  X, Download, ExternalLink, Clock, Calendar, User, Check, 
  AlertCircle, MessageSquare, Edit2, Trash2, MoreHorizontal,
  ChevronLeft, ChevronRight, FileText, Image, File, Loader2,
  Send, ThumbsUp, ThumbsDown, RotateCcw
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription 
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Store
import { useDeliverablesStore, deliverableStatusConfig, deliverableTypeConfig } from '@/lib/projects-v2-store'

// File type helpers
function getFileIcon(fileType) {
  if (!fileType) return File
  if (fileType.startsWith('image/')) return Image
  if (fileType.includes('pdf')) return FileText
  return File
}

function isPreviewable(fileType) {
  if (!fileType) return false
  return fileType.startsWith('image/') || fileType.includes('pdf')
}

// File preview component
function FilePreview({ deliverable, className }) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const fileType = deliverable?.file_type || ''
  const fileUrl = deliverable?.file_url || ''

  if (!fileUrl) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-lg text-muted-foreground",
        className
      )}>
        <div className="text-center p-6">
          <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No file attached</p>
        </div>
      </div>
    )
  }

  if (fileType.startsWith('image/')) {
    return (
      <div className={cn("relative bg-muted rounded-lg overflow-hidden", className)}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
          </div>
        ) : (
          <img
            src={fileUrl}
            alt={deliverable.title}
            className={cn(
              "w-full h-full object-contain transition-opacity",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setError(true)
            }}
          />
        )}
      </div>
    )
  }

  if (fileType.includes('pdf')) {
    return (
      <div className={cn("bg-muted rounded-lg overflow-hidden", className)}>
        <iframe
          src={`${fileUrl}#view=FitH`}
          className="w-full h-full border-0"
          title={deliverable.title}
        />
      </div>
    )
  }

  // Non-previewable file
  const FileIcon = getFileIcon(fileType)
  return (
    <div className={cn(
      "flex items-center justify-center bg-muted rounded-lg",
      className
    )}>
      <div className="text-center p-6">
        <FileIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium mb-1">{deliverable.title}</p>
        <p className="text-sm text-muted-foreground mb-4">
          {deliverable.file_name || 'File attached'}
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-4 w-4 mr-1" />
            Download
          </a>
        </Button>
      </div>
    </div>
  )
}

// Comment item component
function CommentItem({ comment }) {
  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={comment.user?.avatar_url} />
        <AvatarFallback className="text-xs">
          {comment.user?.full_name?.slice(0, 2)?.toUpperCase() || '??'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{comment.user?.full_name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true })}
          </span>
          {comment.is_feedback && (
            <Badge variant="outline" className="text-xs">Feedback</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>
    </div>
  )
}

// Approval action buttons
function ApprovalActions({ 
  deliverable, 
  isAdmin,
  onApprove, 
  onRequestChanges, 
  onDeliver,
  onSubmitForReview,
  isLoading,
}) {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [approvalMessage, setApprovalMessage] = useState('')
  const [showApprovalInput, setShowApprovalInput] = useState(false)

  const status = deliverable?.status

  // Draft - can submit for review
  if (status === 'draft' && isAdmin) {
    return (
      <Button onClick={() => onSubmitForReview?.()} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
        Submit for Review
      </Button>
    )
  }

  // Pending Review - can approve or request changes
  if (status === 'pending_review') {
    if (isAdmin) {
      return (
        <div className="space-y-3">
          {showApprovalInput ? (
            <div className="space-y-2">
              <Textarea
                value={approvalMessage}
                onChange={(e) => setApprovalMessage(e.target.value)}
                placeholder="Add an approval message (optional)..."
                rows={2}
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowApprovalInput(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    onApprove?.(approvalMessage)
                    setShowApprovalInput(false)
                    setApprovalMessage('')
                  }}
                  disabled={isLoading}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setFeedbackDialogOpen(true)}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Request Changes
              </Button>
              <Button 
                className="flex-1"
                onClick={() => setShowApprovalInput(true)}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          )}

          {/* Request Changes Dialog */}
          <AlertDialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request Changes</AlertDialogTitle>
                <AlertDialogDescription>
                  Provide feedback on what needs to be changed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe the changes needed..."
                rows={4}
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setFeedback('')
                  setFeedbackDialogOpen(false)
                }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={!feedback.trim() || isLoading}
                  onClick={() => {
                    onRequestChanges?.(feedback)
                    setFeedback('')
                    setFeedbackDialogOpen(false)
                  }}
                >
                  Submit Feedback
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    } else {
      return (
        <Badge variant="outline" className="w-full justify-center py-2">
          <Clock className="h-4 w-4 mr-1" />
          Awaiting your review
        </Badge>
      )
    }
  }

  // Needs Changes - can resubmit (admin only)
  if (status === 'needs_changes' && isAdmin) {
    return (
      <Button onClick={() => onSubmitForReview?.()} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
        Resubmit for Review
      </Button>
    )
  }

  // Approved - can deliver (admin only)
  if (status === 'approved' && isAdmin) {
    return (
      <Button onClick={() => onDeliver?.()} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
        Mark as Delivered
      </Button>
    )
  }

  // Delivered
  if (status === 'delivered') {
    return (
      <Badge variant="default" className="w-full justify-center py-2 bg-green-500">
        <Check className="h-4 w-4 mr-1" />
        Delivered
      </Badge>
    )
  }

  return null
}

// Version history item
function VersionItem({ version, isCurrent }) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-2 px-3 rounded-lg",
      isCurrent && "bg-primary/5 border border-primary/20"
    )}>
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
        v{version.version_number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {version.notes || `Version ${version.version_number}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(parseISO(version.created_at), { addSuffix: true })}
        </p>
      </div>
      {isCurrent && (
        <Badge variant="secondary" className="text-xs">Current</Badge>
      )}
    </div>
  )
}

export default function DeliverableDetailDrawer({
  deliverable,
  isOpen,
  onClose,
  isAdmin = false,
  onApprove,
  onRequestChanges,
  onDeliver,
  onSubmitForReview,
  onEdit,
  onDelete,
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')

  const statusCfg = deliverableStatusConfig[deliverable?.status] || {}
  const typeCfg = deliverableTypeConfig[deliverable?.deliverable_type] || {}

  // Mock comments and versions - would come from API
  const comments = useMemo(() => [
    {
      id: 1,
      user: { full_name: 'Jane Doe' },
      content: 'Looks great! Just need to adjust the colors slightly.',
      is_feedback: true,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 2,
      user: { full_name: 'John Smith' },
      content: 'Colors updated. Please review again.',
      is_feedback: false,
      created_at: new Date(Date.now() - 43200000).toISOString(),
    },
  ], [])

  const versions = useMemo(() => [
    { id: 1, version_number: 1, notes: 'Initial upload', created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 2, version_number: 2, notes: 'Color adjustments', created_at: new Date(Date.now() - 86400000).toISOString() },
  ], [])

  // Handlers
  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim()) return
    
    // In real implementation, would call API
    console.log('Submitting comment:', newComment)
    setNewComment('')
  }, [newComment])

  const handleApprove = useCallback(async (message) => {
    setIsLoading(true)
    await onApprove?.(message)
    setIsLoading(false)
  }, [onApprove])

  const handleRequestChanges = useCallback(async (feedback) => {
    setIsLoading(true)
    await onRequestChanges?.(feedback)
    setIsLoading(false)
  }, [onRequestChanges])

  const handleDeliver = useCallback(async () => {
    setIsLoading(true)
    await onDeliver?.()
    setIsLoading(false)
  }, [onDeliver])

  const handleSubmitForReview = useCallback(async () => {
    setIsLoading(true)
    await onSubmitForReview?.()
    setIsLoading(false)
  }, [onSubmitForReview])

  const handleDelete = useCallback(async () => {
    setIsLoading(true)
    await onDelete?.(deliverable?.id)
    setIsLoading(false)
    setDeleteDialogOpen(false)
    onClose?.()
  }, [deliverable?.id, onDelete, onClose])

  if (!deliverable) return null

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="p-4 border-b shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", typeCfg.color)}
                  >
                    {typeCfg.label || deliverable.deliverable_type}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", statusCfg.color)}
                  >
                    {statusCfg.label || deliverable.status}
                  </Badge>
                </div>
                <SheetTitle className="text-lg truncate">
                  {deliverable.title}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {deliverable.description || 'No description'}
                </SheetDescription>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {deliverable.file_url && (
                    <>
                      <DropdownMenuItem asChild>
                        <a href={deliverable.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in New Tab
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={deliverable.file_url} download>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit?.(deliverable)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4">
              {['preview', 'comments', 'versions'].map(tab => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="capitalize"
                >
                  {tab}
                  {tab === 'comments' && comments.length > 0 && (
                    <span className="ml-1 text-xs bg-muted rounded-full px-1.5">
                      {comments.length}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </SheetHeader>

          {/* Content */}
          <ScrollArea className="flex-1">
            {activeTab === 'preview' && (
              <div className="p-4 space-y-4">
                <FilePreview deliverable={deliverable} className="h-[400px]" />
                
                {/* Metadata */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    {deliverable.created_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Created:</span>
                        <span>{format(parseISO(deliverable.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {deliverable.due_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Due:</span>
                        <span>{format(parseISO(deliverable.due_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {deliverable.created_by_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Created by:</span>
                        <span>{deliverable.created_by_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="p-4">
                {comments.length > 0 ? (
                  <div className="divide-y">
                    {comments.map(comment => (
                      <CommentItem key={comment.id} comment={comment} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No comments yet</p>
                  </div>
                )}

                {/* Add comment */}
                <div className="mt-4 space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'versions' && (
              <div className="p-4 space-y-2">
                {versions.length > 0 ? (
                  versions.map((version, i) => (
                    <VersionItem 
                      key={version.id} 
                      version={version} 
                      isCurrent={i === versions.length - 1}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No version history</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer - Approval Actions */}
          <div className="p-4 border-t shrink-0">
            <ApprovalActions
              deliverable={deliverable}
              isAdmin={isAdmin}
              onApprove={handleApprove}
              onRequestChanges={handleRequestChanges}
              onDeliver={handleDeliver}
              onSubmitForReview={handleSubmitForReview}
              isLoading={isLoading}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deliverable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deliverable.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Named export
export { DeliverableDetailDrawer }
