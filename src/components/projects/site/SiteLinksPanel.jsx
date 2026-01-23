/**
 * SiteLinksPanel - Manage internal links
 */
import { Link2, Plus, Sparkles, MoreVertical, Check, X, Search, Edit, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSiteManagementStore } from '@/lib/site-management-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const POSITIONS = [
  { value: 'inline', label: 'Inline (within content)' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'footer', label: 'Footer' },
  { value: 'related', label: 'Related Links Section' },
]

export default function SiteLinksPanel({ project, links = [] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingLink, setEditingLink] = useState(null)
  const [isDeleting, setIsDeleting] = useState(null)
  const store = useSiteManagementStore()
  
  const pendingLinks = links.filter(l => !l.approved_at && l.created_by === 'ai')
  const approvedLinks = links.filter(l => l.approved_at || l.created_by !== 'ai')
  
  const filteredApprovedLinks = approvedLinks.filter(l =>
    l.source_path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.target_path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.anchor_text?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleDelete = async (linkId) => {
    setIsDeleting(linkId)
    try {
      await store.deleteLink(linkId)
      toast.success('Link deleted')
    } catch (error) {
      toast.error('Failed to delete link')
    } finally {
      setIsDeleting(null)
    }
  }
  
  const handleApprove = async (linkId) => {
    try {
      await store.approveLink(linkId)
      toast.success('Link approved')
    } catch (error) {
      toast.error('Failed to approve link')
    }
  }
  
  const handleSuggestLinks = async () => {
    toast.info('AI link suggestions coming soon')
  }
  
  if (links.length === 0) {
    return (
      <div className="text-center py-12">
        <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No Internal Links</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Use AI to analyze your content and suggest internal linking opportunities.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={handleSuggestLinks}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Suggestions
          </Button>
          <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Manually
          </Button>
        </div>
        
        <CreateLinkDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={async (data) => {
            await store.createLink(data)
            toast.success('Link created')
            setIsCreateOpen(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Approval */}
      {pendingLinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Pending Approval</h3>
            <Badge variant="destructive">{pendingLinks.length}</Badge>
          </div>
          
          <div className="border rounded-lg border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Page</TableHead>
                  <TableHead>Target Page</TableHead>
                  <TableHead>Anchor Text</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-mono text-sm">{link.source_path}</TableCell>
                    <TableCell className="font-mono text-sm">{link.target_path}</TableCell>
                    <TableCell>{link.anchor_text}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{link.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600"
                          onClick={() => handleApprove(link.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(link.id)}
                          disabled={isDeleting === link.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      {/* Active Links */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Badge variant="secondary">{filteredApprovedLinks.length} links</Badge>
          
          <div className="flex-1" />
          
          <Button size="sm" variant="outline" onClick={handleSuggestLinks}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Suggestions
          </Button>
          
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>
        
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Page</TableHead>
                <TableHead>Target Page</TableHead>
                <TableHead>Anchor Text</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApprovedLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-mono text-sm">{link.source_path}</TableCell>
                  <TableCell className="font-mono text-sm">{link.target_path}</TableCell>
                  <TableCell>{link.anchor_text}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{link.position}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingLink(link)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(link.id)}
                          disabled={isDeleting === link.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredApprovedLinks.length === 0 && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              No links match "{searchQuery}"
            </div>
          )}
        </div>
      </div>
      
      {/* Create Dialog */}
      <CreateLinkDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (data) => {
          await store.createLink(data)
          toast.success('Link created')
          setIsCreateOpen(false)
        }}
      />
      
      {/* Edit Dialog */}
      <EditLinkDialog
        link={editingLink}
        open={!!editingLink}
        onOpenChange={(open) => !open && setEditingLink(null)}
        onSubmit={async (data) => {
          await store.updateLink(editingLink.id, data)
          toast.success('Link updated')
          setEditingLink(null)
        }}
        onDelete={async () => {
          await handleDelete(editingLink.id)
          setEditingLink(null)
        }}
      />
    </div>
  )
}

function CreateLinkDialog({ open, onOpenChange, onSubmit }) {
  const [formData, setFormData] = useState({
    source_path: '',
    target_path: '',
    anchor_text: '',
    position: 'inline',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.source_path || !formData.target_path || !formData.anchor_text) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData({ source_path: '', target_path: '', anchor_text: '', position: 'inline' })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Internal Link</DialogTitle>
          <DialogDescription>
            Create a new internal link between pages.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source_path">Source Page</Label>
            <Input
              id="source_path"
              placeholder="/blog/article-1"
              value={formData.source_path}
              onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              The page where the link will be added
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="target_path">Target Page</Label>
            <Input
              id="target_path"
              placeholder="/services"
              value={formData.target_path}
              onChange={(e) => setFormData({ ...formData, target_path: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              The page the link will point to
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="anchor_text">Anchor Text</Label>
            <Input
              id="anchor_text"
              placeholder="our services"
              value={formData.anchor_text}
              onChange={(e) => setFormData({ ...formData, anchor_text: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Select
              value={formData.position}
              onValueChange={(value) => setFormData({ ...formData, position: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.source_path || !formData.target_path}>
              {isSubmitting ? 'Creating...' : 'Create Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditLinkDialog({ link, open, onOpenChange, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({
    source_path: '',
    target_path: '',
    anchor_text: '',
    position: 'inline',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    if (link) {
      setFormData({
        source_path: link.source_path || '',
        target_path: link.target_path || '',
        anchor_text: link.anchor_text || '',
        position: link.position || 'inline',
      })
    }
  }, [link])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Link</DialogTitle>
          <DialogDescription>
            Update the internal link.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_source_path">Source Page</Label>
            <Input
              id="edit_source_path"
              value={formData.source_path}
              onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_target_path">Target Page</Label>
            <Input
              id="edit_target_path"
              value={formData.target_path}
              onChange={(e) => setFormData({ ...formData, target_path: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_anchor_text">Anchor Text</Label>
            <Input
              id="edit_anchor_text"
              value={formData.anchor_text}
              onChange={(e) => setFormData({ ...formData, anchor_text: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_position">Position</Label>
            <Select
              value={formData.position}
              onValueChange={(value) => setFormData({ ...formData, position: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
