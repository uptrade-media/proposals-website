import { create } from 'zustand'
import { filesApi } from './portal-api'
import { supabase } from './supabase'

const useFilesStore = create((set, get) => ({
  files: [],
  folders: [],
  categories: [],
  currentProjectId: null,
  currentFolderPath: null,
  isLoading: false,
  error: null,
  uploadProgress: 0,

  // Clear error
  clearError: () => set({ error: null }),

  // Set current project
  setCurrentProject: (projectId) => set({ currentProjectId: projectId, currentFolderPath: null }),

  // Set current folder
  setCurrentFolder: (folderPath) => set({ currentFolderPath: folderPath }),

  // Fetch folders for a project
  fetchFolders: async (projectId) => {
    try {
      const response = await filesApi.listFolders(projectId)
      const data = response.data || response
      set({ folders: data.folders || [] })
      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch folders'
      set({ error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch file categories
  fetchCategories: async () => {
    try {
      const response = await filesApi.getCategories()
      const data = response.data || response
      set({ categories: data.categories || data })
      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch categories'
      set({ error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch project files
  fetchFiles: async (projectId, filters = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await filesApi.listFiles({ projectId, ...filters })
      const data = response.data || response
      
      set({ 
        files: data.files || data || [],
        currentProjectId: projectId,
        isLoading: false 
      })
      
      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch files'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Upload file
  uploadFile: async (projectId, file, category = 'general', isPublic = false, folderPath = null) => {
    set({ isLoading: true, error: null, uploadProgress: 0 })
    
    try {
      // Generate unique file ID and path
      const fileId = crypto.randomUUID()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const storagePath = `${category}/${fileId}.${ext}`
      
      // Upload directly to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(storagePath)
      
      // Register the file with the API
      const response = await filesApi.registerFile({
        fileId,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        storagePath,
        publicUrl: urlData.publicUrl,
        projectId,
        folderPath,
        category,
        isPublic
      })
      const data = response.data || response
      
      // Add new file to the list
      set(state => ({ 
        files: [data.file || data, ...state.files],
        isLoading: false,
        uploadProgress: 100
      }))
      
      setTimeout(() => set({ uploadProgress: 0 }), 1000)
      
      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to upload file'
      set({ 
        isLoading: false, 
        error: errorMessage,
        uploadProgress: 0
      })
      return { success: false, error: errorMessage }
    }
  },

  // Upload multiple files
  uploadMultipleFiles: async (projectId, files, isPublic = false) => {
    set({ isLoading: true, error: null })
    
    const results = []
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      set({ uploadProgress: Math.round(((i + 1) / files.length) * 100) })
      
      const result = await get().uploadFile(projectId, file, isPublic)
      results.push({ file: file.name, ...result })
      
      if (result.success) {
        successCount++
      } else {
        errorCount++
      }
    }
    
    set({ 
      isLoading: false,
      uploadProgress: 0,
      error: errorCount > 0 ? `${errorCount} files failed to upload` : null
    })
    
    return {
      success: errorCount === 0,
      results,
      summary: { successCount, errorCount, total: files.length }
    }
  },

  // Download file
  downloadFile: async (fileId, filename) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await filesApi.downloadFile(fileId)
      const data = response.data || response
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      set({ isLoading: false })
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to download file'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Update file
  updateFile: async (fileId, fileData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await filesApi.updateFile(fileId, fileData)
      const data = response.data || response
      const file = data.file || data
      
      // Update file in the list
      set(state => ({
        files: state.files.map(f => 
          f.id === fileId ? file : f
        ),
        isLoading: false
      }))
      
      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update file'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Delete file
  deleteFile: async (fileId) => {
    set({ isLoading: true, error: null })
    
    try {
      await filesApi.deleteFile(fileId)
      
      // Remove file from the list
      set(state => ({
        files: state.files.filter(f => f.id !== fileId),
        isLoading: false
      }))
      
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete file'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Replace file contents (keeps same URL/path)
  replaceFile: async (fileId, file) => {
    set({ isLoading: true, error: null, uploadProgress: 0 })

    try {
      const reader = new FileReader()
      const base64Data = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await filesApi.replaceFile(fileId, {
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        base64Data
      })

      const data = response.data || response
      const updatedFile = data.file || data

      set(state => ({
        files: state.files.map(f => f.id === fileId ? { ...f, ...updatedFile } : f),
        isLoading: false,
        uploadProgress: 100
      }))

      setTimeout(() => set({ uploadProgress: 0 }), 500)

      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to replace file'
      set({ 
        isLoading: false, 
        error: errorMessage,
        uploadProgress: 0
      })
      return { success: false, error: errorMessage }
    }
  },

  // Get file size formatted
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // Get file icon based on category
  getFileIcon: (category, mimeType) => {
    switch (category) {
      case 'documents':
        return 'FileText'
      case 'images':
        return 'Image'
      case 'videos':
        return 'Video'
      case 'spreadsheets':
        return 'Table'
      case 'presentations':
        return 'Presentation'
      case 'archives':
        return 'Archive'
      default:
        return 'File'
    }
  },

  // Clear all data (for logout)
  clearAll: () => set({
    files: [],
    categories: [],
    currentProjectId: null,
    error: null,
    uploadProgress: 0
  })
}))

export default useFilesStore
