/**
 * PaymentSchedule - How and when payments are due
 * 
 * Clear payment milestones tied to project phases.
 */

import { cn } from '@/lib/utils'
import { CreditCard, Calendar, CheckCircle2, Clock } from 'lucide-react'

export function PaymentSchedule({
  title = "Payment Schedule",
  payments = [],
  totalAmount,
  acceptedPaymentMethods,
  note,
  className = ''
}) {
  return (
    <div className={cn(
      'p-6 sm:p-8 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)]',
      className
    )}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[var(--brand-green)]/10">
          <CreditCard className="w-5 h-5 text-[var(--brand-green)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
      </div>
      
      {/* Payment milestones */}
      <div className="space-y-0 mb-6">
        {payments.map((payment, i) => (
          <div 
            key={i}
            className="flex items-start gap-4 py-4 border-b border-[var(--glass-border)] last:border-0"
          >
            {/* Payment number */}
            <div className="w-8 h-8 rounded-full bg-[var(--brand-green)]/10 
              flex items-center justify-center text-[var(--brand-green)] font-semibold text-sm flex-shrink-0">
              {i + 1}
            </div>
            
            {/* Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)]">{payment.milestone}</h4>
                  {payment.description && (
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{payment.description}</p>
                  )}
                  {payment.dueDate && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {payment.dueDate}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {payment.percentage && (
                    <span className="text-sm text-[var(--text-tertiary)]">{payment.percentage}%</span>
                  )}
                  <p className="font-bold text-[var(--text-primary)]">
                    ${payment.amount?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Total */}
      {totalAmount && (
        <div className="flex items-center justify-between py-4 px-4 rounded-xl bg-[var(--surface-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Total</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-teal)] bg-clip-text text-transparent">
            ${totalAmount.toLocaleString()}
          </span>
        </div>
      )}
      
      {/* Payment methods */}
      {acceptedPaymentMethods && (
        <p className="text-sm text-[var(--text-tertiary)] mt-4">
          <span className="font-medium">Accepted:</span> {acceptedPaymentMethods}
        </p>
      )}
      
      {/* Note */}
      {note && (
        <p className="text-sm text-[var(--text-secondary)] mt-4 pt-4 border-t border-[var(--glass-border)]">
          {note}
        </p>
      )}
    </div>
  )
}

// Simple 50/50 payment display
export function SimpleSplitPayment({
  totalAmount,
  depositPercent = 50,
  className = ''
}) {
  const depositAmount = Math.round(totalAmount * (depositPercent / 100))
  const finalAmount = totalAmount - depositAmount
  
  return (
    <div className={cn('grid sm:grid-cols-2 gap-4', className)}>
      <div className="p-5 rounded-xl bg-[var(--brand-green)]/10 border border-[var(--brand-green)]/20 text-center">
        <p className="text-sm text-[var(--text-secondary)] mb-1">Deposit to Start</p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">${depositAmount.toLocaleString()}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{depositPercent}% upon signing</p>
      </div>
      
      <div className="p-5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-center">
        <p className="text-sm text-[var(--text-secondary)] mb-1">Final Payment</p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">${finalAmount.toLocaleString()}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{100 - depositPercent}% upon completion</p>
      </div>
    </div>
  )
}
