/**
 * SiteContentPanel - Manage content blocks
 */
import { FileEdit, Plus, MoreVertical, Eye, Trash2, Edit, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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

const CONTENT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'html', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
]

export default function SiteContentPanel({ project, content = [] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingContent, setEditingContent] = useState(null)
  const [isDeleting, setIsDeleting] = useState(null)
  const store = useSiteManagementStore()
  
  const filteredContent = content.filter(c =>
    c.path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.section?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleDelete = async (contentId) => {
    setIsDeleting(contentId)
    try {
      await store.deleteContent(contentId)
      toast.success('Content block deleted')
    } catch (error) {
      toast.error('Failed to delete content')
    } finally {
      setIsDeleting(null)
    }
  }
  
  if (content.length === 0) {
    return (
      <div className="text-center py-12">
        <FileEdit className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No Content Blocks</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create managed content blocks for dynamic page sections.
        </p>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Content Block
        </Button>
        
        <CreateContentDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={async (data) => {
            await store.createContent(data)
            toast.success('Content block created')
            setIsCreateOpen(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Badge variant="secondary">{filteredContent.length} blocks</Badge>
        
        <div className="flex-1" />
        
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Block
        </Button>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContent.map((block) => (
              <TableRow key={block.id}>
                <TableCell className="font-mono text-sm">{block.path}</TableCell>
                <TableCell>{block.section}</TableCell>
                <TableCell>
                  <Badge variant="outline">{block.content_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={block.is_published ? "default" : "secondary"}>
                    {block.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingContent(block)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(block.id)}
                        disabled={isDeleting === block.id}
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
        
        {filteredContent.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            No content matches "{searchQuery}"
          </div>
        )}
      </div>
      
      {/* Create Dialog */}
      <CreateContentDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (data) => {
          await store.createContent(data)
          toast.success('Content block created')
          setIsCreateOpen(false)
        }}
      />
      
      {/* Edit Dialog */}
      <EditContentDialog
        content={editingContent}
        open={!!editingContent}
        onOpenChange={(open) => !open && setEditingContent(null)}
        onSubmit={async (data) => {
          await store.updateContent(editingContent.id, data)
          toast.success('Content updated')
          setEditingContent(null)
        }}
        onDelete={async () => {
          await handleDelete(editingContent.id)
          setEditingContent(null)
        }}
      />
    </div>
  )
}

function CreateContentDialog({ open, onOpenChange, onSubmit }) {
  const [formData, setFormData] = useState({
    path: '',
    section: '',
    content_type: 'text',
    content: '',
    is_published: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.path || !formData.section) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData({ path: '', section: '', content_type: 'text', content: '', is_published: false })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Content Block</DialogTitle>
          <DialogDescription>
            Add a new managed content block for your site.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="path">Page Path</Label>
              <Input
                id="path"
                placeholder="/about"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="section">Section ID</Label>
              <Input
                id="section"
                placeholder="hero-heading"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="content_type">Content Type</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) => setFormData({ ...formData, content_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 pt-8">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="is_published">Published</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Enter your content..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.path || !formData.section}>
              {isSubmitting ? 'Creating...' : 'Create Block'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditContentDialog({ content, open, onOpenChange, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({
    path: '',
    section: '',
    content_type: 'text',
    content: '',
    is_published: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    if (content) {
      setFormData({
        path: content.path || '',
        section: content.section || '',
        content_type: content.content_type || 'text',
        content: content.content || '',
        is_published: content.is_published ?? false,
      })
    }
  }, [content])
  
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Content Block</DialogTitle>
          <DialogDescription>
            Update the content block.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_path">Page Path</Label>
              <Input
                id="edit_path"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_section">Section ID</Label>
              <Input
                id="edit_section"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_content_type">Content Type</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) => setFormData({ ...formData, content_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 pt-8">
              <Switch
                id="edit_is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="edit_is_published">Published</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_content">Content</Label>
            <Textarea
              id="edit_content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
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
