import React, { useState } from 'react'
import { AlertCircle, Lock, RefreshCw, HelpCircle, Shield } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function Auth2FAVerify() {
  const navigate = useNavigate()
  const [method, setMethod] = useState('totp') // 'totp' or 'backup'
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Verify TOTP Token
  const handleVerifyTOTP = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setError('Code must contain only numbers')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await axios.post('/.netlify/functions/auth-2fa-verify', {
        totpToken: code
      })

      // Redirect to dashboard/projects
      const redirect = response.data.user?.role === 'admin' ? '/dashboard' : '/projects'
      navigate(redirect, { replace: true })
    } catch (err) {
      console.error('TOTP verification failed:', err)
      setError(
        err.response?.data?.error || 'Invalid code. Please check your authenticator app and try again.'
      )
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  // Verify Backup Code
  const handleVerifyBackupCode = async () => {
    if (!code || code.trim().length === 0) {
      setError('Please enter a backup code')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await axios.post('/.netlify/functions/auth-2fa-recovery', {
        backupCode: code.toUpperCase().replace(/\s/g, '')
      })

      // Show warning if running low on backup codes
      if (response.data.codesRemaining <= 3) {
        console.warn(response.data.warning)
      }

      // Redirect to dashboard/projects
      const redirect = response.data.user?.role === 'admin' ? '/dashboard' : '/projects'
      navigate(redirect, { replace: true })
    } catch (err) {
      console.error('Backup code verification failed:', err)
      setError(err.response?.data?.error || 'Invalid backup code. Please try again.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (method === 'totp') {
      handleVerifyTOTP()
    } else {
      handleVerifyBackupCode()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
      {/* Subtle gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-secondary)] opacity-[0.08] blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative">
        <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)] overflow-hidden">
          {/* Header */}
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <img src="/logo.svg" alt="Uptrade Media" className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">Verify Your Identity</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Two-factor authentication is protecting your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Method Selector */}
            <div className="space-y-3">
              {/* TOTP Method */}
              <button
                onClick={() => {
                  setMethod('totp')
                  setCode('')
                  setError(null)
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  method === 'totp'
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                    : 'border-[var(--glass-border)] bg-[var(--surface-secondary)] hover:border-[var(--text-tertiary)]'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Authenticator App
                  </div>
                  <p className="text-[var(--text-tertiary)] text-sm mt-1">Use your authenticator app</p>
                </div>
              </button>

              {/* Backup Code Method */}
              <button
                onClick={() => {
                  setMethod('backup')
                  setCode('')
                  setError(null)
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  method === 'backup'
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                    : 'border-[var(--glass-border)] bg-[var(--surface-secondary)] hover:border-[var(--text-tertiary)]'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Backup Code
                  </div>
                  <p className="text-[var(--text-tertiary)] text-sm mt-1">Lost your authenticator app?</p>
                </div>
              </button>
            </div>

            {/* Input Section */}
            <div className="space-y-3">
              {method === 'totp' ? (
                <>
                  <Label className="text-[var(--text-primary)]">6-Digit Code</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setCode(val.slice(0, 6))
                      setError(null)
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && code.length === 6) {
                        handleVerifyTOTP()
                      }
                    }}
                    className="text-center text-2xl font-mono tracking-widest"
                    autoFocus
                  />
                  <p className="text-[var(--text-tertiary)] text-xs">
                    Enter the 6-digit code from your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)
                  </p>
                </>
              ) : (
                <>
                  <Label className="text-[var(--text-primary)]">Backup Code</Label>
                  <Input
                    type="text"
                    placeholder="e.g., A1B2C3D4"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase())
                      setError(null)
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && code.trim()) {
                        handleVerifyBackupCode()
                      }
                    }}
                    className="font-mono"
                    autoFocus
                  />
                  <p className="text-[var(--text-tertiary)] text-xs">
                    Enter one of your backup codes. Each code can only be used once.
                  </p>
                </>
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !code || (method === 'totp' && code.length !== 6)}
              variant="glass-primary"
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Verify & Login'
              )}
            </Button>

            {/* Help Link */}
            <p className="text-[var(--text-tertiary)] text-xs text-center">
              Having trouble? Contact{' '}
              <a href="mailto:support@uptrademedia.com" className="text-[var(--brand-primary)] hover:underline">
                support@uptrademedia.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-xl p-4">
          <p className="text-[var(--text-secondary)] text-sm">
            <strong className="text-[var(--text-primary)]">What is 2FA?</strong> Two-factor authentication adds an extra layer of security to your account. Even if someone knows your password, they can't access your account without your authenticator app or backup code.
          </p>
        </div>
      </div>
    </div>
  )
}
