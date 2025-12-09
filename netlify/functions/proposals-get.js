// netlify/functions/proposals-get.js
// Migrated to Supabase from Neon/Drizzle
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET

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

  // Get proposal slug or ID from query parameter or path
  const identifier = event.queryStringParameters?.id || event.path.split('/').pop()
  const magicToken = event.queryStringParameters?.token
  
  if (!identifier || identifier === 'proposals-get') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Proposal slug or ID required' })
    }
  }

  if (!JWT_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server not configured' })
    }
  }

  // Try magic link token first, then session cookie
  let authPayload = null
  let isMagicLinkAccess = false
  
  if (magicToken) {
    try {
      const tokenPayload = jwt.verify(magicToken, JWT_SECRET)
      // Verify magic token matches this proposal
      if (tokenPayload.proposalId && tokenPayload.recipientEmail) {
        authPayload = {
          email: tokenPayload.recipientEmail,
          role: 'prospect', // Limited role for magic link access
          proposalId: tokenPayload.proposalId
        }
        isMagicLinkAccess = true
      }
    } catch (tokenErr) {
      console.error('Invalid magic token:', tokenErr.message)
      // Fall through to try session cookie
    }
  }
  
  // Try session cookie if no valid magic token
  if (!authPayload) {
    const rawCookie = event.headers.cookie || ''
    const token = rawCookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))?.split('=')[1]
    
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }
    
    try {
      authPayload = jwt.verify(token, JWT_SECRET)
    } catch (sessionErr) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }
  }

  try {
    // Verify user is authenticated
    if (!authPayload.userId && !authPayload.email) {
      console.error('Invalid session token')
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Invalid session' })
      }
    }

    // Check if identifier is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)

    // Fetch proposal by slug or ID
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
          description,
          status,
          start_date,
          end_date
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
      .limit(1)
      .single()

    if (isUUID) {
      query = query.eq('id', identifier)
    } else {
      query = query.eq('slug', identifier)
    }

    const { data: proposal, error } = await query

    if (error || !proposal) {
      console.error('Proposal not found:', error)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Check authorization
    // - Admins can see all proposals
    // - Magic link access: must match the proposal ID from token
    // - Regular clients: must own the proposal
    if (authPayload.role === 'admin') {
      // Admin access - allowed
    } else if (isMagicLinkAccess) {
      // Magic link access - verify proposal ID matches
      const isUUIDToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authPayload.proposalId)
      const tokenMatchesProposal = isUUIDToken 
        ? authPayload.proposalId === proposal.id
        : authPayload.proposalId === proposal.slug
      
      if (!tokenMatchesProposal) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'This link is not valid for this proposal' })
        }
      }
    } else if (proposal.contact_id !== authPayload.userId) {
      // Regular user - must own the proposal
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to view this proposal' })
      }
    }

    // Record view if not admin (first view or magic link access)
    if (authPayload.role !== 'admin') {
      const updateData = {}
      
      // Set viewed_at if first view
      if (!proposal.viewed_at) {
        updateData.viewed_at = new Date().toISOString()
      }
      
      // Update status to 'viewed' if currently 'sent'
      if (proposal.status === 'sent') {
        updateData.status = 'viewed'
      }
      
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('proposals')
          .update(updateData)
          .eq('id', proposal.id)
      }
    }

    // Format response (include full MDX content)
    const formattedProposal = {
      id: proposal.id,
      slug: proposal.slug,
      title: proposal.title,
      description: proposal.description,
      mdxContent: proposal.mdx_content,
      status: proposal.status,
      version: proposal.version,
      totalAmount: proposal.total_amount ? parseFloat(proposal.total_amount) : null,
      validUntil: proposal.valid_until,
      sentAt: proposal.sent_at,
      viewedAt: proposal.viewed_at,
      clientEmail: proposal.client_email,
      signedAt: proposal.signed_at,
      adminSignedAt: proposal.admin_signed_at,
      fullyExecutedAt: proposal.fully_executed_at,
      clientSignature: proposal.client_signature,
      adminSignature: proposal.admin_signature,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      contact: proposal.contact ? {
        id: proposal.contact.id,
        name: proposal.contact.name,
        email: proposal.contact.email,
        company: proposal.contact.company,
        avatar: proposal.contact.avatar
      } : null,
      project: proposal.project ? {
        id: proposal.project.id,
        title: proposal.project.title,
        description: proposal.project.description,
        status: proposal.project.status,
        startDate: proposal.project.start_date,
        endDate: proposal.project.end_date
      } : null,
      lineItems: (proposal.line_items || []).sort((a, b) => a.sort_order - b.sort_order).map(li => ({
        id: li.id,
        serviceType: li.service_type,
        description: li.description,
        quantity: li.quantity,
        unitPrice: parseFloat(li.unit_price),
        total: parseFloat(li.total)
      }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ proposal: formattedProposal })
    }

  } catch (error) {
    console.error('Error fetching proposal:', error)
    
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
        error: 'Failed to fetch proposal',
        message: error.message 
      })
    }
  }
}
