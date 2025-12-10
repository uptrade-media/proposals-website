// netlify/functions/proposals-update-ai.js
// Update an existing proposal based on AI instruction
import OpenAI from 'openai'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const UPDATE_PROMPT = `You are updating a proposal for Uptrade Media based on the user's instruction.

Current proposal content (MDX format):
{{currentContent}}

User's instruction: {{instruction}}

INSTRUCTIONS:
1. Make the requested changes while maintaining the proposal's professional tone
2. Keep the same MDX structure and formatting
3. Preserve urgency triggers and conversion elements
4. If changing pricing, ensure it's reflected in the investment section

Return the complete updated MDX content only, no explanations.`

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

    // Build the prompt
    const systemPrompt = UPDATE_PROMPT
      .replace('{{currentContent}}', proposal.mdx_content || '')
      .replace('{{instruction}}', instruction)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please update the proposal according to this instruction: ${instruction}` }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })

    const updatedContent = completion.choices[0]?.message?.content || ''

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
