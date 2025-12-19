// netlify/functions/projects-list.js
// Migrated to Supabase from Neon/Drizzle
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication via Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    // Get query parameters for filtering
    const queryParams = event.queryStringParameters || {}
    const { status, contactId, limit: limitParam, offset: offsetParam } = queryParams
    const limit = Math.min(parseInt(limitParam) || 50, 100)
    const offset = parseInt(offsetParam) || 0

    // Build query
    let query = supabase
      .from('projects')
      .select(`
        *,
        contact:contacts!projects_contact_id_fkey (
          id,
          name,
          email,
          company,
          avatar
        ),
        proposals (
          id,
          title,
          status,
          total_amount
        )
      `)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by user role
    if (contact.role !== 'admin') {
      query = query.eq('contact_id', contact.id)
    } else if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: projects, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Format response
    const formattedProjects = (projects || []).map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      budget: p.budget ? parseFloat(p.budget) : null,
      startDate: p.start_date,
      start_date: p.start_date, // Include snake_case for frontend compatibility
      endDate: p.end_date,
      end_date: p.end_date, // Include snake_case for frontend compatibility
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      // Include contact_id directly for edit operations
      contact_id: p.contact_id,
      // Tenant fields
      is_tenant: p.is_tenant || false,
      tenant_domain: p.tenant_domain || null,
      tenant_features: p.tenant_features || [],
      tenant_tracking_id: p.tenant_tracking_id || null,
      // Transform features array to modules object for frontend compatibility
      tenant_modules: (p.tenant_features || []).reduce((acc, f) => ({ ...acc, [f]: true }), {}),
      // Include contact info for admin view
      ...(contact.role === 'admin' && p.contact ? {
        contact: {
          id: p.contact.id,
          name: p.contact.name,
          email: p.contact.email,
          company: p.contact.company,
          avatar: p.contact.avatar
        },
        client_name: p.contact.name || p.contact.company
      } : {}),
      // Include proposals summary
      proposals: (p.proposals || []).map(prop => ({
        id: prop.id,
        title: prop.title,
        status: prop.status,
        totalAmount: prop.total_amount ? parseFloat(prop.total_amount) : null
      }))
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        projects: formattedProjects,
        total: formattedProjects.length,
        offset,
        limit
      })
    }

  } catch (error) {
    console.error('Error fetching projects:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch projects',
        message: error.message 
      })
    }
  }
}
