/**
 * SiteImagesPanel - Manage image slots for site-kit
 */
import { Image, Upload, Sparkles, Grid, List, MoreVertical, Search, Trash2, Edit, X, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

const CATEGORIES = [
  { value: 'brand', label: 'Brand' },
  { value: 'hero', label: 'Hero Images' },
  { value: 'team', label: 'Team' },
  { value: 'features', label: 'Features' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'background', label: 'Backgrounds' },
  { value: 'icons', label: 'Icons' },
  { value: 'other', label: 'Other' },
]

export default function SiteImagesPanel({ project, images = [] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [editingImage, setEditingImage] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(null)
  const store = useSiteManagementStore()
  
  // Group images by category
  const groupedImages = images.reduce((acc, img) => {
    const category = img.ai_category || 'uncategorized'
    if (!acc[category]) acc[category] = []
    acc[category].push(img)
    return acc
  }, {})
  
  const filteredImages = images.filter(img => 
    img.slot_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.ai_category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.alt_text?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleDelete = async (imageId) => {
    setIsDeleting(imageId)
    try {
      await store.deleteImage(imageId)
      toast.success('Image slot removed')
    } catch (error) {
      toast.error('Failed to delete image')
    } finally {
      setIsDeleting(null)
    }
  }
  
  const handleCategorize = async () => {
    try {
      await store.triggerImageCategorization()
      toast.success('Image categorization started')
    } catch (error) {
      toast.error('Failed to start categorization')
    }
  }
  
  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No Managed Images</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Images are populated during site scrape or can be added manually.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Add Image Slot
          </Button>
          <Button onClick={handleCategorize}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Categorize
          </Button>
        </div>
        
        <CreateImageDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen}
          onSubmit={async (data) => {
            await store.createImage(data)
            toast.success('Image slot created')
            setIsCreateOpen(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        
        <Badge variant="secondary">{filteredImages.length} images</Badge>
        
        <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Add Slot
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleCategorize}>
          <Sparkles className="h-4 w-4 mr-2" />
          AI Categorize
        </Button>
      </div>
      
      {/* Category Groups */}
      {Object.entries(groupedImages).map(([category, categoryImages]) => (
        <div key={category} className="space-y-3">
          <h3 className="font-medium capitalize flex items-center gap-2">
            {category}
            <Badge variant="secondary" className="text-xs">
              {categoryImages.length}
            </Badge>
          </h3>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {categoryImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-lg border bg-muted overflow-hidden"
                >
                  {img.url ? (
                    <img
                      src={img.url}
                      alt={img.alt_text || img.slot_id}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => setEditingImage(img)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  
                  {/* Slot ID badge */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-xs text-white font-mono truncate">
                      {img.slot_id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {categoryImages.map((img) => (
                <div key={img.id} className="flex items-center gap-4 p-3">
                  <div className="w-16 h-16 rounded bg-muted flex-shrink-0 overflow-hidden">
                    {img.url ? (
                      <img
                        src={img.url}
                        alt={img.alt_text || img.slot_id}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm">{img.slot_id}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {img.alt_text || 'No alt text'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {img.ai_tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingImage(img)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(img.id)}
                        disabled={isDeleting === img.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      
      {/* Create Dialog */}
      <CreateImageDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        onSubmit={async (data) => {
          await store.createImage(data)
          toast.success('Image slot created')
          setIsCreateOpen(false)
        }}
      />
      
      {/* Edit Dialog */}
      <EditImageDialog
        image={editingImage}
        open={!!editingImage}
        onOpenChange={(open) => !open && setEditingImage(null)}
        onSubmit={async (data) => {
          await store.updateImage(editingImage.id, data)
          toast.success('Image updated')
          setEditingImage(null)
        }}
        onDelete={async () => {
          await handleDelete(editingImage.id)
          setEditingImage(null)
        }}
      />
    </div>
  )
}

function CreateImageDialog({ open, onOpenChange, onSubmit }) {
  const [formData, setFormData] = useState({
    slot_id: '',
    page_path: '',
    alt_text: '',
    ai_category: 'other',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.slot_id) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData({ slot_id: '', page_path: '', alt_text: '', ai_category: 'other' })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Image Slot</DialogTitle>
          <DialogDescription>
            Create a managed image slot for your site-kit components.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slot_id">Slot ID</Label>
            <Input
              id="slot_id"
              placeholder="hero-main, logo-primary, team-ceo"
              value={formData.slot_id}
              onChange={(e) => setFormData({ ...formData, slot_id: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Used in ManagedImage component: slotId="{formData.slot_id || 'your-slot-id'}"
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="page_path">Page Path (optional)</Label>
            <Input
              id="page_path"
              placeholder="/about, /services"
              value={formData.page_path}
              onChange={(e) => setFormData({ ...formData, page_path: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ai_category">Category</Label>
            <Select
              value={formData.ai_category}
              onValueChange={(value) => setFormData({ ...formData, ai_category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="alt_text">Alt Text</Label>
            <Textarea
              id="alt_text"
              placeholder="Descriptive alt text for accessibility"
              value={formData.alt_text}
              onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.slot_id}>
              {isSubmitting ? 'Creating...' : 'Create Slot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditImageDialog({ image, open, onOpenChange, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({
    slot_id: '',
    page_path: '',
    alt_text: '',
    ai_category: 'other',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Update form when image changes
  useState(() => {
    if (image) {
      setFormData({
        slot_id: image.slot_id || '',
        page_path: image.page_path || '',
        alt_text: image.alt_text || '',
        ai_category: image.ai_category || 'other',
      })
    }
  }, [image])
  
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
          <DialogTitle>Edit Image Slot</DialogTitle>
          <DialogDescription>
            Update the image slot configuration.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {image?.url && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img src={image.url} alt="" className="w-full h-full object-contain" />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="edit_slot_id">Slot ID</Label>
            <Input
              id="edit_slot_id"
              value={formData.slot_id}
              onChange={(e) => setFormData({ ...formData, slot_id: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_page_path">Page Path</Label>
            <Input
              id="edit_page_path"
              value={formData.page_path}
              onChange={(e) => setFormData({ ...formData, page_path: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_ai_category">Category</Label>
            <Select
              value={formData.ai_category}
              onValueChange={(value) => setFormData({ ...formData, ai_category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_alt_text">Alt Text</Label>
            <Textarea
              id="edit_alt_text"
              value={formData.alt_text}
              onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
              rows={2}
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
