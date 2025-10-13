import { create } from 'zustand'

// Cookie-based auth (no tokens in localStorage)
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

  // Check if user is authenticated (verify cookie)
  checkAuth: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch('/.netlify/functions/auth-verify', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        get().clearAuth()
        set({ isLoading: false })
        return { success: false }
      }

      const data = await response.json()
      
      if (data.ok && data.user) {
        get().setUser(data.user)
        set({ isLoading: false })
        return { success: true, user: data.user }
      } else {
        get().clearAuth()
        set({ isLoading: false })
        return { success: false }
      }
    } catch (error) {
      get().clearAuth()
      set({ isLoading: false, error: error.message })
      return { success: false, error: error.message }
    }
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

  // Logout function (clears cookie via server)
  logout: async () => {
    try {
      await fetch('/.netlify/functions/auth-logout', {
        method: 'POST',
        credentials: 'include'
      })
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
