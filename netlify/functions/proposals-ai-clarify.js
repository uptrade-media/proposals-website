// netlify/functions/proposals-ai-clarify.js
// AI assistant that asks clarifying questions before generating a proposal
import OpenAI from 'openai'
import { getAuthenticatedUser } from './utils/supabase.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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
    const projectDetails = [
      projectInfo?.brandName && `Brand: ${projectInfo.brandName}`,
      projectInfo?.websiteUrl && `Website: ${projectInfo.websiteUrl}`,
      projectInfo?.totalPrice && `Budget: $${projectInfo.totalPrice}`,
      projectInfo?.timeline && `Timeline: ${projectInfo.timeline}`,
      projectInfo?.goals && `Goals: ${projectInfo.goals}`,
      projectInfo?.challenges && `Challenges: ${projectInfo.challenges}`,
      projectInfo?.context && `Additional context: ${projectInfo.context}`,
      auditResults && `Audit findings available: ${JSON.stringify(auditResults).slice(0, 500)}`
    ].filter(Boolean).join('\n')

    const systemPrompt = CLARIFICATION_PROMPT
      .replace('{{proposalType}}', proposalType)
      .replace('{{clientName}}', clientInfo?.name || 'Unknown')
      .replace('{{clientCompany}}', clientInfo?.company || 'Unknown')
      .replace('{{clientIndustry}}', clientInfo?.industry || 'Unknown')
      .replace('{{projectDetails}}', projectDetails || 'None provided yet')

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ]

    // If no conversation yet, just generate first question
    if (conversation.length === 0) {
      messages.push({
        role: 'user',
        content: 'Please review the information provided and ask any clarifying questions needed to create a high-converting proposal.'
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 500
    })

    const aiResponse = completion.choices[0]?.message?.content || ''

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
