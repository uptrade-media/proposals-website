// netlify/functions/proposals-duplicate.js
// Duplicate a proposal as a new draft (without signatures)
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
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
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only team members can duplicate proposals
    if (!contact.team_role) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Team member access required' })
      }
    }

    const { proposalId } = JSON.parse(event.body || '{}')

    if (!proposalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'proposalId is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch the original proposal
    const { data: original, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (fetchError || !original) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Create a new proposal with copied data (without signatures)
    const newProposal = {
      // Copy core content
      title: `${original.title} (Copy)`,
      description: original.description,
      mdx_content: original.mdx_content,
      slug: `${original.slug}-copy-${Date.now()}`,
      
      // Copy pricing
      total_amount: original.total_amount,
      payment_terms: original.payment_terms,
      deposit_percentage: original.deposit_percentage,
      deposit_amount: original.deposit_amount,
      
      // Copy metadata
      timeline: original.timeline,
      hero_image_url: original.hero_image_url,
      brand_name: original.brand_name,
      metadata: original.metadata,
      
      // Copy relationships
      contact_id: original.contact_id,
      project_id: original.project_id,
      org_id: original.org_id,
      organization_id: original.organization_id,
      
      // Reset status to draft
      status: 'draft',
      version: 1,
      
      // Set new creator
      created_by: contact.id,
      
      // Clear all signature data
      client_signature_url: null,
      client_signed_by: null,
      client_signed_at: null,
      client_signed_ip: null,
      client_signed_name: null,
      signed_at: null,
      fully_executed_at: null,
      signed_pdf_path: null,
      
      // Clear deposit data
      deposit_paid_at: null,
      deposit_payment_id: null,
      
      // Clear send data
      sent_at: null,
      sent_to_recipients: null,
      client_email: original.client_email,
      
      // Clear view/decline data
      viewed_at: null,
      declined_at: null,
      declined_reason: null,
      
      // Calculate new valid_until
      valid_until: original.valid_until ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      
      // New timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: created, error: createError } = await supabase
      .from('proposals')
      .insert(newProposal)
      .select()
      .single()

    if (createError) {
      console.error('[ProposalsDuplicate] Create error:', createError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create duplicate proposal' })
      }
    }

    // Transform to camelCase for frontend
    const proposal = {
      id: created.id,
      title: created.title,
      slug: created.slug,
      description: created.description,
      mdxContent: created.mdx_content,
      totalAmount: created.total_amount,
      paymentTerms: created.payment_terms,
      depositPercentage: created.deposit_percentage,
      depositAmount: created.deposit_amount,
      timeline: created.timeline,
      heroImageUrl: created.hero_image_url,
      brandName: created.brand_name,
      metadata: created.metadata,
      contactId: created.contact_id,
      projectId: created.project_id,
      orgId: created.org_id,
      organizationId: created.organization_id,
      status: created.status,
      version: created.version,
      validUntil: created.valid_until,
      clientEmail: created.client_email,
      createdBy: created.created_by,
      createdAt: created.created_at,
      updatedAt: created.updated_at
    }

    console.log(`[ProposalsDuplicate] Created duplicate "${proposal.title}" from ${proposalId}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        proposal,
        message: 'Proposal duplicated successfully'
      })
    }

  } catch (error) {
    console.error('[ProposalsDuplicate] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
