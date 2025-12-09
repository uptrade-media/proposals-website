import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/lib/toast'
import { ConfirmDialog } from './ConfirmDialog'
import { 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  FileText,
  Image,
  Video,
  FileSpreadsheet,
  Archive,
  File,
  Eye,
  MoreVertical,
  Loader2,
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
  RefreshCw,
  ExternalLink,
  Grid3X3,
  List,
  Music,
  FileType,
  AlertCircle
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import useDriveStore from '@/lib/drive-store'
import useAuthStore from '@/lib/auth-store'

// File type icons
const getFileIcon = (mimeType, isFolder) => {
  if (isFolder) return <Folder className="w-5 h-5 text-blue-500" />
  
  const category = useDriveStore.getState().getFileCategory(mimeType)
  
  switch (category) {
    case 'image':
      return <Image className="w-5 h-5 text-green-500" />
    case 'video':
      return <Video className="w-5 h-5 text-purple-500" />
    case 'audio':
      return <Music className="w-5 h-5 text-pink-500" />
    case 'pdf':
      return <FileType className="w-5 h-5 text-red-500" />
    case 'spreadsheet':
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
    case 'document':
      return <FileText className="w-5 h-5 text-blue-500" />
    case 'presentation':
      return <FileText className="w-5 h-5 text-orange-500" />
    case 'archive':
      return <Archive className="w-5 h-5 text-amber-500" />
    default:
      return <File className="w-5 h-5 text-[var(--text-tertiary)]" />
  }
}

const Files = () => {
  const { user } = useAuthStore()
  const { 
    files, 
    currentFolder,
    folderPath,
    isLoading, 
    isUploading,
    uploadProgress,
    error,
    fetchFiles,
    searchFiles,
    navigateToFolder,
    goToRoot,
    uploadFile,
    downloadFile,
    deleteFile,
    createFolder,
    formatFileSize,
    clearError
  } = useDriveStore()
  
  const hasFetchedRef = useRef(false)
  const fileInputRef = useRef(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null })
  const [newFolderDialog, setNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  const needsConfig = useDriveStore(state => state.needsConfig)

  // Fetch files on mount
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchFiles()
  }, [])

  // Debounced search
  useEffect(() => {
    if (!searchTerm) {
      if (isSearching) {
        setIsSearching(false)
        fetchFiles()
      }
      return
    }
    
    const timeout = setTimeout(() => {
      setIsSearching(true)
      searchFiles(searchTerm)
    }, 500)
    
    return () => clearTimeout(timeout)
  }, [searchTerm])

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return
    
    for (const file of droppedFiles) {
      const result = await uploadFile(file)
      if (result.success) {
        toast.success(`Uploaded ${file.name}`)
      } else {
        toast.error(`Failed to upload ${file.name}`)
      }
    }
  }

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length === 0) return
    
    for (const file of selectedFiles) {
      const result = await uploadFile(file)
      if (result.success) {
        toast.success(`Uploaded ${file.name}`)
      } else {
        toast.error(`Failed to upload ${file.name}`)
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (file) => {
    if (file.isFolder) return
    
    toast.info(`Downloading ${file.name}...`)
    const result = await downloadFile(file.id, file.name)
    if (result.success) {
      toast.success('File downloaded!')
    } else {
      toast.error(result.error || 'Failed to download file')
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.file) return
    
    const result = await deleteFile(deleteDialog.file.id)
    if (result.success) {
      toast.success('Moved to trash')
    } else {
      toast.error(result.error || 'Failed to delete file')
    }
    setDeleteDialog({ open: false, file: null })
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    
    setIsCreatingFolder(true)
    const result = await createFolder(newFolderName.trim())
    setIsCreatingFolder(false)
    
    if (result.success) {
      toast.success('Folder created!')
      setNewFolderDialog(false)
      setNewFolderName('')
    } else {
      toast.error(result.error || 'Failed to create folder')
    }
  }

  const handleFolderClick = (file) => {
    if (file.isFolder) {
      setSearchTerm('')
      setIsSearching(false)
      navigateToFolder(file.id, file.name)
    }
  }

  const handleOpenInDrive = (file) => {
    if (file.webViewLink) {
      window.open(file.webViewLink, '_blank')
    }
  }

  // Show configuration needed message
  if (needsConfig) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Files</h1>
            <p className="text-[var(--text-secondary)]">Manage your Google Drive files</p>
          </div>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
              <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Google Drive Not Configured</h3>
              <p className="text-[var(--text-secondary)]">
                To use Google Drive integration, you need to set up a Service Account.
              </p>
            </div>
            
            <div className="bg-[var(--surface-secondary)] rounded-lg p-4 text-left">
              <h4 className="font-medium mb-3 text-[var(--text-primary)]">Setup Instructions:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-secondary)]">
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="text-[var(--brand-primary)] hover:underline">Google Cloud Console</a></li>
                <li>Create or select a project</li>
                <li>Enable the <strong>Google Drive API</strong></li>
                <li>Go to <strong>APIs & Services → Credentials</strong></li>
                <li>Create a <strong>Service Account</strong></li>
                <li>Create a key for the service account (JSON format)</li>
                <li>Add the entire JSON key as <code className="bg-[var(--surface-tertiary)] px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> env var</li>
                <li>Share your Google Drive folder with the service account email</li>
                <li>Optionally set <code className="bg-[var(--surface-tertiary)] px-1 rounded">GOOGLE_DRIVE_FOLDER_ID</code> to the folder ID</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Files</h1>
            <p className="text-[var(--text-secondary)]">Manage your Google Drive files</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchFiles()}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNewFolderDialog(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button 
              variant="glass-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <Alert>
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription className="flex items-center gap-4">
              <span>Uploading...</span>
              <Progress value={uploadProgress} className="flex-1 max-w-xs" />
              <span>{uploadProgress}%</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && !needsConfig && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            <Button variant="ghost" size="sm" onClick={goToRoot} className="shrink-0">
              <Home className="w-4 h-4" />
            </Button>
            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center shrink-0">
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToFolder(folder.id, folder.name)}
                  className={index === folderPath.length - 1 ? 'font-semibold' : ''}
                >
                  {folder.name}
                </Button>
              </div>
            ))}
          </div>
          
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex border rounded-lg">
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
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`min-h-[400px] rounded-lg border-2 border-dashed transition-colors ${
            dragOver 
              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10' 
              : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
          }`}
        >
          {isLoading && files.length === 0 ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-[var(--text-secondary)]">
              <Folder className="w-16 h-16 mb-4 text-[var(--text-tertiary)]" />
              <p className="text-lg font-medium">
                {isSearching ? 'No files found' : 'This folder is empty'}
              </p>
              <p className="text-sm mt-1">
                {isSearching ? 'Try a different search term' : 'Drag and drop files here or click Upload'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`group relative p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:shadow-md hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer ${
                    file.isFolder ? 'hover:bg-[var(--brand-primary)]/10' : ''
                  }`}
                  onClick={() => file.isFolder ? handleFolderClick(file) : handleOpenInDrive(file)}
                  onDoubleClick={() => !file.isFolder && handleDownload(file)}
                >
                  {/* Thumbnail or Icon */}
                  <div className="flex items-center justify-center h-20 mb-3">
                    {file.thumbnailLink && !file.isFolder ? (
                      <img 
                        src={file.thumbnailLink} 
                        alt={file.name}
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center">
                        {getFileIcon(file.mimeType, file.isFolder)}
                      </div>
                    )}
                  </div>
                  
                  {/* Name */}
                  <p className="text-sm font-medium truncate text-center text-[var(--text-primary)]" title={file.name}>
                    {file.name}
                  </p>
                  
                  {/* Size */}
                  {!file.isFolder && file.size && (
                    <p className="text-xs text-[var(--text-tertiary)] text-center mt-1">
                      {formatFileSize(file.size)}
                    </p>
                  )}
                  
                  {/* Shared indicator */}
                  {file.shared && (
                    <Badge className="absolute top-2 right-2 text-xs" variant="secondary">
                      Shared
                    </Badge>
                  )}
                  
                  {/* Actions */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-white/80">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenInDrive(file) }}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in Drive
                        </DropdownMenuItem>
                        {!file.isFolder && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(file) }}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, file }) }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Move to Trash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="divide-y divide-[var(--glass-border)]">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
                  onClick={() => file.isFolder ? handleFolderClick(file) : handleOpenInDrive(file)}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 flex items-center justify-center">
                    {file.thumbnailLink && !file.isFolder ? (
                      <img 
                        src={file.thumbnailLink} 
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      getFileIcon(file.mimeType, file.isFolder)
                    )}
                  </div>
                  
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-[var(--text-primary)]">{file.name}</p>
                    {file.owner && (
                      <p className="text-xs text-[var(--text-tertiary)]">Owner: {file.owner}</p>
                    )}
                  </div>
                  
                  {/* Modified */}
                  <div className="text-sm text-[var(--text-secondary)] w-32 shrink-0">
                    {file.modifiedAt ? new Date(file.modifiedAt).toLocaleDateString() : '—'}
                  </div>
                  
                  {/* Size */}
                  <div className="text-sm text-[var(--text-secondary)] w-24 shrink-0 text-right">
                    {file.isFolder ? '—' : formatFileSize(file.size)}
                  </div>
                  
                  {/* Shared */}
                  <div className="w-16 shrink-0">
                    {file.shared && (
                      <Badge variant="secondary" className="text-xs">Shared</Badge>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenInDrive(file) }}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in Drive
                      </DropdownMenuItem>
                      {!file.isFolder && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(file) }}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, file }) }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Move to Trash
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, file: deleteDialog.file })}
          title="Move to Trash"
          description={`Are you sure you want to move "${deleteDialog.file?.name}" to trash?`}
          onConfirm={handleDelete}
          confirmText="Move to Trash"
          variant="destructive"
        />

        {/* New Folder Dialog */}
        <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Enter a name for the new folder
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewFolderDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isCreatingFolder}>
                {isCreatingFolder && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

export default Files
