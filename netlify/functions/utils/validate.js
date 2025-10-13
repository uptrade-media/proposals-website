/**
 * Request Validation Utility using Zod
 * 
 * Provides schema validation for all function inputs with:
 * - Type safety
 * - Clear error messages
 * - Automatic sanitization
 * - Reusable schemas
 * 
 * Usage:
 * ```javascript
 * import { validate, schemas } from './utils/validate.js'
 * 
 * export async function handler(event) {
 *   const body = JSON.parse(event.body || '{}')
 *   
 *   const validation = validate(schemas.projectCreate, body)
 *   if (!validation.success) {
 *     return {
 *       statusCode: 400,
 *       body: JSON.stringify({ errors: validation.errors })
 *     }
 *   }
 *   
 *   const { data } = validation
 *   // ... use validated data
 * }
 * ```
 */

import { z } from 'zod'

/**
 * Common validation schemas
 */

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format')

// Email validation
export const emailSchema = z.string().email('Invalid email address')

// Password validation (min 8 chars)
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')

// Date string validation
export const dateSchema = z.string().datetime('Invalid date format')

// Money amount validation (e.g., "123.45")
export const moneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')

// Status enum
export const projectStatusSchema = z.enum(['planning', 'active', 'on-hold', 'completed'], {
  errorMap: () => ({ message: 'Status must be planning, active, on-hold, or completed' })
})

export const proposalStatusSchema = z.enum(['draft', 'sent', 'viewed', 'accepted', 'declined'], {
  errorMap: () => ({ message: 'Status must be draft, sent, viewed, accepted, or declined' })
})

export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'], {
  errorMap: () => ({ message: 'Status must be draft, sent, paid, overdue, or cancelled' })
})

/**
 * Feature-specific validation schemas
 */
export const schemas = {
  // Projects
  projectCreate: z.object({
    contactId: uuidSchema,
    name: z.string().min(1).max(200, 'Name must be 200 characters or less'),
    description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
    status: projectStatusSchema.optional().default('planning'),
    budget: moneySchema.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional()
  }).refine(data => {
    // Ensure end date is after start date
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate)
    }
    return true
  }, {
    message: 'End date must be after start date',
    path: ['endDate']
  }),

  projectUpdate: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    status: projectStatusSchema.optional(),
    budget: moneySchema.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional()
  }),

  // Proposals
  proposalCreate: z.object({
    contactId: uuidSchema,
    title: z.string().min(1).max(200),
    status: proposalStatusSchema.optional().default('draft'),
    totalAmount: moneySchema,
    validUntil: dateSchema.optional(),
    content: z.object({}).passthrough(), // JSONB content
    lineItems: z.array(z.object({
      description: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: moneySchema,
      total: moneySchema
    })).optional()
  }),

  proposalUpdate: z.object({
    title: z.string().min(1).max(200).optional(),
    status: proposalStatusSchema.optional(),
    totalAmount: moneySchema.optional(),
    validUntil: dateSchema.optional(),
    content: z.object({}).passthrough().optional()
  }),

  // Files
  fileUpload: z.object({
    contactId: uuidSchema,
    projectId: uuidSchema.optional(),
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    size: z.number().int().positive().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
    category: z.enum(['audit', 'proposal', 'project', 'message', 'invoice']),
    base64Data: z.string().min(1, 'File data is required')
  }),

  // Messages
  messageSend: z.object({
    contactId: uuidSchema,
    threadId: uuidSchema.optional(),
    content: z.string().min(1).max(10000, 'Message must be 10000 characters or less'),
    attachments: z.array(uuidSchema).optional()
  }),

  // Invoices
  invoiceCreate: z.object({
    contactId: uuidSchema,
    projectId: uuidSchema.optional(),
    amount: moneySchema,
    taxRate: moneySchema.optional(),
    dueDate: dateSchema.optional(),
    description: z.string().max(2000).optional(),
    lineItems: z.array(z.object({
      description: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: moneySchema,
      total: moneySchema
    })).optional()
  }),

  invoiceUpdate: z.object({
    status: invoiceStatusSchema.optional(),
    amount: moneySchema.optional(),
    taxRate: moneySchema.optional(),
    dueDate: dateSchema.optional(),
    description: z.string().max(2000).optional()
  }),

  // Admin - Client management
  clientCreate: z.object({
    email: emailSchema,
    name: z.string().min(1).max(200),
    company: z.string().max(200).optional(),
    role: z.enum(['client', 'admin']).optional().default('client')
  }),

  clientUpdate: z.object({
    name: z.string().min(1).max(200).optional(),
    company: z.string().max(200).optional(),
    role: z.enum(['client', 'admin']).optional()
  }),

  // Authentication
  authLogin: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required')
  }),

  authSignup: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: z.string().min(1).max(200),
    company: z.string().max(200).optional()
  }),

  authPasswordReset: z.object({
    token: z.string().min(1),
    newPassword: passwordSchema
  }),

  authAccountSetup: z.object({
    token: z.string().min(1),
    password: passwordSchema.optional(),
    googleCredential: z.string().optional(),
    method: z.enum(['password', 'google'])
  }).refine(data => {
    // Ensure password is provided if method is password
    if (data.method === 'password' && !data.password) {
      return false
    }
    // Ensure googleCredential is provided if method is google
    if (data.method === 'google' && !data.googleCredential) {
      return false
    }
    return true
  }, {
    message: 'Required field missing for selected method'
  }),

  // Contact support
  contactSupport: z.object({
    email: emailSchema,
    message: z.string().min(1).max(5000, 'Message must be 5000 characters or less')
  }),

  // Pagination params
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).optional().default('50')
  })
}

/**
 * Validate data against a schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {object} { success: boolean, data?: any, errors?: array }
 */
export function validate(schema, data) {
  try {
    const validated = schema.parse(data)
    return { 
      success: true, 
      data: validated 
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
    
    // Unexpected error
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: error.message || 'Validation failed'
      }]
    }
  }
}

/**
 * Validate data and throw error if invalid
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {any} Validated data
 * @throws {Error} If validation fails
 */
export function validateOrThrow(schema, data) {
  const result = validate(schema, data)
  
  if (!result.success) {
    const error = new Error('Validation failed')
    error.statusCode = 400
    error.errors = result.errors
    throw error
  }
  
  return result.data
}

/**
 * Create a validation response for invalid data
 * @param {array} errors - Validation errors
 * @returns {object} Netlify function response
 */
export function validationErrorResponse(errors) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: 'Validation failed',
      errors: errors
    })
  }
}

/**
 * Wrapper to automatically validate request body
 * @param {z.ZodSchema} schema - Schema to validate
 * @param {Function} handler - Handler function that receives validated data
 */
export function withValidation(schema, handler) {
  return async (event, context) => {
    // Parse body
    let body
    try {
      body = JSON.parse(event.body || '{}')
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      }
    }

    // Validate
    const validation = validate(schema, body)
    if (!validation.success) {
      return validationErrorResponse(validation.errors)
    }

    // Call handler with validated data
    return handler(event, context, validation.data)
  }
}
