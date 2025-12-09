import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import useAuthStore from '../lib/auth-store'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[AuthCallback] Processing OAuth callback...')
      
      // Supabase has already set the session in localStorage
      // Just verify and fetch user data
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
