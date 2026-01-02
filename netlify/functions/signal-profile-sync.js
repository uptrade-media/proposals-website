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


// netlify/functions/signal-profile-sync.js
// Signal Module: Sync extracted profile from seo_knowledge_base to signal_config
// Bridges the gap between AI extraction and the profile editor

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

/**
 * Transform seo_knowledge_base data to profile_snapshot format
 */
function transformKnowledgeToProfile(knowledge, existingProfile = {}) {
  // Build tone rules from tone_keywords
  const toneRules = (knowledge.tone_keywords || []).map(keyword => {
    // Convert keywords to rules
    const lowerKeyword = keyword.toLowerCase()
    if (['professional', 'expert', 'authoritative'].includes(lowerKeyword)) {
      return `Maintain a ${lowerKeyword} tone`
    }
    if (['friendly', 'warm', 'approachable'].includes(lowerKeyword)) {
      return `Be ${lowerKeyword} and conversational`
    }
    return `Be ${keyword.toLowerCase()}`
  })

  // Build CTA rules from unique selling points
  const ctaRules = (knowledge.unique_selling_points || []).slice(0, 3).map(usp => 
    `Highlight: ${usp}`
  )

  return {
    // Identity
    brandName: knowledge.business_name || existingProfile.brandName || '',
    shortDescription: knowledge.site_content_summary || existingProfile.shortDescription || '',
    primaryServices: knowledge.primary_services || existingProfile.primaryServices || [],
    serviceCategories: knowledge.secondary_services || existingProfile.serviceCategories || [],
    
    // Tone
    toneRules: toneRules.length > 0 ? toneRules : (existingProfile.toneRules || []),
    
    // Location
    serviceArea: knowledge.service_areas || existingProfile.serviceArea || [],
    address: existingProfile.address || '',
    phone: existingProfile.phone || '',
    email: existingProfile.email || '',
    hours: existingProfile.hours || { 'mon-fri': '', 'sat': '', 'sun': '' },
    
    // Conversion - these typically need manual input
    pricingModel: existingProfile.pricingModel || '',
    bookingFlow: existingProfile.bookingFlow || '',
    ctaRules: ctaRules.length > 0 ? ctaRules : (existingProfile.ctaRules || []),
    
    // Constraints - usually need manual input for legal/compliance
    doNotOffer: existingProfile.doNotOffer || [],
    complianceNotes: existingProfile.complianceNotes || [],
    
    // Leads - keep existing or use defaults
    requiredFields: existingProfile.requiredFields || ['name', 'email'],
    optionalFields: existingProfile.optionalFields || ['phone', 'company'],
    qualifyingQuestions: existingProfile.qualifyingQuestions || []
  }
}

/**
 * Determine industry from business_type and primary_services
 */
function inferIndustry(knowledge) {
  const businessType = (knowledge.business_type || '').toLowerCase()
  const services = (knowledge.primary_services || []).join(' ').toLowerCase()
  const industry = (knowledge.industry || '').toLowerCase()
  
  // Check for specific industry matches
  if (businessType.includes('saas') || services.includes('software') || services.includes('platform')) {
    return 'saas'
  }
  if (businessType.includes('e-commerce') || businessType.includes('ecommerce') || services.includes('shop') || services.includes('store')) {
    return 'ecommerce'
  }
  if (businessType.includes('agency') || services.includes('marketing') || services.includes('design')) {
    return 'agency'
  }
  if (industry.includes('health') || industry.includes('medical') || industry.includes('dental')) {
    return 'healthcare'
  }
  if (industry.includes('legal') || industry.includes('law')) {
    return 'legal'
  }
  if (industry.includes('finance') || industry.includes('financial') || services.includes('accounting')) {
    return 'finance'
  }
  if (businessType.includes('local') || services.includes('plumb') || services.includes('roof') || 
      services.includes('hvac') || services.includes('electric') || services.includes('repair')) {
    return 'local-service'
  }
  
  return 'other'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: CORS_HEADERS, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const { projectId, siteId, forceRefresh = false } = JSON.parse(event.body || '{}')

    if (!projectId && !siteId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'projectId or siteId is required' })
      }
    }

    // Get SEO site
    let site
    if (siteId) {
      const { data } = await supabase
        .from('seo_sites')
        .select('id, domain, project_id, org_id')
        .eq('id', siteId)
        .single()
      site = data
    } else {
      const { data } = await supabase
        .from('seo_sites')
        .select('id, domain, project_id, org_id')
        .eq('project_id', projectId)
        .single()
      site = data
    }

    if (!site) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'SEO site not found' })
      }
    }

    const resolvedProjectId = site.project_id || projectId

    // Get extracted knowledge from seo_knowledge_base
    const { data: knowledge, error: knowledgeError } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', site.id)
      .single()

    if (knowledgeError || !knowledge) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          synced: false,
          message: 'No extracted knowledge found. Run signal-profile-extract first.',
          needsExtraction: true
        })
      }
    }

    // Get existing signal config
    const { data: existingConfig } = await supabase
      .from('signal_config')
      .select('*')
      .eq('project_id', resolvedProjectId)
      .single()

    // Check if already auto-populated and not forcing refresh
    if (existingConfig?.auto_populated_at && !forceRefresh) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          synced: false,
          message: 'Profile already auto-populated. Use forceRefresh=true to update.',
          config: existingConfig,
          alreadySynced: true
        })
      }
    }

    // Transform knowledge to profile snapshot
    const existingProfile = existingConfig?.profile_snapshot || {}
    const profileSnapshot = transformKnowledgeToProfile(knowledge, existingProfile)
    
    // Infer industry
    const industry = inferIndustry(knowledge)

    // Upsert signal config with the new profile
    const { data: config, error: upsertError } = await supabase
      .from('signal_config')
      .upsert({
        project_id: resolvedProjectId,
        org_id: site.org_id,
        profile_snapshot: profileSnapshot,
        auto_populated_at: new Date().toISOString(),
        auto_populated_from: 'seo_knowledge_base',
        industry,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[Profile Sync] Upsert error:', upsertError)
      throw upsertError
    }

    // Build summary of what was synced
    const syncedFields = []
    if (profileSnapshot.brandName) syncedFields.push('brandName')
    if (profileSnapshot.shortDescription) syncedFields.push('shortDescription')
    if (profileSnapshot.primaryServices?.length) syncedFields.push(`${profileSnapshot.primaryServices.length} services`)
    if (profileSnapshot.serviceArea?.length) syncedFields.push(`${profileSnapshot.serviceArea.length} service areas`)
    if (profileSnapshot.toneRules?.length) syncedFields.push(`${profileSnapshot.toneRules.length} tone rules`)

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        synced: true,
        config,
        profileSnapshot,
        industry,
        syncedFields,
        sourceKnowledge: {
          business_name: knowledge.business_name,
          pages_analyzed: knowledge.pages_analyzed,
          updated_at: knowledge.updated_at
        }
      })
    }

  } catch (error) {
    console.error('[Profile Sync] Error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
