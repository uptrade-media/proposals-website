// netlify/functions/proposals-ai-edit.js
// Chat-based AI editing of proposal content - uses Signal ProposalsSkill
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { ProposalsSkill } from './skills/proposals-skill.js'

// Helper to display payment terms in human-readable format
function formatPaymentTermsDisplay(value) {
  const terms = {
    '50-50': '50% upfront, 50% on completion',
    '100-upfront': '100% upfront',
    '25-25-25-25': '25% quarterly milestones',
    'monthly': 'Monthly billing',
    'custom': 'Custom terms'
  }
  return terms[value] || value || '50% upfront, 50% on completion'
}

// Helper to display timeline in human-readable format
function formatTimelineDisplay(value) {
  if (!value) return '6 weeks'
  const match = value.match(/^(\d+)-?weeks?$/i)
  if (match) return `${match[1]} weeks`
  const monthMatch = value.match(/^(\d+)-?months?$/i)
  if (monthMatch) return `${monthMatch[1]} months`
  if (value === 'ongoing') return 'Ongoing'
  return value.replace(/-/g, ' ')
}

const EDIT_PROMPT = `You are a proposal editor for Uptrade Media. The user wants to make changes to their proposal.

Current proposal content (MDX format):
{{currentContent}}

Current proposal DATABASE settings (THESE ARE WHAT DISPLAY IN THE UI):
- Payment Terms: {{paymentTerms}}
- Timeline: {{timeline}}
- Total Price: ${{totalAmount}}
- Valid Until: {{validUntil}}

User's edit request: {{userMessage}}

CRITICAL: The "Payment Terms", "Timeline", and "Total Price" shown above are the DATABASE values that display in the proposal hero/header. If the user asks to change these, you MUST return the structured fields to update the database, even if the MDX content already mentions them.

INSTRUCTIONS:
1. If the user is asking a question about the proposal, answer it helpfully
2. If the user wants changes, make them and return ALL the updated values
3. Keep the same MDX structure and formatting when updating content
4. Maintain the professional, conversion-focused tone
5. ALWAYS include the structured field when changing settings:
   - Changing payment terms → MUST include "updatedPaymentTerms"
   - Changing timeline → MUST include "updatedTimeline"  
   - Changing price → MUST include "updatedPrice"

PAYMENT TERMS VALUES (use exact string):
- "50-50" = 50% upfront, 50% on completion
- "100-upfront" = 100% upfront
- "25-25-25-25" = 25% quarterly milestones  
- "monthly" = Monthly billing
- "custom" = Custom terms

TIMELINE VALUES (use exact format):
- "6-weeks", "8-weeks", "12-weeks", "3-months", "ongoing", etc.

RESPONSE FORMAT - JSON only:
{
  "message": "Brief description of what you changed",
  "updatedContent": "Full updated MDX content (if content changed)",
  "updatedPrice": 5000,
  "updatedPaymentTerms": "50-50",
  "updatedTimeline": "8-weeks",
  "updatedValidUntil": "2025-02-01"
}

Only include fields that changed. If user asks to change payment terms to 50/50, you MUST include:
"updatedPaymentTerms": "50-50"

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
    const { proposalId, message, currentContent, conversationHistory = [], proposalData = {} } = JSON.parse(event.body || '{}')

    if (!message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message required' }) }
    }

    // Get current proposal data from database if proposalId provided
    let currentProposal = proposalData
    if (proposalId) {
      const supabase = createSupabaseAdmin()
      const { data: dbProposal } = await supabase
        .from('proposals')
        .select('payment_terms, timeline, total_amount, valid_until, mdx_content')
        .eq('id', proposalId)
        .single()
      
      if (dbProposal) {
        currentProposal = {
          paymentTerms: dbProposal.payment_terms || proposalData.paymentTerms || '50-50',
          timeline: dbProposal.timeline || proposalData.timeline || '6-weeks',
          totalAmount: dbProposal.total_amount || proposalData.totalAmount || '0',
          validUntil: dbProposal.valid_until || proposalData.validUntil || 'Not set'
        }
      }
    }

    // Build the prompt with current settings
    const systemPrompt = EDIT_PROMPT
      .replace('{{currentContent}}', currentContent || 'No content provided')
      .replace('{{userMessage}}', message)
      .replace('{{paymentTerms}}', formatPaymentTermsDisplay(currentProposal.paymentTerms))
      .replace('{{timeline}}', formatTimelineDisplay(currentProposal.timeline))
      .replace('{{totalAmount}}', currentProposal.totalAmount || '0')
      .replace('{{validUntil}}', currentProposal.validUntil || 'Not set')

    // Use ProposalsSkill for AI refinement
    const supabase = createSupabaseAdmin()
    const proposalsSkill = new ProposalsSkill(supabase, null, { userId: contact.id })
    
    console.log('[proposals-ai-edit] Using ProposalsSkill for refinement')
    
    const result = await proposalsSkill.refineWithChat(
      proposalId,
      currentContent,
      message,
      conversationHistory.slice(-6)
    )
    
    const aiResponseText = typeof result === 'string' ? result : JSON.stringify(result)
    console.log('[proposals-ai-edit] Full AI response:', aiResponseText)
    
    let aiResponse
    
    try {
      aiResponse = JSON.parse(aiResponseText)
      console.log('[proposals-ai-edit] Parsed AI response fields:', {
        hasMessage: !!aiResponse.message,
        hasUpdatedContent: !!aiResponse.updatedContent,
        hasUpdatedPrice: !!aiResponse.updatedPrice,
        updatedPaymentTerms: aiResponse.updatedPaymentTerms || 'NOT INCLUDED',
        updatedTimeline: aiResponse.updatedTimeline || 'NOT INCLUDED'
      })
    } catch (e) {
      console.log('[proposals-ai-edit] Failed to parse JSON:', e.message)
      aiResponse = { message: aiResponseText }
    }

    // Check if any updates were made
    const hasUpdates = aiResponse.updatedContent || aiResponse.updatedPrice || 
                       aiResponse.updatedPaymentTerms || aiResponse.updatedTimeline ||
                       aiResponse.updatedValidUntil

    // If any field was updated and we have a proposalId, save to database
    if (hasUpdates && proposalId) {
      const supabase = createSupabaseAdmin()
      
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
      }
      if (aiResponse.updatedTimeline) {
        updateData.timeline = aiResponse.updatedTimeline
      }
      if (aiResponse.updatedValidUntil) {
        updateData.valid_until = aiResponse.updatedValidUntil
      }

      console.log('[proposals-ai-edit] Updating proposal:', proposalId, updateData)

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
        updatedPrice: aiResponse.updatedPrice || null,
        updatedPaymentTerms: aiResponse.updatedPaymentTerms || null,
        updatedTimeline: aiResponse.updatedTimeline || null,
        updatedValidUntil: aiResponse.updatedValidUntil || null
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
