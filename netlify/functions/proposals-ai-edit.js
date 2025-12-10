// netlify/functions/proposals-ai-edit.js
// Chat-based AI editing of proposal content
import OpenAI from 'openai'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

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
  "updatedPrice": 5000 // optional, only if price changed
}

If just answering a question (no changes needed):
{
  "message": "Your helpful response here"
}

Respond with valid JSON only.`

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
    const { proposalId, message, currentContent, conversationHistory = [] } = JSON.parse(event.body || '{}')

    if (!message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message required' }) }
    }

    // Build the prompt
    const systemPrompt = EDIT_PROMPT
      .replace('{{currentContent}}', currentContent || 'No content provided')
      .replace('{{userMessage}}', message)

    // Include conversation history for context
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const aiResponseText = completion.choices[0]?.message?.content || '{}'
    let aiResponse
    
    try {
      aiResponse = JSON.parse(aiResponseText)
    } catch (e) {
      aiResponse = { message: aiResponseText }
    }

    // If content was updated and we have a proposalId, save to database
    if (aiResponse.updatedContent && proposalId) {
      const supabase = createSupabaseAdmin()
      
      const updateData = {
        mdx_content: aiResponse.updatedContent,
        updated_at: new Date().toISOString()
      }
      
      if (aiResponse.updatedPrice) {
        updateData.total_amount = aiResponse.updatedPrice
      }

      await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: aiResponse.message,
        updatedContent: aiResponse.updatedContent || null,
        updatedPrice: aiResponse.updatedPrice || null
      })
    }

  } catch (error) {
    console.error('AI edit error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process edit', details: error.message })
    }
  }
}
