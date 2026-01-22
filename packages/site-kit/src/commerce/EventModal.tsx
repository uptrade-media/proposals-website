/**
 * @uptrade/site-kit/commerce - EventModal
 * 
 * Modal popup for event registration and checkout.
 * Handles both free registration and paid tickets via Stripe/Square.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { CommerceOffering, CommerceSchedule, CheckoutCustomer, CheckoutResult } from './types'
import { registerForEvent, createCheckoutSession } from './api'
import { formatDate, formatTime, formatPrice, getSpotsRemaining, isEventSoldOut } from './utils'

export interface EventModalProps {
  /** Event to display */
  event: CommerceOffering | null
  /** Specific schedule (optional - uses first upcoming if not provided) */
  schedule?: CommerceSchedule | null
  /** Whether modal is open */
  isOpen: boolean
  /** Close modal callback */
  onClose: () => void
  /** Success callback */
  onSuccess?: (result: CheckoutResult) => void
  /** Error callback */
  onError?: (error: string) => void
  /** Collect phone number */
  collectPhone?: boolean
  /** Additional form fields */
  additionalFields?: AdditionalField[]
  /** Custom class names */
  className?: string
  overlayClassName?: string
  contentClassName?: string
}

export interface AdditionalField {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'number'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
}

export function EventModal({
  event,
  schedule: propSchedule,
  isOpen,
  onClose,
  onSuccess,
  onError,
  collectPhone = false,
  additionalFields = [],
  className = '',
  overlayClassName = '',
  contentClassName = '',
}: EventModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [quantity, setQuantity] = useState(1)
  
  const [customer, setCustomer] = useState<CheckoutCustomer>({
    email: '',
    name: '',
    phone: '',
  })
  
  const [additionalData, setAdditionalData] = useState<Record<string, string>>({})
  
  // Get schedule
  const schedule = propSchedule || event?.schedules?.[0] || (event as any)?.next_schedule
  
  // Reset state when modal opens with new event
  useEffect(() => {
    if (isOpen && event) {
      setError(null)
      setSuccess(false)
      setQuantity(1)
      setCustomer({ email: '', name: '', phone: '' })
      setAdditionalData({})
    }
  }, [isOpen, event?.id])
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])
  
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])
  
  if (!isOpen || !event) return null
  
  const isFree = !event.price || event.price === 0
  const soldOut = schedule ? isEventSoldOut(schedule.capacity, schedule.current_registrations) : false
  const spotsRemaining = schedule ? getSpotsRemaining(schedule.capacity, schedule.current_registrations) : null
  const total = event.price ? event.price * quantity : 0
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!schedule) {
      setError('No schedule available for this event')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      if (isFree) {
        // Free event registration
        const result = await registerForEvent(event.id, schedule.id, {
          ...customer,
          ...additionalData,
        })
        
        if (result.success) {
          setSuccess(true)
          onSuccess?.(result)
        } else {
          setError(result.error || 'Registration failed')
          onError?.(result.error || 'Registration failed')
        }
      } else {
        // Paid checkout - redirect to Stripe/Square
        const result = await createCheckoutSession(event.id, {
          scheduleId: schedule.id,
          quantity,
          customer: {
            ...customer,
            ...additionalData,
          },
          successUrl: window.location.href + '?registration=success',
          cancelUrl: window.location.href,
        })
        
        if (result.success && result.payment_url) {
          // Redirect to payment
          window.location.href = result.payment_url
        } else {
          setError(result.error || 'Checkout failed')
          onError?.(result.error || 'Checkout failed')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }
  
  const updateCustomer = (field: keyof CheckoutCustomer, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }))
  }
  
  return (
    <div
      className={`site-kit-modal-overlay ${overlayClassName}`}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className={`site-kit-modal ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem',
            border: 'none',
            background: '#f3f4f6',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '1.25rem',
            lineHeight: 1,
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          aria-label="Close"
        >
          ×
        </button>
        
        {/* Event header */}
        {event.featured_image_url && (
          <div style={{ position: 'relative' }}>
            <img
              src={event.featured_image_url}
              alt={event.name}
              style={{
                width: '100%',
                height: '180px',
                objectFit: 'cover',
                borderRadius: '16px 16px 0 0',
              }}
            />
            {soldOut && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                background: '#ef4444',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}>
                Sold Out
              </div>
            )}
          </div>
        )}
        
        <div className={`site-kit-modal-content ${contentClassName}`} style={{ padding: '1.5rem' }}>
          {/* Success state */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
              <h2 style={{ margin: '0 0 0.5rem', color: '#166534' }}>
                You're Registered!
              </h2>
              <p style={{ color: '#15803d', margin: '0 0 1.5rem' }}>
                Check your email for confirmation details.
              </p>
              <button
                onClick={onClose}
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Event info */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 600, paddingRight: '2rem' }}>
                  {event.name}
                </h2>
                
                {schedule && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: '#666', fontSize: '0.9rem' }}>
                    <span>📅 {formatDate(schedule.starts_at)}</span>
                    <span>🕐 {formatTime(schedule.starts_at)}</span>
                    {event.location && <span>📍 {event.location}</span>}
                  </div>
                )}
                
                {event.short_description && (
                  <p style={{ margin: '0.75rem 0 0', color: '#666', fontSize: '0.9rem' }}>
                    {event.short_description}
                  </p>
                )}
                
                {/* Capacity warning */}
                {spotsRemaining !== null && spotsRemaining <= 10 && spotsRemaining > 0 && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: '#fef3c7',
                    borderRadius: '6px',
                    color: '#92400e',
                    fontSize: '0.875rem',
                  }}>
                    ⚠️ Only {spotsRemaining} spot{spotsRemaining > 1 ? 's' : ''} remaining!
                  </div>
                )}
              </div>
              
              {soldOut ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                }}>
                  <p style={{ margin: 0, color: '#666' }}>
                    This event is sold out. Check back for future dates!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Price / Quantity */}
                  {!isFree && event.price_is_public && (
                    <div style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>
                            {formatPrice(event.price!, event.currency)}
                          </span>
                          <span style={{ color: '#666', fontSize: '0.875rem' }}> per ticket</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.875rem', color: '#666' }}>Qty:</label>
                          <select
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            style={{
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              background: 'white',
                              fontSize: '1rem',
                            }}
                          >
                            {[...Array(Math.min(10, spotsRemaining || 10))].map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {quantity > 1 && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          paddingTop: '0.75rem', 
                          borderTop: '1px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}>
                          <span style={{ fontWeight: 500 }}>Total</span>
                          <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                            {formatPrice(total, event.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Customer info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customer.name}
                        onChange={(e) => updateCustomer('name', e.target.value)}
                        placeholder="John Smith"
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '1rem',
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={customer.email}
                        onChange={(e) => updateCustomer('email', e.target.value)}
                        placeholder="john@example.com"
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '1rem',
                        }}
                      />
                    </div>
                    
                    {collectPhone && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={customer.phone || ''}
                          onChange={(e) => updateCustomer('phone', e.target.value)}
                          placeholder="(555) 123-4567"
                          style={{
                            width: '100%',
                            padding: '0.625rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '1rem',
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Additional fields */}
                    {additionalFields.map(field => (
                      <div key={field.name}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                          {field.label} {field.required && '*'}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            required={field.required}
                            placeholder={field.placeholder}
                            value={additionalData[field.name] || ''}
                            onChange={(e) => setAdditionalData(prev => ({ ...prev, [field.name]: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '0.625rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '1rem',
                              minHeight: '80px',
                              resize: 'vertical',
                            }}
                          />
                        ) : field.type === 'select' && field.options ? (
                          <select
                            required={field.required}
                            value={additionalData[field.name] || ''}
                            onChange={(e) => setAdditionalData(prev => ({ ...prev, [field.name]: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '0.625rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '1rem',
                              background: 'white',
                            }}
                          >
                            <option value="">Select...</option>
                            {field.options.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || 'text'}
                            required={field.required}
                            placeholder={field.placeholder}
                            value={additionalData[field.name] || ''}
                            onChange={(e) => setAdditionalData(prev => ({ ...prev, [field.name]: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '0.625rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              fontSize: '1rem',
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {error && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#dc2626',
                      fontSize: '0.875rem',
                    }}>
                      {error}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      marginTop: '1.25rem',
                      padding: '0.875rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: 'none',
                      background: loading ? '#93c5fd' : '#2563eb',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Processing...' : (
                      isFree ? 'Register Free' : `Pay ${formatPrice(total, event.currency)}`
                    )}
                  </button>
                  
                  {!isFree && (
                    <p style={{ 
                      textAlign: 'center', 
                      fontSize: '0.75rem', 
                      color: '#666',
                      margin: '0.75rem 0 0',
                    }}>
                      🔒 Secure checkout via Stripe
                    </p>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventModal
