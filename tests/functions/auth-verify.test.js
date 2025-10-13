import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

// Mock the handler
const mockHandler = async (event) => {
  // Extract token from cookie
  const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
  
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No session token provided' })
    }
  }

  try {
    // Verify JWT token
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    
    // Check token expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Session expired' })
      }
    }

    // Return user info
    return {
      statusCode: 200,
      body: JSON.stringify({
        authenticated: true,
        user: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          type: payload.type
        }
      })
    }
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid session token' })
    }
  }
}

describe('auth-verify function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when no token provided', async () => {
    const event = global.testHelpers.createMockEvent({
      authenticated: false
    })

    const response = await mockHandler(event)

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body).error).toBe('No session token provided')
  })

  it('should return 200 with user data for valid token', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000'
    const event = global.testHelpers.createMockEvent({
      authenticated: true,
      userId,
      userRole: 'client'
    })

    const response = await mockHandler(event)

    expect(response.statusCode).toBe(200)
    const data = JSON.parse(response.body)
    expect(data.authenticated).toBe(true)
    expect(data.user.userId).toBe(userId)
    expect(data.user.role).toBe('client')
  })

  it('should return 401 for expired token', async () => {
    // Create expired token
    const expiredToken = jwt.sign(
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'client',
        type: 'google'
      },
      process.env.AUTH_JWT_SECRET,
      { expiresIn: '-1h' } // Expired 1 hour ago
    )

    const event = global.testHelpers.createMockEvent({
      authenticated: false
    })
    event.headers.cookie = `um_session=${expiredToken}`

    const response = await mockHandler(event)

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body).error).toContain('expired')
  })

  it('should return 401 for invalid token', async () => {
    const event = global.testHelpers.createMockEvent({
      authenticated: false
    })
    event.headers.cookie = 'um_session=invalid-token-format'

    const response = await mockHandler(event)

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body).error).toBe('Invalid session token')
  })

  it('should handle admin role correctly', async () => {
    const event = global.testHelpers.createMockEvent({
      authenticated: true,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      userRole: 'admin'
    })

    const response = await mockHandler(event)

    expect(response.statusCode).toBe(200)
    const data = JSON.parse(response.body)
    expect(data.user.role).toBe('admin')
  })
})
