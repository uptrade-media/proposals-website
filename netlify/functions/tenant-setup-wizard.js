// netlify/functions/tenant-setup-wizard.js
// Comprehensive tenant setup that validates and creates everything needed
// Handles both new tenants and project conversions
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

// Modules always included for every tenant (Uptrade internal tools)
const INCLUDED_MODULES = ['billing', 'messages', 'files', 'proposals']

// Selectable tenant business modules
const AVAILABLE_MODULES = {
  analytics: { 
    label: 'Website Analytics',
    tables: ['sessions', 'page_views', 'events'],
    requiresSetup: ['domain']
  },
  clients: { 
    label: 'Clients CRM',
    tables: ['contacts', 'activities', 'notes'],
    requiresSetup: []
  },
  seo: { 
    label: 'SEO Manager',
    tables: ['seo_sites', 'seo_pages', 'seo_queries'],
    requiresSetup: ['domain']
  },
  ecommerce: { 
    label: 'E-commerce',
    tables: ['products', 'orders', 'order_items'],
    requiresSetup: ['shopify_store_domain', 'shopify_access_token']
  },
  forms: { 
    label: 'Forms',
    tables: ['forms', 'form_submissions'],
    requiresSetup: []
  },
  blog: { 
    label: 'Blog Manager',
    tables: ['blog_posts'],
    requiresSetup: []
  },
  email_manager: { 
    label: 'Email Campaigns',
    tables: ['email_campaigns', 'email_templates', 'email_subscribers'],
    requiresSetup: ['resend_api_key', 'resend_from_email']
  },
}

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
    // Verify authentication - only admins can create tenants
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
        body: JSON.stringify({ error: 'Admin access required to create tenants' })
      }
    }

    const body = JSON.parse(event.body || '{}')
    const {
      projectId,
      name,
      slug,
      domain,
      adminEmail,
      adminName,
      features = {},
      theme = {},
      secrets = {},
      plan = 'starter'
    } = body

    // ========================================
    // STEP 1: Validate all inputs
    // ========================================
    const validationErrors = []

    // Name validation
    if (!name || name.length < 2) {
      validationErrors.push({ field: 'name', error: 'Name must be at least 2 characters' })
    }

    // Slug validation
    if (!slug) {
      validationErrors.push({ field: 'slug', error: 'Slug is required' })
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      validationErrors.push({ field: 'slug', error: 'Slug must be lowercase alphanumeric with hyphens only' })
    } else if (slug.length < 2 || slug.length > 50) {
      validationErrors.push({ field: 'slug', error: 'Slug must be 2-50 characters' })
    }

    // Domain validation
    if (!domain) {
      validationErrors.push({ field: 'domain', error: 'Domain is required' })
    } else {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
      if (!domainRegex.test(cleanDomain)) {
        validationErrors.push({ field: 'domain', error: 'Invalid domain format' })
      }
    }

    // Admin email validation
    if (adminEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(adminEmail)) {
        validationErrors.push({ field: 'adminEmail', error: 'Invalid email format' })
      }
    }

    // Module validation
    const enabledModules = Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key)
    
    if (enabledModules.length === 0) {
      validationErrors.push({ field: 'features', error: 'At least one module must be enabled' })
    }

    // Validate module keys
    const invalidModules = enabledModules.filter(key => !AVAILABLE_MODULES[key])
    if (invalidModules.length > 0) {
      validationErrors.push({ 
        field: 'features', 
        error: `Invalid modules: ${invalidModules.join(', ')}` 
      })
    }

    // Check required secrets for enabled modules
    const missingSecrets = []
    enabledModules.forEach(moduleKey => {
      const module = AVAILABLE_MODULES[moduleKey]
      if (module?.requiresSetup) {
        module.requiresSetup.forEach(secretKey => {
          if (secretKey !== 'domain' && !secrets[secretKey]) {
            // Secrets are optional but we track what's missing
            missingSecrets.push({ module: moduleKey, secret: secretKey })
          }
        })
      }
    })

    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Validation failed',
          validationErrors
        })
      }
    }

    // ========================================
    // STEP 2: Check slug availability
    // ========================================
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingOrg) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Organization with this slug already exists',
          field: 'slug'
        })
      }
    }

    // ========================================
    // STEP 3: If converting a project, verify it
    // ========================================
    let project = null
    if (projectId) {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          contact:contacts!projects_contact_id_fkey (id, name, email, company)
        `)
        .eq('id', projectId)
        .single()

      if (projectError || !projectData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }

      if (projectData.status !== 'completed') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Project must be completed before converting. Current status: ${projectData.status}` 
          })
        }
      }

      if (projectData.is_tenant) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Project is already a tenant' })
        }
      }

      project = projectData
    }

    // ========================================
    // STEP 4: Create organization record
    // ========================================
    const schemaName = `org_${slug.replace(/-/g, '_')}`
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const trackingId = `UM-${randomBytes(4).toString('hex').toUpperCase()}`

    // Merge always-included modules with selected business modules
    const allFeatures = {
      ...features,
      // Always include Uptrade internal modules
      billing: true,
      messages: true,
      files: true,
      proposals: true,
    }

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        domain: cleanDomain,
        schema_name: schemaName,
        features: allFeatures,
        theme: {
          primaryColor: theme.primaryColor || '#4bbf39',
          logoUrl: theme.logoUrl || null,
          faviconUrl: theme.faviconUrl || null
        },
        plan,
        status: 'active'
      })
      .select()
      .single()

    if (orgError) {
      console.error('[TenantSetup] Error creating organization:', orgError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create organization: ' + orgError.message })
      }
    }

    console.log(`[TenantSetup] Created organization: ${organization.id} (${slug})`)

    // ========================================
    // STEP 5: Create secrets record
    // ========================================
    const secretsData = {
      organization_id: organization.id,
      resend_api_key: secrets.resend_api_key || null,
      resend_from_email: secrets.resend_from_email || null,
      square_access_token: secrets.square_access_token || null,
      square_location_id: secrets.square_location_id || null,
      square_environment: secrets.square_environment || 'sandbox',
      custom_secrets: {
        shopify_store_domain: secrets.shopify_store_domain || null,
        shopify_access_token: secrets.shopify_access_token || null,
      }
    }

    const { error: secretsError } = await supabase
      .from('organization_secrets')
      .insert(secretsData)

    if (secretsError) {
      console.error('[TenantSetup] Error creating secrets:', secretsError)
      // Continue anyway - secrets can be added later
    }

    // ========================================
    // STEP 6: Add admin user if provided
    // ========================================
    if (adminEmail) {
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_email: adminEmail,
          organization_id: organization.id,
          role: 'owner',
          is_primary: true
        })

      if (userOrgError && !userOrgError.message.includes('duplicate')) {
        console.error('[TenantSetup] Error adding admin user:', userOrgError)
      }
    }

    // ========================================
    // STEP 7: Update project if converting
    // ========================================
    if (project) {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          is_tenant: true,
          tenant_domain: cleanDomain,
          tenant_modules: allFeatures,
          tenant_theme_color: theme.primaryColor || '#4bbf39',
          tenant_tracking_id: trackingId,
          tenant_org_id: organization.id,
          converted_to_tenant_at: new Date().toISOString()
        })
        .eq('id', projectId)

      if (updateError) {
        console.error('[TenantSetup] Error updating project:', updateError)
      }

      // Log activity
      await supabase
        .from('project_activities')
        .insert({
          project_id: projectId,
          user_id: contact?.id,
          action: 'converted_to_tenant',
          details: {
            organizationId: organization.id,
            modules: enabledModules,
            domain: cleanDomain,
            trackingId
          }
        })
    }

    // ========================================
    // STEP 8: Log the action
    // ========================================
    await supabase
      .from('org_access_logs')
      .insert({
        user_email: user.email || contact?.email,
        organization_id: organization.id,
        action: 'create',
        resource_type: 'tenant',
        metadata: { 
          name, 
          slug, 
          domain: cleanDomain,
          modules: enabledModules,
          fromProject: projectId || null
        }
      })

    // ========================================
    // STEP 9: Generate tracking script
    // ========================================
    const baseUrl = process.env.URL || 'https://portal.uptrademedia.com'
    const trackingScript = `<!-- Uptrade Portal Analytics -->
<script>
  window.UPTRADE_CONFIG = {
    orgId: '${organization.id}',
    orgSlug: '${organization.slug}',
    trackingId: '${trackingId}',
    apiEndpoint: '${baseUrl}/.netlify/functions'
  };
</script>
<script src="${baseUrl}/tracking.js" defer></script>
<!-- End Uptrade Portal Analytics -->`

    // ========================================
    // STEP 10: Build setup checklist
    // ========================================
    const setupChecklist = {
      organization: { status: 'complete', message: 'Organization created' },
      secrets: { 
        status: missingSecrets.length > 0 ? 'warning' : 'complete',
        message: missingSecrets.length > 0 
          ? `${missingSecrets.length} API key(s) still needed` 
          : 'All required API keys configured'
      },
      tracking: { 
        status: 'pending', 
        message: 'Tracking script needs to be installed on client website' 
      },
      modules: { 
        status: 'complete', 
        message: `${enabledModules.length} module(s) enabled` 
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        organization,
        trackingId,
        trackingScript,
        setupChecklist,
        missingSecrets,
        message: `Tenant "${name}" created successfully with ${enabledModules.length} module(s)`
      })
    }

  } catch (error) {
    console.error('[TenantSetup] Exception:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    }
  }
}
