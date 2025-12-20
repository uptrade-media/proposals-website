// netlify/functions/audits-list.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { requireTeamMember, applyOwnershipFilter } from './utils/permissions.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    // Get authenticated user via Supabase
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Require team member access
    try {
      requireTeamMember(contact)
    } catch (err) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: err.message })
      }
    }

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.team_role === 'admin' || contact.team_role === 'manager'
    
    // Get optional filters from query params
    const contactIdFilter = event.queryStringParameters?.contactId
    const createdByFilter = event.queryStringParameters?.createdBy

    // Build base query
    let query = supabase
      .from('audits')
      .select(`
        id,
        target_url,
        status,
        performance_score,
        seo_score,
        accessibility_score,
        best_practices_score,
        created_at,
        completed_at,
        report_storage_path,
        contact_id,
        project_id,
        device_type,
        magic_token,
        magic_token_expires,
        sent_at,
        sent_to,
        full_audit_json,
        created_by,
        source,
        contacts!audits_contact_id_fkey (
          id,
          name,
          email,
          company
        )
      `)
    
    // Search by URL (for finding existing audits) - check this first before ownership filter
    const urlFilter = event.queryStringParameters?.url
    if (urlFilter) {
      // Normalize URL for matching (strip trailing slash, www, and protocol)
      const normalizedUrl = urlFilter
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
      
      console.log('[audits-list] Searching by URL:', urlFilter, '-> normalized:', normalizedUrl)
      
      // For URL searches, we want to find ANY matching audit (skip ownership filter)
      // This is used for proposal creation to reference existing audit data
      // Note: status can be 'completed' or 'complete' depending on source
      query = query
        .ilike('target_url', `%${normalizedUrl}%`)
        .in('status', ['completed', 'complete'])
    } else {
      // Apply ownership filter only for regular list views (not URL searches)
      query = applyOwnershipFilter(query, contact, 'created_by')
    }
    
    // Apply optional filters
    if (contactIdFilter) {
      query = query.eq('contact_id', contactIdFilter)
    }
    
    if (createdByFilter && isAdmin) {
      // Only admins can filter by creator
      query = query.eq('created_by', createdByFilter)
    }
    
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    // Log results for URL searches
    if (urlFilter) {
      console.log('[audits-list] URL search found', data?.length || 0, 'audits')
      if (data?.length > 0) {
        console.log('[audits-list] First result:', data[0].target_url, 'status:', data[0].status)
      }
    }

    // Transform to camelCase and flatten contact
    const audits = data.map(a => ({
      id: a.id,
      targetUrl: a.target_url,
      target_url: a.target_url, // Also include snake_case for compatibility
      status: a.status,
      scores: {
        performance: a.performance_score,
        seo: a.seo_score,
        accessibility: a.accessibility_score,
        bestPractices: a.best_practices_score
      },
      fullAuditJson: a.full_audit_json,
      createdAt: a.created_at,
      created_at: a.created_at,
      completedAt: a.completed_at,
      reportStoragePath: a.report_storage_path,
      contactId: a.contact_id,
      projectId: a.project_id,
      deviceType: a.device_type,
      magicToken: a.magic_token,
      magic_token: a.magic_token,
      magicTokenExpiresAt: a.magic_token_expires,
      sent_at: a.sent_at,
      sent_to: a.sent_to,
      createdBy: a.created_by,
      source: a.source,
      contact: a.contacts ? {
        id: a.contacts.id,
        name: a.contacts.name,
        email: a.contacts.email,
        company: a.contacts.company
      } : null
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audits,
        count: audits.length,
        isAdmin
      })
    }

  } catch (error) {
    console.error('Error fetching audits:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch audits' })
    }
  }
}
