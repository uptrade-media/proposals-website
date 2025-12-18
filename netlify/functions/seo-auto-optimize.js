// netlify/functions/seo-auto-optimize.js
// Master automation function that runs all SEO optimizations
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabase = createSupabaseAdmin()

  try {
    const { siteId, options = {} } = JSON.parse(event.body || '{}')

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    // Get site info
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    const results = {
      siteId,
      domain: site.domain,
      startedAt: new Date().toISOString(),
      steps: [],
      errors: [],
      summary: {}
    }

    // Step 1: Check for pages that need metadata
    const { data: pagesNeedingMeta } = await supabase
      .from('seo_pages')
      .select('id, url, title, meta_description')
      .eq('site_id', siteId)
      .or('title.is.null,meta_description.is.null')
      .limit(20)

    results.steps.push({
      step: 'check_metadata',
      pagesNeedingMeta: pagesNeedingMeta?.length || 0,
      status: 'completed'
    })

    // Step 2: Check for pending AI recommendations
    const { data: pendingRecs } = await supabase
      .from('seo_ai_recommendations')
      .select('id, page_id, recommendation_type, suggested_value, auto_fixable')
      .eq('site_id', siteId)
      .eq('status', 'pending')
      .eq('auto_fixable', true)
      .limit(50)

    results.steps.push({
      step: 'check_recommendations',
      pendingAutoFix: pendingRecs?.length || 0,
      status: 'completed'
    })

    // Step 3: Apply auto-fixable recommendations
    let appliedCount = 0
    const appliedRecs = []

    if (options.applyAutoFix !== false && pendingRecs?.length > 0) {
      for (const rec of pendingRecs) {
        try {
          // Apply the recommendation based on type
          if (rec.recommendation_type === 'title' && rec.page_id && rec.suggested_value) {
            await supabase
              .from('seo_pages')
              .update({ 
                title: rec.suggested_value,
                updated_at: new Date().toISOString()
              })
              .eq('id', rec.page_id)

            await supabase
              .from('seo_ai_recommendations')
              .update({ 
                status: 'applied',
                applied_at: new Date().toISOString()
              })
              .eq('id', rec.id)

            appliedCount++
            appliedRecs.push(rec.id)
          }

          if (rec.recommendation_type === 'meta_description' && rec.page_id && rec.suggested_value) {
            await supabase
              .from('seo_pages')
              .update({ 
                meta_description: rec.suggested_value,
                updated_at: new Date().toISOString()
              })
              .eq('id', rec.page_id)

            await supabase
              .from('seo_ai_recommendations')
              .update({ 
                status: 'applied',
                applied_at: new Date().toISOString()
              })
              .eq('id', rec.id)

            appliedCount++
            appliedRecs.push(rec.id)
          }
        } catch (err) {
          results.errors.push({
            step: 'apply_recommendation',
            recId: rec.id,
            error: err.message
          })
        }
      }
    }

    results.steps.push({
      step: 'apply_auto_fix',
      applied: appliedCount,
      appliedIds: appliedRecs,
      status: 'completed'
    })

    // Step 4: Check for content decay
    const { data: decayingPages } = await supabase
      .from('seo_pages')
      .select('id, url, clicks_28d, clicks_prev_28d')
      .eq('site_id', siteId)
      .eq('content_decay_risk', true)
      .limit(20)

    results.steps.push({
      step: 'check_content_decay',
      decayingPages: decayingPages?.length || 0,
      status: 'completed'
    })

    // Step 5: Check open opportunities
    const { data: openOpportunities } = await supabase
      .from('seo_opportunities')
      .select('id, type, priority')
      .eq('site_id', siteId)
      .eq('status', 'open')

    const opportunitySummary = {
      total: openOpportunities?.length || 0,
      critical: openOpportunities?.filter(o => o.priority === 'critical').length || 0,
      high: openOpportunities?.filter(o => o.priority === 'high').length || 0,
      medium: openOpportunities?.filter(o => o.priority === 'medium').length || 0
    }

    results.steps.push({
      step: 'check_opportunities',
      ...opportunitySummary,
      status: 'completed'
    })

    // Calculate overall summary
    results.summary = {
      pagesNeedingMeta: pagesNeedingMeta?.length || 0,
      recommendationsApplied: appliedCount,
      decayingPages: decayingPages?.length || 0,
      openOpportunities: opportunitySummary.total,
      criticalIssues: opportunitySummary.critical,
      errorsEncountered: results.errors.length
    }

    results.completedAt = new Date().toISOString()

    // Update site last analysis timestamp
    await supabase
      .from('seo_sites')
      .update({ 
        last_ai_analysis_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId)

    // Step 6: Trigger site revalidation if changes were applied
    let revalidationResult = null
    if (appliedCount > 0 && options.triggerRevalidation !== false) {
      try {
        // Get the paths that were updated
        const { data: updatedPages } = await supabase
          .from('seo_pages')
          .select('url')
          .in('id', pendingRecs.filter(r => appliedRecs.includes(r.id)).map(r => r.page_id))

        const paths = updatedPages?.map(p => {
          // Extract path from URL
          try {
            const url = new URL(p.url)
            return url.pathname
          } catch {
            return null
          }
        }).filter(Boolean) || []

        if (paths.length > 0) {
          // Call the revalidation endpoint on the main site
          const secret = process.env.MAIN_SITE_REVALIDATION_SECRET
          if (secret) {
            const revalidateUrl = 'https://uptrademedia.com/api/seo-revalidate'
            const response = await fetch(revalidateUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ secret, paths })
            })
            
            if (response.ok) {
              revalidationResult = await response.json()
              results.steps.push({
                step: 'site_revalidation',
                paths: paths.length,
                revalidated: revalidationResult.revalidated,
                status: 'completed'
              })
            } else {
              results.steps.push({
                step: 'site_revalidation',
                status: 'failed',
                error: `HTTP ${response.status}`
              })
            }
          }
        }
      } catch (revalError) {
        console.error('[seo-auto-optimize] Revalidation error:', revalError)
        results.steps.push({
          step: 'site_revalidation',
          status: 'failed',
          error: revalError.message
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results
      })
    }
  } catch (err) {
    console.error('[seo-auto-optimize] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
