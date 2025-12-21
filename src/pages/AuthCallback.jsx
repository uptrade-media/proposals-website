import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import useAuthStore from '../lib/auth-store'
import axios from 'axios'
import { supabase, getCurrentUser } from '../lib/supabase-auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUser, fetchOrganizationContext } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[AuthCallback] Processing OAuth callback...')
      
      // Wait for Supabase to process the OAuth callback and establish session
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
            await processAuthenticatedUser(newSession)
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
      await processAuthenticatedUser(session)
    }
    
    const processAuthenticatedUser = async (session) => {
      const user = session.user
      console.log('[AuthCallback] User authenticated:', user.email)
      
      // Check if this is a new account setup (from AccountSetup page with token)
      const pendingSetupToken = localStorage.getItem('pendingSetupToken')
      const pendingSetupContactId = localStorage.getItem('pendingSetupContactId')
      
      if (pendingSetupToken) {
        console.log('[AuthCallback] Completing account setup after OAuth...')
        localStorage.removeItem('pendingSetupToken')
        
        try {
          const googleId = user?.user_metadata?.provider_id || user?.id
          
          await axios.post('/.netlify/functions/auth-complete-setup', {
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
          await axios.post('/.netlify/functions/auth-mark-setup-complete', {
            contactId: pendingSetupContactId
          }, { withCredentials: true })
        } catch (setupError) {
          console.error('[AuthCallback] Failed to complete setup:', setupError)
        }
      } else {
        // Link contact by email for regular OAuth logins
        console.log('[AuthCallback] Linking contact for:', user.email)
        try {
          await axios.post('/.netlify/functions/auth-link-contact', {
            email: user.email,
            authUserId: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name
          })
        } catch (linkError) {
          console.log('[AuthCallback] Contact link result:', linkError?.response?.data || 'ok')
        }
      }
      
      // Get user data from contacts table - we already have a valid session
      try {
        const contactUser = await getCurrentUser()
        
        if (contactUser) {
          console.log('[AuthCallback] Found contact:', contactUser.email)
          setUser(contactUser)
          
          // Fetch organization context
          await fetchOrganizationContext(session.access_token)
          
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
