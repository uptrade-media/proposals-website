/**
 * AcceptanceBlock - Final signature and acceptance section
 * 
 * Wrapper around the existing ProposalSignature component
 * with urgency triggers and conversion optimization.
 */

import { cn } from '@/lib/utils'
import { FileSignature, CheckCircle2, AlertCircle, Clock, Zap, ArrowRight, Shield } from 'lucide-react'
import { Section } from '../core/Section'
import ProposalSignature from '@/components/ProposalSignature'
import { useState, useEffect } from 'react'

// Countdown hook
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, expired: false })
  
  useEffect(() => {
    if (!targetDate) return
    
    const calculateTime = () => {
      const now = new Date()
      const target = new Date(targetDate)
      const diff = target - now
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, expired: true })
        return
      }
      
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        expired: false
      })
    }
    
    calculateTime()
    const interval = setInterval(calculateTime, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [targetDate])
  
  return timeLeft
}

export function AcceptanceBlock({
  proposalId,
  proposalTitle,
  clientName,
  clientEmail,
  totalAmount,
  depositAmount,
  validUntil,
  acceptedStatus = false,
  acceptedAt,
  acceptedBy,
  urgencyMessage,
  limitedSlots,
  bonusOffer,
  className = ''
}) {
  const countdown = useCountdown(validUntil)
  const showUrgency = countdown.days <= 7 && countdown.days >= 0 && !countdown.expired

  // Already accepted state
  if (acceptedStatus) {
    return (
      <Section id="acceptance" padding="lg" className={className}>
        <div className="max-w-2xl mx-auto">
          <div className="p-8 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-2">
              Proposal Accepted
            </h2>
            <p className="text-green-700 dark:text-green-300 mb-4">
              This proposal was accepted by {acceptedBy} on{' '}
              {new Date(acceptedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              Check your email for next steps and payment instructions.
            </p>
          </div>
        </div>
      </Section>
    )
  }

  return (
    <Section id="acceptance" padding="lg" variant="accent" className={className}>
      <div className="max-w-2xl mx-auto">
        {/* Countdown Timer - Urgency */}
        {showUrgency && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-500/10 
            border border-orange-500/30 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-orange-500 animate-pulse" />
              <span className="text-sm font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Limited Time Offer
              </span>
            </div>
            
            {/* Countdown boxes */}
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="text-center">
                <div className="w-16 h-16 rounded-xl bg-orange-500 text-white flex items-center justify-center text-2xl font-bold">
                  {countdown.days}
                </div>
                <p className="text-xs text-orange-600 mt-1">Days</p>
              </div>
              <div className="text-2xl font-bold text-orange-500">:</div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-xl bg-orange-500 text-white flex items-center justify-center text-2xl font-bold">
                  {countdown.hours}
                </div>
                <p className="text-xs text-orange-600 mt-1">Hours</p>
              </div>
              <div className="text-2xl font-bold text-orange-500">:</div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-xl bg-orange-500 text-white flex items-center justify-center text-2xl font-bold">
                  {String(countdown.minutes).padStart(2, '0')}
                </div>
                <p className="text-xs text-orange-600 mt-1">Minutes</p>
              </div>
            </div>
            
            <p className="text-orange-700 dark:text-orange-300 font-medium">
              {urgencyMessage || 'Accept now to lock in this pricing before it expires'}
            </p>
          </div>
        )}

        {/* Limited Slots Banner */}
        {limitedSlots && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center gap-3">
            <Zap className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-red-600 dark:text-red-400">{limitedSlots}</span>
          </div>
        )}

        {/* Bonus Offer */}
        {bonusOffer && (
          <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 
            border border-purple-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-1">
                  {bonusOffer.title || 'BONUS: Sign Today'}
                </h4>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  {bonusOffer.description}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full 
            bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-teal)] mb-4">
            <FileSignature className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
            Ready to Get Started?
          </h2>
          <p className="text-[var(--text-secondary)]">
            Sign below to accept and let's transform your business
          </p>
        </div>
        
        {/* Summary before signing */}
        <div className="p-5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
            Agreement Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Project</span>
              <span className="font-medium text-[var(--text-primary)]">{proposalTitle}</span>
            </div>
            {totalAmount && (
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Total Investment</span>
                <span className="font-medium text-[var(--text-primary)]">${totalAmount.toLocaleString()}</span>
              </div>
            )}
            {depositAmount && (
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Deposit Due Upon Signing</span>
                <span className="font-bold text-[var(--brand-green)]">${depositAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Legal acknowledgment */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            By signing below, you agree to the terms and conditions outlined in this proposal, 
            including the scope of work, payment schedule, and legal terms. This signature 
            constitutes a binding agreement.
          </p>
        </div>
        
        {/* Signature component */}
        <ProposalSignature
          proposalId={proposalId}
          proposalTitle={proposalTitle}
          clientName={clientName}
          clientEmail={clientEmail}
        />

        {/* Trust signals */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span>Secure & Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Legally Binding</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-500" />
            <span>Instant Confirmation</span>
          </div>
        </div>
        
        {/* Validity notice */}
        {validUntil && !countdown.expired && (
          <p className="text-center text-sm text-[var(--text-tertiary)] mt-6">
            This proposal is valid until{' '}
            <span className={cn(
              "font-medium",
              showUrgency ? "text-orange-500" : "text-[var(--text-secondary)]"
            )}>
              {new Date(validUntil).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </p>
        )}
      </div>
    </Section>
  )
}
