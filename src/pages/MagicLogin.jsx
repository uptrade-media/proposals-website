// src/pages/MagicLogin.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'

export default function MagicLogin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [status, setStatus] = useState('validating') // validating, success, error
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const redirect = searchParams.get('redirect') || '/dashboard'

    if (!token) {
      setStatus('error')
      setError('No authentication token provided')
      return
    }

    authenticateWithMagicLink(token, redirect)
  }, [searchParams])

  const authenticateWithMagicLink = async (token, redirect) => {
    try {
      const res = await api.post('/.netlify/functions/auth-magic-login', { token })
      
      setStatus('success')
      
      // Redirect after brief success message
      setTimeout(() => {
        navigate(redirect)
      }, 1500)
      
    } catch (err) {
      setStatus('error')
      setError(err.response?.data?.error || 'Authentication failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {status === 'validating' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-green-600" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Logging you in...</h2>
                <p className="text-muted-foreground text-sm">Please wait while we authenticate your session</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Success!</h2>
                <p className="text-muted-foreground text-sm">Redirecting you now...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Your login link may have expired or is invalid.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  Return to Login →
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
