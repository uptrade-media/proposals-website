import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET

export async function handler(event) {
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    jwt.verify(token, JWT_SECRET)

    // Return predefined file categories
    const categories = [
      { id: 'contract', label: 'Contracts', description: 'Legal documents and agreements' },
      { id: 'invoice', label: 'Invoices', description: 'Billing and payment documents' },
      { id: 'design', label: 'Design Files', description: 'Mockups, wireframes, and assets' },
      { id: 'content', label: 'Content', description: 'Copy, images, and media files' },
      { id: 'report', label: 'Reports', description: 'Analytics and performance reports' },
      { id: 'other', label: 'Other', description: 'Miscellaneous files' }
    ]

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        categories
      })
    }
  } catch (error) {
    console.error('File categories error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch file categories',
        details: error.message
      })
    }
  }
}
