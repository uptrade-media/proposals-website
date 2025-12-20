/**
 * CRM Prospects List Function
 * 
 * Lists prospects (contacts from calls who haven't been converted to users)
 * with pipeline stages and filtering
 */

import { createSupabaseAdmin } from './utils/supabase.js'

// Pipeline stages for prospects
const PIPELINE_STAGES = {
  new_lead: { label: 'New Lead', order: 1 },
  contacted: { label: 'Contacted', order: 2 },
  qualified: { label: 'Qualified', order: 3 },
  proposal_sent: { label: 'Proposal Sent', order: 4 },
  negotiating: { label: 'Negotiating', order: 5 },
  closed_won: { label: 'Closed Won', order: 6 },
  closed_lost: { label: 'Closed Lost', order: 7 }
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const params = event.queryStringParameters || {}
    
    // Project-level filtering (CRM data is per-project, not per-org)
    // Example: Big Corp has 11 projects, each with their own leads
    const projectId = event.headers['x-project-id'] || event.headers['X-Project-Id']
    const orgId = event.headers['x-organization-id'] || event.headers['X-Organization-Id']
    
    const {
      stage,          // Pipeline stage filter
      source,         // 'openphone_call' | 'website' | 'referral' etc.
      hasPhone,       // 'true' to only show contacts with phone
      search,         // Search name, email, company
      sortBy = 'last_call_date',  // 'last_call_date' | 'lead_quality' | 'created_at'
      sortOrder = 'desc',
      limit = '50',
      offset = '0'
    } = params

    // Build query - get contacts that are prospects (not portal users)
    // Use explicit FK relationship: call_logs!call_logs_contact_id_fkey
    let query = supabase
      .from('contacts')
      .select(`
        *,
        call_logs:call_logs!call_logs_contact_id_fkey(
          id,
          direction,
          duration,
          sentiment,
          lead_quality_score,
          ai_summary,
          created_at
        )
      `, { count: 'exact' })
      .is('auth_user_id', null) // Not a portal user yet
      .eq('role', 'client')
      .neq('pipeline_stage', 'closed_won') // Exclude won deals (they're now clients)
    
    // Project-level filtering (preferred) or org-level fallback
    if (projectId) {
      query = query.eq('project_id', projectId)
    } else if (orgId) {
      query = query.eq('org_id', orgId)
    }

    // Apply filters
    if (stage) {
      query = query.eq('pipeline_stage', stage)
    }
    
    if (source) {
      query = query.eq('source', source)
    }
    
    if (hasPhone === 'true') {
      query = query.not('phone', 'is', null)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    // Sorting
    const ascending = sortOrder === 'asc'
    if (sortBy === 'last_call_date') {
      query = query.order('last_call_date', { ascending, nullsFirst: false })
    } else if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending })
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    const { data: prospects, count, error } = await query

    if (error) {
      throw error
    }

    // Process prospects to add computed fields
    const processedProspects = prospects?.map(prospect => {
      const calls = prospect.call_logs || []
      const lastCall = calls.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0]
      
      // Compute average lead quality from calls
      const scoresWithValues = calls.filter(c => c.lead_quality_score != null)
      const avgLeadQuality = scoresWithValues.length > 0
        ? Math.round(scoresWithValues.reduce((sum, c) => sum + c.lead_quality_score, 0) / scoresWithValues.length)
        : null

      return {
        ...prospect,
        call_count: calls.length,
        last_call: lastCall,
        avg_lead_quality: avgLeadQuality,
        total_call_duration: calls.reduce((sum, c) => sum + (c.duration || 0), 0),
        // Remove full call_logs from response to reduce payload
        call_logs: undefined
      }
    }) || []

    // Get pipeline stats (filtered by project or org)
    let statsQuery = supabase
      .from('contacts')
      .select('pipeline_stage, source')
      .is('auth_user_id', null)
      .eq('role', 'client')
    
    if (projectId) {
      statsQuery = statsQuery.eq('project_id', projectId)
    } else if (orgId) {
      statsQuery = statsQuery.eq('org_id', orgId)
    }
    
    const { data: allProspects } = await statsQuery
    
    const pipelineStats = Object.keys(PIPELINE_STAGES).reduce((acc, stage) => {
      acc[stage] = allProspects?.filter(p => p.pipeline_stage === stage).length || 0
      return acc
    }, {})

    const sourceStats = allProspects?.reduce((acc, p) => {
      const src = p.source || 'unknown'
      acc[src] = (acc[src] || 0) + 1
      return acc
    }, {}) || {}

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        prospects: processedProspects,
        total: count,
        pipelineStages: PIPELINE_STAGES,
        pipelineStats,
        sourceStats,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count > parseInt(offset) + parseInt(limit)
        }
      })
    }

  } catch (error) {
    console.error('CRM prospects list error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
