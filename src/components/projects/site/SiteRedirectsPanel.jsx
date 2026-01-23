/**
 * SiteRedirectsPanel - Manage URL redirects
 */
import { ArrowRightLeft, Plus, Upload, MoreVertical, Search, ArrowRight, Trash2, Edit, FileUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const STATUS_CODES = [
  { value: 301, label: '301 - Permanent Redirect' },
  { value: 302, label: '302 - Temporary Redirect' },
  { value: 307, label: '307 - Temporary (preserve method)' },
  { value: 308, label: '308 - Permanent (preserve method)' },
]

export default function SiteRedirectsPanel({ project, redirects = [] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingRedirect, setEditingRedirect] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(null)
  const store = useSiteManagementStore()
  
  const filteredRedirects = redirects.filter(r => 
    r.source_path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.destination_path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.destination_url?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const totalHits = redirects.reduce((sum, r) => sum + (r.hit_count || 0), 0)
  const permanentCount = redirects.filter(r => r.status_code === 301 || r.status_code === 308).length
  const temporaryCount = redirects.filter(r => r.status_code === 302 || r.status_code === 307).length
  
  const handleDelete = async (redirectId) => {
    setIsDeleting(redirectId)
    try {
      await store.deleteRedirect(redirectId)
      toast.success('Redirect deleted')
    } catch (error) {
      toast.error('Failed to delete redirect')
    } finally {
      setIsDeleting(null)
    }
  }
  
  const handleToggleActive = async (redirect, checked) => {
    try {
      await store.updateRedirect(redirect.id, { is_active: checked })
      toast.success(checked ? 'Redirect activated' : 'Redirect deactivated')
    } catch (error) {
      toast.error('Failed to update redirect')
    }
  }
  
  if (redirects.length === 0) {
    return (
      <div className="text-center py-12">
        <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No Redirects Configured</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add redirects to handle URL changes and prevent 404 errors.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Redirect
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
        
        <CreateRedirectDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={async (data) => {
            await store.createRedirect(data)
            toast.success('Redirect created')
            setIsCreateOpen(false)
          }}
        />
        
        <ImportRedirectsDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          onSubmit={async (csvData) => {
            await store.importRedirects(csvData)
            toast.success('Redirects imported')
            setIsImportOpen(false)
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
            placeholder="Search redirects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="default">{permanentCount} permanent</Badge>
          <Badge variant="secondary">{temporaryCount} temporary</Badge>
          <Badge variant="outline">{totalHits.toLocaleString()} hits</Badge>
        </div>
        
        <div className="flex-1" />
        
        <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
          <FileUp className="h-4 w-4 mr-2" />
          Import
        </Button>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Redirect
        </Button>
      </div>
      
      {/* Redirects Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead></TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hits</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRedirects.map((redirect) => (
              <TableRow key={redirect.id}>
                <TableCell className="font-mono text-sm max-w-[200px] truncate">
                  {redirect.source_path}
                </TableCell>
                <TableCell>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell className="font-mono text-sm max-w-[200px] truncate">
                  {redirect.destination_path || redirect.destination_url}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge 
                          variant={redirect.status_code === 301 || redirect.status_code === 308 ? 'default' : 'secondary'}
                        >
                          {redirect.status_code || 301}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {STATUS_CODES.find(s => s.value === redirect.status_code)?.label || 'Redirect'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(redirect.hit_count || 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={redirect.is_active} 
                    onCheckedChange={(checked) => handleToggleActive(redirect, checked)}
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
                      <DropdownMenuItem onClick={() => setEditingRedirect(redirect)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(redirect.id)}
                        disabled={isDeleting === redirect.id}
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
        
        {filteredRedirects.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            No redirects match "{searchQuery}"
          </div>
        )}
      </div>
      
      {/* Create Dialog */}
      <CreateRedirectDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (data) => {
          await store.createRedirect(data)
          toast.success('Redirect created')
          setIsCreateOpen(false)
        }}
      />
      
      {/* Edit Dialog */}
      <EditRedirectDialog
        redirect={editingRedirect}
        open={!!editingRedirect}
        onOpenChange={(open) => !open && setEditingRedirect(null)}
        onSubmit={async (data) => {
          await store.updateRedirect(editingRedirect.id, data)
          toast.success('Redirect updated')
          setEditingRedirect(null)
        }}
        onDelete={async () => {
          await handleDelete(editingRedirect.id)
          setEditingRedirect(null)
        }}
      />
      
      {/* Import Dialog */}
      <ImportRedirectsDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSubmit={async (csvData) => {
          await store.importRedirects(csvData)
          toast.success('Redirects imported')
          setIsImportOpen(false)
        }}
      />
    </div>
  )
}

function CreateRedirectDialog({ open, onOpenChange, onSubmit }) {
  const [formData, setFormData] = useState({
    source_path: '',
    destination_path: '',
    status_code: 301,
    is_active: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.source_path || !formData.destination_path) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData({ source_path: '', destination_path: '', status_code: 301, is_active: true })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Redirect</DialogTitle>
          <DialogDescription>
            Create a new URL redirect for your site.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source_path">Source Path</Label>
            <Input
              id="source_path"
              placeholder="/old-page"
              value={formData.source_path}
              onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              The old URL path that should redirect
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="destination_path">Destination Path</Label>
            <Input
              id="destination_path"
              placeholder="/new-page"
              value={formData.destination_path}
              onChange={(e) => setFormData({ ...formData, destination_path: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              The new URL path to redirect to (or full URL for external redirects)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status_code">Redirect Type</Label>
            <Select
              value={String(formData.status_code)}
              onValueChange={(value) => setFormData({ ...formData, status_code: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CODES.map((code) => (
                  <SelectItem key={code.value} value={String(code.value)}>
                    {code.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.source_path || !formData.destination_path}>
              {isSubmitting ? 'Creating...' : 'Create Redirect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditRedirectDialog({ redirect, open, onOpenChange, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({
    source_path: '',
    destination_path: '',
    status_code: 301,
    is_active: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Update form when redirect changes
  useEffect(() => {
    if (redirect) {
      setFormData({
        source_path: redirect.source_path || '',
        destination_path: redirect.destination_path || redirect.destination_url || '',
        status_code: redirect.status_code || 301,
        is_active: redirect.is_active ?? true,
      })
    }
  }, [redirect])
  
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
          <DialogTitle>Edit Redirect</DialogTitle>
          <DialogDescription>
            Update the redirect configuration.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_source_path">Source Path</Label>
            <Input
              id="edit_source_path"
              value={formData.source_path}
              onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_destination_path">Destination Path</Label>
            <Input
              id="edit_destination_path"
              value={formData.destination_path}
              onChange={(e) => setFormData({ ...formData, destination_path: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit_status_code">Redirect Type</Label>
            <Select
              value={String(formData.status_code)}
              onValueChange={(value) => setFormData({ ...formData, status_code: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CODES.map((code) => (
                  <SelectItem key={code.value} value={String(code.value)}>
                    {code.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

function ImportRedirectsDialog({ open, onOpenChange, onSubmit }) {
  const [csvContent, setCsvContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preview, setPreview] = useState([])
  
  const handleCsvChange = (value) => {
    setCsvContent(value)
    // Parse preview
    const lines = value.trim().split('\n').filter(l => l.trim())
    const parsed = lines.slice(0, 5).map(line => {
      const parts = line.split(',').map(p => p.trim())
      return {
        from: parts[0] || '',
        to: parts[1] || '',
        status: parts[2] || '301',
      }
    })
    setPreview(parsed)
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!csvContent.trim()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(csvContent)
      setCsvContent('')
      setPreview([])
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Redirects</DialogTitle>
          <DialogDescription>
            Paste CSV data with columns: source_path, destination_path, status_code (optional)
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>CSV Data</Label>
            <Textarea
              placeholder="/old-page,/new-page,301
/another-old,/another-new"
              value={csvContent}
              onChange={(e) => handleCsvChange(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first 5 rows)</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{row.from}</TableCell>
                        <TableCell className="font-mono text-sm">{row.to}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !csvContent.trim()}>
              {isSubmitting ? 'Importing...' : `Import ${preview.length || 0}+ Redirects`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
