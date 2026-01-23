/**
 * @uptrade/site-kit/forms - Forms API Client
 * 
 * Full API client for form management. Allows developers to create, update,
 * and delete forms programmatically. Changes sync to Portal automatically.
 * 
 * @example
 * ```tsx
 * import { formsApi } from '@uptrade/site-kit/forms'
 * 
 * // Create a new form
 * const form = await formsApi.create({
 *   projectId: 'xxx',
 *   slug: 'contact-us',
 *   name: 'Contact Form',
 *   formType: 'prospect',
 *   fields: [
 *     { slug: 'name', label: 'Name', fieldType: 'text', isRequired: true },
 *     { slug: 'email', label: 'Email', fieldType: 'email', isRequired: true },
 *     { slug: 'message', label: 'Message', fieldType: 'textarea' },
 *   ]
 * })
 * 
 * // Update fields
 * await formsApi.update(form.id, {
 *   fields: [...form.fields, { slug: 'phone', label: 'Phone', fieldType: 'phone' }]
 * })
 * ```
 */

// ============================================
// Types
// ============================================

export type FormType = 
  | 'prospect'      // → CRM leads
  | 'contact'       // → Contact form
  | 'support'       // → Support tickets
  | 'feedback'      // → Feedback entries
  | 'newsletter'    // → Email subscribers
  | 'custom'        // → Custom webhook

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multi_select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'datetime'
  | 'url'
  | 'file'
  | 'rating'
  | 'slider'
  | 'hidden'
  | 'heading'
  | 'paragraph'

export type FieldWidth = 'full' | 'half' | 'third' | 'quarter'

export interface FieldOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FieldValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  patternMessage?: string
}

export interface FieldConditional {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'not_empty' | 'greater_than' | 'less_than'
  value?: string | number | boolean
}

export interface FormField {
  id?: string
  slug: string
  label: string
  fieldType: FieldType
  placeholder?: string
  helpText?: string
  defaultValue?: string
  isRequired?: boolean
  validation?: FieldValidation
  options?: FieldOption[]
  conditional?: FieldConditional
  width?: FieldWidth
  sortOrder?: number
  destinationField?: string
  stepId?: string
}

export interface FormStep {
  id?: string
  stepNumber: number
  title?: string
  description?: string
  condition?: FieldConditional
}

export interface Form {
  id: string
  projectId: string
  slug: string
  name: string
  description?: string
  formType: FormType
  successMessage: string
  redirectUrl?: string
  notificationEmails?: string[]
  submitButtonText: string
  layout: 'stacked' | 'inline' | 'grid'
  showProgress: boolean
  enableSaveDraft: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  fields?: FormField[]
  steps?: FormStep[]
}

export interface CreateFormInput {
  projectId: string
  slug: string
  name: string
  description?: string
  formType?: FormType
  successMessage?: string
  redirectUrl?: string
  notificationEmails?: string[]
  submitButtonText?: string
  layout?: 'stacked' | 'inline' | 'grid'
  showProgress?: boolean
  enableSaveDraft?: boolean
  isActive?: boolean
  fields?: FormField[]
  steps?: FormStep[]
}

export interface UpdateFormInput {
  slug?: string
  name?: string
  description?: string
  formType?: FormType
  successMessage?: string
  redirectUrl?: string
  notificationEmails?: string[]
  submitButtonText?: string
  layout?: 'stacked' | 'inline' | 'grid'
  showProgress?: boolean
  enableSaveDraft?: boolean
  isActive?: boolean
  fields?: FormField[]
  steps?: FormStep[]
}

export interface FormsListOptions {
  projectId?: string
  formType?: FormType
  isActive?: boolean
  search?: string
}

// ============================================
// API Client Configuration
// ============================================

interface FormsApiConfig {
  baseUrl: string
  apiKey?: string
  getAuthToken?: () => Promise<string> | string
}

let config: FormsApiConfig | null = null

/**
 * Configure the forms API client
 */
export function configureFormsApi(options: FormsApiConfig) {
  config = options
}

/**
 * Get API config, falling back to SiteKitProvider globals
 */
function getConfig(): FormsApiConfig {
  if (config) return config
  
  // Try to get from window globals (set by SiteKitProvider)
  if (typeof window !== 'undefined') {
    const apiUrl = (window as any).__SITE_KIT_API_URL__
    const apiKey = (window as any).__SITE_KIT_API_KEY__
    
    if (apiUrl && apiKey) {
      return { baseUrl: apiUrl, apiKey }
    }
  }
  
  throw new Error(
    'Forms API not configured. Either wrap your app in SiteKitProvider or call configureFormsApi() first.'
  )
}

// ============================================
// HTTP Helpers
// ============================================

async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any
): Promise<T> {
  const { baseUrl, apiKey, getAuthToken } = getConfig()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  // Use API key for public endpoints, auth token for admin endpoints
  if (apiKey) {
    headers['x-api-key'] = apiKey
  } else if (getAuthToken) {
    const token = await getAuthToken()
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API error: ${response.status}`)
  }
  
  if (response.status === 204) {
    return undefined as T
  }
  
  return response.json()
}

// ============================================
// Forms API
// ============================================

export const formsApi = {
  /**
   * List all forms for a project
   */
  async list(options: FormsListOptions = {}): Promise<Form[]> {
    const params = new URLSearchParams()
    if (options.projectId) params.set('projectId', options.projectId)
    if (options.formType) params.set('formType', options.formType)
    if (options.isActive !== undefined) params.set('isActive', String(options.isActive))
    if (options.search) params.set('search', options.search)
    
    const query = params.toString()
    const result = await apiRequest<{ data: Form[] }>('GET', `/forms${query ? `?${query}` : ''}`)
    return result.data
  },
  
  /**
   * Get a single form by ID or slug
   */
  async get(idOrSlug: string): Promise<Form> {
    return apiRequest<Form>('GET', `/forms/${idOrSlug}`)
  },
  
  /**
   * Create a new form
   */
  async create(input: CreateFormInput): Promise<Form> {
    return apiRequest<Form>('POST', '/forms', input)
  },
  
  /**
   * Update an existing form
   */
  async update(id: string, input: UpdateFormInput): Promise<Form> {
    return apiRequest<Form>('PUT', `/forms/${id}`, input)
  },
  
  /**
   * Delete a form
   */
  async delete(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/forms/${id}`)
  },
  
  /**
   * Add a field to an existing form
   */
  async addField(formId: string, field: FormField): Promise<Form> {
    const form = await formsApi.get(formId)
    const maxSortOrder = Math.max(0, ...(form.fields || []).map(f => f.sortOrder || 0))
    
    return formsApi.update(formId, {
      fields: [
        ...(form.fields || []),
        { ...field, sortOrder: field.sortOrder ?? maxSortOrder + 1 }
      ]
    })
  },
  
  /**
   * Update a field in an existing form
   */
  async updateField(formId: string, fieldSlug: string, updates: Partial<FormField>): Promise<Form> {
    const form = await formsApi.get(formId)
    
    return formsApi.update(formId, {
      fields: (form.fields || []).map(f => 
        f.slug === fieldSlug ? { ...f, ...updates } : f
      )
    })
  },
  
  /**
   * Remove a field from a form
   */
  async removeField(formId: string, fieldSlug: string): Promise<Form> {
    const form = await formsApi.get(formId)
    
    return formsApi.update(formId, {
      fields: (form.fields || []).filter(f => f.slug !== fieldSlug)
    })
  },
  
  /**
   * Reorder fields in a form
   */
  async reorderFields(formId: string, fieldSlugs: string[]): Promise<Form> {
    const form = await formsApi.get(formId)
    const fieldsMap = new Map((form.fields || []).map(f => [f.slug, f]))
    
    const orderedFields = fieldSlugs.map((slug, index) => {
      const field = fieldsMap.get(slug)
      if (!field) throw new Error(`Field not found: ${slug}`)
      return { ...field, sortOrder: index }
    })
    
    return formsApi.update(formId, { fields: orderedFields })
  },
  
  /**
   * Clone a form
   */
  async clone(formId: string, newSlug: string, newName?: string): Promise<Form> {
    const form = await formsApi.get(formId)
    
    return formsApi.create({
      projectId: form.projectId,
      slug: newSlug,
      name: newName || `${form.name} (Copy)`,
      description: form.description,
      formType: form.formType,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl,
      notificationEmails: form.notificationEmails,
      submitButtonText: form.submitButtonText,
      layout: form.layout,
      showProgress: form.showProgress,
      enableSaveDraft: form.enableSaveDraft,
      isActive: false, // Clone as inactive
      fields: (form.fields || []).map(({ id, ...field }) => field), // Remove IDs
      steps: (form.steps || []).map(({ id, ...step }) => step), // Remove IDs
    })
  },
  
  /**
   * Activate or deactivate a form
   */
  async setActive(formId: string, isActive: boolean): Promise<Form> {
    return formsApi.update(formId, { isActive })
  },

  /**
   * Sync a form definition to the backend
   * Creates the form if it doesn't exist, updates if it does
   * Perfect for defining forms in code during development
   * 
   * @example
   * ```tsx
   * // In your app initialization or form component
   * await formsApi.sync({
   *   slug: 'contact',
   *   name: 'Contact Form',
   *   formType: 'prospect',
   *   fields: [
   *     field.text('name', 'Your Name', { isRequired: true }),
   *     field.email('email', 'Email Address'),
   *     field.phone('phone', 'Phone Number'),
   *     field.textarea('message', 'Message'),
   *   ]
   * })
   * ```
   */
  async sync(input: Omit<CreateFormInput, 'projectId'>): Promise<Form & { synced: boolean; created: boolean; updated: boolean }> {
    return apiRequest<Form & { synced: boolean; created: boolean; updated: boolean }>(
      'POST',
      '/api/public/forms/sync',
      input
    )
  },

  /**
   * Sync multiple forms at once
   * Useful for initializing all forms in your app
   */
  async syncAll(forms: Array<Omit<CreateFormInput, 'projectId'>>): Promise<Array<Form & { synced: boolean; created: boolean; updated: boolean }>> {
    return Promise.all(forms.map(form => formsApi.sync(form)))
  },
}

// ============================================
// Field Builder Helpers
// ============================================

/**
 * Helper functions to build field definitions
 */
export const field = {
  text: (slug: string, label: string, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'text',
    ...options,
  }),
  
  email: (slug: string, label: string, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'email',
    isRequired: true,
    ...options,
  }),
  
  phone: (slug: string, label: string, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'phone',
    ...options,
  }),
  
  textarea: (slug: string, label: string, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'textarea',
    ...options,
  }),
  
  select: (slug: string, label: string, choices: Array<{ value: string; label: string }>, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'select',
    options: choices,
    ...options,
  }),
  
  radio: (slug: string, label: string, choices: Array<{ value: string; label: string }>, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'radio',
    options: choices,
    ...options,
  }),
  
  checkbox: (slug: string, label: string, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'checkbox',
    ...options,
  }),
  
  date: (slug: string, label: string, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'date',
    ...options,
  }),
  
  number: (slug: string, label: string, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'number',
    ...options,
  }),
  
  rating: (slug: string, label: string, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'rating',
    ...options,
  }),
  
  file: (slug: string, label: string, options?: Partial<FormField>): FormField => ({
    slug,
    label,
    fieldType: 'file',
    ...options,
  }),
  
  hidden: (slug: string, defaultValue: string): FormField => ({
    slug,
    label: '',
    fieldType: 'hidden',
    defaultValue,
  }),
  
  heading: (slug: string, label: string): FormField => ({
    slug,
    label,
    fieldType: 'heading',
  }),
  
  paragraph: (slug: string, label: string): FormField => ({
    slug,
    label,
    fieldType: 'paragraph',
  }),
}

// ============================================
// Form Definition Helper
// ============================================

export interface FormDefinition extends Omit<CreateFormInput, 'projectId'> {
  slug: string
  name: string
  fields: FormField[]
}

/**
 * Define a form declaratively
 * Returns a form definition that can be synced to the backend
 * 
 * @example
 * ```tsx
 * // forms/contact.ts
 * import { defineForm, field } from '@uptrade/site-kit/forms'
 * 
 * export const contactForm = defineForm({
 *   slug: 'contact',
 *   name: 'Contact Us',
 *   formType: 'prospect',
 *   successMessage: 'Thanks! We\'ll be in touch soon.',
 *   fields: [
 *     field.text('name', 'Your Name', { isRequired: true }),
 *     field.email('email', 'Email Address'),
 *     field.phone('phone', 'Phone Number'),
 *     field.select('service', 'Service Needed', [
 *       { value: 'consultation', label: 'Free Consultation' },
 *       { value: 'representation', label: 'Legal Representation' },
 *     ]),
 *     field.textarea('message', 'Tell us about your case'),
 *   ]
 * })
 * 
 * // Then in your app:
 * await formsApi.sync(contactForm)
 * ```
 */
export function defineForm(definition: FormDefinition): FormDefinition {
  // Ensure fields have sort order
  const fieldsWithOrder = definition.fields.map((f, index) => ({
    ...f,
    sortOrder: f.sortOrder ?? index,
  }))
  
  return {
    ...definition,
    fields: fieldsWithOrder,
    formType: definition.formType || 'contact',
    successMessage: definition.successMessage || 'Thank you for your submission!',
    submitButtonText: definition.submitButtonText || 'Submit',
    layout: definition.layout || 'stacked',
    isActive: definition.isActive ?? true,
  }
}

/**
 * Initialize multiple forms and sync them to the backend
 * Call this once during app initialization (e.g., in layout.tsx or _app.tsx)
 * 
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { initializeForms } from '@uptrade/site-kit/forms'
 * import { contactForm } from './forms/contact'
 * import { consultationForm } from './forms/consultation'
 * 
 * // Initialize forms (runs once per build/server start in dev)
 * if (process.env.NODE_ENV === 'development') {
 *   initializeForms([contactForm, consultationForm])
 * }
 * ```
 */
export async function initializeForms(forms: FormDefinition[]): Promise<void> {
  if (typeof window === 'undefined') {
    // Server-side: log that forms need to be synced
    console.log(`[Site-Kit] ${forms.length} form(s) ready to sync: ${forms.map(f => f.slug).join(', ')}`)
    return
  }
  
  try {
    const results = await formsApi.syncAll(forms)
    const created = results.filter(r => r.created).length
    const updated = results.filter(r => r.updated).length
    console.log(`[Site-Kit] Forms synced: ${created} created, ${updated} updated`)
  } catch (error) {
    console.error('[Site-Kit] Failed to sync forms:', error)
  }
}
