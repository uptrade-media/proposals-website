/**
 * CallIntentDialog - Pre-call dialog to capture call purpose
 * 
 * Shows before initiating a call to log intent, then opens phone/OpenPhone
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Phone, Loader2, ExternalLink } from 'lucide-react'
import api from '@/lib/api'

const CALL_PURPOSES = [
  { value: 'follow_up', label: 'Follow-up on previous conversation' },
  { value: 'proposal', label: 'Discuss proposal/quote' },
  { value: 'check_in', label: 'General check-in' },
  { value: 'scheduling', label: 'Schedule meeting' },
  { value: 'support', label: 'Support/Questions' },
  { value: 'closing', label: 'Close deal' },
  { value: 'other', label: 'Other' },
]

export function CallIntentDialog({ 
  open, 
  onOpenChange, 
  prospect,
  onCallInitiated 
}) {
  const [purpose, setPurpose] = useState('follow_up')
  const [notes, setNotes] = useState('')
  const [isLogging, setIsLogging] = useState(false)

  const handleInitiateCall = async () => {
    if (!prospect?.phone) return

    setIsLogging(true)
    
    try {
      // Log the intent first
      await api.post('/.netlify/functions/calls-log-intent', {
        contactId: prospect.id,
        phoneNumber: prospect.phone,
        purpose: CALL_PURPOSES.find(p => p.value === purpose)?.label || purpose,
        notes: notes.trim() || null
      })

      // Close dialog
      onOpenChange(false)
      
      // Notify parent
      if (onCallInitiated) {
        onCallInitiated(prospect)
      }

      // Try OpenPhone deep link first, fallback to tel:
      // OpenPhone desktop app: openphone://call?number=+1234567890
      // Fallback: tel:+1234567890
      const phoneNumber = formatPhoneForDialer(prospect.phone)
      
      // Try OpenPhone first (will fail silently if not installed)
      const openPhoneUrl = `openphone://call?number=${encodeURIComponent(phoneNumber)}`
      const telUrl = `tel:${phoneNumber}`
      
      // Create a hidden iframe to try OpenPhone
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = openPhoneUrl
      document.body.appendChild(iframe)
      
      // After a short delay, fallback to tel: if OpenPhone didn't open
      setTimeout(() => {
        document.body.removeChild(iframe)
        // Always open tel: as backup - phone app will handle it
        window.location.href = telUrl
      }, 500)

    } catch (error) {
      console.error('Failed to log call intent:', error)
      // Still try to make the call even if logging failed
      window.location.href = `tel:${prospect.phone}`
    } finally {
      setIsLogging(false)
      // Reset form
      setPurpose('follow_up')
      setNotes('')
    }
  }

  const formatPhoneForDialer = (phone) => {
    // Clean up phone number for dialer
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) return '+1' + digits
    if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
    return phone.startsWith('+') ? phone : '+' + digits
  }

  const formatPhoneDisplay = (phone) => {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) {
      return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
    }
    return phone
  }

  if (!prospect) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Call {prospect.name || 'Contact'}
          </DialogTitle>
          <DialogDescription>
            {formatPhoneDisplay(prospect.phone)}
            {prospect.company && ` • ${prospect.company}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Call Purpose */}
          <div className="space-y-2">
            <Label>What's the purpose of this call?</Label>
            <RadioGroup value={purpose} onValueChange={setPurpose}>
              {CALL_PURPOSES.map((p) => (
                <div key={p.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={p.value} id={p.value} />
                  <Label htmlFor={p.value} className="font-normal cursor-pointer">
                    {p.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="call-notes">Notes (optional)</Label>
            <Textarea
              id="call-notes"
              placeholder="Key points to discuss, context to remember..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLogging}
          >
            Cancel
          </Button>
          <Button
            onClick={handleInitiateCall}
            disabled={isLogging || !prospect.phone}
            className="gap-2"
          >
            {isLogging ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4" />
                Start Call
                <ExternalLink className="h-3 w-3 opacity-50" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CallIntentDialog
