// netlify/functions/auth-switch-org.js
// Switch the current organization context for a user session
// Now also supports project-based tenants (web apps)
import { createSupabasePublic, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication
  const { user, contact, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { organizationId, organizationSlug, projectId } = body

    if (!organizationId && !organizationSlug && !projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Organization id, slug, or project id required' })
      }
    }

    const supabase = createSupabasePublic()

    // If projectId is provided, look up the project as a tenant
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          contact:contacts!projects_contact_id_fkey (
            id, name, email, company
          )
        `)
        .eq('id', projectId)
        .eq('is_tenant', true)
        .single()

      if (projectError || !project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Web app not found or project is not a tenant' })
        }
      }

      // Super admins have access to all
      // Other admins have access to all projects
      const hasAccess = isSuperAdmin || contact?.role === 'admin'

      if (!hasAccess) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'You do not have access to this web app' })
        }
      }

      // Log the access
      try {
        await supabase
          .from('project_activities')
          .insert({
            project_id: projectId,
            user_id: contact?.id,
            action: 'dashboard_entered',
            details: {
              user_email: user.email,
              ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip']
            }
          })
      } catch (logError) {
        console.error('Failed to log project activity:', logError)
      }

      // Return project as organization context
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          organization: {
            id: project.id,
            slug: project.tenant_tracking_id || project.id,
            name: project.title,
            domain: project.tenant_domain,
            features: project.tenant_features || [],
            theme: {
              primaryColor: project.tenant_theme_color || '#4bbf39'
            },
            plan: 'managed', // Projects are managed web apps
            status: 'active',
            isProjectTenant: true // Flag to indicate this is a project-based tenant
          },
          role: 'admin', // Admins viewing a project get admin access
          isSuperAdmin,
          project: {
            id: project.id,
            title: project.title,
            description: project.description,
            domain: project.tenant_domain,
            features: project.tenant_features || [],
            contact: project.contact
          }
        })
      }
    }

    // Original organization-based lookup
    let query = supabase.from('organizations').select('*')
    
    if (organizationId) {
      query = query.eq('id', organizationId)
    } else {
      query = query.eq('slug', organizationSlug)
    }

    const { data: organization, error: orgError } = await query.single()

    if (orgError || !organization) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Organization not found' })
      }
    }

    // Check if user has access to this organization
    let hasAccess = isSuperAdmin

    if (!hasAccess) {
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_email', user.email)
        .eq('organization_id', organization.id)
        .single()
      
      hasAccess = !!userOrg
    }

    if (!hasAccess) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'You do not have access to this organization' })
      }
    }

    // Get user's role in this organization
    const { data: userOrgRole } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_email', user.email)
      .eq('organization_id', organization.id)
      .single()

    // Log the switch action
    await supabase
      .from('org_access_logs')
      .insert({
        user_email: user.email,
        organization_id: organization.id,
        action: 'switch',
        resource_type: 'session',
        ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'],
        user_agent: event.headers['user-agent']
      })

    // Return the organization context
    // Note: The frontend stores this and sends it as X-Organization-Id header
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        organization: {
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
          domain: organization.domain,
          schema_name: organization.schema_name,
          features: organization.features,
          theme: organization.theme,
          plan: organization.plan,
          status: organization.status
        },
        role: userOrgRole?.role || (isSuperAdmin ? 'admin' : 'member'),
        isSuperAdmin
      })
    }
  } catch (error) {
    console.error('[AuthSwitchOrg] Exception:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
