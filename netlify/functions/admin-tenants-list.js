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

    // Get user counts per organization from user_organizations (legacy/supabase auth)
    const { data: userCounts } = await supabase
      .from('user_organizations')
      .select('organization_id')
    
    const countsByOrg = (userCounts || []).reduce((acc, uo) => {
      acc[uo.organization_id] = (acc[uo.organization_id] || 0) + 1
      return acc
    }, {})

    // Also count from organization_members (new system)
    const { data: orgMemberCounts } = await supabase
      .from('organization_members')
      .select('organization_id')
    
    const memberCountsByOrg = (orgMemberCounts || []).reduce((acc, om) => {
      acc[om.organization_id] = (acc[om.organization_id] || 0) + 1
      return acc
    }, {})

    // Fetch ALL projects grouped by organization
    const { data: allProjects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        tenant_domain,
        tenant_features,
        tenant_theme_color,
        is_tenant,
        org_id,
        organization_id,
        status,
        created_at
      `)
      .order('created_at', { ascending: false })
    
    if (projectError) {
      console.error('[AdminTenants] Error fetching projects:', projectError)
    }

    // Group projects by organization
    const projectsByOrg = (allProjects || []).reduce((acc, project) => {
      // Use organization_id if set, fall back to org_id
      const orgId = project.organization_id || project.org_id
      if (orgId) {
        if (!acc[orgId]) acc[orgId] = []
        acc[orgId].push({
          id: project.id,
          title: project.title,
          status: project.status,
          is_tenant: project.is_tenant,
          tenant_domain: project.tenant_domain,
          tenant_features: project.tenant_features,
          tenant_theme_color: project.tenant_theme_color,
          created_at: project.created_at
        })
      }
      return acc
    }, {})

    // Enrich organizations with user counts AND nested projects
    const enrichedOrgs = organizations.map(org => ({
      ...org,
      userCount: (countsByOrg[org.id] || 0) + (memberCountsByOrg[org.id] || 0),
      projects: projectsByOrg[org.id] || [],
      projectCount: (projectsByOrg[org.id] || []).length,
      tenantProjectCount: (projectsByOrg[org.id] || []).filter(p => p.is_tenant).length
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
