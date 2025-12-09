import { create } from 'zustand'
import { supabase, getCurrentUser, getSession, signOut } from './supabase-auth'

// Global flag to prevent multiple simultaneous auth checks
let isCheckingAuth = false
let authCheckPromise = null

// Supabase Auth integration
const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Set user data (session verified via cookie)
  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      error: null
    })
  },

  // Clear authentication data
  clearAuth: () => {
    set({
      user: null,
      isAuthenticated: false,
      error: null
    })
  },

  // Check if user is authenticated (verify Supabase session + fetch contacts data)
  checkAuth: async () => {
    // If already checking, return the existing promise
    if (isCheckingAuth && authCheckPromise) {
      console.log('[AuthStore] Auth check already in progress, returning existing promise');
      return authCheckPromise
    }
    
    console.log('[AuthStore] Checking authentication');
    isCheckingAuth = true
    set({ isLoading: true, error: null })
    
    authCheckPromise = (async () => {
      try {
        // Check Supabase session
        const { data: { session }, error: sessionError } = await getSession()
        
        if (sessionError || !session) {
          console.log('[AuthStore] No active Supabase session');
          get().clearAuth()
          set({ isLoading: false })
          return { success: false }
        }

        // Fetch user data from contacts table
        const contactUser = await getCurrentUser()
        
        if (contactUser) {
          console.log('[AuthStore] Auth verification successful, user:', contactUser.email);
          get().setUser(contactUser)
          set({ isLoading: false })
          return { success: true, user: contactUser }
        } else {
          console.log('[AuthStore] No matching contact found for auth user');
          get().clearAuth()
          set({ isLoading: false })
          return { success: false }
        }
      } catch (error) {
        console.error('[AuthStore] Auth verification error:', error);
        get().clearAuth()
        set({ isLoading: false, error: error.message })
        return { success: false, error: error.message }
      } finally {
        isCheckingAuth = false
        authCheckPromise = null
      }
    })()
    
    return authCheckPromise
  },

  // Login function (cookie-based via Netlify function)
  login: async (email, password, nextPath = '/') => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch('/.netlify/functions/auth-login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          password,
          next: nextPath
        })
      })

      let data = {}
      try { data = await response.json() } catch {}

      if (!response.ok) {
        const errorMessage = data?.error || 'Login failed'
        set({ 
          isLoading: false, 
          error: errorMessage,
          isAuthenticated: false
        })
        return { success: false, error: errorMessage }
      }

      // Check if 2FA is required
      if (data.requiresMfa) {
        console.log('[AuthStore] 2FA required for login')
        set({ isLoading: false })
        return { success: true, requiresMfa: true }
      }

      // Cookie is set by server, fetch user data
      await get().checkAuth()
      
      set({ isLoading: false })
      return { success: true, redirect: data.redirect || '/' }
      
    } catch (error) {
      const errorMessage = error.message || 'Login failed'
      set({ 
        isLoading: false, 
        error: errorMessage,
        isAuthenticated: false
      })
      return { success: false, error: errorMessage }
    }
  },

  // Logout function (signs out from Supabase)
  logout: async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    get().clearAuth()
    // Redirect to login
    window.location.href = '/login'
  },

  // Sign up function (create new account)
  signup: async (email, password, name, nextPath = '/') => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch('/.netlify/functions/auth-signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          password,
          name: name.trim(),
          next: nextPath
        })
      })

      let data = {}
      try { data = await response.json() } catch {}

      if (!response.ok) {
        const errorMessage = data?.error || 'Sign up failed'
        set({ 
          isLoading: false, 
          error: errorMessage,
          isAuthenticated: false
        })
        return { success: false, error: errorMessage }
      }

      // Cookie is set by server, fetch user data
      await get().checkAuth()
      
      set({ isLoading: false })
      return { success: true, redirect: data.redirect || '/' }
      
    } catch (error) {
      const errorMessage = error.message || 'Sign up failed'
      set({ 
        isLoading: false, 
        error: errorMessage,
        isAuthenticated: false
      })
      return { success: false, error: errorMessage }
    }
  },

  // Clear error
  clearError: () => set({ error: null })
}))

export default useAuthStore
