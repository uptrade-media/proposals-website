import React, { useState, useEffect } from 'react'
import { Copy, Check, AlertCircle, RefreshCw, Shield, ArrowLeft, Download } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'

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
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
      {/* Subtle gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-secondary)] opacity-[0.08] blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="Uptrade Media" className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Enable Two-Factor Authentication</h1>
          <p className="text-[var(--text-secondary)]">Step {step} of 3</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: QR Code */}
        {step === 1 && (
          <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Step 1: Scan QR Code</CardTitle>
              <CardDescription className="text-[var(--text-secondary)]">
                Scan this code with your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
                </div>
              ) : qrCode ? (
                <>
                  {/* QR Code */}
                  <div className="flex justify-center p-4 bg-white rounded-xl">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>

                  <div className="text-center">
                    <p className="text-[var(--text-secondary)] text-sm mb-3">
                      Compatible with:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 text-xs text-[var(--text-tertiary)]">
                      <span className="px-2 py-1 bg-[var(--surface-secondary)] rounded">Google Authenticator</span>
                      <span className="px-2 py-1 bg-[var(--surface-secondary)] rounded">Microsoft Authenticator</span>
                      <span className="px-2 py-1 bg-[var(--surface-secondary)] rounded">Authy</span>
                      <span className="px-2 py-1 bg-[var(--surface-secondary)] rounded">1Password</span>
                    </div>
                  </div>

                  {/* Manual Entry */}
                  <div className="border-t border-[var(--glass-border)] pt-6">
                    <Label className="text-[var(--text-secondary)] text-sm mb-2 block">Or enter this code manually:</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-[var(--surface-secondary)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] font-mono text-sm break-all">
                        {manualKey}
                      </code>
                      <Button
                        variant="glass"
                        size="icon"
                        onClick={handleCopyKey}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    variant="glass-primary"
                    className="w-full"
                  >
                    I've Scanned the Code
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Verify Token */}
        {step === 2 && (
          <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Step 2: Enter Code from App</CardTitle>
              <CardDescription className="text-[var(--text-secondary)]">
                Open your authenticator app and enter the 6-digit code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tokenError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{tokenError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label className="text-[var(--text-primary)]">6-Digit Code</Label>
                <Input
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
                  className="text-center text-2xl font-mono tracking-widest"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="glass"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleVerifyToken}
                  disabled={loading || totpToken.length !== 6}
                  variant="glass-primary"
                  className="flex-1"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Save Backup Codes */}
        {step === 3 && (
          <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Step 3: Save Backup Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/30 rounded-xl p-4">
                <p className="text-[var(--text-primary)] text-sm">
                  <strong>Important:</strong> Save these codes in a secure location. You can use them to login if you lose access to your authenticator app. Each code can only be used once.
                </p>
              </div>

              {/* Backup Codes */}
              <div className="bg-[var(--surface-secondary)] rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center gap-3 font-mono text-sm">
                    <span className="text-[var(--text-tertiary)]">{index + 1}.</span>
                    <code className="flex-1 text-[var(--text-primary)]">{code}</code>
                  </div>
                ))}
              </div>

              {/* Download / Copy */}
              <div className="flex gap-3">
                <Button
                  variant="glass"
                  className="flex-1"
                  onClick={() => {
                    const text = backupCodes.join('\n')
                    navigator.clipboard.writeText(text)
                    alert('Codes copied to clipboard!')
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="glass"
                  className="flex-1"
                  onClick={() => {
                    const element = document.createElement('a')
                    const file = new Blob([backupCodes.join('\n')], { type: 'text/plain' })
                    element.href = URL.createObjectURL(file)
                    element.download = 'backup-codes.txt'
                    document.body.appendChild(element)
                    element.click()
                    document.body.removeChild(element)
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="savedCodes"
                  checked={savedCodes}
                  onCheckedChange={setSavedCodes}
                />
                <label htmlFor="savedCodes" className="text-[var(--text-secondary)] text-sm cursor-pointer">
                  I have saved my backup codes in a secure location
                </label>
              </div>

              {/* Complete Button */}
              <Button
                onClick={handleCodesConfirmed}
                disabled={!savedCodes}
                variant="glass-primary"
                className="w-full"
              >
                {success ? '✓ Setup Complete!' : 'Complete Setup'}
              </Button>

              {success && (
                <p className="text-center text-[var(--accent-success)] text-sm">
                  2FA is now enabled. Redirecting to settings...
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-[var(--text-tertiary)] text-sm mt-8">
          Need help? Check the{' '}
          <a href="/help/2fa" className="text-[var(--brand-primary)] hover:underline">
            2FA setup guide
          </a>
        </p>
      </div>
    </div>
  )
}
