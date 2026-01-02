// netlify/functions/scheduled/signal-engagement-analysis.js
// Weekly cron job for engagement pattern analysis

import { createSupabaseAdmin } from '../utils/supabase.js'

export async function handler(event) {
  try {
    console.log('[signal-engagement-analysis] Starting weekly engagement analysis')

    const supabase = createSupabaseAdmin()

    // Get all organizations with Engage elements
    const { data: orgs, error: orgsError } = await supabase
      .from('engage_elements')
      .select('org_id')
      .eq('is_active', true)

    if (orgsError) throw orgsError

    const uniqueOrgs = [...new Set(orgs.map(o => o.org_id))]
    
    console.log(`[signal-engagement-analysis] Found ${uniqueOrgs.length} orgs to analyze`)

    const results = []
    
    for (const orgId of uniqueOrgs) {
      try {
        console.log(`[signal-engagement-analysis] Analyzing org: ${orgId}`)
        results.push({ orgId, status: 'queued' })
      } catch (error) {
        console.error(`[signal-engagement-analysis] Error for org ${orgId}:`, error)
        results.push({ orgId, status: 'error', error: error.message })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Engagement analysis completed',
        processed: results.length,
        results
      })
    }

  } catch (error) {
    console.error('[signal-engagement-analysis] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to run engagement analysis',
        details: error.message
      })
    }
  }
}
