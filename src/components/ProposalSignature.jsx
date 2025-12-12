import { useState, useRef, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, X, Pen, Loader2, Mail, Calendar, User } from 'lucide-react'

export default function ProposalSignature({ 
  proposalId, 
  proposalSlug,
  proposalTitle, 
  clientName: initialClientName, 
  clientEmail, 
  onSignatureStarted,
  // For displaying already-signed proposals (from ProposalView)
  clientSignature,
  clientSignedBy,
  clientSignedAt,
  adminSignature,
  adminSignedBy,
  adminSignedAt,
  status
}) {
  const sigPad = useRef(null)
  const [signed, setSigned] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState('')
  const [isEmpty, setIsEmpty] = useState(true)
  const [hasTriggeredStart, setHasTriggeredStart] = useState(false)
  const [printedName, setPrintedName] = useState(initialClientName || '')
  const [signatureData, setSignatureData] = useState(null)
  const [signedDate, setSignedDate] = useState(null)
  const [adminSig, setAdminSig] = useState(null)
  const [adminSigDate, setAdminSigDate] = useState(null)
  const [adminSigner, setAdminSigner] = useState(null)

  // Debug log
  console.log('[ProposalSignature] Mounted with proposalId:', proposalId, 'status:', status)

  // Check if proposal is already signed on mount
  useEffect(() => {
    if (clientSignature || clientSignedAt) {
      setSigned(true)
      setSignatureData(clientSignature)
      setPrintedName(clientSignedBy || '')
      setSignedDate(clientSignedAt)
      setAdminSig(adminSignature)
      setAdminSigDate(adminSignedAt)
      setAdminSigner(adminSignedBy)
    } else {
      checkSignatureStatus()
    }
  }, [proposalId, clientSignature, clientSignedAt])

  const checkSignatureStatus = async () => {
    if (!proposalId) return
    
    try {
      const response = await fetch(`/.netlify/functions/proposals-get?id=${proposalId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        const proposal = data.proposal
        
        // Check if proposal has signature data
        if (proposal?.signed_at || proposal?.client_signed_at || proposal?.client_signature || proposal?.client_signature_url) {
          setSigned(true)
          setSignatureData(proposal.client_signature_url || proposal.client_signature)
          setPrintedName(proposal.client_signed_by || initialClientName || '')
          setSignedDate(proposal.client_signed_at || proposal.signed_at)
          setAdminSig(proposal.admin_signature_url || proposal.admin_signature)
          setAdminSigDate(proposal.admin_signed_at)
          setAdminSigner(proposal.admin_signed_by)
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
    
    // Track signature started (only once)
    if (!hasTriggeredStart && onSignatureStarted) {
      setHasTriggeredStart(true)
      onSignatureStarted()
    }
  }

  const handleSign = async () => {
    if (isEmpty || !sigPad.current) {
      setError('Please provide your signature before accepting.')
      return
    }

    if (!printedName.trim()) {
      setError('Please type your full legal name.')
      return
    }

    setSigning(true)
    setError('')

    try {
      const sigData = sigPad.current.toDataURL('image/png')
      const signedAt = new Date().toISOString()
      
      const response = await fetch('/.netlify/functions/proposals-sign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          proposalTitle,
          signature: sigData,
          signedAt,
          signedBy: printedName.trim(),
          clientEmail
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process signature')
      }

      // Store signature data for inline display
      setSignatureData(sigData)
      setSignedDate(signedAt)
      setSigned(true)
      
    } catch (err) {
      console.error('Signature error:', err)
      setError(err.message || 'Failed to process signature. Please try again.')
      setSigning(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Show inline signature block if already signed
  if (signed) {
    return (
      <div id="signature" className="space-y-6 scroll-mt-24">
        {/* Client Signature Block */}
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-[var(--brand-primary)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">Client Signature</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Signature Image */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              {signatureData ? (
                <img 
                  src={signatureData} 
                  alt="Client Signature" 
                  className="max-h-24 mx-auto"
                />
              ) : (
                <div className="h-24 flex items-center justify-center text-gray-400">
                  Signature on file
                </div>
              )}
            </div>
            
            {/* Signature Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-[var(--text-secondary)]">Signed by:</span>
                <span className="font-medium text-[var(--text-primary)]">{printedName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-[var(--text-secondary)]">Date:</span>
                <span className="font-medium text-[var(--text-primary)]">{formatDate(signedDate)}</span>
              </div>
              {clientEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-secondary)]">Email:</span>
                  <span className="font-medium text-[var(--text-primary)]">{clientEmail}</span>
                </div>
              )}
            </div>
          </div>
          
          <p className="text-xs text-[var(--text-tertiary)] mt-4">
            Electronically signed and legally binding under the ESIGN Act and UETA.
          </p>
        </div>

        {/* Admin Counter-Signature Block */}
        {adminSig ? (
          <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-[var(--brand-primary)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Uptrade Media Signature</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <img 
                  src={adminSig} 
                  alt="Admin Signature" 
                  className="max-h-24 mx-auto"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-secondary)]">Signed by:</span>
                  <span className="font-medium text-[var(--text-primary)]">{adminSigner || 'Uptrade Media'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-secondary)]">Date:</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatDate(adminSigDate)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-[var(--brand-primary)]/10 rounded-lg">
              <p className="text-sm text-[var(--brand-primary)] font-medium">
                ✓ This contract is fully executed
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-5 w-5 text-[var(--accent-orange)] animate-spin" />
              <h3 className="font-semibold text-[var(--accent-orange)]">Awaiting Counter-Signature</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Thank you for signing! Uptrade Media has been notified and will counter-sign shortly. 
              You'll receive the fully executed contract via email once complete.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Show signature form
  return (
    <div id="signature" className="scroll-mt-24 bg-[var(--glass-bg)] border-2 border-[var(--brand-primary)] rounded-xl overflow-hidden">
      <div className="bg-[var(--brand-primary)]/10 p-4 border-b border-[var(--brand-primary)]/20">
        <div className="flex items-center gap-2">
          <Pen className="h-5 w-5 text-[var(--brand-primary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Sign to Accept Proposal</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          By signing below, you agree to the terms and pricing outlined in this proposal.
        </p>
      </div>
      
      <div className="p-6 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Legal Notice */}
        <div className="bg-[var(--glass-bg-inset)] rounded-lg p-4 space-y-3">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-[var(--text-primary)]">Legally Binding</p>
              <p className="text-xs text-[var(--text-secondary)]">Electronic signatures are legally enforceable under the ESIGN Act.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-[var(--text-primary)]">Email Confirmation</p>
              <p className="text-xs text-[var(--text-secondary)]">You'll receive a signed PDF copy via email once fully executed.</p>
            </div>
          </div>
        </div>

        {/* Printed Name Field */}
        <div className="space-y-2">
          <Label htmlFor="printedName" className="text-[var(--text-primary)]">
            Your Full Legal Name <span className="text-[var(--accent-red)]">*</span>
          </Label>
          <Input
            id="printedName"
            type="text"
            value={printedName}
            onChange={(e) => setPrintedName(e.target.value)}
            placeholder="Type your full legal name"
            className="bg-[var(--surface-page-secondary)] border-[var(--glass-border)] text-[var(--text-primary)]"
            disabled={signing}
          />
        </div>

        {/* Signature Canvas */}
        <div className="space-y-2">
          <Label className="text-[var(--text-primary)]">
            Your Signature <span className="text-[var(--accent-red)]">*</span>
          </Label>
          <div className="border-2 border-[var(--glass-border-strong)] rounded-lg bg-white overflow-hidden">
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
          <p className="text-xs text-[var(--text-tertiary)]">
            Sign above using your mouse, trackpad, or touch screen
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={signing}
            className="flex-1 border-[var(--glass-border-strong)]"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Signature
          </Button>
          <Button
            onClick={handleSign}
            disabled={signing || isEmpty || !printedName.trim()}
            className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
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

        {/* Signature Details Preview */}
        <div className="pt-4 border-t border-[var(--glass-border)] text-xs text-[var(--text-tertiary)] space-y-1">
          <p><strong>Proposal:</strong> {proposalTitle}</p>
          {clientEmail && <p><strong>Email:</strong> {clientEmail}</p>}
          <p><strong>Date:</strong> {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
      </div>
    </div>
  )
}
