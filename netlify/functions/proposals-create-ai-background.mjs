/**
 * Background function for AI proposal generation (15 min timeout)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * MIGRATED TO SIGNAL: Routes through ProposalsSkill instead of direct OpenAI
 * 
 * This keeps business logic (line items, invoices, slug generation) but
 * delegates AI generation to ProposalsSkill.draftProposalFromForm()
 */

import { createClient } from '@supabase/supabase-js'
import { ProposalsSkill } from './skills/proposals-skill.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Default org ID for Uptrade Media (used when no org context)
const UPTRADE_ORG_ID = process.env.UPTRADE_ORG_ID || '00000000-0000-0000-0000-000000000001'

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const body = JSON.parse(event.body || '{}')
  const { proposalId, formData, createdBy, orgId } = body

  if (!proposalId || !formData) {
    console.error('[proposal-ai-background] Missing proposalId or formData')
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required data' }) }
  }

  console.log(`[proposal-ai-background] Starting generation for proposal: ${proposalId}`)

  try {
    const { contactId, pricing, validUntil } = formData

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE PROPOSAL VIA PROPOSALSSKILL
    // ─────────────────────────────────────────────────────────────────────────
    
    const proposalsSkill = new ProposalsSkill(supabase, orgId || UPTRADE_ORG_ID, {
      userId: createdBy
    })

    console.log('[proposal-ai-background] Calling ProposalsSkill.draftProposalFromForm()')
    const aiContent = await proposalsSkill.draftProposalFromForm(formData)

    if (!aiContent || !aiContent.mdxContent) {
      throw new Error('AI did not return valid proposal content')
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SAVE PROPOSAL TO DATABASE
    // ─────────────────────────────────────────────────────────────────────────

    const proposalSlug = generateSlug(aiContent.title) + '-' + Date.now()

    const validUntilDate = validUntil || (() => {
      const date = new Date()
      date.setDate(date.getDate() + (aiContent.suggestedValidDays || 30))
      return date.toISOString().split('T')[0]
    })()

    const { data: proposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        slug: proposalSlug,
        title: aiContent.title,
        description: aiContent.description,
        mdx_content: aiContent.mdxContent,
        status: 'draft',
        total_amount: aiContent.totalAmount ? String(aiContent.totalAmount) : null,
        valid_until: validUntilDate
      })
      .eq('id', proposalId)
      .select()
      .single()

    if (updateError) {
      console.error('[proposal-ai-background] Update proposal error:', updateError)
      throw updateError
    }

    console.log(`[proposal-ai-background] Proposal generated successfully: ${proposalId}`)

    // ─────────────────────────────────────────────────────────────────────────
    // INSERT LINE ITEMS
    // ─────────────────────────────────────────────────────────────────────────

    if (aiContent.lineItems && aiContent.lineItems.length > 0) {
      try {
        const lineItemsToInsert = aiContent.lineItems.map((item, index) => ({
          proposal_id: proposalId,
          title: item.description?.substring(0, 100) || item.title || 'Service',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || 0,
          total_price: item.total || (item.quantity || 1) * (item.unitPrice || 0),
          item_type: item.serviceType || 'service',
          is_optional: false,
          selected: true,
          sort_order: index
        }))

        const { error: lineItemsError } = await supabase
          .from('proposal_line_items')
          .insert(lineItemsToInsert)
        
        if (lineItemsError) {
          console.log('[proposal-ai-background] Line items insert error:', lineItemsError.message)
        }
      } catch (lineItemsError) {
        console.log('[proposal-ai-background] Line items error:', lineItemsError.message)
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE DRAFT RECURRING INVOICE (if monthly retainers selected)
    // ─────────────────────────────────────────────────────────────────────────

    const recurringAddOns = pricing?.addOns?.filter(a => a.isRecurring) || []
    if (recurringAddOns.length > 0 && contactId) {
      try {
        const monthlyTotal = recurringAddOns.reduce((sum, a) => sum + (a.price || 0), 0)
        const itemDescriptions = recurringAddOns.map(a => a.name).join(', ')
        
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            contact_id: contactId,
            proposal_id: proposalId,
            status: 'draft',
            amount: monthlyTotal.toString(),
            currency: 'USD',
            description: `Monthly Retainer: ${itemDescriptions}`,
            is_recurring: true,
            recurring_interval: 'monthly',
            notes: `Auto-generated from proposal. Monthly services: ${recurringAddOns.map(a => `${a.name} ($${a.price}/mo)`).join(', ')}`
          })
          .select()
          .single()
        
        if (invoiceError) {
          console.log('[proposal-ai-background] Draft invoice create error:', invoiceError.message)
        } else {
          console.log(`[proposal-ai-background] Draft recurring invoice created: ${invoice?.id}`)
        }
      } catch (invoiceError) {
        console.log('[proposal-ai-background] Invoice error:', invoiceError.message)
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, proposalId }) }

  } catch (error) {
    console.error('[proposal-ai-background] Error:', error)
    
    // Update proposal with error status
    await supabase
      .from('proposals')
      .update({ 
        status: 'failed', 
        description: `Generation failed: ${error.message}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}

// Mark as background function (15 minute timeout)
export const config = {
  type: "background"
}
