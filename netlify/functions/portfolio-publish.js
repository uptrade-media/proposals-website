/**
 * Portfolio Publish Function
 * 
 * Publishes a draft portfolio item and triggers trifolio screenshot capture
 */

import { publishPortfolioItem } from '../../src/lib/portfolio-admin.js'
import { getAuthenticatedUser } from './utils/supabase.js'

// Hardcoded screenshot API URL (internal API, no auth needed)
const SCREENSHOT_API_URL = 'https://uptrademedia.com/api/screenshot/trifolio'

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // 1. Verify authentication using Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }
    
    // 2. Check admin role
    if (contact.role !== 'admin') {
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

    // 5. Capture trifolio screenshot in background (don't await)
    captureAndUpdateScreenshot(publishedItem.id, publishedItem.slug).catch(err => {
      console.error('[Portfolio API] Screenshot capture failed:', err.message)
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: publishedItem,
        message: 'Portfolio item published successfully. Screenshot capture started.'
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

/**
 * Capture trifolio screenshot and update hero image
 * Runs in background after publish
 */
async function captureAndUpdateScreenshot(portfolioId, slug) {
  try {
    console.log(`[Portfolio API] Capturing screenshot for: ${slug}`)
    
    // Wait for CDN/edge cache to clear so trifolio page has latest data
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Call the main site screenshot API (no auth needed - internal use)
    const response = await fetch(SCREENSHOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Screenshot API returned ${response.status}`)
    }

    const screenshotData = await response.json()
    
    if (!screenshotData.success || !screenshotData.imageUrl) {
      throw new Error('Invalid response from screenshot API')
    }

    // The main site API already:
    // 1. Uploads screenshot to Supabase Storage
    // 2. Updates hero_image in the database
    // No additional action needed here

    console.log(`[Portfolio API] Screenshot captured: ${screenshotData.width}x${screenshotData.height}`)
    console.log('[Portfolio API] Hero image updated:', screenshotData.imageUrl)
  } catch (error) {
    console.error('[Portfolio API] Screenshot failed:', error.message)
  }
}
