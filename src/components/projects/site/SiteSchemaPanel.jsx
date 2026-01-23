/**
 * SiteSchemaPanel - Manage JSON-LD structured data
 */
import { Braces, Plus, MoreVertical, Copy, Check, Edit, Trash2, ExternalLink, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

// Schema type presets with templates
const SCHEMA_TYPES = [
  { 
    type: 'Organization', 
    icon: '🏢', 
    description: 'Company/organization info',
    template: { "@context": "https://schema.org", "@type": "Organization", "name": "", "url": "", "logo": "" }
  },
  { 
    type: 'LocalBusiness', 
    icon: '📍', 
    description: 'Local business with address',
    template: { "@context": "https://schema.org", "@type": "LocalBusiness", "name": "", "address": { "@type": "PostalAddress" }, "telephone": "" }
  },
  { 
    type: 'WebSite', 
    icon: '🌐', 
    description: 'Website with search action',
    template: { "@context": "https://schema.org", "@type": "WebSite", "name": "", "url": "" }
  },
  { 
    type: 'BreadcrumbList', 
    icon: '🔗', 
    description: 'Breadcrumb navigation',
    template: { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [] }
  },
  { 
    type: 'Article', 
    icon: '📄', 
    description: 'Blog posts and articles',
    template: { "@context": "https://schema.org", "@type": "Article", "headline": "", "author": { "@type": "Person", "name": "" }, "datePublished": "" }
  },
  { 
    type: 'Product', 
    icon: '🛍️', 
    description: 'E-commerce products',
    template: { "@context": "https://schema.org", "@type": "Product", "name": "", "description": "", "offers": { "@type": "Offer", "price": "", "priceCurrency": "USD" } }
  },
  { 
    type: 'Service', 
    icon: '🔧', 
    description: 'Professional services',
    template: { "@context": "https://schema.org", "@type": "Service", "name": "", "description": "", "provider": { "@type": "Organization", "name": "" } }
  },
  { 
    type: 'FAQPage', 
    icon: '❓', 
    description: 'FAQ sections',
    template: { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [] }
  },
]

export default function SiteSchemaPanel({ project, schema = [] }) {
  const [copiedId, setCopiedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSchema, setEditingSchema] = useState(null)
  const [isDeleting, setIsDeleting] = useState(null)
  const [presetType, setPresetType] = useState(null)
  const store = useSiteManagementStore()
  
  const filteredSchema = schema.filter(s =>
    s.schema_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleCopy = async (id, json) => {
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    setCopiedId(id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }
  
  const handleDelete = async (schemaId) => {
    setIsDeleting(schemaId)
    try {
      await store.deleteSchema(schemaId)
      toast.success('Schema deleted')
    } catch (error) {
      toast.error('Failed to delete schema')
    } finally {
      setIsDeleting(null)
    }
  }
  
  const openTestTool = (json) => {
    const url = `https://search.google.com/test/rich-results?code=${encodeURIComponent(JSON.stringify(json))}`
    window.open(url, '_blank')
  }
  
  const openCreateWithPreset = (type) => {
    setPresetType(type)
    setIsCreateOpen(true)
  }
  
  if (schema.length === 0) {
    return (
      <div className="text-center py-12">
        <Braces className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No Structured Data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add JSON-LD schema markup for rich search results.
        </p>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Schema
        </Button>
        
        {/* Schema type presets */}
        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-3">Common schema types:</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            {SCHEMA_TYPES.map((type) => (
              <Button 
                key={type.type} 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => openCreateWithPreset(type)}
              >
                <span className="mr-1.5">{type.icon}</span>
                {type.type}
              </Button>
            ))}
          </div>
        </div>
        
        <CreateSchemaDialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) setPresetType(null)
          }}
          preset={presetType}
          onSubmit={async (data) => {
            await store.createSchema(data)
            toast.success('Schema created')
            setIsCreateOpen(false)
            setPresetType(null)
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
            placeholder="Search schemas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Badge variant="secondary">{filteredSchema.length} schemas</Badge>
        
        <div className="flex-1" />
        
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Schema
        </Button>
      </div>
      
      {/* Schema cards */}
      <div className="grid gap-4">
        {filteredSchema.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{item.schema_type || 'Unknown'}</h4>
                  <Badge variant="outline">{item.path || 'Global'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCopy(item.id, item.json_ld)}
                >
                  {copiedId === item.id ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingSchema(item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openTestTool(item.json_ld)}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Test in Rich Results
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting === item.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* JSON preview */}
            <div className="bg-muted rounded-md p-3 font-mono text-xs overflow-x-auto">
              <pre className="text-muted-foreground">
                {JSON.stringify(item.json_ld, null, 2).slice(0, 200)}
                {JSON.stringify(item.json_ld, null, 2).length > 200 && '...'}
              </pre>
            </div>
          </div>
        ))}
        
        {filteredSchema.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            No schemas match "{searchQuery}"
          </div>
        )}
      </div>
      
      {/* Create Dialog */}
      <CreateSchemaDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) setPresetType(null)
        }}
        preset={presetType}
        onSubmit={async (data) => {
          await store.createSchema(data)
          toast.success('Schema created')
          setIsCreateOpen(false)
          setPresetType(null)
        }}
      />
      
      {/* Edit Dialog */}
      <EditSchemaDialog
        schema={editingSchema}
        open={!!editingSchema}
        onOpenChange={(open) => !open && setEditingSchema(null)}
        onSubmit={async (data) => {
          await store.updateSchema(editingSchema.id, data)
          toast.success('Schema updated')
          setEditingSchema(null)
        }}
        onDelete={async () => {
          await handleDelete(editingSchema.id)
          setEditingSchema(null)
        }}
      />
    </div>
  )
}

function CreateSchemaDialog({ open, onOpenChange, preset, onSubmit }) {
  const [formData, setFormData] = useState({
    schema_type: '',
    path: '',
    description: '',
    json_ld: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [jsonError, setJsonError] = useState(null)
  
  useEffect(() => {
    if (preset) {
      setFormData({
        schema_type: preset.type,
        path: '',
        description: preset.description,
        json_ld: JSON.stringify(preset.template, null, 2),
      })
    }
  }, [preset])
  
  const validateJson = (value) => {
    try {
      JSON.parse(value)
      setJsonError(null)
      return true
    } catch (e) {
      setJsonError(e.message)
      return false
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.schema_type || !formData.json_ld) return
    if (!validateJson(formData.json_ld)) return
    
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        json_ld: JSON.parse(formData.json_ld),
      })
      setFormData({ schema_type: '', path: '', description: '', json_ld: '' })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Schema</DialogTitle>
          <DialogDescription>
            Add JSON-LD structured data for rich search results.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schema_type">Schema Type</Label>
              <Select
                value={formData.schema_type}
                onValueChange={(value) => {
                  const type = SCHEMA_TYPES.find(t => t.type === value)
                  setFormData({ 
                    ...formData, 
                    schema_type: value,
                    description: type?.description || '',
                    json_ld: type ? JSON.stringify(type.template, null, 2) : formData.json_ld,
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {SCHEMA_TYPES.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      {type.icon} {type.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="path">Page Path (optional)</Label>
              <Input
                id="path"
                placeholder="/about (leave empty for global)"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of this schema"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="json_ld">JSON-LD</Label>
            <Textarea
              id="json_ld"
              placeholder='{"@context": "https://schema.org", ...}'
              value={formData.json_ld}
              onChange={(e) => {
                setFormData({ ...formData, json_ld: e.target.value })
                validateJson(e.target.value)
              }}
              rows={12}
              className="font-mono text-sm"
              required
            />
            {jsonError && (
              <p className="text-sm text-destructive">{jsonError}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.schema_type || !!jsonError}>
              {isSubmitting ? 'Creating...' : 'Add Schema'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditSchemaDialog({ schema, open, onOpenChange, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({
    schema_type: '',
    path: '',
    description: '',
    json_ld: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [jsonError, setJsonError] = useState(null)
  
  useEffect(() => {
    if (schema) {
      setFormData({
        schema_type: schema.schema_type || '',
        path: schema.path || '',
        description: schema.description || '',
        json_ld: JSON.stringify(schema.json_ld, null, 2) || '',
      })
    }
  }, [schema])
  
  const validateJson = (value) => {
    try {
      JSON.parse(value)
      setJsonError(null)
      return true
    } catch (e) {
      setJsonError(e.message)
      return false
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateJson(formData.json_ld)) return
    
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        json_ld: JSON.parse(formData.json_ld),
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Schema</DialogTitle>
          <DialogDescription>
            Update the structured data.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_schema_type">Schema Type</Label>
              <Select
                value={formData.schema_type}
                onValueChange={(value) => setFormData({ ...formData, schema_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEMA_TYPES.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      {type.icon} {type.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_path">Page Path</Label>
              <Input
                id="edit_path"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_description">Description</Label>
            <Input
              id="edit_description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_json_ld">JSON-LD</Label>
            <Textarea
              id="edit_json_ld"
              value={formData.json_ld}
              onChange={(e) => {
                setFormData({ ...formData, json_ld: e.target.value })
                validateJson(e.target.value)
              }}
              rows={12}
              className="font-mono text-sm"
            />
            {jsonError && (
              <p className="text-sm text-destructive">{jsonError}</p>
            )}
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
              <Button type="submit" disabled={isSubmitting || !!jsonError}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
