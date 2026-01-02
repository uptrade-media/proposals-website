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


// netlify/functions/signal-config.js
// Signal Module: Get and update AI configuration for a project
// Integrates with SEO AI brain (seo_knowledge_base) for business context

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  const supabase = createSupabaseAdmin()
  
  // Get project ID from query or body, or derive from siteId
  let projectId = event.queryStringParameters?.projectId || 
                 JSON.parse(event.body || '{}').projectId

  // Also accept siteId and lookup projectId from it
  const siteId = event.queryStringParameters?.siteId || 
                JSON.parse(event.body || '{}').siteId

  if (!projectId && siteId) {
    // Lookup project from siteId
    const { data: site } = await supabase
      .from('seo_sites')
      .select('project_id')
      .eq('id', siteId)
      .single()
    
    if (site?.project_id) {
      projectId = site.project_id
    }
  }

  if (!projectId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Project ID is required' })
    }
  }

  try {
    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, org_id, tenant_domain, organizations!projects_organization_id_fkey(id, name, slug)')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('[signal-config] Project lookup failed:', projectError)
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Project not found', details: projectError?.message })
      }
    }

    // Check if there's an SEO site linked to this project
    const { data: seoSite } = await supabase
      .from('seo_sites')
      .select('id, domain')
      .eq('project_id', projectId)
      .single()

    // Get SEO knowledge base if SEO site exists
    let seoKnowledge = null
    if (seoSite) {
      const { data: kb } = await supabase
        .from('seo_knowledge_base')
        .select(`
          business_name, business_type, industry,
          primary_services, secondary_services, service_areas,
          target_personas, brand_voice_description, tone_keywords,
          primary_competitors, site_content_summary
        `)
        .eq('site_id', seoSite.id)
        .single()
      seoKnowledge = kb
    }

    if (event.httpMethod === 'GET') {
      // Get signal config
      const { data: config, error } = await supabase
        .from('signal_config')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error
      }

      // Default config based on design doc
      const defaultConfig = {
        project_id: projectId,
        org_id: project.org_id,
        seo_site_id: seoSite?.id || null,
        is_enabled: false,
        widget_persona: 'helpful assistant',
        greeting_message: 'Hi! 👋 How can I help you today?',
        contact_email: null,
        contact_phone: null,
        business_hours: null,
        rag_enabled: true,
        profile_snapshot: {
          toneRules: [],
          ctaRules: [],
          doNotOffer: [],
          escalationKeywords: [],
          emergencyContacts: null
        },
        ai_model: 'gpt-4o-mini',
        max_tokens: 500,
        temperature: 0.7,
        enable_handoff: true,
        handoff_keywords: ['human', 'agent', 'person', 'representative'],
        avg_satisfaction_rating: null
      }

      // Get knowledge stats
      const { count: knowledgeCount } = await supabase
        .from('signal_knowledge')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('is_active', true)

      // Get FAQ stats
      const { count: faqCount } = await supabase
        .from('signal_faqs')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'approved')

      // Get conversation stats (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { count: conversationCount } = await supabase
        .from('signal_widget_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .gte('created_at', thirtyDaysAgo)

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          config: config || defaultConfig,
          isNew: !config,
          project: {
            id: project.id,
            title: project.title,
            domain: project.tenant_domain,
            org: project.organizations
          },
          seoIntegration: {
            linked: !!seoSite,
            siteId: seoSite?.id || null,
            hasKnowledge: !!seoKnowledge,
            businessName: seoKnowledge?.business_name || null,
            industry: seoKnowledge?.industry || null
          },
          stats: {
            knowledgeChunks: knowledgeCount || 0,
            approvedFaqs: faqCount || 0,
            conversationsLast30Days: conversationCount || 0
          }
        })
      }
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { config: updates, action } = body

      // If action is 'init' or no updates provided, just ensure config exists with defaults
      if (action === 'init' || !updates) {
        // Check if config exists
        const { data: existing } = await supabase
          .from('signal_config')
          .select('*')
          .eq('project_id', projectId)
          .single()

        if (existing) {
          // Config already exists
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ 
              config: existing,
              initialized: true,
              message: 'Signal config already initialized'
            })
          }
        }

        // Create default config
        const defaultConfig = {
          project_id: projectId,
          org_id: project.org_id,
          seo_site_id: seoSite?.id || null,
          widget_enabled: true,
          greeting_message: `Hi! Welcome to ${project.title}. How can I help you today?`,
          fallback_message: "I'm not sure about that. Would you like me to connect you with our team?",
          primary_color: '#3B82F6',
          position: 'bottom-right',
          collect_email_prompt: 'before_chat',
          business_hours: null,
          allowed_domains: project.tenant_domain ? [project.tenant_domain] : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: newConfig, error: insertError } = await supabase
          .from('signal_config')
          .insert(defaultConfig)
          .select()
          .single()

        if (insertError) {
          // If table doesn't exist or other error, just return success without config
          console.log('[signal-config] Init error (may be missing table):', insertError.message)
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ 
              initialized: true,
              message: 'Signal config initialized (defaults)'
            })
          }
        }

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            config: newConfig,
            initialized: true,
            message: 'Signal config created'
          })
        }
      }

      // Check if config exists
      const { data: existing } = await supabase
        .from('signal_config')
        .select('id')
        .eq('project_id', projectId)
        .single()

      // If linking to SEO site, validate it exists
      if (updates.seo_site_id) {
        const { data: validSite } = await supabase
          .from('seo_sites')
          .select('id')
          .eq('id', updates.seo_site_id)
          .eq('project_id', projectId)
          .single()

        if (!validSite) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid SEO site ID' })
          }
        }
      }

      let result
      if (existing) {
        // Update existing config
        const { data, error } = await supabase
          .from('signal_config')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('signal_config')
          .insert({
            project_id: projectId,
            org_id: project.org_id,
            seo_site_id: seoSite?.id || null,
            ...updates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        result = data
      }

      // Log config change
      await supabase
        .from('signal_widget_audit')
        .insert({
          project_id: projectId,
          org_id: project.org_id,
          action: 'config_updated',
          action_data: {
            updated_by: contact.id,
            changes: Object.keys(updates)
          }
        })

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          config: result,
          seoIntegration: {
            linked: !!result.seo_site_id,
            siteId: result.seo_site_id
          }
        })
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Signal config error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
