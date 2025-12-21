// netlify/functions/proposals-update-ai.js
// Update an existing proposal based on AI instruction - uses Signal ProposalsSkill
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { ProposalsSkill } from './skills/proposals-skill.js'

// Note: Proposal editing prompts are now handled by ProposalsSkill

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    const { proposalId, instruction } = JSON.parse(event.body || '{}')

    if (!proposalId || !instruction) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Proposal ID and instruction required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Fetch the current proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (fetchError || !proposal) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Proposal not found' }) }
    }

    // Use ProposalsSkill for AI editing
    const proposalsSkill = new ProposalsSkill(supabase, null, { userId: contact.id })
    
    console.log('[proposals-update-ai] Using ProposalsSkill for update')
    
    const result = await proposalsSkill.editSection(
      proposalId,
      'full', // Edit full content
      proposal.mdx_content,
      instruction
    )

    const updatedContent = typeof result === 'string' ? result : (result.content || result.mdxContent || '')

    // Update the proposal in the database
    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        mdx_content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Failed to update proposal:', updateError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to save updated proposal' }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        proposal: {
          id: updatedProposal.id,
          title: updatedProposal.title,
          mdxContent: updatedProposal.mdx_content,
          totalAmount: updatedProposal.total_amount,
          status: updatedProposal.status,
          updatedAt: updatedProposal.updated_at
        }
      })
    }

  } catch (error) {
    console.error('AI update error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update proposal', details: error.message })
    }
  }
}
