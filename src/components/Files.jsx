import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/lib/toast'
import { EmptyState } from './EmptyState'
import { ConfirmDialog } from './ConfirmDialog'
import { 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw,
  Search, 
  Filter,
  FileText,
  Image,
  Video,
  Table,
  Archive,
  File,
  Eye,
  MoreVertical,
  Loader2,
  FolderOpen,
  FolderPlus,
  Folder,
  Share2,
  MessageCircle,
  Copy,
  Home,
  ChevronRight,
  ArrowLeft,
  Grid3X3,
  List,
  Pencil
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu'
import useFilesStore from '@/lib/files-store'
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'
import { adminApi } from '@/lib/portal-api'

const Files = () => {
  const { user, isSuperAdmin, currentOrg } = useAuthStore()
  const { projects, fetchProjects } = useProjectsStore()
  
  // Check if this is Uptrade Media (agency) - should see ALL projects
  // Also check if user is super admin as fallback
  const isAgencyOrg = isSuperAdmin || 
                      currentOrg?.slug === 'uptrade-media' || 
                      currentOrg?.domain === 'uptrademedia.com' || 
                      currentOrg?.org_type === 'agency'
  
  console.log('[Files] isAgencyOrg check:', { 
    isSuperAdmin, 
    orgSlug: currentOrg?.slug, 
    orgDomain: currentOrg?.domain, 
    orgType: currentOrg?.org_type,
    result: isAgencyOrg 
  })
  
  const { 
    files, 
    categories,
    fetchFiles, 
    fetchCategories,
    uploadFile,
    uploadMultipleFiles,
    downloadFile,
    deleteFile,
    replaceFile,
    updateFile,
    formatFileSize,
    isLoading, 
    error, 
    uploadProgress,
    clearError 
  } = useFilesStore()
  
  const hasFetchedRef = useRef(false)
  const [allProjects, setAllProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null })
  const [replaceTarget, setReplaceTarget] = useState(null)
  const [createFolderDialog, setCreateFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [imagePreviewFile, setImagePreviewFile] = useState(null)
  const [customFolders, setCustomFolders] = useState(() => {
    // Load custom folders from localStorage
    const saved = localStorage.getItem('uptrade_custom_folders')
    return saved ? JSON.parse(saved) : []
  })
  const [currentFolder, setCurrentFolder] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const replaceInputRef = useRef(null)

  // Get current folder path segments for breadcrumb
  const folderSegments = currentFolder ? currentFolder.split('/') : []
  
  // Navigate to a specific segment in the path
  const navigateToSegment = (index) => {
    if (index < 0) {
      setCurrentFolder(null)
    } else {
      const newPath = folderSegments.slice(0, index + 1).join('/')
      setCurrentFolder(newPath)
    }
  }

  // Navigate up one folder level
  const navigateUp = () => {
    if (!currentFolder) return
    const segments = currentFolder.split('/')
    if (segments.length === 1) {
      setCurrentFolder(null)
    } else {
      setCurrentFolder(segments.slice(0, -1).join('/'))
    }
  }

  // Get subfolders of current folder
  const getSubfolders = () => {
    if (!selectedProject) return []
    return customFolders.filter(f => {
      if (f.projectId !== selectedProject.id) return false
      if (!currentFolder) {
        // At root: show folders that have no slash (top-level)
        return !f.path.includes('/')
      } else {
        // In a folder: show folders that start with currentFolder/ and have exactly one more segment
        if (!f.path.startsWith(currentFolder + '/')) return false
        const remainder = f.path.slice(currentFolder.length + 1)
        return !remainder.includes('/')
      }
    })
  }

  // Delete a custom folder
  const handleDeleteFolder = (folder) => {
    const updated = customFolders.filter(f => f.id !== folder.id && !f.path.startsWith(folder.path + '/'))
    saveCustomFolders(updated)
    toast.success(`Folder "${folder.name}" deleted`)
    // If we're inside the deleted folder, go back to root
    if (currentFolder && (currentFolder === folder.path || currentFolder.startsWith(folder.path + '/'))) {
      setCurrentFolder(null)
    }
  }

  // Rename a custom folder
  const handleRenameFolder = (folder) => {
    if (!renameValue.trim()) return
    const oldPath = folder.path
    const segments = oldPath.split('/')
    segments[segments.length - 1] = renameValue.trim()
    const newPath = segments.join('/')
    
    // Update this folder and all subfolders
    const updated = customFolders.map(f => {
      if (f.id === folder.id) {
        return { ...f, name: renameValue.trim(), path: newPath }
      }
      if (f.path.startsWith(oldPath + '/')) {
        return { ...f, path: f.path.replace(oldPath, newPath) }
      }
      return f
    })
    
    saveCustomFolders(updated)
    toast.success('Folder renamed')
    setRenamingFolder(null)
    setRenameValue('')
    
    // Update current folder path if we're inside the renamed folder
    if (currentFolder === oldPath) {
      setCurrentFolder(newPath)
    } else if (currentFolder && currentFolder.startsWith(oldPath + '/')) {
      setCurrentFolder(currentFolder.replace(oldPath, newPath))
    }
  }

  // Handle share file - copy link to clipboard
  const handleShare = async (file) => {
    const url = file.public_url || file.url
    if (url) {
      await navigator.clipboard.writeText(url)
      toast.success('File link copied to clipboard')
    } else {
      toast.error('No shareable URL available')
    }
  }

  // Handle Ask Echo about file
  const handleAskEcho = (file) => {
    // Navigate to messages with Echo pre-populated with file context
    const echoUrl = `/messages?echo=true&context=file&fileId=${file.id}&fileName=${encodeURIComponent(file.original_filename || file.filename)}`
    window.location.href = echoUrl
  }

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedProject) return
    
    const folderPath = currentFolder 
      ? `${currentFolder}/${newFolderName.trim()}` 
      : newFolderName.trim()
    
    // Check if folder already exists
    if (customFolders.some(f => f.path === folderPath && f.projectId === selectedProject.id)) {
      toast.error('A folder with this name already exists')
      return
    }
    
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      path: folderPath,
      projectId: selectedProject.id,
      createdAt: new Date().toISOString()
    }
    
    saveCustomFolders([...customFolders, newFolder])
    toast.success(`Folder "${newFolderName}" created`)
    setNewFolderName('')
    setCreateFolderDialog(false)
  }

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || isSuperAdmin

  // Fetch initial data only once
  useEffect(() => {
    if (hasFetchedRef.current) return
    
    console.log('[Files] Fetching initial data, isAgencyOrg:', isAgencyOrg)
    hasFetchedRef.current = true
    
    // Fetch projects based on org type
    if (isAgencyOrg) {
      // Agency org - fetch ALL projects from admin API
      console.log('[Files] Loading all projects via admin API')
      loadAllProjects()
    } else {
      // Client org - fetch projects from regular API (org-scoped)
      console.log('[Files] Loading org projects via regular API')
      fetchProjects()
    }
    
    fetchCategories()
  }, [isAgencyOrg])
  
  // Load all projects for agency org
  const loadAllProjects = async () => {
    try {
      console.log('[Files] Calling adminApi.listTenants()')
      const response = await adminApi.listTenants()
      const payload = response?.data || response
      const orgsWithProjects = payload.organizations || payload.tenants || []
      
      console.log('[Files] Received orgs:', orgsWithProjects.length)
      
      // Flatten all projects from all orgs
      const allProjectsList = orgsWithProjects.flatMap(org => 
        (org.projects || []).map(project => ({
          ...project,
          title: project.title || project.name,
          org_id: project.org_id || org.id,
          organization: { name: org.name, slug: org.slug }
        }))
      )
      
      console.log('[Files] Total projects loaded:', allProjectsList.length)
      setAllProjects(allProjectsList)
    } catch (error) {
      console.error('[Files] Failed to load all projects:', error)
    }
  }

  // Get effective projects list based on org type
  const effectiveProjects = isAgencyOrg ? allProjects : projects
  
  // Auto-select project if there's only one
  useEffect(() => {
    if (effectiveProjects.length === 1 && !selectedProject) {
      setSelectedProject(effectiveProjects[0])
    }
  }, [effectiveProjects, selectedProject])

  useEffect(() => {
    if (selectedProject) {
      handleSearch()
    }
  }, [selectedProject])

  const handleSearch = useCallback(() => {
    if (selectedProject) {
      const filters = {}
      if (searchTerm) filters.search = searchTerm
      if (selectedCategory) filters.category = selectedCategory
      
      fetchFiles(selectedProject.id, filters)
    }
  }, [selectedProject, searchTerm, selectedCategory, fetchFiles])

  useEffect(() => {
    const timeoutId = setTimeout(handleSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCategory, handleSearch])

  const getFileIcon = (category) => {
    switch (category) {
      case 'documents':
        return <FileText className="w-5 h-5" />
      case 'images':
        return <Image className="w-5 h-5" />
      case 'videos':
        return <Video className="w-5 h-5" />
      case 'spreadsheets':
        return <Table className="w-5 h-5" />
      case 'presentations':
        return <FileText className="w-5 h-5" />
      case 'archives':
        return <Archive className="w-5 h-5" />
      default:
        return <File className="w-5 h-5" />
    }
  }

  // Check if file is an image that can be previewed
  const isPreviewableImage = (file) => {
    const mimeType = file.mime_type || file.mimeType || ''
    const filename = file.original_filename || file.filename || file.name || ''
    const ext = filename.split('.').pop()?.toLowerCase()
    
    const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
    
    return imageMimeTypes.includes(mimeType) || imageExtensions.includes(ext)
  }

  // Get preview URL for a file
  const getPreviewUrl = (file) => {
    return file.url || file.public_url || file.publicUrl || file.download_url || file.downloadUrl || null
  }

  // Handle copy URL to clipboard
  const handleCopyUrl = async (file) => {
    const url = getPreviewUrl(file)
    if (url) {
      await navigator.clipboard.writeText(url)
      toast.success('URL copied to clipboard')
    } else {
      toast.error('No URL available for this file')
    }
  }

  // Handle clicking on an image file card
  const handleImageClick = (file) => {
    if (isPreviewableImage(file) && getPreviewUrl(file)) {
      setImagePreviewFile(file)
    }
  }

  // Save custom folders to localStorage
  const saveCustomFolders = (folders) => {
    localStorage.setItem('uptrade_custom_folders', JSON.stringify(folders))
    setCustomFolders(folders)
  }

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    setSelectedFiles(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles(files)
    setIsUploadDialogOpen(true)
  }

  const handleUpload = async () => {
    if (!selectedProject || selectedFiles.length === 0) return

    let result
    if (selectedFiles.length === 1) {
      result = await uploadFile(selectedProject.id, selectedFiles[0], isPublic)
    } else {
      result = await uploadMultipleFiles(selectedProject.id, selectedFiles, isPublic)
    }

    if (result.success) {
      toast.success(selectedFiles.length === 1 ? 'File uploaded successfully!' : `${selectedFiles.length} files uploaded successfully!`)
      setIsUploadDialogOpen(false)
      setSelectedFiles([])
      setIsPublic(false)
    }
  }

  const handleDownload = async (file) => {
    const result = await downloadFile(file.id, file.original_filename)
    if (result.success) {
      toast.success('File downloaded successfully!')
    }
  }

  const handleDelete = async (file) => {
    const result = await deleteFile(file.id)
    if (result.success) {
      toast.success('File deleted successfully!')
    }
  }

  const handleReplaceClick = (file) => {
    setReplaceTarget(file)
    replaceInputRef.current?.click()
  }

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !replaceTarget) return

    const result = await replaceFile(replaceTarget.id, file)
    if (result.success) {
      toast.success('File replaced (URL unchanged)')
      handleSearch()
    } else if (result.error) {
      toast.error(result.error)
    }
    setReplaceTarget(null)
    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }

  const canUpload = user?.role === 'admin' || user?.role === 'client_admin' || user?.role === 'client_user'

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="space-y-6 min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Files</h1>
          <p className="text-[var(--text-secondary)]">Manage project files and documents</p>
        </div>
        {canUpload && (
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glass-primary">
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
                <DialogDescription>
                  Upload files to the selected project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select 
                    value={selectedProject?.id?.toString()} 
                    onValueChange={(value) => {
                      const project = projects.find(p => p.id === parseInt(value))
                      setSelectedProject(project)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {effectiveProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragOver 
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' 
                      : 'border-[var(--glass-border)] hover:border-[var(--text-tertiary)]'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    Drag and drop files here, or click to select
                  </p>
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>Choose Files</span>
                    </Button>
                  </Label>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files ({selectedFiles.length})</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-[var(--surface-secondary)] rounded">
                          <span className="truncate">{file.name}</span>
                          <span className="text-[var(--text-tertiary)]">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <Label>Upload Progress</Label>
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-[var(--text-secondary)]">{uploadProgress}% complete</p>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="is_public" className="text-sm">
                    Make files public (visible to all project members)
                  </Label>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsUploadDialogOpen(false)
                      setSelectedFiles([])
                      setIsPublic(false)
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="glass-primary"
                    onClick={handleUpload}
                    disabled={isLoading || !selectedProject || selectedFiles.length === 0}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedProject?.id?.toString() || ''} onValueChange={(value) => {
                const project = projects.find(p => p.id === parseInt(value))
                setSelectedProject(project)
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedCategory || 'all'} onValueChange={(val) => setSelectedCategory(val === 'all' ? '' : val)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Bar - show when we have projects */}
      {effectiveProjects.length > 0 && (
        <div className="flex items-center justify-between">
          {/* Left: Back button + Breadcrumb */}
          <div className="flex items-center gap-2">
            {/* Back button - show when inside a project or folder */}
            {(selectedProject || currentFolder) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (currentFolder) {
                    navigateUp()
                  } else if (selectedProject) {
                    // Go back to all projects view
                    setSelectedProject(null)
                  }
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm">
              {/* Root: Always show "All Projects" as clickable for navigation */}
              <button 
                onClick={() => { setSelectedProject(null); setCurrentFolder(null) }}
                className={`flex items-center gap-1 hover:text-[var(--brand-primary)] transition-colors ${
                  !selectedProject ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>All Projects</span>
              </button>
              
              {/* Project name in breadcrumb */}
              {selectedProject && (
                <>
                  <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <button 
                    onClick={() => setCurrentFolder(null)}
                    className={`hover:text-[var(--brand-primary)] transition-colors ${
                      !currentFolder ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {selectedProject.title || selectedProject.name}
                  </button>
                </>
              )}
              
              {folderSegments.map((segment, index) => (
                <div key={index} className="flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <button 
                    onClick={() => navigateToSegment(index)}
                    className={`hover:text-[var(--brand-primary)] transition-colors ${
                      index === folderSegments.length - 1 
                        ? 'text-[var(--text-primary)] font-medium' 
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {segment}
                  </button>
                </div>
              ))}
            </nav>
          </div>
          
          {/* Right: View toggle + New Folder (only when inside a project) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            {selectedProject && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCreateFolderDialog(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Folders Section */}
      {selectedProject && getSubfolders().length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">Folders</h3>
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" 
            : "space-y-1"
          }>
            {getSubfolders().map((folder) => (
              <ContextMenu key={folder.id}>
                <ContextMenuTrigger>
                  {viewMode === 'grid' ? (
                    <Card 
                      className="hover:shadow-md transition-shadow cursor-pointer bg-[var(--surface-secondary)] group"
                      onClick={() => setCurrentFolder(folder.path)}
                    >
                      <CardContent className="p-3 flex items-center gap-2">
                        <Folder className="w-5 h-5 text-[var(--brand-primary)]" />
                        {renamingFolder === folder.id ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameFolder(folder)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolder(folder)
                              if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue('') }
                            }}
                            className="h-6 text-sm py-0 px-1"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--surface-secondary)] cursor-pointer group"
                      onClick={() => setCurrentFolder(folder.path)}
                    >
                      <Folder className="w-5 h-5 text-[var(--brand-primary)]" />
                      {renamingFolder === folder.id ? (
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameFolder(folder)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameFolder(folder)
                            if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue('') }
                          }}
                          className="h-6 text-sm py-0 px-1 w-48"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm font-medium">{folder.name}</span>
                      )}
                    </div>
                  )}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => setCurrentFolder(folder.path)}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    setRenamingFolder(folder.id)
                    setRenameValue(folder.name)
                  }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    onClick={() => handleDeleteFolder(folder)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      {!selectedProject ? (
        /* Show projects as folders when no project is selected */
        effectiveProjects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects found"
            description="You don't have access to any projects yet."
          />
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Projects</h3>
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
              : "space-y-1 border rounded-lg divide-y"
            }>
              {effectiveProjects.map((project) => (
                viewMode === 'grid' ? (
                  <Card 
                    key={project.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => setSelectedProject(project)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="w-16 h-16 bg-[var(--brand-primary)]/10 rounded-lg flex items-center justify-center group-hover:bg-[var(--brand-primary)]/20 transition-colors">
                          <Folder className="w-8 h-8 text-[var(--brand-primary)]" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                            {project.title || project.name}
                          </span>
                          {project.organization?.name && (
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {project.organization.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div 
                    key={project.id}
                    className="flex items-center gap-4 p-3 hover:bg-[var(--surface-secondary)] cursor-pointer"
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-lg flex items-center justify-center">
                      <Folder className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.title || project.name}</p>
                      {project.organization?.name && (
                        <p className="text-xs text-[var(--text-tertiary)]">{project.organization.name}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </div>
                )
              ))}
            </div>
          </div>
        )
      ) : isLoading && files.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#4bbf39]" />
        </div>
      ) : files.length === 0 && getSubfolders().length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={currentFolder ? "This folder is empty" : "No files found"}
          description={
            searchTerm || selectedCategory 
              ? "No files match your current filters. Try adjusting your search criteria."
              : currentFolder
                ? "This folder doesn't contain any files yet."
                : "No files have been uploaded to this project yet."
          }
          actionLabel={canUpload && !searchTerm && !selectedCategory ? "Upload Files" : undefined}
          onAction={canUpload && !searchTerm && !selectedCategory ? (() => setIsUploadDialogOpen(true)) : undefined}
        />
      ) : files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">{files.length} Files</h3>
          {viewMode === 'grid' ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 240px))' }}>
              {files.map((file) => (
                <ContextMenu key={file.id}>
                  <ContextMenuTrigger>
                    <Card 
                      className="hover:shadow-lg transition-shadow cursor-context-menu overflow-hidden w-full"
                      onClick={() => handleImageClick(file)}
                    >
              <CardContent className="p-0">
                {/* Image Preview */}
                {isPreviewableImage(file) && getPreviewUrl(file) ? (
                  <div 
                    className="relative w-full h-32 bg-[var(--surface-secondary)] border-b border-[var(--glass-border)] cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setImagePreviewFile(file)
                    }}
                  >
                    <img 
                      src={getPreviewUrl(file)} 
                      alt={file.original_filename || file.filename || 'Preview'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Hide broken images
                        e.target.parentElement.style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-20 bg-[var(--surface-secondary)] border-b border-[var(--glass-border)] flex items-center justify-center">
                    <div className="text-[var(--text-tertiary)] opacity-50">
                      {getFileIcon(file.category)}
                    </div>
                  </div>
                )}
                
                <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-[#4bbf39]">
                      {getFileIcon(file.category)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {file.category}
                    </Badge>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyUrl(file)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(file)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAskEcho(file)}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Ask Echo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {(file.uploaded_by === user?.id || user?.role === 'admin' || user?.role === 'client_admin') && (
                        <DropdownMenuItem onClick={() => handleReplaceClick(file)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                          Replace (keep URL)
                        </DropdownMenuItem>
                      )}
                      {(file.uploaded_by === user?.id || user?.role === 'admin' || user?.role === 'client_admin') && (
                        <DropdownMenuItem 
                          onClick={() => setDeleteDialog({ open: true, file })}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm truncate" title={file.original_filename || file.filename || file.name}>
                    {file.original_filename || file.filename || file.name}
                  </h4>
                  
                  <div className="text-xs text-[var(--text-tertiary)] space-y-0.5">
                    <div>{formatFileSize(file.file_size || file.fileSize || file.size)}</div>
                    <div className="truncate" title={file.uploader?.name || file.uploader_name || 'Unknown'}>
                      {file.uploader?.name || file.uploader_name || 'Unknown'}
                    </div>
                  </div>
                  
                  {file.is_public && (
                    <Badge variant="secondary" className="text-xs">
                      Public
                    </Badge>
                  )}
                </div>
                
                <div className="flex space-x-1 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  {isPreviewableImage(file) && getPreviewUrl(file) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(getPreviewUrl(file), '_blank')}
                      title="View full size"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                </div>
              </CardContent>
            </Card>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleDownload(file)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleShare(file)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Link
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleAskEcho(file)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Ask Echo about this file
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => setCreateFolderDialog(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add folder
                </ContextMenuItem>
                {(file.uploaded_by === user?.id || user?.role === 'admin' || user?.role === 'client_admin') && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => handleReplaceClick(file)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Replace (keep URL)
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => setDeleteDialog({ open: true, file })}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
          ))}
            </div>
          ) : (
            /* List View */
            <div className="border rounded-lg divide-y">
              {files.map((file) => (
                <ContextMenu key={file.id}>
                  <ContextMenuTrigger>
                    <div 
                      className="flex items-center gap-4 p-3 hover:bg-[var(--surface-secondary)] cursor-pointer"
                      onClick={() => handleImageClick(file)}
                    >
                      {/* Thumbnail or Icon */}
                      {isPreviewableImage(file) && getPreviewUrl(file) ? (
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={getPreviewUrl(file)} 
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-[var(--surface-tertiary)] flex items-center justify-center flex-shrink-0">
                          <div className="text-[var(--text-tertiary)]">
                            {getFileIcon(file.category)}
                          </div>
                        </div>
                      )}
                      
                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.original_filename || file.filename || file.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{file.category}</p>
                      </div>
                      
                      {/* Size */}
                      <div className="text-sm text-[var(--text-tertiary)] hidden md:block">
                        {formatFileSize(file.file_size || file.fileSize || file.size)}
                      </div>
                      
                      {/* Date */}
                      <div className="text-sm text-[var(--text-tertiary)] hidden lg:block">
                        {new Date(file.created_at || file.uploadedAt || file.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyUrl(file)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(file)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share Link
                          </DropdownMenuItem>
                          {(file.uploaded_by === user?.id || user?.role === 'admin' || user?.role === 'client_admin') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleReplaceClick(file)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Replace
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeleteDialog({ open: true, file })}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleDownload(file)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCopyUrl(file)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy URL
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleShare(file)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Link
                    </ContextMenuItem>
                    {(file.uploaded_by === user?.id || user?.role === 'admin' || user?.role === 'client_admin') && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem 
                          onClick={() => setDeleteDialog({ open: true, file })}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, file: null })}
        title="Delete File"
        description={`Are you sure you want to delete "${deleteDialog.file?.original_filename}"? This action cannot be undone.`}
        confirmText="Delete File"
        onConfirm={() => handleDelete(deleteDialog.file)}
      />

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialog} onOpenChange={setCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="My Folder"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateFolderDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden input for replace */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleReplaceFile}
      />

      {/* Image Preview Modal */}
      <Dialog open={!!imagePreviewFile} onOpenChange={(open) => !open && setImagePreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="truncate pr-8">
              {imagePreviewFile?.original_filename || imagePreviewFile?.filename || 'Image Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center bg-black/5 p-4 min-h-[300px] max-h-[70vh]">
            {imagePreviewFile && (
              <img 
                src={getPreviewUrl(imagePreviewFile)} 
                alt={imagePreviewFile?.original_filename || imagePreviewFile?.filename || 'Preview'}
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            )}
          </div>
          <div className="p-4 pt-2 border-t border-[var(--glass-border)] flex items-center justify-between gap-2">
            <div className="text-sm text-[var(--text-secondary)]">
              {imagePreviewFile && formatFileSize(imagePreviewFile.file_size || imagePreviewFile.fileSize || imagePreviewFile.size)}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopyUrl(imagePreviewFile)}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy URL
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => imagePreviewFile && handleDownload(imagePreviewFile)}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => window.open(getPreviewUrl(imagePreviewFile), '_blank')}
              >
                <Eye className="w-4 h-4 mr-1" />
                Open Full Size
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => setCreateFolderDialog(true)}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </ContextMenuItem>
        {canUpload && (
          <ContextMenuItem onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleSearch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default Files
