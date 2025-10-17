import { useState, useRef, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, X, Pen, Loader2, Mail } from 'lucide-react'

export default function ProposalSignature({ proposalId, proposalTitle, clientName, clientEmail }) {
  const sigPad = useRef(null)
  const [signed, setSigned] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState('')
  const [isEmpty, setIsEmpty] = useState(true)

  // Check if proposal is already signed on mount
  useEffect(() => {
    checkSignatureStatus()
  }, [proposalId])

  const checkSignatureStatus = async () => {
    try {
      const response = await fetch(`/.netlify/functions/proposals-get?id=${proposalId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        // Check if proposal has signature data
        if (data.proposal?.signedAt || data.proposal?.status === 'accepted') {
          setSigned(true)
        }
      }
    } catch (err) {
      console.error('Error checking signature status:', err)
    }
  }

  const handleClear = () => {
    sigPad.current?.clear()
    setIsEmpty(true)
    setError('')
  }

  const handleBegin = () => {
    setIsEmpty(false)
    setError('')
  }

  const handleSign = async () => {
    if (isEmpty || !sigPad.current) {
      setError('Please provide your signature before accepting.')
      return
    }

    setSigning(true)
    setError('')

    try {
      const signatureData = sigPad.current.toDataURL('image/png')
      
      const response = await fetch('/.netlify/functions/proposals-sign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          proposalTitle,
          signature: signatureData,
          signedAt: new Date().toISOString(),
          signedBy: clientName,
          clientEmail
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process signature')
      }

      setSigned(true)
      
      // Show success for a moment, then reload to show accepted state
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (err) {
      console.error('Signature error:', err)
      setError(err.message || 'Failed to process signature. Please try again.')
      setSigning(false)
    }
  }

  if (signed) {
    return (
      <Card className="border-green-500 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-700">
            <CheckCircle className="h-6 w-6 mr-2" />
            Proposal Accepted!
          </CardTitle>
          <CardDescription>
            Thank you for signing. You will receive a confirmation email with the signed contract shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-[#4bbf39]">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Pen className="h-5 w-5 mr-2 text-[#4bbf39]" />
          Sign to Accept Proposal
        </CardTitle>
        <CardDescription>
          By signing below, you agree to the terms and pricing outlined in this proposal.
          A signed copy will be emailed to you at {clientEmail || 'your email address'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Legally Binding</p>
              <p className="text-xs text-gray-600">Electronic signatures are legally enforceable under the ESIGN Act.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Email Confirmation</p>
              <p className="text-xs text-gray-600">You'll receive a signed PDF copy via email immediately.</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Signature</label>
          <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
            <SignatureCanvas
              ref={sigPad}
              onBegin={handleBegin}
              canvasProps={{
                className: 'w-full h-40 cursor-crosshair',
                style: { touchAction: 'none' }
              }}
              backgroundColor="rgb(255, 255, 255)"
            />
          </div>
          <p className="text-xs text-gray-500">
            Sign above using your mouse, trackpad, or touch screen
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={signing}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Signature
          </Button>
          <Button
            onClick={handleSign}
            disabled={signing || isEmpty}
            className="flex-1 bg-[#4bbf39] hover:bg-[#3da030] text-white"
          >
            {signing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Sign & Accept Proposal
              </>
            )}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-600">
            <strong>Signed by:</strong> {clientName}
          </p>
          <p className="text-xs text-gray-600">
            <strong>Proposal:</strong> {proposalTitle}
          </p>
          {clientEmail && (
            <p className="text-xs text-gray-600">
              <strong>Email:</strong> {clientEmail}
            </p>
          )}
          <p className="text-xs text-gray-600">
            <strong>Date:</strong> {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
