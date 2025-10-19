import React, { useState, useEffect } from 'react'
import { Copy, Check, AlertCircle, RefreshCw } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Auth2FASetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: QR Code, 2: Verify Token, 3: Save Codes
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Step 1: QR Code Generation
  const [qrCode, setQrCode] = useState(null)
  const [manualKey, setManualKey] = useState(null)
  const [secret, setSecret] = useState(null)
  const [copied, setCopied] = useState(false)

  // Step 2: TOTP Verification
  const [totpToken, setTotpToken] = useState('')
  const [tokenError, setTokenError] = useState(null)

  // Step 3: Backup Codes
  const [backupCodes, setBackupCodes] = useState([])
  const [savedCodes, setSavedCodes] = useState(false)

  // Step 1: Fetch QR Code
  useEffect(() => {
    const initiate2FA = async () => {
      try {
        setLoading(true)
        const response = await axios.post('/.netlify/functions/auth-2fa-setup-initiate')
        setQrCode(response.data.qrCode)
        setManualKey(response.data.manualEntryKey)
        setSecret(response.data.secret)
        setError(null)
      } catch (err) {
        console.error('Failed to initiate 2FA:', err)
        setError(err.response?.data?.error || 'Failed to generate QR code')
      } finally {
        setLoading(false)
      }
    }

    initiate2FA()
  }, [])

  // Copy manual key to clipboard
  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(manualKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Verify TOTP token and enable 2FA
  const handleVerifyToken = async () => {
    if (!totpToken || totpToken.length !== 6) {
      setTokenError('Please enter a 6-digit code')
      return
    }

    if (!/^\d{6}$/.test(totpToken)) {
      setTokenError('Code must contain only numbers')
      return
    }

    try {
      setLoading(true)
      setTokenError(null)

      const response = await axios.post('/.netlify/functions/auth-2fa-setup-verify', {
        totpSecret: secret,
        totpToken: totpToken
      })

      setBackupCodes(response.data.backupCodes)
      setStep(3)
      setError(null)
    } catch (err) {
      console.error('Failed to verify token:', err)
      setTokenError(err.response?.data?.error || 'Invalid code. Please try again.')
      setTotpToken('')
    } finally {
      setLoading(false)
    }
  }

  // Mark codes as saved and complete setup
  const handleCodesConfirmed = () => {
    setSavedCodes(true)
    setSuccess(true)
    setTimeout(() => {
      navigate('/account/settings?tab=security')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Enable Two-Factor Authentication</h1>
          <p className="text-slate-300">Step {step} of 3</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-300">Setup Error</h3>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: QR Code */}
        {step === 1 && (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Step 1: Scan QR Code</h2>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : qrCode ? (
              <>
                <div className="space-y-6">
                  {/* QR Code */}
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
                  </div>

                  <div className="text-center">
                    <p className="text-slate-300 mb-3">
                      Scan this code with your authenticator app:
                    </p>
                    <ul className="text-left text-sm text-slate-400 space-y-1 mb-6">
                      <li>• Google Authenticator</li>
                      <li>• Microsoft Authenticator</li>
                      <li>• Authy</li>
                      <li>• 1Password</li>
                    </ul>
                  </div>

                  {/* Manual Entry */}
                  <div className="border-t border-slate-700 pt-6">
                    <p className="text-slate-300 text-sm mb-3">Or enter this code manually:</p>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100 font-mono text-sm break-all">
                        {manualKey}
                      </code>
                      <button
                        onClick={handleCopyKey}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors flex items-center gap-2"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setStep(2)}
                    className="w-full mt-6 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    I've Scanned the Code
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Step 2: Verify Token */}
        {step === 2 && (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Step 2: Enter Code from App</h2>

            <div className="space-y-6">
              <p className="text-slate-300">
                Open your authenticator app and enter the 6-digit code shown there:
              </p>

              {tokenError && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm">{tokenError}</p>
                </div>
              )}

              {/* 6-Digit Code Input */}
              <input
                type="text"
                inputMode="numeric"
                maxLength="6"
                placeholder="000000"
                value={totpToken}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  setTotpToken(val.slice(0, 6))
                  setTokenError(null)
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && totpToken.length === 6) {
                    handleVerifyToken()
                  }
                }}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-center text-3xl font-mono tracking-widest focus:outline-none focus:border-blue-500"
              />

              <button
                onClick={handleVerifyToken}
                disabled={loading || totpToken.length !== 6}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Save Backup Codes */}
        {step === 3 && (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Step 3: Save Backup Codes</h2>

            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 mb-6">
              <p className="text-amber-200 text-sm">
                <strong>Important:</strong> Save these codes in a secure location. You can use them to login if you lose access to your authenticator app. Each code can only be used once.
              </p>
            </div>

            {/* Backup Codes */}
            <div className="bg-slate-900 rounded-lg p-6 mb-6 space-y-2 max-h-64 overflow-y-auto">
              {backupCodes.map((code, index) => (
                <div key={index} className="flex items-center gap-3 font-mono text-sm">
                  <span className="text-slate-500">{index + 1}.</span>
                  <code className="flex-1 text-slate-200">{code}</code>
                </div>
              ))}
            </div>

            {/* Download / Copy */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => {
                  const text = backupCodes.join('\n')
                  navigator.clipboard.writeText(text)
                  alert('Codes copied to clipboard!')
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={() => {
                  const element = document.createElement('a')
                  const file = new Blob([backupCodes.join('\n')], { type: 'text/plain' })
                  element.href = URL.createObjectURL(file)
                  element.download = 'backup-codes.txt'
                  document.body.appendChild(element)
                  element.click()
                  document.body.removeChild(element)
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Download
              </button>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-3 mb-6">
              <input
                type="checkbox"
                checked={savedCodes}
                onChange={(e) => setSavedCodes(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-500"
              />
              <span className="text-slate-300 text-sm">
                I have saved my backup codes in a secure location
              </span>
            </label>

            {/* Complete Button */}
            <button
              onClick={handleCodesConfirmed}
              disabled={!savedCodes}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
            >
              {success ? '✓ Setup Complete!' : 'Complete Setup'}
            </button>

            {success && (
              <p className="text-center text-green-400 text-sm mt-4">
                2FA is now enabled. Redirecting to settings...
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-8">
          Need help? Check the{' '}
          <a href="/help/2fa" className="text-blue-400 hover:text-blue-300">
            2FA setup guide
          </a>
        </p>
      </div>
    </div>
  )
}
