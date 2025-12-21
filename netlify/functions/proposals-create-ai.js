// netlify/functions/proposals-create-ai.js
// AI-powered proposal generator - uses Signal ProposalsSkill
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'
import { ProposalsSkill } from './skills/proposals-skill.js'
import { PROPOSAL_STYLE } from './utils/proposal-blocks.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Note: PROPOSAL_STYLE is now imported from utils/proposal-blocks.js
// The ProposalsSkill uses it internally for consistent AI prompts

// Generate URL-safe slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
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

  // Authenticate using Supabase
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  // Only admins can create proposals
  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Only admins can create proposals' })
    }
  }

  try {

    // Parse request body
    const formData = JSON.parse(event.body || '{}')
    
    // Support both old and new format
    const { 
      contactId,
      projectId,
      // Old format
      clientName: legacyClientName,
      clientCompany: legacyClientCompany,
      projectType: legacyProjectType,
      services,
      budget,
      timeline: legacyTimeline,
      goals: legacyGoals,
      challenges: legacyChallenges,
      notes: legacyNotes,
      validUntil,
      // New format from ProposalAIDialog
      proposalType,
      pricing,
      clientInfo,
      projectInfo,
      heroImageUrl,
      auditResults,
      aiConversation
    } = formData

    // Normalize data from either format
    const clientName = clientInfo?.name || legacyClientName
    const clientCompany = clientInfo?.company || legacyClientCompany
    const brandName = clientInfo?.brandName || clientCompany || clientName
    const clientIndustry = clientInfo?.industry || 'Not specified'
    const projectType = proposalType || legacyProjectType
    const timeline = projectInfo?.timeline || legacyTimeline
    const startDate = projectInfo?.startDate
    const goals = projectInfo?.goals || legacyGoals
    const challenges = projectInfo?.challenges || legacyChallenges
    const websiteUrl = projectInfo?.websiteUrl
    const notes = projectInfo?.notes || legacyNotes
    const context = projectInfo?.context
    const totalPrice = pricing?.totalPrice || pricing?.basePrice || budget
    const addOns = pricing?.addOns || formData.addOns || []
    const paymentTerms = pricing?.paymentTerms

    // Validate required fields
    if (!contactId || !clientName || !projectType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['contactId', 'clientName/clientInfo.name', 'projectType/proposalType']
        })
      }
    }

    // Verify contact exists
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, company')
      .eq('id', contactId)
      .single()

    if (contactError || !contactData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    console.log('[Proposal AI] Generating proposal for:', brandName, projectType)
    console.log('[Proposal AI] Audit results:', auditResults ? 'Present' : 'Not provided')

    // Build audit data section for the AI prompt
    let auditSection = ''
    if (auditResults) {
      auditSection = `
WEBSITE AUDIT DATA (Use this to inform your proposal with specific issues to address):
- Website: ${websiteUrl || 'Current website'}
- Performance Score: ${auditResults.performance || 'N/A'}/100
- SEO Score: ${auditResults.seo || 'N/A'}/100
- Accessibility Score: ${auditResults.accessibility || 'N/A'}/100
- Best Practices Score: ${auditResults.bestPractices || 'N/A'}/100`
      
      // Include detailed audit data if available
      if (auditResults.fullAuditJson) {
        const fullAudit = typeof auditResults.fullAuditJson === 'string' 
          ? JSON.parse(auditResults.fullAuditJson) 
          : auditResults.fullAuditJson
        
        // Extract key issues from full audit
        const opportunities = fullAudit?.lighthouseResult?.audits || {}
        const failedAudits = Object.entries(opportunities)
          .filter(([_, audit]) => audit.score !== null && audit.score < 0.5)
          .slice(0, 10)
          .map(([key, audit]) => `- ${audit.title}: ${audit.displayValue || 'Needs improvement'}`)
        
        if (failedAudits.length > 0) {
          auditSection += `

KEY ISSUES IDENTIFIED (reference these specifically in your proposal):
${failedAudits.join('\n')}`
        }
      }
    }

    // Build AI conversation context if provided
    let aiConversationContext = ''
    if (aiConversation && aiConversation.length > 0) {
      aiConversationContext = aiConversation
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => `${m.role === 'user' ? 'Client Info' : 'AI'}: ${m.content}`)
        .join('\n')
    }

    // Initialize ProposalsSkill with Signal integration
    const proposalsSkill = new ProposalsSkill(supabase, null, { userId: contact.id })

    console.log('[Proposal AI] Using ProposalsSkill for generation')

    // Generate AI content via Signal-integrated skill
    const aiContent = await proposalsSkill.draftProposal({
      contactId,
      projectType,
      services: addOns.map(a => a.name),
      budget: totalPrice,
      timeline,
      goals,
      challenges,
      competitorInfo: null,
      auditData: auditResults ? {
        performance: auditResults.performance,
        seo: auditResults.seo,
        accessibility: auditResults.accessibility,
        bestPractices: auditResults.bestPractices,
        issues: auditSection,
        websiteUrl
      } : null,
      // Additional context for the skill
      clientName,
      clientCompany,
      brandName,
      clientIndustry,
      startDate,
      paymentTerms,
      notes,
      context,
      aiConversationContext
    })
    
    // Generate slug
    const proposalSlug = generateSlug(aiContent.title) + '-' + Date.now()

    // Calculate valid until date
    const validUntilDate = validUntil || (() => {
      const date = new Date()
      date.setDate(date.getDate() + (aiContent.suggestedValidDays || 30))
      return date.toISOString().split('T')[0]
    })()

    console.log('[Proposal AI] Saving with heroImageUrl:', heroImageUrl)

    // Create proposal in database
    const { data: proposal, error: createError } = await supabase
      .from('proposals')
      .insert({
        contact_id: contactId,
        project_id: projectId || null,
        slug: proposalSlug,
        title: aiContent.title,
        description: aiContent.description,
        mdx_content: aiContent.mdxContent,
        status: 'draft',
        total_amount: totalPrice ? String(totalPrice) : (aiContent.totalAmount ? String(aiContent.totalAmount) : null),
        valid_until: validUntilDate,
        hero_image_url: heroImageUrl || null,
        brand_name: brandName || null,
        timeline: timeline || null,
        payment_terms: paymentTerms || null,
        metadata: {
          keyValueProps: aiContent.keyValueProps,
          deliverables: aiContent.deliverables,
          urgencyTriggers: aiContent.urgencyTriggers,
          limitedSlots: aiContent.limitedSlots,
          bonusOffer: aiContent.bonusOffer,
          guarantee: aiContent.guarantee,
          timelinePhases: aiContent.timeline
        }
      })
      .select()
      .single()

    if (createError) {
      console.error('Create proposal error:', createError)
      throw createError
    }

    // Insert line items
    if (aiContent.lineItems && aiContent.lineItems.length > 0) {
      const lineItemsToInsert = aiContent.lineItems.map((item, index) => ({
        proposal_id: proposal.id,
        title: item.title || item.serviceType || 'Service',
        item_type: item.serviceType || item.itemType || 'custom',
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total_price: item.total || (item.quantity || 1) * (item.unitPrice || 0),
        sort_order: index
      }))

      const { error: lineItemsError } = await supabase
        .from('proposal_line_items')
        .insert(lineItemsToInsert)

      if (lineItemsError) {
        console.error('Line items error:', lineItemsError)
        // Non-fatal
      }
    }

    // Format response
    const formattedProposal = {
      id: proposal.id,
      contactId: proposal.contact_id,
      projectId: proposal.project_id,
      slug: proposal.slug,
      title: proposal.title,
      description: proposal.description,
      mdxContent: proposal.mdx_content,
      status: proposal.status,
      totalAmount: proposal.total_amount ? parseFloat(proposal.total_amount) : null,
      validUntil: proposal.valid_until,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      // Include AI-generated metadata including urgency triggers
      aiMetadata: {
        keyValueProps: aiContent.keyValueProps,
        deliverables: aiContent.deliverables,
        timeline: aiContent.timeline,
        lineItems: aiContent.lineItems,
        // Urgency triggers for high conversion
        urgencyTriggers: aiContent.urgencyTriggers,
        limitedSlots: aiContent.limitedSlots,
        bonusOffer: aiContent.bonusOffer,
        guarantee: aiContent.guarantee
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        proposalId: proposal.id, // For frontend compatibility
        proposal: formattedProposal,
        message: 'AI proposal generated successfully',
        preview: true // Indicates this is a draft for review
      })
    }

  } catch (error) {
    console.error('Error generating AI proposal:', error)
    
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
        error: 'Failed to generate proposal',
        message: error.message 
      })
    }
  }
}
