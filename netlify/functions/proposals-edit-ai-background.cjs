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

Current proposal DATABASE settings (THESE ARE WHAT DISPLAY IN THE UI HEADER):
- Payment Terms: {{paymentTerms}}
- Timeline: {{timeline}}
- Total Price: ${{totalAmount}}

User's edit request: {{userMessage}}

CRITICAL: The "Payment Terms", "Timeline", and "Total Price" shown above are the DATABASE values that display in the proposal header. If the user asks to change these, you MUST return the corresponding structured field.

INSTRUCTIONS:
1. If the user wants changes, make them and return ALL updated values
2. Keep the same MDX structure and formatting
3. ALWAYS include the structured field when changing settings:
   - Changing payment terms → MUST include "updatedPaymentTerms" with exact value
   - Changing timeline → MUST include "updatedTimeline" with exact value
   - Changing price → MUST include "updatedPrice"

PAYMENT TERMS VALUES (use exact string):
- "50-50" = 50% upfront, 50% on completion
- "100-upfront" = 100% upfront
- "25-25-25-25" = 25% quarterly milestones  
- "monthly" = Monthly billing

TIMELINE VALUES (use exact format):
- "6-weeks", "8-weeks", "12-weeks", "3-months", "ongoing", etc.

RESPONSE FORMAT - JSON only:
{
  "message": "Brief description of what you changed",
  "updatedContent": "Full updated MDX content (if content changed)",
  "updatedPrice": 5000,
  "updatedPaymentTerms": "50-50",
  "updatedTimeline": "8-weeks"
}

IMPORTANT: If user asks to change payment terms to 50/50, you MUST include:
"updatedPaymentTerms": "50-50"

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
    // Fetch current proposal settings from database
    const { data: currentProposal } = await supabase
      .from('proposals')
      .select('payment_terms, timeline, total_amount')
      .eq('id', proposalId)
      .single()

    const paymentTermsMap = {
      '50-50': '50% upfront, 50% on completion',
      '100-upfront': '100% upfront',
      '25-25-25-25': '25% quarterly milestones',
      'monthly': 'Monthly billing'
    }
    
    const currentPaymentTerms = currentProposal?.payment_terms || '50-50'
    const currentTimeline = currentProposal?.timeline || '6-weeks'
    const currentAmount = currentProposal?.total_amount || '0'

    // Build the prompt with current settings
    const systemPrompt = EDIT_PROMPT
      .replace('{{currentContent}}', currentContent || 'No content provided')
      .replace('{{userMessage}}', instruction)
      .replace('{{paymentTerms}}', paymentTermsMap[currentPaymentTerms] || currentPaymentTerms)
      .replace('{{timeline}}', currentTimeline.replace('-', ' '))
      .replace('{{totalAmount}}', currentAmount)

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

    // Check if any updates were made
    const hasUpdates = aiResponse.updatedContent || aiResponse.updatedPrice || 
                       aiResponse.updatedPaymentTerms || aiResponse.updatedTimeline

    console.log('[proposals-edit-ai-background] AI response fields:', {
      hasUpdatedContent: !!aiResponse.updatedContent,
      updatedPaymentTerms: aiResponse.updatedPaymentTerms || 'NOT INCLUDED',
      updatedTimeline: aiResponse.updatedTimeline || 'NOT INCLUDED',
      updatedPrice: aiResponse.updatedPrice || 'NOT INCLUDED'
    })

    // Update the proposal if any changes were made
    if (hasUpdates) {
      console.log('[proposals-edit-ai-background] Updating proposal in database...')
      
      const updateData = {
        updated_at: new Date().toISOString()
      }
      
      if (aiResponse.updatedContent) {
        updateData.mdx_content = aiResponse.updatedContent
      }
      if (aiResponse.updatedPrice) {
        updateData.total_amount = String(aiResponse.updatedPrice)
      }
      if (aiResponse.updatedPaymentTerms) {
        updateData.payment_terms = aiResponse.updatedPaymentTerms
        console.log('[proposals-edit-ai-background] Setting payment_terms to:', aiResponse.updatedPaymentTerms)
      }
      if (aiResponse.updatedTimeline) {
        updateData.timeline = aiResponse.updatedTimeline
        console.log('[proposals-edit-ai-background] Setting timeline to:', aiResponse.updatedTimeline)
      }

      console.log('[proposals-edit-ai-background] Update data:', updateData)

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
