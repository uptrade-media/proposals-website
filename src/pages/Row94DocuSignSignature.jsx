import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Loader2, FileText, Shield, Clock, User, Mail, Building, Phone } from 'lucide-react'

const Row94DocuSignSignature = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState(null)

  // Embedded signing state
  const [signingUrl, setSigningUrl] = useState(null)
  const [showSigner, setShowSigner] = useState(false)

  // Form data for Row 94 Whiskey proposal
  const [formData, setFormData] = useState({
    signerName: '',
    signerEmail: '',
    signerTitle: '',
    signerPhone: '',
    companyName: 'Row 94 Whiskey',
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!formData.signerName.trim()) {
      return 'Please enter your full name.'
    }
    if (!formData.signerEmail.trim()) {
      return 'Please enter your email address.'
    }
    if (!/\S+@\S+\.\S+/.test(formData.signerEmail)) {
      return 'Please enter a valid email address.'
    }
    if (!formData.signerTitle.trim()) {
      return 'Please enter your title/position.'
    }
    return null
  }

const startEmbeddedSigning = async () => {
  const validationError = validateForm()
  if (validationError) { setError(validationError); return }
  setError(null)
  setIsLoading(true)

  try {
    const res = await fetch('/.netlify/functions/create-embedded-signing', {
      method: 'POST',
      credentials: 'include', // important if function is auth-guarded
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'row94', // <-- tells server which template to use
        signerName: formData.signerName.trim(),
        signerEmail: formData.signerEmail.trim(),
        signerTitle: formData.signerTitle.trim(),
        signerPhone: formData.signerPhone.trim(),
        companyName: formData.companyName,
        proposalType: 'Row 94 Whiskey Digital Growth Proposal',
        projectValue: '$12,500',
        returnUrl: `${window.location.origin}/p/row94?signed=1` // server must use this in recipientView
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.signingUrl) {
      throw new Error(data.error || `Failed to start DocuSign (${res.status})`)
    }

    setSigningUrl(data.signingUrl)
    setShowSigner(true)
  } catch (err) {
    setError(err?.message || 'Failed to start DocuSign')
  } finally {
    setIsLoading(false)
  }
}
useEffect(() => {
  const onPop = () => {
    if (new URLSearchParams(window.location.search).get('signed') === '1') {
      setShowSigner(false); setSigningUrl(null); setIsCompleted(true)
    }
  }
  window.addEventListener('popstate', onPop)
  onPop() // run once on mount in case already on ?signed=1
  return () => window.removeEventListener('popstate', onPop)
}, [])


  // Listen for completion from the return page (loaded inside the iframe)
  useEffect(() => {
    const onMessage = (e) => {
      if (typeof e.data === 'string' && e.data.startsWith('docusign:completed')) {
        setShowSigner(false)
        setSigningUrl(null)
        setIsCompleted(true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (isCompleted) {
    return (
      <section className="py-16 bg-green-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Row 94 Whiskey Agreement Signed Successfully!
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Thank you for choosing Uptrade Media for Row 94's digital transformation. We'll begin implementation immediately.
            </p>
            <div className="bg-white rounded-xl p-8 shadow-lg border border-green-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">What happens next for Row 94 Whiskey?</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Within 24 Hours</h4>
                  <p className="text-sm text-gray-600">Kickoff call to confirm compliance requirements and API credentials</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Week 1</h4>
                  <p className="text-sm text-gray-600">Age verification and compliance stack implementation begins</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Week 3</h4>
                  <p className="text-sm text-gray-600">Phase 1 complete with immediate conversion improvements</p>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-amber-50 rounded-lg">
                <h4 className="font-semibold text-amber-800 mb-2">Project Highlights</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Total Investment:</span>
                    <span className="text-amber-600 ml-2">$12,500</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Timeline:</span>
                    <span className="text-amber-600 ml-2">12 weeks</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Expected Traffic Growth:</span>
                    <span className="text-green-600 ml-2">75-120%</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Conversion Improvement:</span>
                    <span className="text-green-600 ml-2">25-40%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
            READY TO TRANSFORM ROW 94 WHISKEY'S
            <br />
            <span className="text-yellow-400">DIGITAL PRESENCE?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-6 font-medium">
            Complete your agreement to begin the 12-week digital transformation journey.
          </p>
          <div className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 text-sm font-bold tracking-wider transform -skew-x-12">
            <Shield className="h-4 w-4 mr-2" />
            SECURE YOUR SPOT: LIMITED TO 2 SPIRITS INDUSTRY PROJECTS IN Q4 2025
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-yellow-500 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Signatory Information */}
          <div className="mb-8">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center tracking-wide">
              <User className="h-5 w-5 mr-2 text-yellow-600" />
              AUTHORIZED SIGNATORY INFORMATION
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 tracking-wide">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  name="signerName"
                  value={formData.signerName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors font-medium"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 tracking-wide">
                  EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  name="signerEmail"
                  value={formData.signerEmail}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors font-medium"
                  placeholder="Enter your email address"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                readOnly
              />
            </div>
          </div>



          {/* Start Embedded DocuSign */}
          <div className="border-t pt-8">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                Secured by DocuSign — Industry-Standard Electronic Signatures
              </div>
            </div>

            <Button
              onClick={startEmbeddedSigning}
              disabled={isLoading}
              size="lg"
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black text-xl py-6 transition-all duration-300 transform hover:scale-105 shadow-lg font-black tracking-wide"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                  Preparing Row 94 Agreement...
                </>
              ) : (
                <>
                  <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Sign Row 94 Whiskey Agreement
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              By completing your signature, you electronically agree to the terms of this Row 94 Whiskey digital growth proposal.
              <br />
              We'll contact you within 24 hours to begin Phase 1 implementation.
            </p>
          </div>
        </div>
      </div>

      {/* DocuSign iframe modal */}
      {showSigner && signingUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
              <h3 className="font-semibold text-gray-900">Sign Row 94 Whiskey Digital Growth Agreement</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => window.open(signingUrl, '_blank', 'noopener')}
                  className="text-sm text-amber-600 hover:text-amber-700 hover:underline transition-colors"
                >
                  Open in new tab
                </button>
                <button
                  onClick={() => setShowSigner(false)}
                  className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              src={signingUrl}
              title="DocuSign Embedded Signing - Row 94 Whiskey"
              className="w-full h-[80vh]"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
            <div className="p-3 text-center text-xs text-gray-500 border-t bg-gray-50">
              If the signing screen doesn't load properly, click "Open in new tab" above.
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Row94DocuSignSignature