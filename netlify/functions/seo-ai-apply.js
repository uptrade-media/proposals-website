// netlify/functions/seo-ai-apply.js
// Apply AI recommendations - auto-fix or one-click apply
// Saves optimized metadata to pages, tracks results
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      recommendationId,
      recommendationIds = [], // For batch apply
      action = 'apply' // 'apply', 'dismiss', 'approve'
    } = body

    const supabase = createSupabaseAdmin()
    
    // Handle single or batch
    const idsToProcess = recommendationId 
      ? [recommendationId] 
      : recommendationIds

    if (idsToProcess.length === 0) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'recommendationId or recommendationIds required' }) 
      }
    }

    const results = {
      applied: [],
      failed: [],
      dismissed: []
    }

    for (const recId of idsToProcess) {
      try {
        const result = await processRecommendation(supabase, recId, action, user)
        if (result.success) {
          if (action === 'dismiss') {
            results.dismissed.push(result)
          } else {
            results.applied.push(result)
          }
        } else {
          results.failed.push({ id: recId, error: result.error })
        }
      } catch (e) {
        results.failed.push({ id: recId, error: e.message })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results,
        summary: {
          applied: results.applied.length,
          failed: results.failed.length,
          dismissed: results.dismissed.length
        }
      })
    }

  } catch (error) {
    console.error('[AI Apply] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

async function processRecommendation(supabase, recId, action, user) {
  // Fetch the recommendation
  const { data: rec, error: recError } = await supabase
    .from('seo_ai_recommendations')
    .select('*, page:seo_pages(*)')
    .eq('id', recId)
    .single()

  if (recError || !rec) {
    return { success: false, error: 'Recommendation not found' }
  }

  if (rec.status === 'applied') {
    return { success: false, error: 'Already applied' }
  }

  // Handle dismiss action
  if (action === 'dismiss') {
    await supabase
      .from('seo_ai_recommendations')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
        dismissed_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', recId)

    return { 
      success: true, 
      id: recId, 
      action: 'dismissed' 
    }
  }

  // For apply action, we need to actually make changes
  let applied = false
  let appliedDetails = {}

  // Handle different recommendation categories
  switch (rec.category) {
    case 'title':
    case 'meta':
      applied = await applyMetadataChange(supabase, rec)
      appliedDetails = { 
        field: rec.field_name,
        oldValue: rec.current_value,
        newValue: rec.suggested_value
      }
      break

    case 'schema':
      applied = await applySchemaChange(supabase, rec)
      appliedDetails = { schemaAdded: rec.suggested_value }
      break

    case 'keyword':
      applied = await applyKeywordChange(supabase, rec)
      appliedDetails = { keywordsUpdated: true }
      break

    default:
      // For non-auto-fixable recommendations, just mark as approved/applied
      applied = true
      appliedDetails = { manualAction: true }
  }

  if (applied) {
    // Record baseline metrics for tracking
    const baselineMetrics = rec.page ? {
      clicks_28d: rec.page.clicks_28d,
      impressions_28d: rec.page.impressions_28d,
      ctr_28d: rec.page.ctr_28d,
      avg_position_28d: rec.page.avg_position_28d,
      recorded_at: new Date().toISOString()
    } : null

    await supabase
      .from('seo_ai_recommendations')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        applied_by: user.id,
        baseline_metrics: baselineMetrics,
        updated_at: new Date().toISOString()
      })
      .eq('id', recId)

    // Log the activity
    await supabase.from('activity_logs').insert({
      contact_id: user.id,
      action: 'seo_recommendation_applied',
      entity_type: 'seo_recommendation',
      entity_id: recId,
      metadata: {
        category: rec.category,
        title: rec.title,
        pageId: rec.page_id,
        ...appliedDetails
      },
      created_at: new Date().toISOString()
    })

    return {
      success: true,
      id: recId,
      action: 'applied',
      category: rec.category,
      details: appliedDetails
    }
  }

  return { success: false, error: 'Failed to apply recommendation' }
}

// Apply title or meta description change
async function applyMetadataChange(supabase, rec) {
  if (!rec.page_id || !rec.field_name || !rec.suggested_value) {
    console.log('[AI Apply] Missing required fields for metadata change')
    return false
  }

  const validFields = [
    'managed_title',
    'managed_meta_description', 
    'managed_canonical_url',
    'managed_robots_meta'
  ]

  if (!validFields.includes(rec.field_name)) {
    console.log('[AI Apply] Invalid field name:', rec.field_name)
    return false
  }

  const updateData = {
    [rec.field_name]: rec.suggested_value,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('seo_pages')
    .update(updateData)
    .eq('id', rec.page_id)

  if (error) {
    console.error('[AI Apply] Error updating page:', error)
    return false
  }

  return true
}

// Apply schema change
async function applySchemaChange(supabase, rec) {
  if (!rec.page_id || !rec.suggested_value) {
    return false
  }

  let schemaData
  try {
    // Parse if it's a string
    schemaData = typeof rec.suggested_value === 'string' 
      ? JSON.parse(rec.suggested_value)
      : rec.suggested_value
  } catch (e) {
    // If it's just a schema type recommendation, we'll store that
    schemaData = { recommendedType: rec.suggested_value }
  }

  const { error } = await supabase
    .from('seo_pages')
    .update({
      managed_schema: schemaData,
      updated_at: new Date().toISOString()
    })
    .eq('id', rec.page_id)

  return !error
}

// Apply keyword targeting change
async function applyKeywordChange(supabase, rec) {
  if (!rec.page_id) {
    return false
  }

  // Extract keywords from recommendation
  let keywords = []
  if (rec.suggested_value) {
    if (Array.isArray(rec.suggested_value)) {
      keywords = rec.suggested_value
    } else if (typeof rec.suggested_value === 'string') {
      keywords = rec.suggested_value.split(',').map(k => k.trim())
    }
  }

  if (keywords.length === 0) {
    return true // Nothing to apply, but not a failure
  }

  const { error } = await supabase
    .from('seo_pages')
    .update({
      target_keywords: keywords,
      updated_at: new Date().toISOString()
    })
    .eq('id', rec.page_id)

  return !error
}
