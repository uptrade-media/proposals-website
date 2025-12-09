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
  FolderOpen
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import useFilesStore from '@/lib/files-store'
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'

const Files = () => {
  const { user } = useAuthStore()
  const { projects, fetchProjects } = useProjectsStore()
  const { 
    files, 
    categories,
    fetchFiles, 
    fetchCategories,
    uploadFile,
    uploadMultipleFiles,
    downloadFile,
    deleteFile,
    updateFile,
    formatFileSize,
    isLoading, 
    error, 
    uploadProgress,
    clearError 
  } = useFilesStore()
  
  const hasFetchedRef = useRef(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null })

  // Fetch initial data only once
  useEffect(() => {
    if (hasFetchedRef.current) return
    
    console.log('[Files] Fetching initial data')
    hasFetchedRef.current = true
    fetchProjects()
    fetchCategories()
  }, [])

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0])
    }
  }, [projects, selectedProject])

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

  const canUpload = user?.role === 'admin' || user?.role === 'client_admin' || user?.role === 'client_user'

  return (
    <div className="space-y-6">
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
                      {projects.map((project) => (
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
                      ? 'border-[#4bbf39] bg-[#4bbf39]/5' 
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
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
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

      {/* Files Grid */}
      {!selectedProject ? (
        <EmptyState
          icon={FolderOpen}
          title="Select a project"
          description="Choose a project from the dropdown above to view and manage its files."
        />
      ) : isLoading && files.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#4bbf39]" />
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No files found"
          description={
            searchTerm || selectedCategory 
              ? "No files match your current filters. Try adjusting your search criteria."
              : "No files have been uploaded to this project yet."
          }
          actionLabel={canUpload && !searchTerm && !selectedCategory ? "Upload Files" : undefined}
          onAction={canUpload && !searchTerm && !selectedCategory ? (() => setIsUploadDialogOpen(true)) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
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
                  <h4 className="font-medium text-sm truncate" title={file.original_filename}>
                    {file.original_filename}
                  </h4>
                  
                  <div className="text-xs text-[var(--text-tertiary)] space-y-1">
                    <div>Size: {formatFileSize(file.file_size)}</div>
                    <div>Uploaded by: {file.uploader_name}</div>
                    <div>
                      {new Date(file.created_at).toLocaleDateString()}
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
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  )
}

export default Files
