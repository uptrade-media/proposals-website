/**
 * @uptrade/site-kit/forms - Managed Form Component
 * 
 * Fetches form config from Portal API and renders fields with validation
 */

'use client'

import type { ManagedFormProps } from './types'
import { useForm } from './useForm'
import { FormClient } from './FormClient'

// ============================================
// Main Component (Client Component)
// ============================================

export function ManagedForm({
  formId,
  projectId,
  className,
  onSuccess,
  onError,
  children,
}: ManagedFormProps) {
  const {
    form,
    isLoading,
    fetchError,
  } = useForm(formId, {
    projectId,
    onSuccess,
    onError,
  })
  
  if (isLoading) {
    return (
      <div className={className}>
        <p style={{ color: '#6b7280' }}>Loading form...</p>
      </div>
    )
  }
  
  if (fetchError || !form) {
    return (
      <div className={className}>
        <p style={{ color: '#ef4444' }}>
          {fetchError?.message || 'Form not found or inactive.'}
        </p>
      </div>
    )
  }
  
  // Pass to client component for interactivity
  return (
    <FormClient
      config={form}
      className={className}
      onSuccess={onSuccess}
      onError={onError}
      customRender={children}
    />
  )
}

