import React, { useState } from 'react'
import { AlertCircle, Lock, RefreshCw, HelpCircle } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Auth2FAVerify() {
  const navigate = useNavigate()
  const [method, setMethod] = useState('totp') // 'totp' or 'backup'
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showBackupCodeInput, setShowBackupCodeInput] = useState(false)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white/10 rounded-full">
                <Lock className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center">Verify Your Identity</h1>
            <p className="text-blue-100 text-center text-sm mt-2">
              Two-factor authentication is protecting your account
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Method Selector */}
            <div className="space-y-3">
              {/* TOTP Method */}
              <button
                onClick={() => {
                  setMethod('totp')
                  setShowBackupCodeInput(false)
                  setCode('')
                  setError(null)
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  method === 'totp'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Authenticator App
                  </div>
                  <p className="text-slate-400 text-sm mt-1">Use your authenticator app</p>
                </div>
              </button>

              {/* Backup Code Method */}
              <button
                onClick={() => {
                  setMethod('backup')
                  setShowBackupCodeInput(true)
                  setCode('')
                  setError(null)
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  method === 'backup'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Backup Code
                  </div>
                  <p className="text-slate-400 text-sm mt-1">Lost your authenticator app?</p>
                </div>
              </button>
            </div>

            {/* Input Section */}
            <div className="space-y-3">
              {method === 'totp' ? (
                <>
                  <label className="block text-sm font-medium text-slate-200">
                    6-Digit Code
                  </label>
                  <input
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
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-center text-3xl font-mono tracking-widest focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <p className="text-slate-400 text-xs">
                    Enter the 6-digit code from your authenticator app (Google Authenticator, Microsoft
                    Authenticator, Authy, etc.)
                  </p>
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-slate-200">
                    Backup Code
                  </label>
                  <input
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
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <p className="text-slate-400 text-xs">
                    Enter one of your backup codes. Each code can only be used once.
                  </p>
                </>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || !code || (method === 'totp' && code.length !== 6)}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Verify & Login'
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="bg-slate-900 px-6 py-4 border-t border-slate-700">
            <p className="text-slate-400 text-xs text-center">
              Having trouble? Contact{' '}
              <a href="mailto:support@uptrademedia.com" className="text-blue-400 hover:text-blue-300">
                support@uptrademedia.com
              </a>
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <p className="text-blue-200 text-sm">
            <strong>What is 2FA?</strong> Two-factor authentication adds an extra layer of security to
            your account. Even if someone knows your password, they can't access your account without
            your authenticator app or backup code.
          </p>
        </div>
      </div>
    </div>
  )
}
