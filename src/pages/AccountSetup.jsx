// src/pages/AccountSetup.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2, KeyRound, Mail, Eye, EyeOff, Lock } from 'lucide-react'
import axios from 'axios'
import useAuthStore from '../lib/auth-store'
import HyperspaceBackground from '../components/HyperspaceBackground'
import whitelogo from '../assets/whitelogo.svg'

const BRAND_GRAD = 'from-[#4bbf39] to-[#39bfb0]'

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
      const res = await axios.post('/.netlify/functions/auth-validate-setup-token', { token })
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
      const res = await axios.post('/.netlify/functions/auth-complete-setup', {
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
      const res = await axios.post('/.netlify/functions/auth-complete-setup', {
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

  if (isValidating) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        <HyperspaceBackground />
        <Card className="relative z-20 w-full max-w-md border border-white/10 bg-neutral-900/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#39bfb0] mb-4" />
            <p className="text-neutral-300">Validating setup link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !tokenData) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        <HyperspaceBackground />
        <Card className="relative z-20 w-full max-w-md border border-white/10 bg-neutral-900/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <CardHeader>
            <CardTitle className="text-red-400">Setup Link Invalid</CardTitle>
            <CardDescription className="text-neutral-300">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-400 mb-4">
              This setup link may have expired or is invalid. Please contact your account manager for a new link.
            </p>
            <Button 
              onClick={() => navigate('/login')} 
              className={`w-full bg-gradient-to-r ${BRAND_GRAD} hover:shadow-[0_10px_35px_rgba(57,191,176,0.35)]`}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black p-4">
      {/* Hyperspace Background */}
      <HyperspaceBackground />

      <Card className="relative z-20 w-full max-w-md overflow-hidden border border-white/10 bg-neutral-900/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        {/* Ring overlay */}
        <div aria-hidden="true" className="pointer-events-none absolute -inset-[1px] z-0 rounded-xl opacity-70 [mask:linear-gradient(#000,transparent)]">
          <div className={`h-full w-full rounded-xl bg-gradient-to-r ${BRAND_GRAD} blur-[10px] opacity-30`} />
        </div>

        <CardHeader className="relative z-10 space-y-4 text-center pb-6">
          <div className="flex justify-center">
            <img
              src={whitelogo}
              alt="Uptrade Media"
              className="h-14 w-auto drop-shadow-[0_6px_20px_rgba(57,191,176,0.35)] transition-transform duration-300 hover:scale-105"
            />
          </div>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            <span className={`bg-gradient-to-r ${BRAND_GRAD} bg-clip-text text-transparent`}>
              Welcome! 🎉
            </span>
          </CardTitle>
          <CardDescription className="text-neutral-300/80">
            Hi {tokenData?.name}! Choose how you'd like to access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Password Setup Option */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-200">
              <KeyRound className="h-4 w-4 text-[#39bfb0]" />
              <span>Set Up Password</span>
            </div>
            
            <form onSubmit={handlePasswordSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-200">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5 group-focus-within:text-[#39bfb0]" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="pl-11 pr-11 bg-neutral-900/60 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-[#39bfb0]/30 focus-visible:border-[#39bfb0] transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-neutral-200">Confirm Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5 group-focus-within:text-[#39bfb0]" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="pl-11 bg-neutral-900/60 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-[#39bfb0]/30 focus-visible:border-[#39bfb0] transition-all"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className={`w-full py-6 font-semibold rounded-lg shadow-lg transition-all duration-300 hover:shadow-[0_10px_35px_rgba(57,191,176,0.35)] active:scale-[0.99] bg-gradient-to-r ${BRAND_GRAD}`}
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
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-neutral-900/70 px-4 text-neutral-400">OR</span>
            </div>
          </div>

          {/* Google OAuth Option */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-200">
              <Mail className="h-4 w-4 text-[#39bfb0]" />
              <span>Sign in with Google</span>
            </div>
            
            <div id="google-signin-button" />
            
            <p className="text-xs text-neutral-400 text-center">
              Quick and secure access using your Google account
            </p>
          </div>

          {/* Helper Text */}
          <div className="bg-[#39bfb0]/10 border border-[#39bfb0]/30 rounded-lg p-4 text-sm">
            <p className="text-[#39bfb0] font-medium mb-1">💡 Pro Tip</p>
            <p className="text-neutral-300">
              Choose whichever method works best for you. You can always add the other option later in your account settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
