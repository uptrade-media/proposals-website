/**
 * Background function for AI proposal editing (15 min timeout)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * MIGRATED TO SIGNAL: Routes through ProposalsSkill instead of direct OpenAI
 */

import { createClient } from '@supabase/supabase-js'
import { ProposalsSkill } from './skills/proposals-skill.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const UPTRADE_ORG_ID = process.env.UPTRADE_ORG_ID || '00000000-0000-0000-0000-000000000001'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const body = JSON.parse(event.body || '{}')
  const { proposalId, instruction, currentContent, editId, orgId } = body

  if (!proposalId || !instruction || !editId) {
    console.error('[proposals-edit-ai-background] Missing required data:', { proposalId, editId, hasInstruction: !!instruction })
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required data' }) }
  }

  console.log(`[proposals-edit-ai-background] Starting edit for proposal: ${proposalId}, editId: ${editId}`)

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // FETCH CURRENT PROPOSAL SETTINGS
    // ─────────────────────────────────────────────────────────────────────────
    
    const { data: currentProposal } = await supabase
      .from('proposals')
      .select('payment_terms, timeline, total_amount')
      .eq('id', proposalId)
      .single()

    const currentSettings = {
      paymentTerms: currentProposal?.payment_terms || '50-50',
      timeline: currentProposal?.timeline || '6-weeks',
      totalAmount: currentProposal?.total_amount || '0'
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CALL PROPOSALSSKILL
    // ─────────────────────────────────────────────────────────────────────────
    
    const proposalsSkill = new ProposalsSkill(supabase, orgId || UPTRADE_ORG_ID)
    
    console.log('[proposals-edit-ai-background] Calling ProposalsSkill.editProposalFromInstruction()')
    const aiResponse = await proposalsSkill.editProposalFromInstruction(
      currentContent,
      instruction,
      currentSettings
    )

    // ─────────────────────────────────────────────────────────────────────────
    // APPLY UPDATES TO DATABASE
    // ─────────────────────────────────────────────────────────────────────────

    const hasUpdates = aiResponse.updatedContent || aiResponse.updatedPrice || 
                       aiResponse.updatedPaymentTerms || aiResponse.updatedTimeline

    console.log('[proposals-edit-ai-background] AI response fields:', {
      hasUpdatedContent: !!aiResponse.updatedContent,
      updatedPaymentTerms: aiResponse.updatedPaymentTerms || 'NOT INCLUDED',
      updatedTimeline: aiResponse.updatedTimeline || 'NOT INCLUDED',
      updatedPrice: aiResponse.updatedPrice || 'NOT INCLUDED'
    })

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

      const { error: updateError } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId)

      if (updateError) {
        console.error('[proposals-edit-ai-background] Database update error:', updateError)
        throw updateError
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STORE EDIT RESULT IN METADATA
    // ─────────────────────────────────────────────────────────────────────────

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
    
    // Store error in metadata
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

export const config = {
  type: "background"
}
