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
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
        <p className="text-slate-400">Loading 2FA settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-blue-400" />
          Two-Factor Authentication
        </h3>
        <p className="text-slate-400 text-sm">
          Add an extra layer of security to your account by requiring a second verification method when
          logging in.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 flex gap-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-200 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-semibold text-white flex items-center gap-2">
              {twoFaStatus?.totpEnabled ? (
                <>
                  <Check className="w-5 h-5 text-green-400" />
                  Two-Factor Authentication is Enabled
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-slate-400" />
                  Two-Factor Authentication is Disabled
                </>
              )}
            </h4>
            <p className="text-slate-400 text-sm mt-1">
              {twoFaStatus?.totpEnabled
                ? 'Your account is protected with 2FA.'
                : 'Enable 2FA to secure your account.'}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              twoFaStatus?.totpEnabled
                ? 'bg-green-900/30 text-green-300'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {twoFaStatus?.totpEnabled ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Backup Codes Info */}
        {twoFaStatus?.totpEnabled && (
          <div className="mt-4 p-4 bg-slate-900 rounded border border-slate-600">
            <p className="text-slate-300 text-sm mb-2">
              <strong>Backup Codes Available:</strong> {twoFaStatus?.backupCodesAvailable}
            </p>
            {twoFaStatus?.warnings?.lowBackupCodes && (
              <p className="text-amber-300 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Running low on backup codes. Consider regenerating them.
              </p>
            )}
            {twoFaStatus?.warnings?.noBackupCodes && (
              <p className="text-red-300 text-sm flex items-start gap-2">
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
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
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Disable 2FA
            </button>
          </>
        )}
      </div>

      {/* Backup Codes Display Modal */}
      {backupCodesToShow && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h4 className="font-semibold text-white mb-4">Your New Backup Codes</h4>
          <div className="bg-slate-900 rounded-lg p-4 mb-4 space-y-2 max-h-48 overflow-y-auto">
            {backupCodesToShow.map((code, index) => (
              <div key={index} className="flex items-center gap-3 font-mono text-sm">
                <span className="text-slate-500">{index + 1}.</span>
                <code className="flex-1 text-slate-200">{code}</code>
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
              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
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
              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
            >
              Download
            </button>
            <button
              onClick={() => setBackupCodesToShow(null)}
              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">
              {modalType === 'regenerate'
                ? 'Regenerate Backup Codes'
                : 'Disable Two-Factor Authentication'}
            </h3>

            <p className="text-slate-300 text-sm mb-4">
              {modalType === 'regenerate'
                ? 'Enter your password to regenerate your backup codes.'
                : 'Enter your password to disable 2FA. This will make your account less secure.'}
            </p>

            {passwordError && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-4 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm">{passwordError}</p>
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
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setPassword('')
                  setPasswordError(null)
                }}
                className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={
                  modalType === 'regenerate' ? handleRegenerateBackupCodes : handleDisable2FA
                }
                disabled={submitting || !password}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                  modalType === 'regenerate'
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white'
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
