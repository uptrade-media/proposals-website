// netlify/functions/proposals-ai-clarify.js
// AI assistant that asks clarifying questions before generating a proposal - uses Signal ProposalsSkill
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { ProposalsSkill } from './skills/proposals-skill.js'

const CLARIFICATION_PROMPT = `You are a senior sales consultant at Uptrade Media helping prepare a high-converting proposal.

Your job is to ask clarifying questions to gather the information needed for a compelling proposal.
You should ask about:
- Specific pain points and challenges
- Budget expectations and decision timeline
- Key stakeholders and decision process
- Competitors they've considered
- Success metrics they care about
- Urgency drivers (launches, deadlines, seasonal factors)

RULES:
1. Ask 1-2 questions at a time, max 3 questions total across the conversation
2. Be conversational and professional
3. If you have enough information, respond with { "done": true, "message": "I have everything I need..." }
4. Focus on gathering info that creates urgency and value

Current proposal type: {{proposalType}}
Client: {{clientName}} at {{clientCompany}} ({{clientIndustry}})
Project details provided: {{projectDetails}}
`

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
    const { proposalType, clientInfo, projectInfo, auditResults, conversation = [] } = JSON.parse(event.body || '{}')

    if (!proposalType) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Proposal type required' }) }
    }

    // Build context for AI
    let auditContext = ''
    if (auditResults) {
      const { performance, seo, accessibility, bestPractices, grade, coreWebVitals, opportunities, seoDetails } = auditResults
      
      auditContext = `
Website Audit Results (Grade: ${grade || 'N/A'}):
- Performance: ${performance || 'N/A'}/100 (Mobile: ${auditResults.performanceMobile || 'N/A'}, Desktop: ${auditResults.performanceDesktop || 'N/A'})
- SEO: ${seo || 'N/A'}/100
- Accessibility: ${accessibility || 'N/A'}/100
- Best Practices: ${bestPractices || 'N/A'}/100`

      if (coreWebVitals) {
        auditContext += `

Core Web Vitals:
- LCP (Largest Contentful Paint): Mobile ${coreWebVitals.lcp?.mobile || 'N/A'}, Desktop ${coreWebVitals.lcp?.desktop || 'N/A'}
- CLS (Cumulative Layout Shift): Mobile ${coreWebVitals.cls?.mobile || 'N/A'}, Desktop ${coreWebVitals.cls?.desktop || 'N/A'}
- Speed Index: Mobile ${coreWebVitals.speedIndex?.mobile || 'N/A'}, Desktop ${coreWebVitals.speedIndex?.desktop || 'N/A'}
- Time to Interactive: Mobile ${coreWebVitals.tti?.mobile || 'N/A'}, Desktop ${coreWebVitals.tti?.desktop || 'N/A'}`
      }

      if (opportunities?.length > 0) {
        auditContext += `

Top Improvement Opportunities:`
        opportunities.slice(0, 3).forEach(opp => {
          auditContext += `\n- ${opp.title}${opp.savings ? ` (potential savings: ${opp.savings})` : ''}`
        })
      }

      if (seoDetails) {
        auditContext += `

SEO Details:
- Title: "${seoDetails.title || 'Missing'}" (${seoDetails.titleLength || 0} chars)
- Meta Description: ${seoDetails.metaDescriptionLength || 0} chars
- Has H1: ${seoDetails.hasH1 ? 'Yes' : 'No'} (${seoDetails.h1Count || 0} total)
- Has robots.txt: ${seoDetails.hasRobotsTxt ? 'Yes' : 'No'}
- Has sitemap: ${seoDetails.hasSitemap ? 'Yes' : 'No'}
- HTTPS: ${seoDetails.isHttps ? 'Yes' : 'No'}`
      }
    }

    const projectDetails = [
      projectInfo?.brandName && `Brand: ${projectInfo.brandName}`,
      projectInfo?.websiteUrl && `Website: ${projectInfo.websiteUrl}`,
      projectInfo?.totalPrice && `Budget: $${projectInfo.totalPrice}`,
      projectInfo?.timeline && `Timeline: ${projectInfo.timeline}`,
      projectInfo?.goals && `Goals: ${projectInfo.goals}`,
      projectInfo?.challenges && `Challenges: ${projectInfo.challenges}`,
      projectInfo?.context && `Additional context: ${projectInfo.context}`,
      auditContext && auditContext
    ].filter(Boolean).join('\n')

    const systemPrompt = CLARIFICATION_PROMPT
      .replace('{{proposalType}}', proposalType)
      .replace('{{clientName}}', clientInfo?.name || 'Unknown')
      .replace('{{clientCompany}}', clientInfo?.company || 'Unknown')
      .replace('{{clientIndustry}}', clientInfo?.industry || 'Unknown')
      .replace('{{projectDetails}}', projectDetails || 'None provided yet')

    // Use ProposalsSkill for clarification questions
    const supabase = createSupabaseAdmin()
    const proposalsSkill = new ProposalsSkill(supabase, null, { userId: contact.id })
    
    console.log('[proposals-ai-clarify] Using ProposalsSkill for clarification')
    
    // Format the vague request with all available context
    const vagueRequest = `
Proposal Type: ${proposalType}
Client: ${clientInfo?.name || 'Unknown'} at ${clientInfo?.company || 'Unknown'} (${clientInfo?.industry || 'Unknown'})
Project Details: ${projectDetails || 'None'}
${conversation.length > 0 ? `\nConversation so far:\n${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}` : ''}
    `.trim()

    let aiResponse
    if (conversation.length === 0) {
      // First call - get initial clarifying questions
      const result = await proposalsSkill.clarifyRequest(vagueRequest)
      aiResponse = result.questions ? result.questions.join('\n\n') : (result.message || result)
    } else {
      // Continuing conversation - use refine
      const result = await proposalsSkill.refineWithChat(
        null,
        vagueRequest,
        conversation[conversation.length - 1]?.content || '',
        conversation
      )
      aiResponse = typeof result === 'string' ? result : (result.message || JSON.stringify(result))
    }

    // Check if AI says it's done (has enough info)
    const isDone = aiResponse.toLowerCase().includes('have everything') || 
                   aiResponse.toLowerCase().includes('ready to generate') ||
                   aiResponse.toLowerCase().includes('have all the information') ||
                   conversation.length >= 4 // Max 4 back-and-forths

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: aiResponse,
        done: isDone
      })
    }

  } catch (error) {
    console.error('AI clarification error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get AI response', details: error.message })
    }
  }
}
