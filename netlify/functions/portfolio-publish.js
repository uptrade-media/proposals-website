/**
 * Portfolio Publish Function
 * 
 * Publishes a draft portfolio item
 */

import { publishPortfolioItem } from '../../src/lib/portfolio-admin.js'
import jwt from 'jsonwebtoken'

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // 1. Verify authentication
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const user = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    
    // 2. Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin privileges required' })
      }
    }

    // 3. Parse request body
    const { portfolioId } = JSON.parse(event.body)

    if (!portfolioId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing portfolioId' })
      }
    }

    // 4. Publish portfolio item
    console.log('[Portfolio API] Publishing portfolio item:', portfolioId)
    const publishedItem = await publishPortfolioItem(portfolioId)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: publishedItem,
        message: 'Portfolio item published successfully'
      })
    }

  } catch (error) {
    console.error('[Portfolio API] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        message: 'Failed to publish portfolio item'
      })
    }
  }
}
