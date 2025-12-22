// netlify/functions/email-templates-list.js
// List email templates - includes global templates and org-specific templates

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

  const supabase = createSupabaseAdmin()
  const params = event.queryStringParameters || {}
  const category = params.category
  const includeGlobal = params.includeGlobal !== 'false' // default true
  
  // Get authenticated user (optional - unauthenticated users can see global templates only)
  const { contact } = await getAuthenticatedUser(event)

  try {
    let orgId = null
    
    // Get org ID if authenticated
    if (contact) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('contact_id', contact.id)
        .single()
      
      if (membership) {
        orgId = membership.organization_id
      }
    }
    
    // Build query to get templates
    let query = supabase
      .from('email_templates')
      .select('id, name, description, category, thumbnail, html, json_content, is_global, is_active, use_count, created_at')
      .eq('is_active', true)
      .order('use_count', { ascending: false })
    
    // Filter by category if specified
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    
    // Build OR filter for global + org templates
    if (orgId && includeGlobal) {
      query = query.or(`is_global.eq.true,org_id.eq.${orgId}`)
    } else if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      // Unauthenticated - global only
      query = query.eq('is_global', true)
    }
    
    const { data: templates, error } = await query

    if (error) throw error
    
    // Build category counts
    const categoryCounts = {}
    ;(templates || []).forEach(t => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1
    })
    
    const categories = [
      { id: 'all', name: 'All Templates', count: templates?.length || 0 },
      { id: 'welcome', name: 'Welcome & Onboarding', count: categoryCounts.welcome || 0 },
      { id: 'newsletter', name: 'Newsletters', count: categoryCounts.newsletter || 0 },
      { id: 'promotional', name: 'Promotional', count: categoryCounts.promotional || 0 },
      { id: 'transactional', name: 'Transactional', count: categoryCounts.transactional || 0 },
      { id: 'announcement', name: 'Announcements', count: categoryCounts.announcement || 0 },
      { id: 'reengagement', name: 'Re-Engagement', count: categoryCounts.reengagement || 0 },
      { id: 'custom', name: 'Custom', count: categoryCounts.custom || 0 }
    ].filter(c => c.id === 'all' || c.count > 0)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ templates: templates || [], categories })
    }

  } catch (error) {
    console.error('[email-templates-list] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
