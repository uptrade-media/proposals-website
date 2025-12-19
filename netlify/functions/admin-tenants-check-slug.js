// netlify/functions/admin-tenants-check-slug.js
// Check if a tenant slug is available
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 
  'portal', 'dashboard', 'app', 'billing', 'support',
  'help', 'docs', 'blog', 'status', 'assets', 'static',
  'public', 'private', 'internal', 'system', 'root',
  'uptrade', 'uptrademedia'
]

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
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
    const { user, contact, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    const isAdmin = contact?.role === 'admin' || isSuperAdmin
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const slug = event.queryStringParameters?.slug

    if (!slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Slug parameter required' })
      }
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          available: false, 
          reason: 'Slug must be lowercase alphanumeric with hyphens only' 
        })
      }
    }

    if (slug.length < 2 || slug.length > 50) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          available: false, 
          reason: 'Slug must be 2-50 characters' 
        })
      }
    }

    // Check reserved slugs
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          available: false, 
          reason: 'This slug is reserved' 
        })
      }
    }

    // Check if slug exists in database
    const { data: existing, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (which is what we want)
      console.error('[CheckSlug] Database error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error' })
      }
    }

    const available = !existing

    // Suggest alternatives if not available
    let suggestions = []
    if (!available) {
      const baseSlug = slug.replace(/-\d+$/, '')
      for (let i = 1; i <= 3; i++) {
        const suggestion = `${baseSlug}-${i}`
        const { data: suggestionExists } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', suggestion)
          .single()
        
        if (!suggestionExists) {
          suggestions.push(suggestion)
          if (suggestions.length >= 3) break
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        available,
        slug,
        suggestions: available ? [] : suggestions
      })
    }

  } catch (error) {
    console.error('[CheckSlug] Exception:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
