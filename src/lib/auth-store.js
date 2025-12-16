import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getCurrentUser, getSession, signOut, signInWithPassword, signUp as supabaseSignUp } from './supabase-auth'
import axios from 'axios'

// Global flag to prevent multiple simultaneous auth checks
let isCheckingAuth = false
let authCheckPromise = null

// Configure axios to include organization header
axios.interceptors.request.use(config => {
  const state = useAuthStore.getState()
  if (state.currentOrg?.id) {
    config.headers['X-Organization-Id'] = state.currentOrg.id
  }
  return config
})

// Supabase Auth integration with multi-tenant support
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Multi-tenant state
      currentOrg: null,
      availableOrgs: [],
      isSuperAdmin: false,

      // Set user data (session verified via cookie)
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          error: null
        })
      },
      
      // Set organization context
      setOrganization: (org) => {
        set({ currentOrg: org })
      },
      
      // Set available organizations
      setAvailableOrgs: (orgs) => {
        set({ availableOrgs: orgs || [] })
      },
      
      // Set super admin flag
      setSuperAdmin: (isSuperAdmin) => {
        set({ isSuperAdmin })
      },

      // Clear authentication data
      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          currentOrg: null,
          availableOrgs: [],
          isSuperAdmin: false
        })
      },

      // Check if user is authenticated (verify Supabase session + fetch contacts data)
      checkAuth: async () => {
        // DEV BYPASS: Skip auth check if we have a dev-bypass user
        const currentUser = get().user
        if (currentUser?.id === 'dev-bypass') {
          console.log('[AuthStore] Dev bypass user detected, skipping auth check');
          set({ isLoading: false })
          return { success: true, user: currentUser }
        }
        
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
              
              // Fetch organization context from backend
              await get().fetchOrganizationContext(session.access_token)
              
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
      
      // Fetch organization context from backend
      fetchOrganizationContext: async (accessToken) => {
        try {
          // The backend's getAuthenticatedUser already returns org context
          // We'll call a lightweight endpoint to get org info
          const response = await axios.get('/.netlify/functions/auth-me', {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          })
          
          const { organization, availableOrgs, isSuperAdmin } = response.data
          
          if (organization) {
            set({ 
              currentOrg: organization,
              availableOrgs: availableOrgs || [],
              isSuperAdmin: isSuperAdmin || false
            })
          }
        } catch (error) {
          console.log('[AuthStore] Could not fetch org context (may not be set up yet):', error.message)
          // Not a fatal error - org context is optional during migration
        }
      },
      
      // Switch to a different organization or project-based tenant
      switchOrganization: async (organizationId, { projectId } = {}) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data: { session } } = await getSession()
          if (!session) throw new Error('Not authenticated')
          
          // Support both organization-based and project-based switching
          const payload = projectId ? { projectId } : { organizationId }
          
          const response = await axios.post(
            '/.netlify/functions/auth-switch-org',
            payload,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            }
          )
          
          const { organization, role, isSuperAdmin, project } = response.data
          
          set({
            currentOrg: { ...organization, userRole: role },
            isSuperAdmin,
            isLoading: false
          })
          
          // Store project context if switching to a project-based tenant
          if (project) {
            localStorage.setItem('currentTenantProject', JSON.stringify(project))
          }
          
          // Reload the page to apply new org context everywhere
          window.location.reload()
          
          return { success: true, organization, project }
        } catch (error) {
          console.error('[AuthStore] Switch organization error:', error)
          set({ isLoading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },
      
      // Fetch all organizations (super admin only)
      fetchAllOrganizations: async () => {
        try {
          const { data: { session } } = await getSession()
          if (!session) throw new Error('Not authenticated')
          
          const response = await axios.get('/.netlify/functions/admin-tenants-list', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          })
          
          set({ availableOrgs: response.data.organizations })
          return response.data.organizations
        } catch (error) {
          console.error('[AuthStore] Fetch all organizations error:', error)
          return []
        }
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
    }),
    {
      name: 'auth-storage',
      // Only persist organization context, not sensitive auth data
      partialize: (state) => ({
        currentOrg: state.currentOrg,
        isSuperAdmin: state.isSuperAdmin
      })
    }
  )
)

// Custom hook to check if a feature is enabled for current org
export function useOrgFeatures() {
  const currentOrg = useAuthStore((state) => state.currentOrg)
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin)
  
  return {
    features: currentOrg?.features || {},
    hasFeature: (featureKey) => {
      // Super admins see all features
      if (isSuperAdmin) return true
      return currentOrg?.features?.[featureKey] === true
    },
    orgName: currentOrg?.name || 'Portal',
    orgSlug: currentOrg?.slug,
    orgTheme: currentOrg?.theme || {},
    plan: currentOrg?.plan || 'free'
  }
}

export default useAuthStore
