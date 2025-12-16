// netlify/functions/admin-tenants-list.js
// List all organizations (tenants) - super admin only
import { createSupabasePublic, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // Verify authentication
  const { user, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  // Only super admins can manage tenants
  if (!isSuperAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Super admin access required' })
    }
  }

  try {
    const supabase = createSupabasePublic()

    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || {})
    const search = params.get('search') || ''
    const status = params.get('status') // 'active', 'suspended', 'cancelled'

    // Build query
    let query = supabase
      .from('organizations')
      .select(`
        id,
        slug,
        name,
        domain,
        schema_name,
        features,
        theme,
        plan,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,domain.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: organizations, error } = await query

    if (error) {
      console.error('[AdminTenants] Error fetching organizations:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch organizations' })
      }
    }

    // Get user counts per organization
    const { data: userCounts } = await supabase
      .from('user_organizations')
      .select('organization_id')
    
    const countsByOrg = (userCounts || []).reduce((acc, uo) => {
      acc[uo.organization_id] = (acc[uo.organization_id] || 0) + 1
      return acc
    }, {})

    // Enrich organizations with user counts
    const enrichedOrgs = organizations.map(org => ({
      ...org,
      userCount: countsByOrg[org.id] || 0
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        organizations: enrichedOrgs,
        total: enrichedOrgs.length
      })
    }
  } catch (error) {
    console.error('[AdminTenants] Exception:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
