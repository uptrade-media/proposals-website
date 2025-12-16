// netlify/functions/proposals-list.js
// Migrated to Supabase
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { requireTeamMember, applyOwnershipFilter } from './utils/permissions.js'

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
    const supabase = createSupabaseAdmin()

    console.log('Fetching proposals...')

    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    console.log('Auth result:', { 
      hasContact: !!contact, 
      role: contact?.role,
      teamRole: contact?.team_role,
      authError: authError 
    })
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
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

    // Parse query parameters for filtering
    const queryParams = event.queryStringParameters || {}
    const { projectId, status, contactId, createdBy } = queryParams
    const isAdmin = contact.team_role === 'admin' || contact.team_role === 'manager'

    // Build query (note: proposal_line_items table doesn't exist in schema)
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
        )
      `)
      .order('created_at', { ascending: false })

    // Apply ownership filter (reps only see their proposals, admins see all)
    query = applyOwnershipFilter(query, contact, 'created_by')

    // Apply optional filters
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    
    if (createdBy && isAdmin) {
      // Only admins can filter by creator
      query = query.eq('created_by', createdBy)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: proposals, error } = await query

    console.log('Query result:', { 
      proposalCount: proposals?.length || 0, 
      hasError: !!error,
      errorMessage: error?.message 
    })

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
      createdBy: p.created_by,
      assignedTo: p.assigned_to,
      // Include contact info for admin/manager view
      ...(isAdmin && p.contact ? {
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
      } : {})
      // Note: lineItems removed - proposal_line_items table doesn't exist in schema
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
    console.error('Error stack:', error.stack)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
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
        message: error.message,
        details: error.toString()
      })
    }
  }
}
