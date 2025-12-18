/**
 * SEO Site Revalidate
 * 
 * Triggers revalidation on the main site when SEO changes are made in the portal.
 * Called automatically after:
 * - Metadata updates (title, description, etc.)
 * - Schema changes
 * - Bulk optimizations
 * - AI recommendations applied
 * 
 * POST /api/seo-site-revalidate
 * Body: { paths: ['/path1/', '/path2/'] } or { revalidateAll: true }
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

// Site configurations for revalidation
const SITE_CONFIGS = {
  'uptrademedia.com': {
    revalidateUrl: 'https://uptrademedia.com/api/seo-revalidate',
    secretEnvVar: 'MAIN_SITE_REVALIDATION_SECRET'
  }
  // Add more sites here as needed
}

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify authentication
  const { contact, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    const { domain, paths, revalidateAll, tag } = JSON.parse(event.body || '{}')
    
    // Default to uptrademedia.com
    const targetDomain = domain || 'uptrademedia.com'
    const siteConfig = SITE_CONFIGS[targetDomain]
    
    if (!siteConfig) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: `Unknown domain: ${targetDomain}` }) 
      }
    }

    // Get the revalidation secret for this site
    const secret = process.env[siteConfig.secretEnvVar]
    if (!secret) {
      console.error(`[SEO Revalidate] Missing secret: ${siteConfig.secretEnvVar}`)
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Revalidation not configured for this site' }) 
      }
    }

    // Build the request payload
    const payload = { secret }
    if (revalidateAll) {
      payload.revalidateAll = true
    } else if (paths && paths.length > 0) {
      payload.paths = paths
    } else if (tag) {
      payload.tag = tag
    } else {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Must specify paths, revalidateAll, or tag' }) 
      }
    }

    // Call the main site's revalidation endpoint
    console.log(`[SEO Revalidate] Triggering revalidation on ${targetDomain}:`, 
      revalidateAll ? 'all pages' : `${paths?.length || 0} paths`)

    const response = await fetch(siteConfig.revalidateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[SEO Revalidate] Failed:`, response.status, errorText)
      return { 
        statusCode: response.status, 
        body: JSON.stringify({ 
          error: 'Revalidation request failed',
          details: errorText
        }) 
      }
    }

    const result = await response.json()

    // Log the revalidation activity
    const supabase = createSupabaseAdmin()
    await supabase.from('seo_activity_log').insert({
      site_id: null, // Could look up site_id if needed
      action: 'site_revalidation',
      details: {
        domain: targetDomain,
        paths: paths || (revalidateAll ? ['all'] : []),
        revalidated: result.revalidated,
        triggeredBy: contact.email
      },
      created_at: new Date().toISOString()
    }).catch(err => console.warn('[SEO Revalidate] Failed to log activity:', err))

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        domain: targetDomain,
        revalidated: result.revalidated,
        timestamp: result.timestamp
      })
    }

  } catch (error) {
    console.error('[SEO Revalidate] Error:', error)
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    }
  }
}
