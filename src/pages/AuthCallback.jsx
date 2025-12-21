import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import useAuthStore from '../lib/auth-store'
import axios from 'axios'
import { supabase } from '../lib/supabase-auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[AuthCallback] Processing OAuth callback...')
      
      // Wait for Supabase to process the OAuth callback and establish session
      // The URL hash contains the tokens that Supabase needs to process
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[AuthCallback] Session error:', sessionError)
        navigate('/login?error=session_failed', { replace: true })
        return
      }
      
      if (!session) {
        console.log('[AuthCallback] No session yet, waiting for auth state change...')
        // Session might not be ready yet - wait for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log('[AuthCallback] Auth state changed:', event)
          if (event === 'SIGNED_IN' && newSession) {
            subscription.unsubscribe()
            await processAuthenticatedUser(newSession.user)
          }
        })
        
        // Timeout after 10 seconds
        setTimeout(() => {
          subscription.unsubscribe()
          console.error('[AuthCallback] Timeout waiting for session')
          navigate('/login?error=timeout', { replace: true })
        }, 10000)
        return
      }
      
      // Session exists, process the user
      await processAuthenticatedUser(session.user)
    }
    
    const processAuthenticatedUser = async (user) => {
      console.log('[AuthCallback] User authenticated:', user.email)
      
      // Check if this is a new account setup (from AccountSetup page with JWT token or contact ID)
      const pendingSetupToken = localStorage.getItem('pendingSetupToken')
      const pendingSetupContactId = localStorage.getItem('pendingSetupContactId')
      
      if (pendingSetupToken) {
        console.log('[AuthCallback] Completing account setup after OAuth with JWT...')
        localStorage.removeItem('pendingSetupToken')
        
        try {
          // Get the current user's Google ID
          const googleId = user?.user_metadata?.provider_id || user?.id
          
          // Complete the setup on the backend
          await axios.post('/.netlify/functions/auth-complete-setup', {
            token: pendingSetupToken,
            method: 'google',
            googleId
          })
          
          console.log('[AuthCallback] Account setup completed via Google OAuth')
        } catch (setupError) {
          console.error('[AuthCallback] Failed to complete setup:', setupError)
          // Continue anyway - the user is authenticated
        }
      } else if (pendingSetupContactId) {
        console.log('[AuthCallback] Completing account setup after OAuth (Supabase magic link)...')
        localStorage.removeItem('pendingSetupContactId')
        
        try {
          // Mark setup as complete for Supabase magic link user
          await axios.post('/.netlify/functions/auth-mark-setup-complete', {
            contactId: pendingSetupContactId
          }, { withCredentials: true })
          
          console.log('[AuthCallback] Account setup completed via Google OAuth (magic link)')
        } catch (setupError) {
          console.error('[AuthCallback] Failed to complete setup:', setupError)
          // Continue anyway - the user is authenticated
        }
      } else {
        // This might be from a Supabase magic link/invite - link contact by email
        console.log('[AuthCallback] Linking contact for:', user.email)
        try {
          await axios.post('/.netlify/functions/auth-link-contact', {
            email: user.email,
            authUserId: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name
          })
        } catch (linkError) {
          // Non-fatal - contact might already be linked
          console.log('[AuthCallback] Contact link result:', linkError?.response?.data || 'ok')
        }
      }
      
      // Verify and fetch user data
      const result = await checkAuth()
      
      if (result.success && result.user) {
        console.log('[AuthCallback] Auth successful, redirecting...')
        // Always redirect to dashboard - let the dashboard handle role-based routing
        navigate('/dashboard', { replace: true })
      } else {
        console.error('[AuthCallback] Authentication failed:', result.error)
        navigate('/login?error=auth_failed', { replace: true })
      }
    }

    handleCallback()
  }, [navigate, checkAuth])

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
