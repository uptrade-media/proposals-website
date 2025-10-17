// netlify/functions/upload-image.js
import jwt from 'jsonwebtoken'

// For Cloudinary - alternative: use formidable or busboy to parse multipart
// This function accepts base64 images or uses Cloudinary's upload widget
export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
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

    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET)

    // Verify admin role
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const { imageUrl, alt, folder } = JSON.parse(event.body || '{}')

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing image URL' })
      }
    }

    // In production, you could upload to Cloudinary here
    // For now, we accept URLs directly (e.g., from Cloudinary's upload widget)
    // This allows flexibility - clients can use their own upload widget

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: imageUrl,
        alt: alt || 'Blog image',
        folder: folder || 'blog'
      })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Upload failed',
        details: error.message
      })
    }
  }
}
