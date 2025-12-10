/**
 * Portfolio Publish Function
 * 
 * Publishes a draft portfolio item and captures trifolio screenshot
 */

import { publishPortfolioItem, uploadPortfolioImage } from '../../src/lib/portfolio-admin.js'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    
    if (!screenshotData.success || !screenshotData.image) {
      throw new Error('Invalid response from screenshot API')
    }

    console.log(`[Portfolio API] Screenshot received: ${screenshotData.width}x${screenshotData.height}`)

    // Convert base64 to buffer and upload
    const buffer = Buffer.from(screenshotData.image, 'base64')
    const filename = `${slug}.jpg`
    const imageData = await uploadPortfolioImage(buffer, filename, 'design')

    // Update portfolio item with hero image
    await supabase
      .from('portfolio_items')
      .update({
        hero_image: imageData.publicUrl,
        hero_image_width: screenshotData.width,
        hero_image_height: screenshotData.height
      })
      .eq('id', portfolioId)

    console.log('[Portfolio API] Screenshot saved:', imageData.publicUrl)
  } catch (error) {
    console.error('[Portfolio API] Screenshot failed:', error.message)
  }
}
