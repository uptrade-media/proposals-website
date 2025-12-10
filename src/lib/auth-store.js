import { create } from 'zustand'
import { supabase, getCurrentUser, getSession, signOut, signInWithPassword, signUp as supabaseSignUp } from './supabase-auth'

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

  // Login function using Supabase Auth
  login: async (email, password, nextPath = '/') => {
    set({ isLoading: true, error: null })
    
    try {
      // Use Supabase signInWithPassword
      const { user, session } = await signInWithPassword(email.trim(), password)
      
      if (!session) {
        throw new Error('Login failed - no session returned')
      }
      
      console.log('[AuthStore] Supabase login successful, fetching user data...')
      
      // Fetch user data from contacts table
      const contactUser = await getCurrentUser()
      
      if (contactUser) {
        get().setUser(contactUser)
        set({ isLoading: false })
        
        // Determine redirect based on role
        const redirect = contactUser.role === 'admin' ? '/admin' : (nextPath || '/dashboard')
        return { success: true, redirect }
      } else {
        throw new Error('Account not found in system')
      }
      
    } catch (error) {
      console.error('[AuthStore] Login error:', error)
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

  // Sign up function using Supabase Auth
  signup: async (email, password, name, nextPath = '/') => {
    set({ isLoading: true, error: null })
    
    try {
      // Use Supabase signUp
      const { user, session } = await supabaseSignUp(email.trim(), password, { name: name.trim() })
      
      if (!session) {
        // Supabase might require email confirmation
        set({ isLoading: false })
        return { 
          success: true, 
          requiresConfirmation: true,
          message: 'Please check your email to confirm your account.'
        }
      }
      
      console.log('[AuthStore] Supabase signup successful')
      
      // Fetch user data from contacts table
      await get().checkAuth()
      
      set({ isLoading: false })
      return { success: true, redirect: nextPath || '/dashboard' }
      
    } catch (error) {
      console.error('[AuthStore] Signup error:', error)
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
