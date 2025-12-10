// netlify/functions/proposals-update.js
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
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Get proposal ID from path
  const proposalId = event.path.split('/').pop()
  if (!proposalId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Proposal ID required' })
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

    // Only admins can update proposals
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can update proposals' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      title,
      description,
      mdxContent,
      status,
      totalAmount,
      validUntil,
      projectId,
      lineItems
    } = body

    // Check if proposal exists
    const { data: existingProposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id, status')
      .eq('id', proposalId)
      .single()

    if (fetchError || !existingProposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Build update object (only include fields that were provided)
    const updates = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (mdxContent !== undefined) updates.mdx_content = mdxContent
    if (status !== undefined) updates.status = status
    if (totalAmount !== undefined) updates.total_amount = totalAmount ? String(totalAmount) : null
    if (validUntil !== undefined) updates.valid_until = validUntil || null
    if (projectId !== undefined) updates.project_id = projectId || null

    // Update proposal
    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', proposalId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    // Update line items if provided
    if (lineItems && Array.isArray(lineItems)) {
      // Delete existing line items
      await supabase
        .from('proposal_line_items')
        .delete()
        .eq('proposal_id', proposalId)

      // Insert new line items
      if (lineItems.length > 0) {
        const lineItemsToInsert = lineItems.map((item, index) => ({
          proposal_id: proposalId,
          service_type: item.serviceType || 'custom',
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unitPrice,
          total: (item.quantity || 1) * item.unitPrice,
          sort_order: index
        }))

        const { error: lineItemsError } = await supabase
          .from('proposal_line_items')
          .insert(lineItemsToInsert)

        if (lineItemsError) {
          console.error('Line items error:', lineItemsError)
          // Non-fatal, continue
        }
      }
    }

    // Format response
    const formattedProposal = {
      id: updatedProposal.id,
      contactId: updatedProposal.contact_id,
      projectId: updatedProposal.project_id,
      slug: updatedProposal.slug,
      title: updatedProposal.title,
      description: updatedProposal.description,
      mdxContent: updatedProposal.mdx_content,
      status: updatedProposal.status,
      totalAmount: updatedProposal.total_amount ? parseFloat(updatedProposal.total_amount) : null,
      validUntil: updatedProposal.valid_until,
      signedAt: updatedProposal.signed_at,
      adminSignedAt: updatedProposal.admin_signed_at,
      fullyExecutedAt: updatedProposal.fully_executed_at,
      createdAt: updatedProposal.created_at,
      updatedAt: updatedProposal.updated_at
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        proposal: formattedProposal,
        message: 'Proposal updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating proposal:', error)
    
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
        error: 'Failed to update proposal',
        message: error.message 
      })
    }
  }
}
