/**
 * InvestmentSection - Fixed project pricing with optional add-ons
 * 
 * Clear, single price for the project with breakdown of what's included.
 * Optional add-ons client can select.
 * Includes urgency triggers for high conversion.
 */

import { cn } from '@/lib/utils'
import { DollarSign, CheckCircle2, Info, Clock, Zap, AlertTriangle, TrendingUp, Shield } from 'lucide-react'
import { Section, SectionHeader } from '../core/Section'

export function InvestmentSection({
  title = "Your Investment",
  subtitle,
  projectPrice,
  projectPriceNote,
  breakdown = [],
  addOns = [],
  selectedAddOns = [],
  onAddOnToggle,
  totalNote,
  validUntil,
  originalPrice, // For showing discount
  discountPercent,
  limitedSlots,
  urgencyMessage,
  guarantee,
  children,
  className = ''
}) {
  // Calculate total with selected add-ons
  const addOnsTotal = selectedAddOns.reduce((sum, id) => {
    const addOn = addOns.find(a => a.id === id)
    return sum + (addOn?.price || 0)
  }, 0)
  
  const grandTotal = (projectPrice || 0) + addOnsTotal
  
  // Calculate days until expiration
  const daysUntilExpiry = validUntil 
    ? Math.ceil((new Date(validUntil) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Section id="investment" padding="lg" className={className}>
      <SectionHeader
        badge="Investment"
        title={title}
        subtitle={subtitle}
        align="center"
      />
      
      <div className="max-w-2xl mx-auto">
        {/* Urgency Banner */}
        {(urgencyMessage || (daysUntilExpiry && daysUntilExpiry <= 7)) && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 
            border border-orange-500/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-orange-500 animate-pulse" />
            </div>
            <div>
              {urgencyMessage ? (
                <p className="font-medium text-orange-700 dark:text-orange-300">{urgencyMessage}</p>
              ) : (
                <p className="font-medium text-orange-700 dark:text-orange-300">
                  This pricing expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                </p>
              )}
              <p className="text-sm text-orange-600/70 dark:text-orange-400/70">
                Lock in this rate by accepting before expiration
              </p>
            </div>
          </div>
        )}

        {/* Limited Slots Badge */}
        {limitedSlots && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-red-600 dark:text-red-400">{limitedSlots}</span>
            </div>
          </div>
        )}

        {/* Main project price */}
        <div className="text-center mb-8 p-8 rounded-2xl 
          bg-gradient-to-br from-[var(--brand-green)]/10 to-[var(--brand-teal)]/10
          border border-[var(--brand-green)]/20 relative overflow-hidden">
          
          {/* Discount badge */}
          {originalPrice && originalPrice > projectPrice && (
            <div className="absolute -top-1 -right-1">
              <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                SAVE ${(originalPrice - projectPrice).toLocaleString()}
              </div>
            </div>
          )}
          
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
            Project Investment
          </p>
          
          {/* Original price strikethrough */}
          {originalPrice && originalPrice > projectPrice && (
            <p className="text-xl text-[var(--text-tertiary)] line-through mb-1">
              ${originalPrice?.toLocaleString()}
            </p>
          )}
          
          <div className="text-5xl sm:text-6xl font-bold 
            bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-teal)] 
            bg-clip-text text-transparent">
            ${projectPrice?.toLocaleString()}
          </div>
          
          {discountPercent && (
            <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-green-500/20 text-green-600 text-sm font-medium">
              <TrendingUp className="w-3 h-3" />
              {discountPercent}% off limited time
            </div>
          )}
          
          {projectPriceNote && (
            <p className="text-sm text-[var(--text-tertiary)] mt-2">{projectPriceNote}</p>
          )}
        </div>
        
        {/* Price breakdown */}
        {breakdown.length > 0 && (
          <div className="mb-8 p-6 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
              What's Included
            </h3>
            <div className="space-y-3">
              {breakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--glass-border)] last:border-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)]" />
                    <span className="text-[var(--text-primary)]">{item.name}</span>
                  </div>
                  {item.value && (
                    <span className="text-sm text-[var(--text-secondary)]">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Add-ons */}
        {addOns.length > 0 && (
          <AddOnsGrid 
            addOns={addOns}
            selectedAddOns={selectedAddOns}
            onToggle={onAddOnToggle}
            className="mb-8"
          />
        )}
        
        {/* Grand total with add-ons */}
        {selectedAddOns.length > 0 && (
          <div className="p-6 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[var(--text-secondary)]">Base Project</span>
              <span className="text-[var(--text-primary)]">${projectPrice?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[var(--text-secondary)]">Selected Add-ons ({selectedAddOns.length})</span>
              <span className="text-[var(--text-primary)]">+${addOnsTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[var(--glass-border)]">
              <span className="font-semibold text-[var(--text-primary)]">Total Investment</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-teal)] bg-clip-text text-transparent">
                ${grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        )}
        
        {/* Guarantee */}
        {guarantee && (
          <div className="mt-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">
                  {guarantee.title || 'Our Guarantee'}
                </h4>
                <p className="text-sm text-green-700 dark:text-green-400">
                  {guarantee.description}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {totalNote && (
          <div className="flex items-start gap-2 mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">{totalNote}</p>
          </div>
        )}
        
        {children}
      </div>
    </Section>
  )
}

// Add-ons grid
export function AddOnsGrid({
  title = "Optional Add-Ons",
  addOns = [],
  selectedAddOns = [],
  onToggle,
  className = ''
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
        {title}
      </h3>
      <div className="space-y-3">
        {addOns.map((addOn) => (
          <AddOnOption
            key={addOn.id}
            {...addOn}
            selected={selectedAddOns.includes(addOn.id)}
            onToggle={() => onToggle?.(addOn.id)}
          />
        ))}
      </div>
    </div>
  )
}

// Individual add-on option
export function AddOnOption({
  id,
  name,
  description,
  price,
  priceNote,
  selected = false,
  onToggle,
  className = ''
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all',
        'border-2',
        selected 
          ? 'border-[var(--brand-green)] bg-[var(--brand-green)]/5'
          : 'border-[var(--glass-border)] hover:border-[var(--brand-green)]/50 bg-[var(--glass-bg)]',
        className
      )}
    >
      {/* Checkbox */}
      <div className={cn(
        'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
        selected 
          ? 'border-[var(--brand-green)] bg-[var(--brand-green)]'
          : 'border-gray-300'
      )}>
        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      
      {/* Content */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-semibold text-[var(--text-primary)]">{name}</h4>
            {description && (
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span className="font-bold text-[var(--text-primary)]">
              +${price?.toLocaleString()}
            </span>
            {priceNote && (
              <p className="text-xs text-[var(--text-tertiary)]">{priceNote}</p>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
