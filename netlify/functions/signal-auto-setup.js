// ============================================================================
// DEPRECATED: This function is now redundant - use Signal API directly
// ============================================================================
// Portal now calls Signal API (NestJS) instead of internal Signal implementation.
// This function remains for backward compatibility but should not be used in new code.
//
// Migration:
//   Old: /.netlify/functions/signal-xxx
//   New: Signal API endpoints (see SIGNAL-API-MIGRATION.md)
//
// Signal API Base URL: $SIGNAL_API_URL (http://localhost:3001 or https://signal-api.uptrademedia.com)
// ============================================================================


// netlify/functions/signal-auto-setup.js
// Auto-setup Signal for a tenant site - creates project, SEO site, and initializes config
// Called from tenant sites like uptrade-media-nextjs to self-register

import { createSupabaseAdmin } from './utils/supabase.js'

// Known tenant configurations (hardcoded for security - only allow known tenants)
const KNOWN_TENANTS = {
  'uptrade': {
    name: 'Uptrade Media',
    domain: 'uptrademedia.com',
    orgSlug: 'uptrade-media'
  }
  // Add other known tenants here as needed
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const tenantId = event.headers['x-tenant-id'] || body.tenantId
    const providedDomain = body.domain // Optional override

    if (!tenantId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Tenant ID required (X-Tenant-ID header or tenantId in body)' })
      }
    }

    // Get tenant config
    const tenantConfig = KNOWN_TENANTS[tenantId]
    if (!tenantConfig && !providedDomain) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Unknown tenant '${tenantId}'. Either register this tenant or provide a domain.`,
          knownTenants: Object.keys(KNOWN_TENANTS)
        })
      }
    }

    const domain = providedDomain || tenantConfig.domain
    const tenantName = tenantConfig?.name || domain.replace(/^www\./, '').replace(/\.[^.]+$/, '')

    const supabase = createSupabaseAdmin()

    // 1. Find or create organization
    let orgId
    const orgSlug = tenantConfig?.orgSlug || tenantId

    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .single()

    if (existingOrg) {
      orgId = existingOrg.id
      console.log(`[signal-auto-setup] Found existing org: ${orgId}`)
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: tenantName,
          slug: orgSlug
        })
        .select('id')
        .single()

      if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`)
      orgId = newOrg.id
      console.log(`[signal-auto-setup] Created new org: ${orgId}`)
    }

    // 2. Find or create project with tenant_domain
    let projectId

    const { data: existingProject } = await supabase
      .from('projects')
      .select('id, tenant_domain')
      .eq('organization_id', orgId)
      .eq('is_tenant', true)
      .single()

    if (existingProject) {
      projectId = existingProject.id
      
      // Update tenant_domain if not set
      if (!existingProject.tenant_domain) {
        await supabase
          .from('projects')
          .update({ tenant_domain: domain })
          .eq('id', projectId)
        console.log(`[signal-auto-setup] Updated project tenant_domain: ${domain}`)
      }
      console.log(`[signal-auto-setup] Found existing project: ${projectId}`)
    } else {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: `${tenantName} Website`,
          organization_id: orgId,
          is_tenant: true,
          tenant_domain: domain,
          tenant_tracking_id: tenantId,
          status: 'active'
        })
        .select('id')
        .single()

      if (projectError) throw new Error(`Failed to create project: ${projectError.message}`)
      projectId = newProject.id
      console.log(`[signal-auto-setup] Created new project: ${projectId}`)
    }

    // 3. Find or create SEO site
    let siteId

    const { data: existingSite } = await supabase
      .from('seo_sites')
      .select('id')
      .eq('project_id', projectId)
      .single()

    if (existingSite) {
      siteId = existingSite.id
      console.log(`[signal-auto-setup] Found existing SEO site: ${siteId}`)
    } else {
      // Check if site exists by domain (might have been created without project link)
      const { data: siteByDomain } = await supabase
        .from('seo_sites')
        .select('id')
        .eq('domain', domain)
        .single()

      if (siteByDomain) {
        // Link existing site to project
        await supabase
          .from('seo_sites')
          .update({ project_id: projectId, org_id: orgId })
          .eq('id', siteByDomain.id)
        siteId = siteByDomain.id
        console.log(`[signal-auto-setup] Linked existing site to project: ${siteId}`)
      } else {
        // Create new SEO site
        const { data: newSite, error: siteError } = await supabase
          .from('seo_sites')
          .insert({
            domain: domain,
            site_name: tenantName,
            project_id: projectId,
            org_id: orgId
          })
          .select('id')
          .single()

        if (siteError) throw new Error(`Failed to create SEO site: ${siteError.message}`)
        siteId = newSite.id
        console.log(`[signal-auto-setup] Created new SEO site: ${siteId}`)
      }
    }

    // 4. Initialize Signal config if not exists
    const { data: existingConfig } = await supabase
      .from('signal_skills')
      .select('id')
      .eq('project_id', projectId)
      .eq('skill_type', 'module_config')
      .single()

    if (!existingConfig) {
      await supabase
        .from('signal_skills')
        .insert({
          project_id: projectId,
          skill_type: 'module_config',
          config: {
            is_enabled: true,
            initialized_at: new Date().toISOString(),
            seoIntegration: {
              siteId: siteId,
              domain: domain
            }
          }
        })
      console.log(`[signal-auto-setup] Created Signal config`)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tenantId,
        domain,
        organizationId: orgId,
        projectId,
        siteId,
        message: 'Signal auto-setup complete. Ready for wizard.'
      })
    }

  } catch (error) {
    console.error('[signal-auto-setup] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
