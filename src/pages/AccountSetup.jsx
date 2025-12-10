// src/pages/AccountSetup.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2, KeyRound, Mail, Eye, EyeOff, Lock, Sparkles, ArrowRight, Lightbulb } from 'lucide-react'
import api from '@/lib/api'
import useAuthStore from '../lib/auth-store'
const logo = '/logo.svg'

export default function AccountSetup() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithGoogle } = useAuthStore()
  
  const [token, setToken] = useState(searchParams.get('token'))
  const [tokenData, setTokenData] = useState(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('No setup token provided')
      setIsValidating(false)
      return
    }

    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const res = await api.post('/.netlify/functions/auth-validate-setup-token', { token })
      setTokenData(res.data)
      setIsValidating(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired setup link')
      setIsValidating(false)
    }
  }

  const handlePasswordSetup = async (e) => {
    e.preventDefault()
    setError('')

    // Validate passwords
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await api.post('/.netlify/functions/auth-complete-setup', {
        token,
        password,
        method: 'password'
      })

      // Redirect to intended page or dashboard
      const redirectTo = tokenData?.redirectTo || '/dashboard'
      navigate(redirectTo)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set up account')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSetup = async (credentialResponse) => {
    setIsSubmitting(true)
    setError('')

    try {
      const res = await api.post('/.netlify/functions/auth-complete-setup', {
        token,
        googleCredential: credentialResponse.credential,
        method: 'google'
      })

      // Redirect to intended page or dashboard
      const redirectTo = tokenData?.redirectTo || '/dashboard'
      navigate(redirectTo)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set up account with Google')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-secondary)] opacity-[0.08] blur-[120px] rounded-full" />
        </div>
        <Card className="relative w-full max-w-md bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
            <p className="text-[var(--text-secondary)]">Validating setup link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state (invalid token)
  if (error && !tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-secondary)] opacity-[0.08] blur-[120px] rounded-full" />
        </div>
        <Card className="relative w-full max-w-md bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
          <CardHeader className="text-center">
            <CardTitle className="text-[var(--accent-error)]">Setup Link Invalid</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-tertiary)] mb-6 text-center">
              This setup link may have expired or is invalid. Please contact your account manager for a new link.
            </p>
            <Button 
              onClick={() => navigate('/login')} 
              variant="glass-primary"
              className="w-full"
            >
              Go to Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
      {/* Subtle gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-secondary)] opacity-[0.08] blur-[120px] rounded-full" />
      </div>

      <Card className="relative w-full max-w-md bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <img
              src={logo}
              alt="Uptrade Media"
              className="h-12 w-12"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
            <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">Welcome!</CardTitle>
          </div>
          <CardDescription className="text-[var(--text-secondary)]">
            Hi {tokenData?.name}! Choose how you'd like to access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Password Setup Option */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <KeyRound className="h-4 w-4 text-[var(--brand-primary)]" />
              <span>Set Up Password</span>
            </div>
            
            <form onSubmit={handlePasswordSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[var(--text-primary)]">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="pl-11 pr-11"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[var(--text-primary)]">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-5 h-5" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="pl-11"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                variant="glass-primary"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Set Password & Continue'
                )}
              </Button>
            </form>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--glass-border)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[var(--glass-bg)] px-4 text-[var(--text-tertiary)]">OR</span>
            </div>
          </div>

          {/* Google OAuth Option */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Mail className="h-4 w-4 text-[var(--brand-primary)]" />
              <span>Sign in with Google</span>
            </div>
            
            <div id="google-signin-button" />
            
            <p className="text-xs text-[var(--text-tertiary)] text-center">
              Quick and secure access using your Google account
            </p>
          </div>

          {/* Helper Text */}
          <div className="bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-xl p-4 text-sm">
            <div className="flex items-center gap-2 text-[var(--brand-primary)] font-medium mb-1">
              <Lightbulb className="h-4 w-4" />
              Pro Tip
            </div>
            <p className="text-[var(--text-secondary)]">
              Choose whichever method works best for you. You can always add the other option later in your account settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
