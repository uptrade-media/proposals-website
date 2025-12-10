// netlify/functions/proposals-list.js
// Migrated to Supabase
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    // Parse query parameters for filtering
    const queryParams = event.queryStringParameters || {}
    const { projectId, status, contactId } = queryParams

    // Build query
    let query = supabase
      .from('proposals')
      .select(`
        *,
        contact:contacts!proposals_contact_id_fkey (
          id,
          name,
          email,
          company,
          avatar
        ),
        project:projects!proposals_project_id_fkey (
          id,
          title,
          status
        ),
        line_items:proposal_line_items (
          id,
          service_type,
          description,
          quantity,
          unit_price,
          total,
          sort_order
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by user role
    if (payload.role !== 'admin') {
      query = query.eq('contact_id', payload.userId)
    } else if (contactId) {
      // Admins can filter by specific contact
      query = query.eq('contact_id', contactId)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: proposals, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Format response
    const formattedProposals = (proposals || []).map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      status: p.status,
      version: p.version,
      totalAmount: p.total_amount ? parseFloat(p.total_amount) : null,
      validUntil: p.valid_until,
      sentAt: p.sent_at,
      viewedAt: p.viewed_at,
      signedAt: p.signed_at,
      adminSignedAt: p.admin_signed_at,
      fullyExecutedAt: p.fully_executed_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      // Include contact info for admin view
      ...(payload.role === 'admin' && p.contact ? {
        contact: {
          id: p.contact.id,
          name: p.contact.name,
          email: p.contact.email,
          company: p.contact.company,
          avatar: p.contact.avatar
        }
      } : {}),
      // Include project info if linked
      ...(p.project ? {
        project: {
          id: p.project.id,
          title: p.project.title,
          status: p.project.status
        }
      } : {}),
      // Include line items
      lineItems: (p.line_items || []).sort((a, b) => a.sort_order - b.sort_order).map(li => ({
        id: li.id,
        serviceType: li.service_type,
        description: li.description,
        quantity: li.quantity,
        unitPrice: parseFloat(li.unit_price),
        total: parseFloat(li.total)
      }))
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        proposals: formattedProposals,
        total: formattedProposals.length
      })
    }

  } catch (error) {
    console.error('Error fetching proposals:', error)
    
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
        error: 'Failed to fetch proposals',
        message: error.message 
      })
    }
  }
}
