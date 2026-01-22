/**
 * @uptrade/site-kit/commerce - CheckoutForm
 * 
 * Checkout/registration form for purchasing products or registering for events.
 */

'use client'

import React, { useState } from 'react'
import type { CheckoutFormProps, CommerceOffering, CheckoutCustomer } from './types'
import { createCheckoutSession, registerForEvent } from './api'
import { formatPrice } from './utils'

export function CheckoutForm({
  offering,
  scheduleId,
  variantId,
  quantity: initialQuantity = 1,
  mode = 'checkout', // 'checkout' | 'register'
  showQuantity = true,
  submitText,
  onSuccess,
  onError,
  className = '',
  formClassName = '',
  inputClassName = '',
  buttonClassName = '',
}: CheckoutFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [quantity, setQuantity] = useState(initialQuantity)
  
  const [customer, setCustomer] = useState<CheckoutCustomer>({
    email: '',
    name: '',
    phone: '',
  })
  
  const isEvent = offering.type === 'event' || offering.type === 'class'
  const isFree = !offering.price || offering.price === 0
  const actualMode = isEvent && isFree ? 'register' : mode
  
  const defaultSubmitText = actualMode === 'register' 
    ? 'Register' 
    : isFree 
      ? 'Complete Order' 
      : 'Continue to Payment'
  
  const total = offering.price ? offering.price * quantity : 0
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      if (actualMode === 'register' && isEvent && scheduleId) {
        // Free event registration
        const result = await registerForEvent(offering.id, scheduleId, customer)
        
        if (result.success) {
          setSuccess(true)
          onSuccess?.(result)
        } else {
          setError(result.error || 'Registration failed')
          onError?.(result.error || 'Registration failed')
        }
      } else {
        // Paid checkout - redirect to Stripe
        const result = await createCheckoutSession(offering.id, {
          variantId,
          scheduleId,
          quantity,
          customer,
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
  
  if (success) {
    return (
      <div className={`site-kit-checkout-success ${className}`} style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#f0fdf4',
        borderRadius: '12px',
        border: '1px solid #bbf7d0',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h3 style={{ margin: '0 0 0.5rem', color: '#166534' }}>
          {actualMode === 'register' ? 'Registration Complete!' : 'Order Confirmed!'}
        </h3>
        <p style={{ color: '#15803d', margin: 0 }}>
          {actualMode === 'register' 
            ? `You're registered for ${offering.name}. Check your email for confirmation.`
            : `Thank you for your order! Check your email for details.`
          }
        </p>
      </div>
    )
  }
  
  return (
    <div className={`site-kit-checkout ${className}`}>
      <form onSubmit={handleSubmit} className={formClassName}>
        {/* Order Summary */}
        <div style={{
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '8px',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{offering.name}</h4>
              {offering.short_description && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
                  {offering.short_description}
                </p>
              )}
            </div>
            {offering.price_is_public && offering.price != null && (
              <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                {offering.price === 0 ? 'Free' : formatPrice(offering.price, offering.currency)}
              </div>
            )}
          </div>
          
          {showQuantity && !isEvent && offering.price && offering.price > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#666' }}>Quantity:</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className={inputClassName}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
                Total: {formatPrice(total, offering.currency)}
              </span>
            </div>
          )}
        </div>
        
        {/* Customer Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              value={customer.name}
              onChange={(e) => updateCustomer('name', e.target.value)}
              className={inputClassName}
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
              className={inputClassName}
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
              Phone Number
            </label>
            <input
              type="tel"
              value={customer.phone || ''}
              onChange={(e) => updateCustomer('phone', e.target.value)}
              className={inputClassName}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '1rem',
              }}
            />
          </div>
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
          className={buttonClassName}
          style={{
            width: '100%',
            marginTop: '1.5rem',
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
          {loading ? 'Processing...' : (submitText || defaultSubmitText)}
        </button>
        
        {!isFree && (
          <p style={{ 
            textAlign: 'center', 
            fontSize: '0.75rem', 
            color: '#666',
            marginTop: '0.75rem',
          }}>
            You'll be redirected to our secure payment page
          </p>
        )}
      </form>
    </div>
  )
}

export default CheckoutForm
