import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import useAuthStore from '../lib/auth-store'
import { authApi } from '../lib/portal-api'
import { supabase, getCurrentUser } from '../lib/supabase-auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUser, fetchOrganizationContext } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[AuthCallback] Processing OAuth callback...')
      console.log('[AuthCallback] URL:', window.location.href)
      console.log('[AuthCallback] Hash:', window.location.hash ? 'present' : 'none')
      
      // If there's a hash fragment with tokens, we need to handle it
      // Supabase's detectSessionInUrl should handle this, but we'll be more explicit
      if (window.location.hash && window.location.hash.includes('access_token')) {
        console.log('[AuthCallback] Hash fragment detected, parsing tokens...')
        
        // Parse the hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          console.log('[AuthCallback] Setting session from URL tokens...')
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            console.error('[AuthCallback] Failed to set session:', error)
            navigate('/login?error=session_failed', { replace: true })
            return
          }
          
          if (data.session) {
            console.log('[AuthCallback] Session set successfully, processing...')
            await processAuthenticatedUser(data.session)
            return
          }
        }
      }
      
      // Fallback: try getSession in case tokens were already processed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('[AuthCallback] getSession result:', { hasSession: !!session, error: sessionError?.message })
      
      if (sessionError) {
        console.error('[AuthCallback] Session error:', sessionError)
        navigate('/login?error=session_failed', { replace: true })
        return
      }
      
      if (session) {
        // Session exists, process immediately
        console.log('[AuthCallback] Session found, processing...')
        await processAuthenticatedUser(session)
        return
      }
      
      console.log('[AuthCallback] No session yet, waiting for auth state change...')
      // Session might not be ready yet - wait for auth state change
      let handled = false
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('[AuthCallback] Auth state changed:', event, 'session:', !!newSession)
        
        // Handle SIGNED_IN or INITIAL_SESSION with a valid session
        if (!handled && newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          handled = true
          subscription.unsubscribe()
          await processAuthenticatedUser(newSession)
        }
      })
      
      // Timeout after 15 seconds (increased from 10)
      setTimeout(() => {
        if (!handled) {
          subscription.unsubscribe()
          console.error('[AuthCallback] Timeout waiting for session')
          navigate('/login?error=timeout', { replace: true })
        }
      }, 15000)
    }
    
    const processAuthenticatedUser = async (session) => {
      const user = session.user
      const accessToken = session.access_token
      console.log('[AuthCallback] User authenticated:', user.email, 'token present:', !!accessToken)
      
      // Check if this is a new account setup (from AccountSetup page with token)
      const pendingSetupToken = localStorage.getItem('pendingSetupToken')
      const pendingSetupContactId = localStorage.getItem('pendingSetupContactId')
      
      // Create axios config with the new token (bypassing interceptor's getSession)
      const authConfig = {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
      
      if (pendingSetupToken) {
        console.log('[AuthCallback] Completing account setup after OAuth...')
        localStorage.removeItem('pendingSetupToken')
        
        try {
          const googleId = user?.user_metadata?.provider_id || user?.id
          
          // Use the token directly since session may not be synced yet
          await authApi.completeSetup({
            token: pendingSetupToken,
            method: 'google',
            googleId
          })
          
          console.log('[AuthCallback] Account setup completed via Google OAuth')
        } catch (setupError) {
          console.error('[AuthCallback] Failed to complete setup:', setupError)
        }
      } else if (pendingSetupContactId) {
        console.log('[AuthCallback] Completing account setup (contactId)...')
        localStorage.removeItem('pendingSetupContactId')
        
        try {
          await authApi.markSetupComplete()
        } catch (setupError) {
          console.error('[AuthCallback] Failed to complete setup:', setupError)
        }
      } else {
        // Link contact by email for regular OAuth logins
        console.log('[AuthCallback] Linking contact for:', user.email)
        try {
          await authApi.linkContact({
            email: user.email,
            authUserId: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name
          })
        } catch (linkError) {
          console.log('[AuthCallback] Contact link result:', linkError?.response?.data || 'ok')
        }
      }
      
      // Small delay to ensure session is persisted before getCurrentUser reads it
      console.log('[AuthCallback] Waiting for session to sync...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Get user data from contacts table - we already have a valid session
      try {
        const contactUser = await getCurrentUser()
        
        if (contactUser) {
          console.log('[AuthCallback] Found contact:', contactUser.email)
          setUser(contactUser)
          
          // Fetch organization context
          await fetchOrganizationContext(session.access_token)
          
          // Double check auth state was set
          const { isAuthenticated } = useAuthStore.getState()
          console.log('[AuthCallback] Auth state after setUser:', { isAuthenticated, user: contactUser.email })
          
          console.log('[AuthCallback] Auth successful, redirecting to dashboard')
          navigate('/dashboard', { replace: true })
        } else {
          console.error('[AuthCallback] No contact found for user')
          navigate('/login?error=no_contact', { replace: true })
        }
      } catch (error) {
        console.error('[AuthCallback] Error fetching user:', error)
        navigate('/login?error=fetch_failed', { replace: true })
      }
    }

    handleCallback()
  }, [navigate, setUser, fetchOrganizationContext])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
        <p className="text-white text-lg">Completing sign in...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait...</p>
      </div>
    </div>
  )
}
