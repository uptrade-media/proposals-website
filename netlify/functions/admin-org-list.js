// netlify/functions/admin-org-list.js
// List all organizations for admin use (e.g., invoice creation)
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

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
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only admins can list all organizations
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch all organizations
    const { data: organizations, error: queryError } = await supabase
      .from('organizations')
      .select('id, name, slug, domain, org_type, status, created_at')
      .order('name')

    if (queryError) {
      console.error('[admin-org-list] Database error:', queryError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch organizations' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        organizations: organizations || []
      })
    }
  } catch (error) {
    console.error('[admin-org-list] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
