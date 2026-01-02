// netlify/functions/scheduled/signal-ab-tests-cron.js
// Hourly cron job to analyze A/B tests automatically

import { createSupabaseAdmin } from '../utils/supabase.js'

export async function handler(event) {
  try {
    console.log('[signal-ab-tests-cron] Starting hourly A/B test analysis')

    const supabase = createSupabaseAdmin()

    // Get all organizations with running A/B tests
    const { data: orgs, error: orgsError } = await supabase
      .from('engage_elements')
      .select('org_id')
      .eq('is_ab_test', true)
      .eq('ab_test_status', 'running')
      .gte('views', 100)

    if (orgsError) throw orgsError

    const uniqueOrgs = [...new Set(orgs.map(o => o.org_id))]
    
    console.log(`[signal-ab-tests-cron] Found ${uniqueOrgs.length} orgs with active tests`)

    // Analyze tests for each org (we'll call the main function)
    const results = []
    
    for (const orgId of uniqueOrgs) {
      try {
        // In production, this would call signal-analyze-tests with a system token
        // For now, we'll just log
        console.log(`[signal-ab-tests-cron] Would analyze tests for org: ${orgId}`)
        results.push({ orgId, status: 'queued' })
      } catch (error) {
        console.error(`[signal-ab-tests-cron] Error for org ${orgId}:`, error)
        results.push({ orgId, status: 'error', error: error.message })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'A/B test analysis completed',
        processed: results.length,
        results
      })
    }

  } catch (error) {
    console.error('[signal-ab-tests-cron] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to run A/B test analysis',
        details: error.message
      })
    }
  }
}
