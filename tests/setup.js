import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.AUTH_JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.SESSION_COOKIE_NAME = 'um_session'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.RESEND_API_KEY = 'test-resend-api-key'
process.env.RESEND_FROM_EMAIL = 'test@uptrademedia.com'
process.env.ADMIN_EMAIL = 'admin@uptrademedia.com'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock authenticated event for Netlify Functions
 */
export function createMockEvent(options = {}) {
  const {
    httpMethod = 'GET',
    path = '/',
    body = null,
    headers = {},
    queryStringParameters = {},
    pathParameters = {},
    authenticated = false,
    userId = '123e4567-e89b-12d3-a456-426614174000',
    userRole = 'client'
  } = options

  const event = {
    httpMethod,
    path,
    body: body ? JSON.stringify(body) : null,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    queryStringParameters,
    pathParameters,
    isBase64Encoded: false
  }

  // Add authentication cookie if needed
  if (authenticated) {
    const jwt = require('jsonwebtoken')
    const token = jwt.sign(
      { userId, role: userRole, type: 'google' },
      process.env.AUTH_JWT_SECRET,
      { expiresIn: '7d' }
    )
    event.headers.cookie = `${process.env.SESSION_COOKIE_NAME}=${token}`
  }

  return event
}

/**
 * Create a mock context for Netlify Functions
 */
export function createMockContext() {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:test',
    memoryLimitInMB: 1024,
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test',
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn()
  }
}

/**
 * Mock database client for testing
 */
export function createMockDb() {
  return {
    query: {
      contacts: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      projects: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      proposals: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      files: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      messages: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      invoices: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      }
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{}])
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}])
        })
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({})
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([])
    })
  }
}

/**
 * Mock Resend email client
 */
export function createMockResend() {
  return {
    emails: {
      send: vi.fn().mockResolvedValue({
        id: 'test-email-id',
        from: process.env.RESEND_FROM_EMAIL,
        to: 'test@example.com',
        created_at: new Date().toISOString()
      })
    }
  }
}

/**
 * Mock Netlify Blobs store
 */
export function createMockBlobStore() {
  const store = new Map()
  
  return {
    set: vi.fn(async (key, value) => {
      store.set(key, value)
      return { key }
    }),
    get: vi.fn(async (key) => {
      return store.get(key)
    }),
    delete: vi.fn(async (key) => {
      return store.delete(key)
    }),
    list: vi.fn(async () => {
      return {
        blobs: Array.from(store.keys()).map(key => ({
          key,
          size: Buffer.from(store.get(key) || '').length
        }))
      }
    })
  }
}

/**
 * Mock axios for API testing
 */
export function createMockAxios() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() }
    }
  }
}

/**
 * Wait for async operations to complete
 */
export function waitFor(callback, options = {}) {
  const { timeout = 1000, interval = 50 } = options
  const startTime = Date.now()

  return new Promise((resolve, reject) => {
    const check = () => {
      try {
        const result = callback()
        resolve(result)
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(new Error('Timeout waiting for condition'))
        } else {
          setTimeout(check, interval)
        }
      }
    }
    check()
  })
}

/**
 * Create mock user data
 */
export function createMockUser(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    company: 'Test Company',
    role: 'client',
    accountSetup: 'true',
    googleId: null,
    avatar: null,
    password: null,
    createdAt: new Date('2025-01-01'),
    ...overrides
  }
}

/**
 * Create mock project data
 */
export function createMockProject(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174001',
    contactId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Project',
    description: 'Test project description',
    status: 'active',
    budget: '5000.00',
    spent: '1000.00',
    startDate: new Date('2025-01-01'),
    endDate: null,
    createdAt: new Date('2025-01-01'),
    ...overrides
  }
}

/**
 * Create mock invoice data
 */
export function createMockInvoice(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174002',
    contactId: '123e4567-e89b-12d3-a456-426614174000',
    invoiceNumber: 'INV-001',
    amount: '1000.00',
    taxAmount: '80.00',
    totalAmount: '1080.00',
    status: 'pending',
    dueDate: new Date('2025-02-01'),
    paidAt: null,
    squareInvoiceId: null,
    createdAt: new Date('2025-01-01'),
    ...overrides
  }
}

// Global test utilities
global.testHelpers = {
  createMockEvent,
  createMockContext,
  createMockDb,
  createMockResend,
  createMockBlobStore,
  createMockAxios,
  createMockUser,
  createMockProject,
  createMockInvoice,
  waitFor
}
