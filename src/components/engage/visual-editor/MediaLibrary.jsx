// src/components/engage/visual-editor/MediaLibrary.jsx
// Media upload and selection for Engage elements

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Image,
  Video,
  Upload,
  Link,
  X,
  Check,
  Loader2,
  Trash2,
  ExternalLink,
  Grid,
  List,
  Search
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import { engageApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']

export default function MediaLibrary({ projectId, onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [library, setLibrary] = useState([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOver, setDragOver] = useState(false)
  
  // Load existing media library
  const loadLibrary = useCallback(async () => {
    try {
      setLoadingLibrary(true)
      const { data } = await engageApi.getMedia(projectId)
      setLibrary(data.media || [])
    } catch (error) {
      console.error('Failed to load media library:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }, [projectId])
  
  // Handle file upload
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    
    // Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image or MP4 video.')
      return
    }
    
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 5MB.')
      return
    }
    
    try {
      setUploading(true)
      setUploadProgress(0)
      
      // Read file as base64
      const base64 = await fileToBase64(file)
      
      // Simulate progress (actual upload doesn't give us progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 100)
      
      // Upload to server
      const { data } = await engageApi.uploadMedia({
        projectId,
        filename: file.name,
        mimeType: file.type,
        data: base64,
        size: file.size
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // Add to library and select
      const newMedia = {
        id: data.mediaId,
        url: data.url,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        name: file.name,
        size: file.size
      }
      
      setLibrary(prev => [newMedia, ...prev])
      setSelectedMedia(newMedia)
      toast.success('Media uploaded!')
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload media')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }
  
  // Handle URL input
  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return
    
    try {
      new URL(urlInput) // Validate URL
    } catch {
      toast.error('Please enter a valid URL')
      return
    }
    
    // Detect media type from URL
    const isVideo = /\.(mp4|webm|ogg)$/i.test(urlInput) || 
                    urlInput.includes('youtube.com') || 
                    urlInput.includes('vimeo.com')
    
    const media = {
      url: urlInput,
      type: isVideo ? 'video' : 'image',
      name: urlInput.split('/').pop() || 'External media',
      isExternal: true
    }
    
    setSelectedMedia(media)
    toast.success('Media URL added')
  }
  
  // Handle selection
  const handleSelect = () => {
    if (selectedMedia) {
      onSelect(selectedMedia)
    }
  }
  
  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }
  
  const handleDragLeave = () => {
    setDragOver(false)
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }
  
  // Filter library by search
  const filteredLibrary = library.filter(media => 
    media.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>
            Upload or select media for your element
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'library') loadLibrary() }}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link className="h-4 w-4 mr-2" />
              URL
            </TabsTrigger>
            <TabsTrigger value="library">
              <Image className="h-4 w-4 mr-2" />
              Library
            </TabsTrigger>
          </TabsList>
          
          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragOver ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-muted-foreground/25",
                uploading && "pointer-events-none opacity-50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-[var(--brand-primary)]" />
                  <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
                  <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2">
                    <div 
                      className="bg-[var(--brand-primary)] h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <Image className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                      <Video className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                  
                  <h3 className="font-semibold mb-2">Drag & drop your file here</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse (JPEG, PNG, GIF, WebP, MP4 • Max 5MB)
                  </p>
                  
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
                    className="hidden"
                    id="media-upload"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <Button asChild>
                    <label htmlFor="media-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </label>
                  </Button>
                </>
              )}
            </div>
          </TabsContent>
          
          {/* URL Tab */}
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label>Image or Video URL</Label>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1"
                />
                <Button onClick={handleUrlSubmit}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a direct link to an image or video. YouTube and Vimeo links are also supported.
              </p>
            </div>
            
            {/* URL Preview */}
            {selectedMedia?.isExternal && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-4">
                  {selectedMedia.type === 'image' ? (
                    <img 
                      src={selectedMedia.url} 
                      alt="" 
                      className="w-24 h-24 object-cover rounded"
                      onError={(e) => e.target.src = '/placeholder.svg'}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-muted rounded flex items-center justify-center">
                      <Video className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium truncate">{selectedMedia.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{selectedMedia.type}</p>
                    <a 
                      href={selectedMedia.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                    >
                      Open in new tab <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setSelectedMedia(null); setUrlInput('') }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search media..."
                  className="pl-9"
                />
              </div>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {loadingLibrary ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLibrary.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <Image className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No media found' : 'No media uploaded yet'}
                  </p>
                  {!searchQuery && (
                    <Button 
                      variant="link" 
                      onClick={() => setActiveTab('upload')}
                    >
                      Upload your first file
                    </Button>
                  )}
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-4 gap-2 overflow-y-auto flex-1">
                {filteredLibrary.map((media) => (
                  <div
                    key={media.id || media.url}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                      selectedMedia?.url === media.url 
                        ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20" 
                        : "border-transparent hover:border-muted-foreground/25"
                    )}
                    onClick={() => setSelectedMedia(media)}
                  >
                    {media.type === 'image' ? (
                      <img 
                        src={media.url} 
                        alt={media.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {selectedMedia?.url === media.url && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1">
                {filteredLibrary.map((media) => (
                  <div
                    key={media.id || media.url}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                      selectedMedia?.url === media.url 
                        ? "bg-[var(--brand-primary)]/10" 
                        : "hover:bg-muted"
                    )}
                    onClick={() => setSelectedMedia(media)}
                  >
                    {media.type === 'image' ? (
                      <img 
                        src={media.url} 
                        alt={media.name} 
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Video className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{media.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {media.type} • {formatFileSize(media.size)}
                      </p>
                    </div>
                    {selectedMedia?.url === media.url && (
                      <Check className="h-5 w-5 text-[var(--brand-primary)]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedMedia}>
            <Check className="h-4 w-4 mr-2" />
            Use Selected
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Utility functions
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
