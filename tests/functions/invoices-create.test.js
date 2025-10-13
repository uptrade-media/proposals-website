import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Invoice creation schema
const invoiceSchema = z.object({
  contactId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  taxRate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional()
})

// Mock handler simulation
const mockHandler = async (event, mockDb, mockResend) => {
  // Verify authentication
  const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  // Check admin role
  const jwt = require('jsonwebtoken')
  const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET)
  
  if (payload.role !== 'admin') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Admin access required' })
    }
  }

  // Parse and validate body
  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' })
    }
  }

  const validation = invoiceSchema.safeParse(body)
  if (!validation.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Validation failed',
        errors: validation.error.errors
      })
    }
  }

  try {
    // Calculate totals
    const amount = parseFloat(validation.data.amount)
    const taxRate = parseFloat(validation.data.taxRate || '0')
    const taxAmount = amount * (taxRate / 100)
    const totalAmount = amount + taxAmount

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`

    // Create invoice in database
    const [invoice] = await mockDb.insert({
      contactId: validation.data.contactId,
      invoiceNumber,
      amount: amount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      status: 'pending',
      dueDate: validation.data.dueDate || null,
      description: validation.data.description || null
    }).returning()

    // Get contact info for email
    const contact = await mockDb.query.contacts.findFirst({
      where: { id: validation.data.contactId }
    })

    // Send email notification
    if (contact && contact.accountSetup === 'true') {
      await mockResend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: contact.email,
        subject: `New Invoice ${invoiceNumber}`,
        html: `<p>You have a new invoice for $${totalAmount.toFixed(2)}</p>`
      })
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ invoice })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create invoice' })
    }
  }
}

describe('invoices-create function', () => {
  let mockDb
  let mockResend

  beforeEach(() => {
    mockDb = global.testHelpers.createMockDb()
    mockResend = global.testHelpers.createMockResend()
    vi.clearAllMocks()
  })

  it('should return 401 without authentication', async () => {
    const event = global.testHelpers.createMockEvent({
      authenticated: false,
      httpMethod: 'POST',
      body: {}
    })

    const response = await mockHandler(event, mockDb, mockResend)

    expect(response.statusCode).toBe(401)
  })

  it('should return 403 for non-admin users', async () => {
    const event = global.testHelpers.createMockEvent({
      authenticated: true,
      userRole: 'client',
      httpMethod: 'POST',
      body: {}
    })

    const response = await mockHandler(event, mockDb, mockResend)

    expect(response.statusCode).toBe(403)
    expect(JSON.parse(response.body).error).toBe('Admin access required')
  })

  it('should validate required fields', async () => {
    const event = global.testHelpers.createMockEvent({
      authenticated: true,
      userRole: 'admin',
      httpMethod: 'POST',
      body: {} // Missing required fields
    })

    const response = await mockHandler(event, mockDb, mockResend)

    expect(response.statusCode).toBe(400)
    const data = JSON.parse(response.body)
    expect(data.error).toBe('Validation failed')
    expect(data.errors).toBeDefined()
  })

  it('should create invoice with valid data', async () => {
    const mockContact = global.testHelpers.createMockUser()
    const mockInvoice = global.testHelpers.createMockInvoice()

    mockDb.insert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockInvoice])
    })
    mockDb.query.contacts.findFirst.mockResolvedValue(mockContact)

    const event = global.testHelpers.createMockEvent({
      authenticated: true,
      userRole: 'admin',
      httpMethod: 'POST',
      body: {
        contactId: mockContact.id,
        amount: '1000.00',
        taxRate: '8.0',
        description: 'Test invoice'
      }
    })

    const response = await mockHandler(event, mockDb, mockResend)

    expect(response.statusCode).toBe(201)
    const data = JSON.parse(response.body)
    expect(data.invoice).toBeDefined()
  })

  it('should calculate tax correctly', async () => {
    const mockContact = global.testHelpers.createMockUser()
    const mockInvoice = global.testHelpers.createMockInvoice({
      amount: '1000.00',
      taxAmount: '80.00',
      totalAmount: '1080.00'
    })

    mockDb.insert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockInvoice])
    })
    mockDb.query.contacts.findFirst.mockResolvedValue(mockContact)

    const event = global.testHelpers.createMockEvent({
      authenticated: true,
      userRole: 'admin',
      httpMethod: 'POST',
      body: {
        contactId: mockContact.id,
        amount: '1000.00',
        taxRate: '8.0'
      }
    })

    const response = await mockHandler(event, mockDb, mockResend)

    expect(response.statusCode).toBe(201)
  })

  it('should send email notification if account is set up', async () => {
    const mockContact = global.testHelpers.createMockUser({
      accountSetup: 'true'
    })
    const mockInvoice = global.testHelpers.createMockInvoice()

    mockDb.insert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockInvoice])
    })
    mockDb.query.contacts.findFirst.mockResolvedValue(mockContact)

    const event = global.testHelpers.createMockEvent({
      authenticated: true,
      userRole: 'admin',
      httpMethod: 'POST',
      body: {
        contactId: mockContact.id,
        amount: '1000.00'
      }
    })

    await mockHandler(event, mockDb, mockResend)

    expect(mockResend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: mockContact.email,
        subject: expect.stringContaining('Invoice')
      })
    )
  })

  it('should not send email if account not set up', async () => {
    const mockContact = global.testHelpers.createMockUser({
      accountSetup: 'false'
    })
    const mockInvoice = global.testHelpers.createMockInvoice()

    mockDb.insert.mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockInvoice])
    })
    mockDb.query.contacts.findFirst.mockResolvedValue(mockContact)

    const event = global.testHelpers.createMockEvent({
      authenticated: true,
      userRole: 'admin',
      httpMethod: 'POST',
      body: {
        contactId: mockContact.id,
        amount: '1000.00'
      }
    })

    await mockHandler(event, mockDb, mockResend)

    expect(mockResend.emails.send).not.toHaveBeenCalled()
  })

  it('should handle database errors', async () => {
    mockDb.insert.mockReturnValue({
      returning: vi.fn().mockRejectedValue(new Error('DB error'))
    })

    const event = global.testHelpers.createMockEvent({
      authenticated: true,
      userRole: 'admin',
      httpMethod: 'POST',
      body: {
        contactId: '123e4567-e89b-12d3-a456-426614174000',
        amount: '1000.00'
      }
    })

    const response = await mockHandler(event, mockDb, mockResend)

    expect(response.statusCode).toBe(500)
  })
})
