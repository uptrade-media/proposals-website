// src/pages/AccountSetup.jsx
// Account setup page for new clients - allows Google OAuth or password setup
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Loader2, CheckCircle2, XCircle, Mail, Lock, Eye, EyeOff, Chrome } from 'lucide-react'
import { supabase, signInWithGoogle, signUp } from '../lib/supabase-auth'
import useAuthStore from '../lib/auth-store'
import axios from 'axios'

export default function AccountSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const { setUser } = useAuthStore()
  
  const [status, setStatus] = useState('validating') // validating, ready, creating, success, error
  const [error, setError] = useState('')
  const [tokenData, setTokenData] = useState(null)
  
  // Password form state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      // Custom JWT token flow (from database magic links)
      validateToken()
    } else {
      // Supabase magic link flow - user is already authenticated
      // Check if we have a session from Supabase magic link
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          // Get contact info from database
          axios.post('/.netlify/functions/auth-validate-supabase-session').then(response => {
            if (response.data.valid) {
              setTokenData({
                email: response.data.email,
                name: response.data.name,
                contactId: response.data.contactId,
                isAlreadySetup: response.data.isAlreadySetup
              })
              setStatus('ready')
            } else {
              setStatus('error')
              setError(response.data.error || 'Account not found')
            }
          }).catch(err => {
            setStatus('error')
            setError(err.response?.data?.error || 'Failed to load account information')
          })
        } else {
          setStatus('error')
          setError('No setup token provided')
        }
      })
    }
  }, [token])

  const validateToken = async () => {
    try {
      const response = await axios.post('/.netlify/functions/auth-validate-setup-token', { token })
      
      if (response.data.valid) {
        setTokenData(response.data)
        setStatus('ready')
      } else {
        setStatus('error')
        setError(response.data.error || 'Invalid or expired token')
      }
    } catch (err) {
      console.error('[AccountSetup] Token validation error:', err)
      setStatus('error')
      setError(err.response?.data?.error || 'Failed to validate token')
    }
  }

  const handleGoogleSignup = async () => {
    try {
      setIsSubmitting(true)
      
      // Store the setup token and contact ID in localStorage for use after OAuth redirect
      if (token) {
        localStorage.setItem('pendingSetupToken', token)
      } else {
        localStorage.setItem('pendingSetupContactId', tokenData.contactId)
      }
      
      // Initiate Google OAuth - Supabase will handle the popup/redirect
      await signInWithGoogle()
      
      // Note: The actual completion happens in AuthCallback.jsx after redirect
    } catch (err) {
      console.error('[AccountSetup] Google signup error:', err)
      setError(err.message || 'Failed to sign up with Google')
      setIsSubmitting(false)
    }
  }

  const handlePasswordSignup = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setStatus('creating')
      
      // Create account with Supabase
      const { user, session, error: signupError } = await signUp(
        tokenData.email,
        password,
        { name: tokenData.name }
      )
      
      if (signupError) {
        throw signupError
      }
      
      // Complete setup on the backend
      if (token) {
        // Custom JWT token flow
        await axios.post('/.netlify/functions/auth-complete-setup', {
          token,
          method: 'password'
        })
      } else {
        // Supabase magic link flow - just mark account as setup
        await axios.post('/.netlify/functions/auth-mark-setup-complete', {
          contactId: tokenData.contactId
        }, { withCredentials: true })
      }
      
      setStatus('success')
      
      // Redirect after brief success message
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 2000)
      
    } catch (err) {
      console.error('[AccountSetup] Password signup error:', err)
      setStatus('ready')
      setError(err.message || 'Failed to create account')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
      {/* Subtle gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-secondary)] opacity-[0.08] blur-[120px] rounded-full" />
      </div>

      <Card className="relative w-full max-w-md bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
        {status === 'validating' && (
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Validating your link...</h2>
                <p className="text-[var(--text-secondary)] text-sm">Please wait while we verify your setup link</p>
              </div>
            </div>
          </CardContent>
        )}

        {status === 'ready' && tokenData && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-[var(--brand-primary)]" />
              </div>
              <CardTitle className="text-2xl font-bold text-[var(--text-primary)]">
                Complete Your Setup
              </CardTitle>
              <CardDescription className="text-[var(--text-secondary)]">
                Welcome, {tokenData.name}! Choose how you'd like to sign in.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Google Sign Up - Recommended */}
              <div>
                <Button
                  onClick={handleGoogleSignup}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl font-medium shadow-sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Chrome className="h-5 w-5 mr-2" />
                  )}
                  Continue with Google
                </Button>
                <p className="text-xs text-center text-[var(--text-tertiary)] mt-2">
                  Recommended - Secure & fast sign-in
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[var(--glass-border)]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--glass-bg)] px-2 text-[var(--text-tertiary)]">
                    or set a password
                  </span>
                </div>
              </div>

              {/* Password Form */}
              <form onSubmit={handlePasswordSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[var(--text-secondary)]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={tokenData.email}
                    disabled
                    className="bg-[var(--surface-secondary)] border-[var(--glass-border)] text-[var(--text-tertiary)]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[var(--text-secondary)]">Create Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="pr-10 bg-[var(--surface-secondary)] border-[var(--glass-border)]"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[var(--text-secondary)]">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="bg-[var(--surface-secondary)] border-[var(--glass-border)]"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !password || !confirmPassword}
                  variant="glass-primary"
                  className="w-full h-11"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Create Account with Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {status === 'creating' && (
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Creating your account...</h2>
                <p className="text-[var(--text-secondary)] text-sm">This will just take a moment</p>
              </div>
            </div>
          </CardContent>
        )}

        {status === 'success' && (
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-[var(--accent-success)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Account Created!</h2>
                <p className="text-[var(--text-secondary)] text-sm">Redirecting to your dashboard...</p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-primary)]" />
            </div>
          </CardContent>
        )}

        {status === 'error' && (
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="h-16 w-16 rounded-full bg-[var(--accent-error)]/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-[var(--accent-error)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Setup Link Invalid</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-4">
                  {error}
                </p>
                <p className="text-[var(--text-tertiary)] text-sm">
                  Setup links expire after 24 hours for security. Please contact your account manager to request a new link.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                variant="glass-primary"
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
