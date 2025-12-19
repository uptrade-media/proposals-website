import axios from 'axios'
import { supabase } from './supabase-auth'

// Create axios instance with default config
const api = axios.create({
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to attach Supabase session token and org context
api.interceptors.request.use(
  async (config) => {
    console.log('[API Request]', config.method?.toUpperCase(), config.url)
    
    // Get Supabase session and add to Authorization header
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    
    // Add organization context from localStorage (set by auth-store when switching orgs)
    const storedTenantProject = localStorage.getItem('currentTenantProject')
    if (storedTenantProject) {
      try {
        const project = JSON.parse(storedTenantProject)
        // Use the project's org_id for filtering (contacts, etc.)
        // This allows tenant-specific data to be filtered properly
        config.headers['X-Organization-Id'] = project.org_id || project.id
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// Add response interceptor to handle 401 errors globally
api.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.config.method?.toUpperCase(), response.config.url, 'Status:', response.status)
    return response
  },
  async (error) => {
    // Log the error details
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message
    })
    
    // If we get a 401, the session has expired or is invalid
    if (error.response?.status === 401) {
      console.error('[API] 401 Unauthorized - Session expired or invalid')
      
      // Check if we're on an auth page already
      const isOnAuthPage = window.location.pathname.includes('/login') ||
                           window.location.pathname.includes('/reset-password') ||
                           window.location.pathname.includes('/auth/')
      
      if (!isOnAuthPage) {
        // Try to refresh the session first
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (!session || refreshError) {
          console.log('[API] Session expired, redirecting to login')
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default api