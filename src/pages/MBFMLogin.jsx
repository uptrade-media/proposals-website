import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2, HelpCircle } from 'lucide-react'
import whitelogo from '../assets/whitelogo.svg'

const BRAND_GRAD = 'from-[#4bbf39] to-[#39bfb0]'
const ALLOWED_DOMAIN = (import.meta.env.VITE_MBFM_DOMAIN || 'mbfm.com').toLowerCase()

const MBFMLogin = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const nextPath = params.get('next') || '/mbfm'

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

  useEffect(() => {
    const saved = localStorage.getItem('mbfm_email')
    if (saved) {
      setEmail(saved)
      setRemember(true)
    }
  }, [])

  function isAllowedDomain(e) {
    const at = e.lastIndexOf('@')
    const dom = at !== -1 ? e.slice(at + 1).toLowerCase() : ''
    return dom === ALLOWED_DOMAIN
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Generic message but still enforce domain on client
    if (!isAllowedDomain(email)) {
      setIsSubmitting(false)
      setError('User account not found')
      return
    }

    try {
      const res = await fetch('/.netlify/functions/mbfm-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'User account not found')
      }

      if (remember) localStorage.setItem('mbfm_email', email)
      else localStorage.removeItem('mbfm_email')

      navigate(nextPath, { replace: true })
    } catch (err) {
      setError(err.message || 'User account not found')
      setIsSubmitting(false)
    }
  }

  async function submitForgot(e) {
    e.preventDefault()
    setForgotLoading(true)
    setForgotMsg('')
    try {
      const res = await fetch('/.netlify/functions/mbfm-forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: (forgotEmail || email).trim() })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to process request')
      setForgotMsg('If your account exists, we emailed instructions to reset access.')
    } catch (err) {
      setForgotMsg(err.message || 'Unable to process request')
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
          message: supportBody || 'Support request from login screen.'
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to send message')
      setSupportMsg('Thanks — your message was sent. We will get back to you shortly.')
      setSupportBody('')
    } catch (err) {
      setSupportMsg(err.message || 'Unable to send message')
    } finally {
      setSupportLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-32 h-96 w-96 bg-gradient-to-br from-[#4bbf39]/20 to-[#39bfb0]/10 blur-3xl rounded-full animate-pulse" />
        <div className="absolute -bottom-48 -left-20 h-[28rem] w-[28rem] bg-gradient-to-tl from-[#39bfb0]/25 to-[#4bbf39]/10 blur-3xl rounded-full animate-pulse [animation-delay:400ms]" />
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-screen"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <Card className="relative z-10 w-full max-w-md overflow-hidden border border-white/10 bg-neutral-900/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        {/* Ring overlay: visible but non-interactive, sits below content */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[1px] z-0 rounded-xl opacity-70 [mask:linear-gradient(#000,transparent)]"
        >
          <div className={`h-full w-full rounded-xl bg-gradient-to-r ${BRAND_GRAD} blur-[10px] opacity-30`} />
        </div>

        <CardHeader className="relative z-10 space-y-4 text-center pb-6">
          <div className="flex justify-center">
            <img
              src={whitelogo}
              alt="UptradeMedia Logo"
              className="h-14 w-auto drop-shadow-[0_6px_20px_rgba(57,191,176,0.35)] transition-transform duration-300 hover:scale-105"
            />
          </div>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            <span className={`bg-gradient-to-r ${BRAND_GRAD} bg-clip-text text-transparent`}>
              Uptrade Proposals Portal
            </span>
          </CardTitle>
          <CardDescription className="text-neutral-300/80">
            Secure access for Uptrade Media proposals and approvals
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
                  placeholder={`you@${ALLOWED_DOMAIN}`}
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

            {/* Error */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2"
              >
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
                    placeholder={`you@${ALLOWED_DOMAIN}`}
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

            {/* Divider */}
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
                    placeholder={`you@${ALLOWED_DOMAIN}`}
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
        </CardContent>
      </Card>

      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-neutral-500 text-xs">© {new Date().getFullYear()} Uptrade Media</p>
      </div>
    </div>
  )
}

export default MBFMLogin
