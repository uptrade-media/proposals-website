// src/pages/LoginPage.jsx
import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2, HelpCircle } from 'lucide-react'
import whitelogo from '../assets/whitelogo.svg'
import useAuthStore from '../lib/auth-store'
import HyperspaceBackground from '../components/HyperspaceBackground'

const BRAND_GRAD = 'from-[#4bbf39] to-[#39bfb0]'

// purely visual; server enforces access
const BRAND_UI = {
  default: {
    title: 'Uptrade Portal',
    logo: whitelogo,
    tagline: 'Your secure client hub for projects, reports, and collaboration',
  },
  row94: {
    title: 'Row 94 — Client Portal',
    logo: whitelogo,
    tagline: 'Secure access to your Row 94 Whiskey project',
  },
  mbfm: {
    title: 'MBFM — Client Portal',
    logo: whitelogo,
    tagline: 'Secure access to your MBFM project',
  },
}

function normalizeErr(e) {
  const msg = String(e || '').toUpperCase()
  if (msg.includes('DOMAIN_NOT_ASSIGNED')) return 'This email domain is not allowed.'
  if (msg.includes('INVALID_PASSWORD'))    return 'Invalid email or password.'
  if (msg.includes('MISSING_CREDENTIALS')) return 'Enter email and password.'
  if (msg.includes('MISSING_FIELDS'))      return 'Please fill in all fields.'
  if (msg.includes('INVALID_EMAIL'))       return 'Please enter a valid email address.'
  if (msg.includes('PASSWORD_TOO_SHORT'))  return 'Password must be at least 8 characters.'
  if (msg.includes('EMAIL_EXISTS'))        return 'An account with this email already exists.'
  if (msg.includes('SIGNUP_FAILED'))       return 'Unable to create account. Please try again.'
  if (msg.includes('AUTH_NOT_CONFIGURED') || msg.includes('SERVER_NOT_CONFIGURED'))
    return 'Sign-in temporarily unavailable.'
  return msg.includes('SIGN') ? 'Sign up failed' : 'Login failed'
}

export default function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { login: authLogin, signup: authSignup, checkAuth, isAuthenticated, user } = useAuthStore()
  const nextPath = params.get('next') || '/dashboard'
  const brandKey = (params.get('brand') || 'default').toLowerCase()
  const brand = useMemo(() => BRAND_UI[brandKey] || BRAND_UI.default, [brandKey])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Determine redirect based on user role
      let redirect = nextPath
      if (user.role === 'admin') {
        redirect = nextPath === '/dashboard' ? '/admin' : nextPath
      } else if (user.slugs && user.slugs.length > 0) {
        // Legacy proposal client
        redirect = `/p/${user.slugs[0]}`
      }
      navigate(redirect)
    }
  }, [isAuthenticated, user, navigate, nextPath])

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Forgot password UI
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState('')

  // Contact support UI
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportEmail, setSupportEmail] = useState('')
  const [supportBody, setSupportBody] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportMsg, setSupportMsg] = useState('')

  // Load Google Identity Services
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('um_email')
    if (saved) {
      setEmail(saved)
      setRemember(true)
    }
  }, [])

  // Initialize Google Sign-In when script loads
  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
        console.log('[Google OAuth] Client ID:', clientId)
        
        if (!clientId) {
          console.error('[Google OAuth] VITE_GOOGLE_CLIENT_ID is not defined!')
          return
        }
        
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse
        })
        console.log('[Google OAuth] Initialized successfully')
      }
    }

    // Try immediately if already loaded
    if (window.google) {
      initGoogle()
    } else {
      // Wait for script to load
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle)
          initGoogle()
        }
      }, 100)

      return () => clearInterval(checkGoogle)
    }
  }, [])

  // Handle Google OAuth response
  async function handleGoogleResponse(response) {
    console.log('[Google OAuth] Callback received!')
    setIsSubmitting(true)
    setError('')

    try {
      console.log('[Google OAuth] Sending credential to backend...')
      const res = await fetch('/.netlify/functions/auth-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential })
      })

      console.log('[Google OAuth] Backend response status:', res.status)
      const data = await res.json()
      console.log('[Google OAuth] Backend response data:', data)

      if (!res.ok) {
        throw new Error(data.error || 'Google sign-in failed')
      }

      // Cookie is now set by server, verify and update auth store
      console.log('[Google OAuth] Verifying session...')
      const authResult = await checkAuth()
      console.log('[Google OAuth] Auth check result:', authResult)
      
      if (!authResult.success) {
        throw new Error('Failed to verify session after Google login')
      }
      
      // Redirect based on server response or user role
      const redirect = data.redirect || nextPath
      window.location.assign(redirect)
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? err.message : String(err || '')
      setError(normalizeErr(msg))
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    try {
      // Remember email if checked
      if (remember) {
        localStorage.setItem('um_email', email.trim())
      } else {
        localStorage.removeItem('um_email')
      }

      // Use auth store login (which handles cookie-based auth)
      const result = await authLogin(email, password, nextPath)
      
      if (result.success) {
        // Navigate using full page reload to ensure edge functions/cookies apply
        const redirect = result.redirect || nextPath
        window.location.assign(redirect)
      } else {
        throw new Error(result.error || 'Login failed')
      }
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? err.message : String(err || '')
      setError(normalizeErr(msg))
      setIsSubmitting(false)
    }
  }

  async function submitForgot(e) {
    e.preventDefault()
    setForgotLoading(true)
    setForgotMsg('')
    try {
      // adjust to your actual function name if different
      const res = await fetch('/.netlify/functions/auth-forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: (forgotEmail || email).trim() })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to process request')
      setForgotMsg('If your account exists, we emailed instructions to reset access.')
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? err.message : String(err || '')
      setForgotMsg(msg || 'Unable to process request')
    } finally {
      setForgotLoading(false)
    }
  }

  async function submitSupport(e) {
    e.preventDefault()
    setSupportLoading(true)
    setSupportMsg('')
    try {
      const res = await fetch('/.netlify/functions/contact-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (supportEmail || email).trim(),
          message: supportBody || 'Support request from login screen.',
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to send message')
      setSupportMsg('Thanks — your message was sent. We will get back to you shortly.')
      setSupportBody('')
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? err.message : String(err || '')
      setSupportMsg(msg || 'Unable to send message')
    } finally {
      setSupportLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
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
              src={brand.logo}
              alt="Brand"
              className="h-14 w-auto drop-shadow-[0_6px_20px_rgba(57,191,176,0.35)] transition-transform duration-300 hover:scale-105"
            />
          </div>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            <span className={`bg-gradient-to-r ${BRAND_GRAD} bg-clip-text text-transparent`}>
              {brand.title}
            </span>
          </CardTitle>
          <CardDescription className="text-neutral-300/80">
            {brand.tagline}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-200">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5 group-focus-within:text-[#39bfb0]" />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="pl-11 bg-neutral-900/60 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-[#39bfb0]/30 focus-visible:border-[#39bfb0] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-200">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5 group-focus-within:text-[#39bfb0]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
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

            {/* Utility row */}
            {(
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-neutral-900/80 text-[#39bfb0] focus:ring-[#39bfb0]/30"
                    disabled={isSubmitting}
                />
                <span className="text-neutral-300">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => { setForgotOpen(!forgotOpen); setForgotMsg('') }}
                className="text-[#39bfb0] hover:opacity-80 transition-opacity"
              >
                Forgot password?
              </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div role="alert" aria-live="polite" className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-6 font-semibold rounded-lg shadow-lg transition-all duration-300 hover:shadow-[0_10px_35px_rgba(57,191,176,0.35)] active:scale-[0.99] bg-gradient-to-r ${BRAND_GRAD}`}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </Button>

            {/* Forgot password panel */}
            {forgotOpen && (
              <div className="mt-3 rounded-lg border border-white/10 p-3 bg-neutral-900/60">
                <form onSubmit={submitForgot} className="space-y-3">
                  <Label htmlFor="forgotEmail" className="text-neutral-200">Account email</Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="bg-neutral-900/60 border-white/10 text-white"
                  />
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className={`w-full ${forgotLoading ? 'opacity-80' : ''} bg-gradient-to-r ${BRAND_GRAD}`}
                  >
                    {forgotLoading ? 'Sending…' : 'Send reset instructions'}
                  </Button>
                  {forgotMsg && <p className="text-xs text-neutral-300">{forgotMsg}</p>}
                </form>
              </div>
            )}

            {/* Trust / privacy note */}
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#39bfb0]" />
              <span>Private access. Encrypted in transit.</span>
            </div>

            {/* Divider before bottom sections */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[11px] uppercase tracking-widest text-neutral-500 bg-neutral-900/70">
                  Uptrade Media
                </span>
              </div>
            </div>

            {/* Contact support row */}
            <div className="flex items-center justify-center gap-2 text-sm mt-2">
              <button
                type="button"
                onClick={() => { setSupportOpen(!supportOpen); setSupportMsg('') }}
                className="inline-flex items-center gap-1 text-[#39bfb0] hover:opacity-80"
              >
                <HelpCircle className="w-4 h-4" />
                Contact support
              </button>

              <span className="text-neutral-500 select-none" aria-hidden="true">·</span>

              <a
                href={`mailto:ramsey@uptrademedia.com?subject=Support%20request&body=Hi%20Uptrade%20Media,%0A%0A`}
                className="inline-flex text-neutral-400 hover:text-neutral-200"
              >
                or email directly
              </a>
            </div>

            {supportOpen && (
              <div className="mt-3 rounded-lg border border-white/10 p-3 bg-neutral-900/60">
                <form onSubmit={submitSupport} className="space-y-3">
                  <Label htmlFor="supportEmail" className="text-neutral-200">Your email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="bg-neutral-900/60 border-white/10 text-white"
                  />
                  <Label htmlFor="supportBody" className="text-neutral-200">Message</Label>
                  <textarea
                    id="supportBody"
                    rows={4}
                    value={supportBody}
                    onChange={(e) => setSupportBody(e.target.value)}
                    placeholder="Tell us what you need help with…"
                    className="w-full rounded-md bg-neutral-900/60 border border-white/10 p-2 text-white"
                  />
                  <Button
                    type="submit"
                    disabled={supportLoading}
                    className={`w-full ${supportLoading ? 'opacity-80' : ''} bg-gradient-to-r ${BRAND_GRAD}`}
                  >
                    {supportLoading ? 'Sending…' : 'Send message'}
                  </Button>
                  {supportMsg && <p className="text-xs text-neutral-300">{supportMsg}</p>}
                </form>
              </div>
            )}
          </form>

          {/* Google Sign-In Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-white/10" />
            <span className="px-4 text-sm text-neutral-400">or continue with</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Google Sign-In Button */}
          <div className="flex justify-center mb-6">
            <div 
              id="g_id_onload"
              data-client_id={import.meta.env.VITE_GOOGLE_CLIENT_ID}
              data-context="signin"
              data-ux_mode="popup"
              data-auto_prompt="false"
            ></div>
            <div 
              className="g_id_signin"
              data-type="standard"
              data-shape="rectangular"
              data-theme="filled_black"
              data-text="signin_with"
              data-size="large"
              data-logo_alignment="left"
              data-width="360"
            ></div>
          </div>
        </CardContent>
      </Card>

      <div className="absolute bottom-4 left-0 right-0 text-center z-20">
        <p className="text-neutral-500 text-xs">© {new Date().getFullYear()} Uptrade Media</p>
      </div>
    </div>
  )
}
