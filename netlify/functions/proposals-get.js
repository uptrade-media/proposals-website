// netlify/functions/proposals-get.js
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

  // Get proposal slug or ID from query parameter or path
  const identifier = event.queryStringParameters?.id || event.path.split('/').pop()
  
  if (!identifier || identifier === 'proposals-get') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Proposal slug or ID required' })
    }
  }

  // Authenticate with Supabase session (magic links create sessions automatically)
  // Note: Magic link recipients might not have a contact record yet
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  // We need at least a verified Supabase user
  if (!user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: authError?.message || 'Not authenticated' })
    }
  }

  try {
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
          title,
          item_type,
          description,
          quantity,
          unit_price,
          total_price,
          is_optional,
          selected,
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
    // - Clients with a contact record can see their own proposals
    // - Magic link recipients can see proposals sent to their email (client_email match)
    const isAdmin = contact?.role === 'admin'
    const isOwner = contact && proposal.contact_id === contact.id
    const isRecipient = proposal.client_email && user.email && 
                        proposal.client_email.toLowerCase() === user.email.toLowerCase()
    
    if (!isAdmin && !isOwner && !isRecipient) {
      console.log('[proposals-get] Access denied:', {
        userEmail: user.email,
        contactId: contact?.id,
        proposalContactId: proposal.contact_id,
        clientEmail: proposal.client_email
      })
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to view this proposal' })
      }
    }

    // Record view if not admin (first view)
    if (!isAdmin) {
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
      heroImageUrl: proposal.hero_image_url,
      brandName: proposal.brand_name,
      status: proposal.status,
      version: proposal.version,
      totalAmount: proposal.total_amount ? parseFloat(proposal.total_amount) : null,
      timeline: proposal.timeline,
      paymentTerms: proposal.payment_terms,
      validUntil: proposal.valid_until,
      sentAt: proposal.sent_at,
      viewedAt: proposal.viewed_at,
      clientEmail: proposal.client_email,
      signedAt: proposal.signed_at,
      adminSignedAt: proposal.admin_signed_at,
      fullyExecutedAt: proposal.fully_executed_at,
      // Client signature fields
      clientSignature: proposal.client_signature,
      clientSignatureUrl: proposal.client_signature_url,
      clientSignedBy: proposal.client_signed_by,
      clientSignedAt: proposal.client_signed_at,
      // Admin signature fields
      adminSignature: proposal.admin_signature,
      adminSignatureUrl: proposal.admin_signature_url,
      adminSignedBy: proposal.admin_signed_by,
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
        title: li.title,
        itemType: li.item_type,
        description: li.description,
        quantity: li.quantity,
        unitPrice: parseFloat(li.unit_price),
        total: parseFloat(li.total_price),
        isOptional: li.is_optional,
        selected: li.selected
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
