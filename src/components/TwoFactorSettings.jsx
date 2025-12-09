import React, { useState, useEffect } from 'react'
import { AlertCircle, Check, X, RefreshCw, Trash2, Lock } from 'lucide-react'
import axios from 'axios'

export default function TwoFactorSettings({ userEmail }) {
  const [twoFaStatus, setTwoFaStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null) // 'setup', 'regenerate', 'disable'
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [backupCodesToShow, setBackupCodesToShow] = useState(null)

  // Fetch 2FA status
  useEffect(() => {
    const fetchTwoFaStatus = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/.netlify/functions/auth-2fa-status')
        setTwoFaStatus(response.data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch 2FA status:', err)
        setError('Failed to load 2FA settings')
      } finally {
        setLoading(false)
      }
    }

    fetchTwoFaStatus()
  }, [])

  // Handle Setup 2FA
  const handleSetup = () => {
    window.location.href = '/auth/setup-2fa'
  }

  // Handle Regenerate Backup Codes
  const handleRegenerateBackupCodes = async () => {
    if (!password) {
      setPasswordError('Password is required')
      return
    }

    try {
      setSubmitting(true)
      setPasswordError(null)

      const response = await axios.post('/.netlify/functions/auth-2fa-generate-backup-codes', {
        password
      })

      setBackupCodesToShow(response.data.backupCodes)
      setSuccessMessage('New backup codes generated successfully!')
      setTwoFaStatus({
        ...twoFaStatus,
        backupCodesAvailable: response.data.backupCodes.length
      })
      setPassword('')
      setModalType(null)

      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (err) {
      console.error('Failed to regenerate backup codes:', err)
      setPasswordError(err.response?.data?.error || 'Failed to regenerate backup codes')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Disable 2FA
  const handleDisable2FA = async () => {
    if (!password) {
      setPasswordError('Password is required')
      return
    }

    try {
      setSubmitting(true)
      setPasswordError(null)

      await axios.post('/.netlify/functions/auth-2fa-disable', {
        password
      })

      setTwoFaStatus({
        ...twoFaStatus,
        totpEnabled: false,
        backupCodesAvailable: 0
      })
      setSuccessMessage('2FA has been disabled')
      setPassword('')
      setModalType(null)

      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (err) {
      console.error('Failed to disable 2FA:', err)
      setPasswordError(err.response?.data?.error || 'Failed to disable 2FA')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--brand-primary)] mb-2" />
        <p className="text-[var(--text-secondary)]">Loading 2FA settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-[var(--brand-primary)]" />
          Two-Factor Authentication
        </h3>
        <p className="text-[var(--text-secondary)] text-sm">
          Add an extra layer of security to your account by requiring a second verification method when
          logging in.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--accent-error)] flex-shrink-0 mt-0.5" />
          <p className="text-[var(--accent-error)] text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/30 rounded-xl p-4 flex gap-3">
          <Check className="w-5 h-5 text-[var(--accent-success)] flex-shrink-0 mt-0.5" />
          <p className="text-[var(--accent-success)] text-sm">{successMessage}</p>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl border border-[var(--glass-border)] p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              {twoFaStatus?.totpEnabled ? (
                <>
                  <Check className="w-5 h-5 text-[var(--accent-success)]" />
                  Two-Factor Authentication is Enabled
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-[var(--text-tertiary)]" />
                  Two-Factor Authentication is Disabled
                </>
              )}
            </h4>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              {twoFaStatus?.totpEnabled
                ? 'Your account is protected with 2FA.'
                : 'Enable 2FA to secure your account.'}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              twoFaStatus?.totpEnabled
                ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]'
                : 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]'
            }`}
          >
            {twoFaStatus?.totpEnabled ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Backup Codes Info */}
        {twoFaStatus?.totpEnabled && (
          <div className="mt-4 p-4 bg-[var(--surface-secondary)] rounded-xl border border-[var(--glass-border)]">
            <p className="text-[var(--text-primary)] text-sm mb-2">
              <strong>Backup Codes Available:</strong> {twoFaStatus?.backupCodesAvailable}
            </p>
            {twoFaStatus?.warnings?.lowBackupCodes && (
              <p className="text-[var(--accent-warning)] text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Running low on backup codes. Consider regenerating them.
              </p>
            )}
            {twoFaStatus?.warnings?.noBackupCodes && (
              <p className="text-[var(--accent-error)] text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                You have no backup codes left. Regenerate immediately.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {!twoFaStatus?.totpEnabled ? (
          <button
            onClick={handleSetup}
            className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white rounded-xl font-medium transition-colors"
          >
            Enable 2FA
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setModalType('regenerate')
                setShowModal(true)
                setPassword('')
                setPasswordError(null)
              }}
              className="px-4 py-2 bg-[var(--surface-tertiary)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate Backup Codes
            </button>
            <button
              onClick={() => {
                setModalType('disable')
                setShowModal(true)
                setPassword('')
                setPasswordError(null)
              }}
              className="px-4 py-2 bg-[var(--accent-error)] hover:bg-[var(--accent-error)]/80 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Disable 2FA
            </button>
          </>
        )}
      </div>

      {/* Backup Codes Display Modal */}
      {backupCodesToShow && (
        <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl border border-[var(--glass-border)] p-6">
          <h4 className="font-semibold text-[var(--text-primary)] mb-4">Your New Backup Codes</h4>
          <div className="bg-[var(--surface-secondary)] rounded-xl p-4 mb-4 space-y-2 max-h-48 overflow-y-auto">
            {backupCodesToShow.map((code, index) => (
              <div key={index} className="flex items-center gap-3 font-mono text-sm">
                <span className="text-[var(--text-tertiary)]">{index + 1}.</span>
                <code className="flex-1 text-[var(--text-primary)]">{code}</code>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const text = backupCodesToShow.join('\n')
                navigator.clipboard.writeText(text)
                alert('Codes copied to clipboard!')
              }}
              className="flex-1 px-3 py-2 bg-[var(--surface-tertiary)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] rounded-xl font-medium transition-colors"
            >
              Copy
            </button>
            <button
              onClick={() => {
                const element = document.createElement('a')
                const file = new Blob([backupCodesToShow.join('\n')], { type: 'text/plain' })
                element.href = URL.createObjectURL(file)
                element.download = 'backup-codes.txt'
                document.body.appendChild(element)
                element.click()
                document.body.removeChild(element)
              }}
              className="flex-1 px-3 py-2 bg-[var(--surface-tertiary)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] rounded-xl font-medium transition-colors"
            >
              Download
            </button>
            <button
              onClick={() => setBackupCodesToShow(null)}
              className="flex-1 px-3 py-2 bg-[var(--surface-tertiary)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl border border-[var(--glass-border)] p-6 max-w-md w-full shadow-[var(--shadow-lg)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              {modalType === 'regenerate'
                ? 'Regenerate Backup Codes'
                : 'Disable Two-Factor Authentication'}
            </h3>

            <p className="text-[var(--text-secondary)] text-sm mb-4">
              {modalType === 'regenerate'
                ? 'Enter your password to regenerate your backup codes.'
                : 'Enter your password to disable 2FA. This will make your account less secure.'}
            </p>

            {passwordError && (
              <div className="bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 rounded-xl p-3 mb-4 flex gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--accent-error)] flex-shrink-0 mt-0.5" />
                <p className="text-[var(--accent-error)] text-sm">{passwordError}</p>
              </div>
            )}

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError(null)
              }}
              className="w-full px-4 py-3 bg-[var(--surface-secondary)] border border-[var(--glass-border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] mb-4 transition-all"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setPassword('')
                  setPasswordError(null)
                }}
                className="flex-1 px-3 py-2.5 bg-[var(--surface-tertiary)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={
                  modalType === 'regenerate' ? handleRegenerateBackupCodes : handleDisable2FA
                }
                disabled={submitting || !password}
                className={`flex-1 px-3 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  modalType === 'regenerate'
                    ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white'
                    : 'bg-[var(--accent-error)] hover:bg-[var(--accent-error)]/80 text-white'
                }`}
              >
                {submitting ? 'Processing...' : modalType === 'regenerate' ? 'Regenerate' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
