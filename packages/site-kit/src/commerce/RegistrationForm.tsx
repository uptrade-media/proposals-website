/**
 * @uptrade/site-kit/commerce - RegistrationForm
 * 
 * Simplified registration form for free events/classes.
 */

'use client'

import React, { useState } from 'react'
import type { RegistrationFormProps, CheckoutCustomer, AdditionalField, AdditionalFieldOption } from './types'
import { registerForEvent } from './api'

export function RegistrationForm({
  event,
  scheduleId,
  title = 'Register for Event',
  submitText = 'Register',
  successMessage,
  collectPhone = false,
  additionalFields = [],
  onSuccess,
  onError,
  className = '',
  formClassName = '',
  inputClassName = '',
  buttonClassName = '',
}: RegistrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [customer, setCustomer] = useState<CheckoutCustomer>({
    email: '',
    name: '',
    phone: '',
  })
  
  const [additionalData, setAdditionalData] = useState<Record<string, string>>({})
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const result = await registerForEvent(event.id, scheduleId, {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }
  
  if (success) {
    return (
      <div className={`site-kit-registration-success ${className}`} style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#f0fdf4',
        borderRadius: '12px',
        border: '1px solid #bbf7d0',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h3 style={{ margin: '0 0 0.5rem', color: '#166534' }}>
          You're Registered!
        </h3>
        <p style={{ color: '#15803d', margin: 0 }}>
          {successMessage || `You've been registered for ${event.name}. Check your email for confirmation.`}
        </p>
      </div>
    )
  }
  
  return (
    <div className={`site-kit-registration ${className}`}>
      {title && (
        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          {title}
        </h3>
      )}
      
      <form onSubmit={handleSubmit} className={formClassName}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              value={customer.name}
              onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
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
              onChange={(e) => setCustomer(prev => ({ ...prev, email: e.target.value }))}
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
          
          {collectPhone && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={customer.phone || ''}
                onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
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
          )}
          
          {additionalFields.map((field: AdditionalField) => (
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
                  className={inputClassName}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '1rem',
                    minHeight: '80px',
                  }}
                />
              ) : field.type === 'select' && field.options ? (
                <select
                  required={field.required}
                  value={additionalData[field.name] || ''}
                  onChange={(e) => setAdditionalData(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className={inputClassName}
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
                  {field.options.map((opt: AdditionalFieldOption) => (
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
                  className={inputClassName}
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
          {loading ? 'Registering...' : submitText}
        </button>
      </form>
    </div>
  )
}

export default RegistrationForm
