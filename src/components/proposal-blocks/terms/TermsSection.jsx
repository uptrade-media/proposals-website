/**
 * TermsSection - Legal terms and conditions
 * 
 * Comprehensive but readable terms covering:
 * - Payment terms
 * - Timeline expectations
 * - Scope boundaries (change orders)
 * - IP and ownership
 * - Liability and warranties
 * - Cancellation policy
 */

import { cn } from '@/lib/utils'
import { Scale, FileText, Clock, Shield, AlertCircle, RefreshCw, Ban } from 'lucide-react'
import { Section, SectionHeader } from '../core/Section'

export function TermsSection({
  title = "Terms & Conditions",
  subtitle = "Please review the following terms carefully before accepting this proposal",
  terms = [],
  children,
  className = ''
}) {
  return (
    <Section id="terms" padding="lg" variant="elevated" className={className}>
      <SectionHeader
        badge="Legal"
        title={title}
        subtitle={subtitle}
        align="center"
      />
      
      <div className="max-w-3xl mx-auto">
        {/* Terms accordion/list */}
        <div className="space-y-4">
          {terms.map((term, i) => (
            <TermsBlock key={i} {...term} />
          ))}
        </div>
        
        {children}
      </div>
    </Section>
  )
}

// Individual terms block
export function TermsBlock({
  title,
  icon,
  content,
  items = [],
  className = ''
}) {
  const iconMap = {
    payment: FileText,
    timeline: Clock,
    scope: RefreshCw,
    ip: Shield,
    liability: AlertCircle,
    cancellation: Ban,
    legal: Scale
  }
  
  const Icon = iconMap[icon] || Scale
  
  return (
    <div className={cn(
      'p-5 sm:p-6 rounded-xl bg-[var(--surface-primary)] border border-[var(--glass-border)]',
      className
    )}>
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
        </div>
        <h3 className="font-semibold text-[var(--text-primary)] pt-1">{title}</h3>
      </div>
      
      {content && (
        <div className="prose prose-sm max-w-none text-[var(--text-secondary)] ml-11">
          {typeof content === 'string' ? <p>{content}</p> : content}
        </div>
      )}
      
      {items.length > 0 && (
        <ul className="space-y-2 ml-11 mt-3">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
              <span className="text-[var(--text-tertiary)]">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Pre-built common terms templates
export const COMMON_TERMS = {
  paymentTerms: {
    title: 'Payment Terms',
    icon: 'payment',
    items: [
      'A 50% deposit is required to begin work on this project.',
      'The remaining 50% is due upon project completion, before final files are delivered.',
      'Invoices are due within 14 days of receipt.',
      'Accepted payment methods: Credit card, ACH bank transfer, or check.',
      'Late payments may incur a 1.5% monthly interest charge.'
    ]
  },
  
  timeline: {
    title: 'Timeline & Delays',
    icon: 'timeline',
    items: [
      'Estimated timelines begin after receipt of deposit and all required materials from Client.',
      'Delays in providing feedback, content, or approvals will extend the project timeline accordingly.',
      'Uptrade Media will communicate any anticipated delays promptly.',
      'Rush requests may incur additional fees and are subject to availability.'
    ]
  },
  
  scopeChanges: {
    title: 'Scope Changes & Revisions',
    icon: 'scope',
    items: [
      'This proposal covers the scope outlined in the deliverables section only.',
      'Requests outside the defined scope will require a change order with additional fees.',
      'Includes up to 2 rounds of revisions per deliverable unless otherwise specified.',
      'Additional revision rounds are billed at $150/hour.',
      'Significant scope changes may require a new proposal.'
    ]
  },
  
  ipOwnership: {
    title: 'Intellectual Property & Ownership',
    icon: 'ip',
    items: [
      'Upon full payment, Client receives full ownership of all final deliverables.',
      'Uptrade Media retains the right to display work in portfolio and marketing materials.',
      'Third-party assets (stock photos, fonts, plugins) are subject to their respective licenses.',
      'Source files and working documents remain property of Uptrade Media unless explicitly transferred.',
      'Client is responsible for ensuring they have rights to any content provided to Uptrade Media.'
    ]
  },
  
  liability: {
    title: 'Liability & Warranties',
    icon: 'liability',
    items: [
      'Uptrade Media will perform all work in a professional manner consistent with industry standards.',
      'We warrant all work is original or properly licensed for the intended use.',
      'Total liability is limited to the amount paid for services under this agreement.',
      'Uptrade Media is not liable for any indirect, incidental, or consequential damages.',
      'Client is responsible for final review and approval of all deliverables before launch.'
    ]
  },
  
  cancellation: {
    title: 'Cancellation Policy',
    icon: 'cancellation',
    items: [
      'Either party may terminate this agreement with 14 days written notice.',
      'If Client cancels, payment is due for all work completed to date.',
      'Deposit is non-refundable once work has commenced.',
      'If Uptrade Media cancels, a pro-rated refund will be issued for incomplete work.',
      'All materials and work product completed to date will be delivered upon final payment.'
    ]
  },
  
  confidentiality: {
    title: 'Confidentiality',
    icon: 'legal',
    items: [
      'Both parties agree to keep confidential any proprietary information shared during this project.',
      'This includes but is not limited to business strategies, customer data, and trade secrets.',
      'Confidentiality obligations survive the termination of this agreement.'
    ]
  }
}

// Quick terms generator using common templates
export function StandardTerms({ 
  include = ['paymentTerms', 'timeline', 'scopeChanges', 'ipOwnership', 'liability', 'cancellation'],
  customTerms = [],
  className = ''
}) {
  const terms = [
    ...include.map(key => COMMON_TERMS[key]).filter(Boolean),
    ...customTerms
  ]
  
  return (
    <div className={cn('space-y-4', className)}>
      {terms.map((term, i) => (
        <TermsBlock key={i} {...term} />
      ))}
    </div>
  )
}
