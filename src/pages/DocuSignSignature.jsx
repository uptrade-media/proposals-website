import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Loader2, FileText, Shield, Clock, User, Mail } from 'lucide-react'

const DocuSignSignature = ({ slug = 'mbfm' }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState(null)

  // Embedded signing state
  const [signingUrl, setSigningUrl] = useState(null)
  const [showSigner, setShowSigner] = useState(false)

  // Simplified form - only what's needed to start signing
  const [formData, setFormData] = useState({
    signerName: '',
    signerEmail: '',
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
    // Simple email validation
    if (!/\S+@\S+\.\S+/.test(formData.signerEmail)) {
      return 'Please enter a valid email address.'
    }
    return null
  }

  const startEmbeddedSigning = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/.netlify/functions/create-embedded-signing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug,
          signerName: formData.signerName,
          signerEmail: formData.signerEmail,
        }),
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        throw new Error(`Unexpected response (${res.status})`)
      }

      if (!res.ok || data.error) {
        console.error('DocuSign function error:', data)
        throw new Error(data.error || `Failed to start DocuSign (${res.status})`)
      }

      console.log('Signing URL (prefix):', (data.signingUrl || '').slice(0, 120))

      setSigningUrl(data.signingUrl)
      setShowSigner(true)
    } catch (err) {
      setError(err.message || 'Failed to start DocuSign')
    } finally {
      setIsLoading(false)
    }
  }

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
              Agreement Signed Successfully!
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Thank you for signing the proposal agreement. We'll be in touch within 1 hour to begin your project.
            </p>
            <div className="bg-white rounded-xl p-8 shadow-lg border border-green-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">What happens next?</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#4bbf39] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Within 1 Hour</h4>
                  <p className="text-sm text-gray-600">Our team will contact you to confirm project details</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#39bfb0] rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Within 24 Hours</h4>
                  <p className="text-sm text-gray-600">Receive detailed project timeline and next steps</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Project Start</h4>
                  <p className="text-sm text-gray-600">Begin development within 7 days to claim your discount</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Digital Presence?
          </h2>
          <p className="text-xl text-gray-600">
            Complete your agreement to secure your $5,000 limited-time discount.
          </p>
          <div className="mt-4 p-4 bg-yellow-100 rounded-lg inline-block">
            <p className="text-yellow-800 font-semibold">
              ⚠️ Only 2 automotive projects available in Q4 2025
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Simplified Signatory Information */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Your Information</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  Full Name *
                </label>
                <input
                  type="text"
                  name="signerName"
                  value={formData.signerName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4bbf39] focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="signerEmail"
                  value={formData.signerEmail}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4bbf39] focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              You'll fill out additional details (title, phone, company) within the DocuSign form.
            </p>
          </div>

          {/* Agreement Terms */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Agreement Terms</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>By proceeding, I acknowledge that I have read and agree to the following:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>The project scope, timeline, and investment outlined in this proposal</li>
                <li>Payment terms: 30% deposit upon signing, remaining balance per phase completion</li>
                <li>The limited-time $5,000 discount is valid for 7 days from proposal date</li>
                <li>Project timeline begins within 7 business days of signed agreement</li>
                <li>All work will be performed according to Uptrade Media's standard terms of service</li>
              </ul>
              <p className="mt-4 font-medium">
                Total Project Investment: <span className="text-[#4bbf39] text-lg">$17,500</span>
                <span className="text-green-600"> ($5,000 discount applied)</span>
              </p>
            </div>
          </div>

          {/* Start Embedded DocuSign */}
          <div className="border-t pt-8">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                Secured by DocuSign — Embedded Signing
              </div>
            </div>

            <Button
              onClick={startEmbeddedSigning}
              disabled={isLoading}
              size="lg"
              className="w-full bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a] text-white text-xl py-6 transition-all duration-300 transform hover:scale-105"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                  Starting DocuSign...
                </>
              ) : (
                <>
                  <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Open Embedded DocuSign
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              By completing your signature, you electronically agree to the terms of this proposal.
              <br />
              We'll contact you within 1 hour to begin your project.
            </p>
          </div>
        </div>
      </div>

      {/* DocuSign iframe modal */}
      {showSigner && signingUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">Sign the Proposal</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => window.open(signingUrl, '_blank', 'noopener')}
                  className="text-sm text-[#4bbf39] hover:underline"
                >
                  Open in new tab
                </button>
                <button
                  onClick={() => setShowSigner(false)}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              src={signingUrl}
              title="DocuSign Embedded Signing"
              className="w-full h-[80vh]"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
            <div className="p-2 text-center text-xs text-gray-500 border-t">
              If the signing screen doesn't load, click "Open in new tab."
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default DocuSignSignature