/**
 * SiteScriptsPanel - Manage tracking scripts
 */
import { Code, Plus, MoreVertical, Play, Pause, Trash2, Edit, Search } from 'lucide-react'
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

// Common script presets
const SCRIPT_PRESETS = [
  { name: 'Google Tag Manager', icon: '📊', type: 'gtm', position: 'head' },
  { name: 'Google Analytics 4', icon: '📈', type: 'ga4', position: 'head' },
  { name: 'Meta Pixel', icon: '📱', type: 'pixel', position: 'head' },
  { name: 'Hotjar', icon: '🔥', type: 'hotjar', position: 'head' },
  { name: 'Custom Script', icon: '⚙️', type: 'custom', position: 'body' },
]

const POSITIONS = [
  { value: 'head', label: 'Head (before </head>)' },
  { value: 'body_start', label: 'Body Start (after <body>)' },
  { value: 'body_end', label: 'Body End (before </body>)' },
]

const LOAD_OPTIONS = [
  { value: 'all', label: 'All Pages' },
  { value: 'specific', label: 'Specific Pages' },
]

export default function SiteScriptsPanel({ project, scripts = [] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingScript, setEditingScript] = useState(null)
  const [isDeleting, setIsDeleting] = useState(null)
  const [presetData, setPresetData] = useState(null)
  const store = useSiteManagementStore()
  
  const activeScripts = scripts.filter(s => s.is_active)
  
  const filteredScripts = scripts.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.script_type?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleDelete = async (scriptId) => {
    setIsDeleting(scriptId)
    try {
      await store.deleteScript(scriptId)
      toast.success('Script deleted')
    } catch (error) {
      toast.error('Failed to delete script')
    } finally {
      setIsDeleting(null)
    }
  }
  
  const handleToggleActive = async (script, checked) => {
    try {
      await store.updateScript(script.id, { is_active: checked })
      toast.success(checked ? 'Script activated' : 'Script deactivated')
    } catch (error) {
      toast.error('Failed to update script')
    }
  }
  
  const openCreateWithPreset = (preset) => {
    setPresetData(preset)
    setIsCreateOpen(true)
  }
  
  if (scripts.length === 0) {
    return (
      <div className="text-center py-12">
        <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No Tracking Scripts</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add analytics and tracking scripts to your site.
        </p>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Script
        </Button>
        
        {/* Quick add presets */}
        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-3">Quick add:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SCRIPT_PRESETS.map((preset) => (
              <Button 
                key={preset.name} 
                variant="outline" 
                size="sm"
                onClick={() => openCreateWithPreset(preset)}
              >
                <span className="mr-2">{preset.icon}</span>
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
        
        <CreateScriptDialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) setPresetData(null)
          }}
          preset={presetData}
          onSubmit={async (data) => {
            await store.createScript(data)
            toast.success('Script created')
            setIsCreateOpen(false)
            setPresetData(null)
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
            placeholder="Search scripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Badge variant="secondary">{scripts.length} scripts</Badge>
        <Badge variant="default" className="bg-green-600">
          {activeScripts.length} active
        </Badge>
        
        <div className="flex-1" />
        
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Script
        </Button>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Load On</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredScripts.map((script) => (
              <TableRow key={script.id}>
                <TableCell className="font-medium">{script.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{script.script_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{script.position}</Badge>
                </TableCell>
                <TableCell>
                  {script.load_on === 'all' ? (
                    <span className="text-sm text-muted-foreground">All pages</span>
                  ) : (
                    <span className="text-sm">{script.paths?.length || 0} pages</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={script.is_active}
                    onCheckedChange={(checked) => handleToggleActive(script, checked)}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingScript(script)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(script.id)}
                        disabled={isDeleting === script.id}
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
        
        {filteredScripts.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            No scripts match "{searchQuery}"
          </div>
        )}
      </div>
      
      {/* Create Dialog */}
      <CreateScriptDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) setPresetData(null)
        }}
        preset={presetData}
        onSubmit={async (data) => {
          await store.createScript(data)
          toast.success('Script created')
          setIsCreateOpen(false)
          setPresetData(null)
        }}
      />
      
      {/* Edit Dialog */}
      <EditScriptDialog
        script={editingScript}
        open={!!editingScript}
        onOpenChange={(open) => !open && setEditingScript(null)}
        onSubmit={async (data) => {
          await store.updateScript(editingScript.id, data)
          toast.success('Script updated')
          setEditingScript(null)
        }}
        onDelete={async () => {
          await handleDelete(editingScript.id)
          setEditingScript(null)
        }}
      />
    </div>
  )
}

function CreateScriptDialog({ open, onOpenChange, preset, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    script_type: 'custom',
    position: 'head',
    load_on: 'all',
    script_content: '',
    is_active: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    if (preset) {
      setFormData({
        name: preset.name,
        script_type: preset.type,
        position: preset.position,
        load_on: 'all',
        script_content: '',
        is_active: true,
      })
    }
  }, [preset])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.script_content) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData({ name: '', script_type: 'custom', position: 'head', load_on: 'all', script_content: '', is_active: true })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Script</DialogTitle>
          <DialogDescription>
            Add a tracking or custom script to your site.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Script Name</Label>
              <Input
                id="name"
                placeholder="Google Analytics"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="script_type">Type</Label>
              <Select
                value={formData.script_type}
                onValueChange={(value) => setFormData({ ...formData, script_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCRIPT_PRESETS.map((preset) => (
                    <SelectItem key={preset.type} value={preset.type}>
                      {preset.icon} {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
            
            <div className="space-y-2">
              <Label htmlFor="load_on">Load On</Label>
              <Select
                value={formData.load_on}
                onValueChange={(value) => setFormData({ ...formData, load_on: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="script_content">Script Content</Label>
            <Textarea
              id="script_content"
              placeholder="<script>...</script>"
              value={formData.script_content}
              onChange={(e) => setFormData({ ...formData, script_content: e.target.value })}
              rows={8}
              className="font-mono text-sm"
              required
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name || !formData.script_content}>
              {isSubmitting ? 'Creating...' : 'Add Script'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditScriptDialog({ script, open, onOpenChange, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({
    name: '',
    script_type: 'custom',
    position: 'head',
    load_on: 'all',
    script_content: '',
    is_active: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    if (script) {
      setFormData({
        name: script.name || '',
        script_type: script.script_type || 'custom',
        position: script.position || 'head',
        load_on: script.load_on || 'all',
        script_content: script.script_content || '',
        is_active: script.is_active ?? true,
      })
    }
  }, [script])
  
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
          <DialogTitle>Edit Script</DialogTitle>
          <DialogDescription>
            Update the script configuration.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Script Name</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_script_type">Type</Label>
              <Select
                value={formData.script_type}
                onValueChange={(value) => setFormData({ ...formData, script_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCRIPT_PRESETS.map((preset) => (
                    <SelectItem key={preset.type} value={preset.type}>
                      {preset.icon} {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
            
            <div className="space-y-2">
              <Label htmlFor="edit_load_on">Load On</Label>
              <Select
                value={formData.load_on}
                onValueChange={(value) => setFormData({ ...formData, load_on: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_script_content">Script Content</Label>
            <Textarea
              id="edit_script_content"
              value={formData.script_content}
              onChange={(e) => setFormData({ ...formData, script_content: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="edit_is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="edit_is_active">Active</Label>
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
