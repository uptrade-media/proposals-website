import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getCurrentUser, getSession, signOut, signInWithPassword, signUp as supabaseSignUp } from './supabase-auth'
import axios from 'axios'

// Global flag to prevent multiple simultaneous auth checks
let isCheckingAuth = false
let authCheckPromise = null

// Configure axios to include organization/project headers and auth token
// 
// Two-tier context:
// - X-Organization-Id: The business entity (GWA LLC) - for org-level services
// - X-Project-Id: The specific project (GWA NextJS Site) - for project-level tools
//
// When in PROJECT context: Both headers are set
// When in ORG-only context: Only X-Organization-Id is set
axios.interceptors.request.use(async config => {
  const state = useAuthStore.getState()
  
  // Add organization ID header (for org-level services: billing, messages, proposals, files)
  if (state.currentOrg?.id) {
    config.headers['X-Organization-Id'] = state.currentOrg.id
  }
  
  // Add project ID header (for project-level tools: CRM, SEO, Ecommerce, Blog, Analytics)
  // When in a project context, this is the project.id
  // Project-level data uses this for filtering (contacts.org_id, seo_sites.org_id, etc.)
  if (state.currentProject?.id) {
    config.headers['X-Project-Id'] = state.currentProject.id
    // Also set org_id to the project's organization for legacy compatibility
    // Many tables use org_id which should be the project's org_id (same as organization_id)
    if (state.currentProject.org_id) {
      config.headers['X-Tenant-Org-Id'] = state.currentProject.org_id
    }
  }
  
  // Add auth token
  try {
    const { data } = await getSession()
    if (data?.session?.access_token) {
      config.headers['Authorization'] = `Bearer ${data.session.access_token}`
    }
  } catch (error) {
    console.error('Failed to get session for axios request:', error)
  }
  
  return config
}, error => {
  return Promise.reject(error)
})

// Supabase Auth integration with multi-tenant support
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Multi-tenant state - Two-tier hierarchy
      // Organization = business entity (e.g., "Garcia's Welding LLC")
      // Project = web app/site under org (e.g., "GWA NextJS Site")
      currentOrg: null,        // The organization context
      currentProject: null,    // The project context (if viewing a specific project)
      availableOrgs: [],       // Organizations the user belongs to
      availableProjects: [],   // Projects under the current organization
      isSuperAdmin: false,
      accessLevel: null,       // 'organization' (full access) or 'project' (limited)

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
      
      // Set project context (within the current organization)
      setProject: (project) => {
        set({ currentProject: project })
      },
      
      // Set available organizations
      setAvailableOrgs: (orgs) => {
        set({ availableOrgs: orgs || [] })
      },
      
      // Set available projects for current organization
      setAvailableProjects: (projects) => {
        set({ availableProjects: projects || [] })
      },
      
      // Set super admin flag
      setSuperAdmin: (isSuperAdmin) => {
        set({ isSuperAdmin })
      },
      
      // Set access level for current org ('organization' or 'project')
      setAccessLevel: (accessLevel) => {
        set({ accessLevel })
      },

      // Clear authentication data
      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          currentOrg: null,
          currentProject: null,
          availableOrgs: [],
          availableProjects: [],
          isSuperAdmin: false,
          accessLevel: null
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
          // Check if we have stored contexts
          const storedOrg = localStorage.getItem('currentOrganization')
          const storedProject = localStorage.getItem('currentTenantProject')
          
          // Restore project context if exists
          if (storedProject) {
            try {
              const project = JSON.parse(storedProject)
              console.log('[AuthStore] Restoring project context:', project.title)
              
              // Build project context
              const projectContext = {
                id: project.id,
                name: project.title,
                domain: project.tenant_domain || project.domain,
                features: project.tenant_features || project.features || [],
                theme: { 
                  primaryColor: project.tenant_theme_color || project.theme?.primaryColor || '#4bbf39',
                  logoUrl: project.tenant_logo_url || project.theme?.logoUrl,
                  faviconUrl: project.tenant_favicon_url || project.theme?.faviconUrl
                },
                isProjectTenant: true,
                organization_id: project.organization_id
              }
              
              set({
                currentProject: projectContext,
                isSuperAdmin: true // Admin who switched to project
              })
            } catch (e) {
              console.error('[AuthStore] Failed to parse stored project:', e)
              localStorage.removeItem('currentTenantProject')
            }
          }
          
          // Restore org context if exists (and no project override)
          if (storedOrg && !storedProject) {
            try {
              const org = JSON.parse(storedOrg)
              console.log('[AuthStore] Restoring org context:', org.name)
              set({ currentOrg: org })
            } catch (e) {
              console.error('[AuthStore] Failed to parse stored org:', e)
              localStorage.removeItem('currentOrganization')
            }
          }
          
          // Fetch fresh context from backend
          const response = await axios.get('/.netlify/functions/auth-me', {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          })
          
          const { organization, availableOrgs, projects, isSuperAdmin, accessLevel } = response.data
          
          console.log('[AuthStore] auth-me response - org:', organization?.name, 'projects:', projects?.length, 'isSuperAdmin:', isSuperAdmin, 'accessLevel:', accessLevel)
          
          // Always set isSuperAdmin and accessLevel, even if no org context
          set({ 
            isSuperAdmin: isSuperAdmin || false,
            accessLevel: accessLevel || 'organization' // Default to org-level for backwards compatibility
          })
          
          if (organization) {
            // Merge fresh org data with cached (to pick up new fields like org_type)
            const cachedOrg = get().currentOrg
            const mergedOrg = cachedOrg?.id === organization.id 
              ? { ...cachedOrg, ...organization } // Merge fresh data into cached
              : (cachedOrg || organization) // Different org or no cache, use fresh
            
            set({ 
              currentOrg: mergedOrg,
              availableOrgs: availableOrgs || [],
              availableProjects: projects || []
            })
            
            // Update localStorage with merged data
            localStorage.setItem('currentOrganization', JSON.stringify(mergedOrg))
          }
        } catch (error) {
          console.log('[AuthStore] Could not fetch org context (may not be set up yet):', error.message)
          // Not a fatal error - org context is optional during migration
        }
      },
      
      // Switch to a different organization
      // This sets the org context and clears any project context
      switchOrganization: async (organizationId) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data: { session } } = await getSession()
          if (!session) throw new Error('Not authenticated')
          
          const response = await axios.post(
            '/.netlify/functions/auth-switch-org',
            { organizationId },
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            }
          )
          
          const { organization, role, isSuperAdmin, projects } = response.data
          
          // Auto-enter first project if available (for client orgs)
          const firstProject = projects?.[0]
          let projectContext = null
          
          if (firstProject && organization.org_type !== 'agency') {
            // Build project context
            projectContext = {
              id: firstProject.id,
              name: firstProject.title || firstProject.name,
              domain: firstProject.tenant_domain || firstProject.domain,
              features: firstProject.tenant_features || firstProject.features || [],
              theme: { 
                primaryColor: firstProject.tenant_theme_color || '#4bbf39',
                logoUrl: firstProject.tenant_logo_url,
                faviconUrl: firstProject.tenant_favicon_url
              },
              isProjectTenant: true,
              organization_id: organization.id
            }
          }
          
          set({
            currentOrg: { ...organization, userRole: role },
            currentProject: projectContext, // Auto-enter first project
            availableProjects: projects || [],
            isSuperAdmin,
            isLoading: false
          })
          
          // Store contexts
          if (projectContext) {
            localStorage.setItem('currentTenantProject', JSON.stringify(firstProject))
          } else {
            localStorage.removeItem('currentTenantProject')
          }
          // Store org context
          localStorage.setItem('currentOrganization', JSON.stringify(organization))
          
          // Reload the page to apply new org context everywhere
          window.location.reload()
          
          return { success: true, organization }
        } catch (error) {
          console.error('[AuthStore] Switch organization error:', error)
          set({ isLoading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },
      
      // Switch to a specific project within the current organization
      // This sets project context while keeping org context
      switchProject: async (projectId) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data: { session } } = await getSession()
          if (!session) throw new Error('Not authenticated')
          
          const response = await axios.post(
            '/.netlify/functions/auth-switch-org',
            { projectId },
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            }
          )
          
          const { organization, project, role, isSuperAdmin } = response.data
          
          // Build the project context (for backward compatibility with existing code)
          const projectContext = project ? {
            id: project.id,
            name: project.title,
            domain: project.tenant_domain,
            features: project.tenant_features || [],
            theme: { 
              primaryColor: project.tenant_theme_color || '#4bbf39',
              logoUrl: project.tenant_logo_url,
              faviconUrl: project.tenant_favicon_url
            },
            isProjectTenant: true,
            organization_id: project.organization_id || organization?.id
          } : null
          
          set({
            currentOrg: organization ? { ...organization, userRole: role } : get().currentOrg,
            currentProject: projectContext,
            isSuperAdmin,
            isLoading: false
          })
          
          // Store project context for restoration
          if (project) {
            localStorage.setItem('currentTenantProject', JSON.stringify(project))
          }
          
          // Reload the page to apply new context everywhere
          window.location.reload()
          
          return { success: true, project: projectContext, organization }
        } catch (error) {
          console.error('[AuthStore] Switch project error:', error)
          set({ isLoading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },
      
      // Return to admin/organization view (clear project context)
      exitProjectView: async () => {
        set({ isLoading: true })
        
        // Clear project context
        localStorage.removeItem('currentTenantProject')
        
        set({
          currentProject: null,
          isLoading: false
        })
        
        // Reload to show org dashboard
        window.location.reload()
        
        return { success: true }
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
      // Only persist organization/project context, not sensitive auth data
      partialize: (state) => ({
        currentOrg: state.currentOrg,
        currentProject: state.currentProject,
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
    // Check if feature is enabled
    // - For super admins: returns true UNLESS ignoreSuperAdmin is true
    // - For regular users: checks the features object
    hasFeature: (featureKey, options = {}) => {
      const { ignoreSuperAdmin = false } = options
      // Super admins see all features unless explicitly checking raw value
      if (isSuperAdmin && !ignoreSuperAdmin) return true
      return currentOrg?.features?.[featureKey] === true
    },
    // Check raw feature value (ignores super admin override)
    hasFeatureRaw: (featureKey) => {
      return currentOrg?.features?.[featureKey] === true
    },
    orgName: currentOrg?.name || 'Portal',
    orgSlug: currentOrg?.slug,
    orgTheme: currentOrg?.theme || {},
    plan: currentOrg?.plan || 'free'
  }
}

export default useAuthStore
