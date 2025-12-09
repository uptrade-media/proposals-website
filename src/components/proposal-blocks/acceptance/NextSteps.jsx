/**
 * NextSteps - What happens after they accept
 * 
 * Clear path forward to reduce friction in signing.
 */

import { cn } from '@/lib/utils'
import { ArrowRight, CheckCircle2, Calendar, CreditCard, MessageSquare, Rocket } from 'lucide-react'
import { Section } from '../core/Section'

const stepIcons = {
  sign: CheckCircle2,
  payment: CreditCard,
  schedule: Calendar,
  kickoff: MessageSquare,
  launch: Rocket
}

export function NextSteps({
  title = "What Happens Next",
  subtitle = "Here's what to expect after you accept this proposal",
  steps = [],
  className = ''
}) {
  const defaultSteps = [
    {
      icon: 'sign',
      title: 'Sign This Proposal',
      description: 'Review and sign electronically using the form below'
    },
    {
      icon: 'payment',
      title: 'Submit Deposit',
      description: "You'll receive an invoice for the 50% deposit via email"
    },
    {
      icon: 'schedule',
      title: 'Schedule Kickoff',
      description: "We'll book a kickoff call to align on goals and gather materials"
    },
    {
      icon: 'kickoff',
      title: 'Work Begins',
      description: 'Our team gets to work while keeping you updated throughout'
    }
  ]
  
  const displaySteps = steps.length > 0 ? steps : defaultSteps

  return (
    <Section id="next-steps" padding="md" className={className}>
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[var(--text-secondary)]">{subtitle}</p>
        )}
      </div>
      
      {/* Steps timeline */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-gradient-to-b from-[var(--brand-green)] to-[var(--brand-teal)] hidden sm:block" />
          
          <div className="space-y-6">
            {displaySteps.map((step, i) => {
              const Icon = stepIcons[step.icon] || CheckCircle2
              return (
                <div key={i} className="flex gap-4 sm:gap-6">
                  {/* Icon */}
                  <div className="relative z-10 w-12 h-12 rounded-full 
                    bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-teal)]
                    flex items-center justify-center flex-shrink-0
                    shadow-lg shadow-[var(--brand-green)]/20">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pt-2">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Section>
  )
}

// CTA to scroll to signature
export function AcceptCTA({
  validUntil,
  onAcceptClick,
  className = ''
}) {
  return (
    <div className={cn(
      'text-center p-8 sm:p-10 rounded-2xl',
      'bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-teal)]',
      className
    )}>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
        Ready to Get Started?
      </h2>
      <p className="text-white/80 mb-6 max-w-md mx-auto">
        Accept this proposal to lock in your spot and begin the project.
      </p>
      
      <button
        onClick={onAcceptClick}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl
          bg-white text-gray-900 font-semibold text-lg
          hover:bg-gray-100 transition-colors
          shadow-lg shadow-black/20"
      >
        Accept Proposal
        <ArrowRight className="w-5 h-5" />
      </button>
      
      {validUntil && (
        <p className="text-white/60 text-sm mt-4">
          This proposal is valid until {new Date(validUntil).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
      )}
    </div>
  )
}
