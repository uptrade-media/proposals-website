// netlify/functions/proposals-edit-ai-background.js
// Background function for AI proposal editing (15 min timeout)
const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const EDIT_PROMPT = `You are a proposal editor for Uptrade Media. The user wants to make changes to their proposal.

Current proposal content (MDX format):
{{currentContent}}

User's edit request: {{userMessage}}

INSTRUCTIONS:
1. If the user is asking a question about the proposal, answer it helpfully
2. If the user wants changes, make them and return the updated MDX content
3. Keep the same MDX structure and formatting
4. Maintain the professional, conversion-focused tone
5. If changing pricing, update the total appropriately

RESPONSE FORMAT:
If you made changes, respond with JSON:
{
  "message": "Brief description of what you changed",
  "updatedContent": "Full updated MDX content here",
  "updatedPrice": 5000
}

If just answering a question (no changes needed):
{
  "message": "Your helpful response here"
}

Respond with valid JSON only.`

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const body = JSON.parse(event.body || '{}')
  const { proposalId, instruction, currentContent, editId } = body

  if (!proposalId || !instruction || !editId) {
    console.error('[proposals-edit-ai-background] Missing required data:', { proposalId, editId, hasInstruction: !!instruction })
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required data' }) }
  }

  console.log(`[proposals-edit-ai-background] Starting edit for proposal: ${proposalId}, editId: ${editId}`)

  try {
    // Build the prompt
    const systemPrompt = EDIT_PROMPT
      .replace('{{currentContent}}', currentContent || 'No content provided')
      .replace('{{userMessage}}', instruction)

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: instruction }
    ]

    console.log('[proposals-edit-ai-background] Calling OpenAI...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages,
      temperature: 0.7,
      max_completion_tokens: 8000,
      response_format: { type: 'json_object' }
    })

    const aiResponseText = completion.choices[0]?.message?.content || '{}'
    console.log('[proposals-edit-ai-background] Got AI response, parsing...')
    
    let aiResponse
    try {
      aiResponse = JSON.parse(aiResponseText)
    } catch (e) {
      console.error('[proposals-edit-ai-background] Failed to parse AI response:', e)
      aiResponse = { message: aiResponseText }
    }

    // Update the proposal if content was changed
    if (aiResponse.updatedContent) {
      console.log('[proposals-edit-ai-background] Updating proposal in database...')
      
      const updateData = {
        mdx_content: aiResponse.updatedContent,
        updated_at: new Date().toISOString()
      }
      
      if (aiResponse.updatedPrice) {
        updateData.total_amount = aiResponse.updatedPrice
      }

      const { error: updateError } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId)

      if (updateError) {
        console.error('[proposals-edit-ai-background] Database update error:', updateError)
        throw updateError
      }
    }

    // Store the result in a temporary table or the proposal's metadata
    // We'll use proposal_edits table or just update a JSON field
    // For simplicity, store in a proposal_ai_edits cache table or localStorage approach via status
    
    // Update the edit status in a simple cache (using proposal metadata)
    const { data: proposal } = await supabase
      .from('proposals')
      .select('metadata')
      .eq('id', proposalId)
      .single()

    const metadata = proposal?.metadata || {}
    metadata.lastAiEdit = {
      editId,
      message: aiResponse.message || 'Changes applied successfully',
      hasChanges: !!aiResponse.updatedContent,
      updatedPrice: aiResponse.updatedPrice || null,
      completedAt: new Date().toISOString()
    }

    await supabase
      .from('proposals')
      .update({ metadata })
      .eq('id', proposalId)

    console.log(`[proposals-edit-ai-background] Edit complete for ${editId}`)

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, editId })
    }

  } catch (error) {
    console.error('[proposals-edit-ai-background] Error:', error)
    
    // Store error in metadata so frontend can retrieve it
    try {
      const { data: proposal } = await supabase
        .from('proposals')
        .select('metadata')
        .eq('id', proposalId)
        .single()

      const metadata = proposal?.metadata || {}
      metadata.lastAiEdit = {
        editId,
        error: error.message || 'Failed to process edit',
        completedAt: new Date().toISOString()
      }

      await supabase
        .from('proposals')
        .update({ metadata })
        .eq('id', proposalId)
    } catch (e) {
      console.error('[proposals-edit-ai-background] Failed to store error:', e)
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process edit', details: error.message })
    }
  }
}
