import { create } from 'zustand'
import api from './api'

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

  // Navigate to folder
  navigateToFolder: async (folderId, folderName) => {
    const { folderPath, rootFolderId } = get()
    
    // Find if folder is already in path (going back)
    const existingIndex = folderPath.findIndex(f => f.id === folderId)
    
    if (existingIndex >= 0) {
      // Going back in path
      set({ folderPath: folderPath.slice(0, existingIndex + 1) })
    } else {
      // Going deeper
      set({ folderPath: [...folderPath, { id: folderId, name: folderName }] })
    }
    
    set({ currentFolder: folderId })
    return get().fetchFiles(folderId)
  },

  // Go to root
  goToRoot: () => {
    const { rootFolderId } = get()
    set({ 
      folderPath: [{ id: rootFolderId, name: 'Files' }],
      currentFolder: rootFolderId
    })
    return get().fetchFiles(rootFolderId)
  },

  // Fetch files from Google Drive
  fetchFiles: async (folderId = null, append = false) => {
    const currentFolderId = folderId || get().currentFolder
    set({ isLoading: true, error: null })
    
    try {
      const params = new URLSearchParams()
      if (currentFolderId) {
        params.append('folderId', currentFolderId)
      }
      
      if (append && get().nextPageToken) {
        params.append('pageToken', get().nextPageToken)
      }
      
      const response = await api.get(`/.netlify/functions/drive-list?${params.toString()}`)
      
      const newFiles = response.data.files || []
      const serverRootFolderId = response.data.rootFolderId
      
      // Initialize root folder path on first load
      let folderPath = get().folderPath
      if (!get().rootFolderId && serverRootFolderId) {
        folderPath = [{ id: serverRootFolderId, name: 'Files' }]
      }
      
      set({ 
        files: append ? [...get().files, ...newFiles] : newFiles,
        currentFolder: response.data.currentFolder || serverRootFolderId,
        rootFolderId: serverRootFolderId,
        folderPath,
        nextPageToken: response.data.nextPageToken || null,
        isLoading: false,
        needsConfig: false
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorData = error.response?.data || {}
      const errorMessage = errorData.error || 'Failed to fetch files'
      
      set({ 
        isLoading: false, 
        error: errorMessage,
        needsConfig: errorData.needsConfig || false
      })
      
      return { success: false, error: errorMessage }
    }
  },

  // Search files
  searchFiles: async (query) => {
    set({ isLoading: true, error: null })
    
    try {
      const params = new URLSearchParams()
      params.append('query', query)
      
      const response = await api.get(`/.netlify/functions/drive-list?${params.toString()}`)
      
      set({ 
        files: response.data.files || [],
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to search files'
      set({ isLoading: false, error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Upload file
  uploadFile: async (file, folderId = null) => {
    const currentFolderId = folderId || get().currentFolder
    set({ isUploading: true, error: null, uploadProgress: 0 })
    
    try {
      // Convert file to base64
      const reader = new FileReader()
      const base64Data = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            set({ uploadProgress: Math.round((e.loaded / e.total) * 50) })
          }
        }
        reader.readAsDataURL(file)
      })
      
      set({ uploadProgress: 60 })
      
      const response = await api.post('/.netlify/functions/drive-upload', {
        filename: file.name,
        mimeType: file.type,
        base64Data,
        folderId: currentFolderId
      })
      
      set({ uploadProgress: 100 })
      
      // Add new file to list
      if (response.data.file) {
        set(state => ({ 
          files: [response.data.file, ...state.files]
        }))
      }
      
      setTimeout(() => set({ isUploading: false, uploadProgress: 0 }), 500)
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to upload file'
      set({ isUploading: false, error: errorMessage, uploadProgress: 0 })
      return { success: false, error: errorMessage }
    }
  },

  // Upload multiple files
  uploadMultipleFiles: async (files, folderId = null) => {
    const results = []
    for (const file of files) {
      const result = await get().uploadFile(file, folderId)
      results.push(result)
    }
    return results
  },

  // Download file
  downloadFile: async (fileId, filename) => {
    try {
      const response = await api.get(`/.netlify/functions/drive-download?fileId=${fileId}`)
      
      if (response.data.file) {
        const { data, mimeType, name } = response.data.file
        
        // Create blob and download
        const blob = new Blob(
          [Uint8Array.from(atob(data), c => c.charCodeAt(0))],
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
      await api.post('/.netlify/functions/drive-delete', { fileId, permanent })
      
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
    
    try {
      const response = await api.post('/.netlify/functions/drive-create-folder', {
        name,
        parentId: currentFolderId
      })
      
      // Add new folder to list
      if (response.data.folder) {
        set(state => ({ 
          files: [response.data.folder, ...state.files]
        }))
      }
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create folder'
      return { success: false, error: errorMessage }
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
