import { create } from 'zustand'
import { driveApi } from './portal-api'

const useDriveStore = create((set, get) => ({
  files: [],
  currentFolder: null, // null means use server default (GOOGLE_DRIVE_FOLDER_ID or 'root')
  rootFolderId: null,  // Will be set from API response
  folderPath: [{ id: null, name: 'Files' }], // null = root
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  error: null,
  nextPageToken: null,
  needsConfig: false, // True if service account not configured

  // Clear error
  clearError: () => set({ error: null }),

  // -----------------------------------------------------------------------
  // Temporary: Google Drive disabled (migrated to Supabase storage)
  // All Drive actions short-circuit to avoid 400s against removed backend.
  // -----------------------------------------------------------------------
  _driveDisabledMessage: 'Google Drive has been disabled (migrated to Supabase storage).',

  // Navigate to folder
  navigateToFolder: async (folderId, folderName) => {
    const message = get()._driveDisabledMessage
    set({ error: message, needsConfig: true })
    return { success: false, error: message }

    const { folderPath, rootFolderId } = get()
    
    // Find if folder is already in path (going back)
    const existingIndex = folderPath.findIndex(f => f.id === folderId)
    
    if (existingIndex >= 0) {
      // Going back in path
      set({ folderPath: folderPath.slice(0, existingIndex + 1) })
    } else {
      // Going deeper
      set({ folderPath: [...folderPath, { id: folderId, name: folderName }] })
          const message = get()._driveDisabledMessage
          return { success: false, error: message }
    const message = get()._driveDisabledMessage
    set({ isLoading: false, error: message, needsConfig: true })
    return { success: false, error: message }
  },

  // Upload file
  uploadFile: async (file, folderId = null) => {
      const message = get()._driveDisabledMessage
      return { success: false, error: message }
  downloadFile: async (fileId, filename) => {
    try {
      const response = await driveApi.downloadFile(fileId)
      const data = response.data || response
      
      if (data.file) {
        const { data: fileData, mimeType, name } = data.file
        
        // Create blob and download
        const blob = new Blob(
          [Uint8Array.from(atob(fileData), c => c.charCodeAt(0))],
          { type: mimeType }
        )
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name || filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        return { success: true }
      }
      
      return { success: false, error: 'No file data received' }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to download file'
      return { success: false, error: errorMessage }
    }
  },

  // Delete file
  deleteFile: async (fileId, permanent = false) => {
    try {
      await driveApi.deleteFile(fileId, permanent)
      
      // Remove from list
      set(state => ({
        files: state.files.filter(f => f.id !== fileId)
      }))
      
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete file'
      return { success: false, error: errorMessage }
    }
  },

  // Create folder
  createFolder: async (name, parentId = null) => {
    const currentFolderId = parentId || get().currentFolder
    
      const message = get()._driveDisabledMessage
      return { success: false, error: message }
    }
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (!bytes) return '—'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  },

  // Get file type category
  getFileCategory: (mimeType) => {
    if (!mimeType) return 'other'
    if (mimeType.includes('folder')) return 'folder'
    if (mimeType.includes('image')) return 'image'
    if (mimeType.includes('video')) return 'video'
    if (mimeType.includes('audio')) return 'audio'
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet'
    if (mimeType.includes('document') || mimeType.includes('word')) return 'document'
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation'
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive'
    return 'other'
  }
}))

export default useDriveStore
