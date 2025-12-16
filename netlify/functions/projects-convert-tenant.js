// netlify/functions/projects-convert-tenant.js
// Convert a completed project into a tenant (web app)
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// Valid tenant feature modules
const VALID_FEATURES = ['analytics', 'blog', 'crm', 'email_campaigns', 'seo']

export async function handler(event) {
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

  try {
    // Verify authentication - only admins can convert projects to tenants
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can convert projects to tenants' })
      }
    }

    const body = JSON.parse(event.body || '{}')
    const { projectId, features, domain } = body

    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' })
      }
    }

    if (!features || !Array.isArray(features) || features.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one feature module must be selected' })
      }
    }

    // Validate features
    const invalidFeatures = features.filter(f => !VALID_FEATURES.includes(f))
    if (invalidFeatures.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Invalid features: ${invalidFeatures.join(', ')}. Valid features: ${VALID_FEATURES.join(', ')}` 
        })
      }
    }

    // Get the project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select(`
        *,
        contact:contacts!projects_contact_id_fkey (
          id, name, email, company
        )
      `)
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Verify project is completed
    if (project.status !== 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Project must be completed before converting to tenant. Current status: ${project.status}` 
        })
      }
    }

    // Check if already a tenant
    if (project.is_tenant) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project is already a tenant' })
      }
    }

    // Generate unique tracking ID for analytics
    const trackingId = `UM-${randomBytes(4).toString('hex').toUpperCase()}`

    // Convert to tenant
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        is_tenant: true,
        tenant_features: features,
        tenant_domain: domain || null,
        tenant_tracking_id: trackingId,
        converted_to_tenant_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select(`
        *,
        contact:contacts!projects_contact_id_fkey (
          id, name, email, company
        )
      `)
      .single()

    if (updateError) {
      console.error('Error converting project to tenant:', updateError)
      throw updateError
    }

    // Log activity
    await logActivity(projectId, contact.id, 'converted_to_tenant', {
      features,
      domain: domain || null,
      trackingId
    })

    // Generate the tracking script for this tenant
    const trackingScript = generateTrackingScript(trackingId, domain)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        project: formatProject(updatedProject),
        trackingScript,
        message: `Project "${project.title}" has been converted to a web app with ${features.length} feature module(s).`
      })
    }

  } catch (error) {
    console.error('Error in projects-convert-tenant:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    }
  }
}

// Helper: Log project activity
async function logActivity(projectId, userId, action, details = {}) {
  try {
    await supabase
      .from('project_activities')
      .insert({
        project_id: projectId,
        user_id: userId,
        action,
        details
      })
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

// Helper: Generate tracking script for tenant
function generateTrackingScript(trackingId, domain) {
  const portalUrl = process.env.URL || 'https://portal.uptrademedia.com'
  
  return `<!-- Uptrade Media Analytics -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'um.start':
  new Date().getTime(),event:'um.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='umLayer'?'&l='+l:'';j.async=true;j.src=
  '${portalUrl}/analytics.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','umLayer','${trackingId}');
</script>
<!-- End Uptrade Media Analytics -->`
}

// Helper: Format project for response
function formatProject(p) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    budget: p.budget ? parseFloat(p.budget) : null,
    startDate: p.start_date,
    endDate: p.end_date,
    isTenant: p.is_tenant,
    tenantFeatures: p.tenant_features || [],
    tenantDomain: p.tenant_domain,
    tenantTrackingId: p.tenant_tracking_id,
    convertedToTenantAt: p.converted_to_tenant_at,
    contact: p.contact ? {
      id: p.contact.id,
      name: p.contact.name,
      email: p.contact.email,
      company: p.contact.company
    } : null,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  }
}
