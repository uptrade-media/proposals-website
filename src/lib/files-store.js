import { create } from 'zustand'
import axios from 'axios'

const useFilesStore = create((set, get) => ({
  files: [],
  categories: [],
  currentProjectId: null,
  isLoading: false,
  error: null,
  uploadProgress: 0,

  // Clear error
  clearError: () => set({ error: null }),

  // Set current project
  setCurrentProject: (projectId) => set({ currentProjectId: projectId }),

  // Fetch file categories
  fetchCategories: async () => {
    try {
      const response = await axios.get('/files/categories')
      set({ categories: response.data.categories })
      return { success: true, data: response.data }
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
      const params = new URLSearchParams()
      if (projectId) params.append('projectId', projectId)
      if (filters.category) params.append('category', filters.category)
      if (filters.isPublic !== undefined) params.append('isPublic', filters.isPublic)
      
      const url = `/.netlify/functions/files-list${params.toString() ? `?${params.toString()}` : ''}`
      const response = await axios.get(url)
      
      set({ 
        files: response.data.files || [],
        currentProjectId: projectId,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
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
  uploadFile: async (projectId, file, category = 'general', isPublic = false) => {
    set({ isLoading: true, error: null, uploadProgress: 0 })
    
    try {
      // Convert file to base64
      const reader = new FileReader()
      const base64Data = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      const response = await axios.post('/.netlify/functions/files-upload', {
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        base64Data,
        projectId,
        category,
        isPublic
      })
      
      // Add new file to the list
      set(state => ({ 
        files: [response.data.file, ...state.files],
        isLoading: false,
        uploadProgress: 100
      }))
      
      setTimeout(() => set({ uploadProgress: 0 }), 1000)
      
      return { success: true, data: response.data }
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
      const response = await axios.get(`/.netlify/functions/files-download/${fileId}`, {
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
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
      const response = await axios.put(`/files/${fileId}`, fileData)
      
      // Update file in the list
      set(state => ({
        files: state.files.map(f => 
          f.id === fileId ? response.data.file : f
        ),
        isLoading: false
      }))
      
      return { success: true, data: response.data }
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
      await axios.delete(`/.netlify/functions/files-delete/${fileId}`)
      
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
