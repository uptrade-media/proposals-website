// netlify/functions/seo-sites-list.js
// List SEO sites for an organization
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const supabase = createSupabaseAdmin()
    const { contactId } = event.queryStringParameters || {}
    
    // Get org_id from header (set by axios interceptor from auth store)
    const orgId = event.headers['x-organization-id'] || event.headers['X-Organization-Id']

    // Admin can view any contact's sites, clients can only view their own
    const isAdmin = contact.role === 'admin' || contact.role === 'super_admin'

    let query = supabase
      .from('seo_sites')
      .select(`
        *,
        contact:contacts!seo_sites_contact_id_fkey(id, name, email, company)
      `)
      .order('created_at', { ascending: false })

    // Filter by organization if provided
    if (orgId) {
      query = query.eq('org_id', orgId)
    }
    
    // If not admin, only show their own sites
    if (!isAdmin) {
      query = query.eq('contact_id', contact.id)
    } else if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    const { data: sites, error } = await query

    if (error) {
      console.error('[seo-sites-list] Error:', error)
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Return sites in snake_case format (matching database columns)
    // Frontend components expect this format
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sites })
    }
  } catch (err) {
    console.error('[seo-sites-list] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
