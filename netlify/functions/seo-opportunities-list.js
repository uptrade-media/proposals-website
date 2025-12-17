// netlify/functions/seo-opportunities-list.js
// List opportunities with filtering
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const { 
      siteId, 
      pageId,
      status = 'open',
      priority,
      type,
      sortBy = 'priority',
      page = '1',
      limit = '50'
    } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Site ID is required' }) }
    }

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.role === 'admin' || contact.role === 'super_admin'

    // Verify site access
    const { data: site } = await supabase
      .from('seo_sites')
      .select('id, contact_id')
      .eq('id', siteId)
      .single()

    if (!site || (!isAdmin && site.contact_id !== contact.id)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) }
    }

    // Build query
    let query = supabase
      .from('seo_opportunities')
      .select(`
        *,
        page:seo_pages!seo_opportunities_page_id_fkey(id, path, title)
      `, { count: 'exact' })
      .eq('site_id', siteId)

    // Apply filters
    if (pageId) {
      query = query.eq('page_id', pageId)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (type) {
      query = query.eq('type', type)
    }

    // Apply sorting
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    if (sortBy === 'priority') {
      query = query.order('priority', { ascending: true }).order('created_at', { ascending: false })
    } else if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: false })
    } else if (sortBy === 'type') {
      query = query.order('type', { ascending: true })
    }

    // Apply pagination
    const pageNum = parseInt(page) || 1
    const limitNum = Math.min(parseInt(limit) || 50, 100)
    const offset = (pageNum - 1) * limitNum
    query = query.range(offset, offset + limitNum - 1)

    const { data: opportunities, error: oppsError, count } = await query

    if (oppsError) {
      console.error('[seo-opportunities-list] Error:', oppsError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: oppsError.message }) }
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from('seo_opportunities')
      .select('status, priority')
      .eq('site_id', siteId)

    const summary = {
      total: stats?.length || 0,
      open: stats?.filter(o => o.status === 'open').length || 0,
      inProgress: stats?.filter(o => o.status === 'in-progress').length || 0,
      completed: stats?.filter(o => o.status === 'completed').length || 0,
      dismissed: stats?.filter(o => o.status === 'dismissed').length || 0,
      byPriority: {
        critical: stats?.filter(o => o.status === 'open' && o.priority === 'critical').length || 0,
        high: stats?.filter(o => o.status === 'open' && o.priority === 'high').length || 0,
        medium: stats?.filter(o => o.status === 'open' && o.priority === 'medium').length || 0,
        low: stats?.filter(o => o.status === 'open' && o.priority === 'low').length || 0
      }
    }

    // Format response
    const formattedOpportunities = opportunities?.map(o => ({
      id: o.id,
      pageId: o.page_id,
      page: o.page ? { id: o.page.id, path: o.page.path, title: o.page.title } : null,
      type: o.type,
      priority: o.priority,
      title: o.title,
      description: o.description,
      aiRecommendation: o.ai_recommendation,
      aiConfidence: o.ai_confidence,
      estimatedImpact: o.estimated_impact,
      estimatedEffort: o.estimated_effort,
      currentValue: o.current_value,
      recommendedValue: o.recommended_value,
      supportingData: o.supporting_data,
      status: o.status,
      assignedTo: o.assigned_to,
      completedAt: o.completed_at,
      resultNotes: o.result_notes,
      createdAt: o.created_at,
      updatedAt: o.updated_at
    })) || []

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        opportunities: formattedOpportunities,
        summary,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum)
        }
      })
    }
  } catch (err) {
    console.error('[seo-opportunities-list] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
