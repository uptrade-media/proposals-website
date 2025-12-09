import axios from 'axios'
import { supabase } from './supabase-auth'

// Create axios instance with default config
const api = axios.create({
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to attach Supabase session token
api.interceptors.request.use(
  async (config) => {
    console.log('[API Request]', config.method?.toUpperCase(), config.url)
    
    // Get Supabase session and add to Authorization header
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
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
  (error) => {
    // Log the error details
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message
    })
    
    // If we get a 401, the session has expired
    if (error.response?.status === 401) {
      console.error('[API] 401 Unauthorized - Session expired or invalid')
      console.error('[API] Current path:', window.location.pathname)
      console.error('[API] URL:', error.config?.url)
      
      // Only redirect to login if:
      // 1. We're not already on auth pages
      // 2. The 401 is from auth-verify (session check), not from other endpoints
      const isAuthVerify = error.config?.url?.includes('auth-verify')
      const isOnAuthPage = window.location.pathname.includes('/login') ||
                           window.location.pathname.includes('/account-setup') ||
                           window.location.pathname.includes('/reset-password') ||
                           window.location.pathname.includes('/magic-login')
      
      if (isAuthVerify && !isOnAuthPage) {
        console.log('[API] Session expired, redirecting to login')
        window.location.href = '/login'
      } else if (!isAuthVerify) {
        console.warn('[API] 401 from', error.config?.url, '- request failed but not redirecting (may be expected)')
      }
    }
    
    return Promise.reject(error)
  }
)

export default api