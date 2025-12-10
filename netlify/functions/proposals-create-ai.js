// netlify/functions/proposals-create-ai.js
// AI-powered proposal generator - similar to blog-create-ai.js
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const PROPOSAL_STYLE = `You are an elite sales copywriter and proposal specialist for Uptrade Media, a premium digital agency.

MISSION: Create ultra-high-converting proposals that close deals fast.

BRAND VOICE:
- Professional, confident, and authoritative
- Results-focused with measurable outcomes
- Client success obsessed
- Urgent but not pushy

PSYCHOLOGICAL TRIGGERS TO USE:
- Urgency: Limited availability, pricing expiration, competitor advantage loss
- Social proof: Reference industry benchmarks and success stories
- Fear of missing out: What they'll lose by waiting
- Exclusivity: Position as premium, selective partnership
- Risk reversal: Guarantees, clear expectations

PROPOSAL STRUCTURE:
1. Executive Summary - Compelling hook + key transformation promise
2. The Problem - Paint their pain points vividly
3. The Solution - Your unique approach and methodology  
4. Deliverables & Scope - Crystal clear what's included
5. Investment - Value-stacked pricing with urgency triggers
6. Timeline - Clear milestones with start date urgency
7. Why Uptrade - Credibility, differentiators, trust signals
8. Next Steps - Strong CTA with urgency

CONVERSION TECHNIQUES:
- Lead with transformation, not features
- Use specific numbers (3x ROI, 47% increase, etc.)
- Create urgency (pricing valid for X days, Q2 launch window)
- Stack value before revealing price
- Use comparison anchoring
- Include risk reversal/guarantee language
- End with clear, urgent call-to-action

URGENCY TRIGGERS - USE THESE THROUGHOUT:
You MUST include urgency triggers in your proposals. These will be rendered as visual components:

1. **Pricing Expiration** (REQUIRED):
   - Set validUntil to 7-14 days from today
   - Mention "This pricing is guaranteed until [date]" in Investment section
   - Reference what happens after expiration (prices increase, availability changes)

2. **Limited Availability** (use when appropriate):
   - "We're only accepting 2 new projects this quarter"
   - "Our Q1 calendar is filling up fast"
   - "Limited spots available for [month] launch"
   - Return a "limitedSlots" message like "Only 2 spots left for Q1"

3. **Start Date Urgency**:
   - "To hit your [goal/launch date], we need to begin by [date]"
   - "Every week of delay costs approximately $X in lost [revenue/opportunity]"
   - Reference seasonal windows, competitor timing, market conditions

4. **Competitor Risk**:
   - "While you're deciding, competitors are moving forward"
   - "Your competitors are already investing in [service]"
   - Reference industry trends and first-mover advantages

5. **Bonus Offers** (return in bonusOffer field):
   - "Sign within 48 hours to receive [bonus]"
   - Free strategy session, extra month of support, priority onboarding
   - Example: { "title": "Sign This Week Bonus", "description": "Get a free 30-minute SEO audit ($500 value) when you accept by Friday" }

6. **Risk Reversal / Guarantees** (return in guarantee field):
   - Satisfaction guarantees
   - Performance benchmarks
   - Example: { "title": "Results Guarantee", "description": "If you don't see measurable improvement in 90 days, we'll work for free until you do." }

URGENCY PLACEMENT:
- Executive Summary: Hint at limited availability
- Investment Section: Pricing expiration, comparison to value received
- Timeline Section: Start date urgency, what delays cost
- Next Steps: Strong deadline-driven CTA with bonus offer`

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
    const { 
      contactId,
      projectId,
      clientName,
      clientCompany,
      projectType,
      services,
      budget,
      timeline,
      goals,
      challenges,
      notes,
      validUntil
    } = formData

    // Validate required fields
    if (!contactId || !clientName || !projectType || !services) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['contactId', 'clientName', 'projectType', 'services']
        })
      }
    }

    // Verify contact exists
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, company')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    console.log('[Proposal AI] Generating proposal for:', clientName, projectType)

    // Generate AI content
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: PROPOSAL_STYLE },
        { 
          role: 'user', 
          content: `Create an ultra-high-converting business proposal:

CLIENT INFORMATION:
- Name: ${clientName}
- Company: ${clientCompany || 'Not specified'}
- Goals: ${goals || 'Not specified'}
- Challenges: ${challenges || 'Not specified'}

PROJECT DETAILS:
- Type: ${projectType}
- Services Requested: ${Array.isArray(services) ? services.join(', ') : services}
- Budget/Price: $${formData.pricing || budget || 'To be discussed'}
- Timeline: ${timeline || 'Standard timeline'}
- Additional Notes: ${notes || 'None'}
${formData.auditData ? `\nWEBSITE AUDIT DATA:\n${JSON.stringify(formData.auditData, null, 2)}` : ''}
${formData.addOns?.length ? `\nADD-ONS SELECTED:\n${formData.addOns.map(a => `- ${a.name}: $${a.price}`).join('\n')}` : ''}

Generate a complete, conversion-optimized proposal in MDX format. Use these techniques:
- Open with a compelling transformation promise
- Paint their pain points vividly before presenting solution
- Stack massive value before the investment section
- Include urgency triggers (limited slots, pricing expires, competitor risk)
- Use specific numbers and metrics
- End with a powerful, urgent call-to-action

STRUCTURE YOUR MDX LIKE THIS:
1. ## Executive Summary - Hook + transformation promise
2. ## The Challenge - Their pain points and what they're missing
3. ## The Solution - Your unique approach
4. ## What's Included - Detailed deliverables (use bullet points)
5. ## Your Investment - Value-stacked pricing with urgency
6. ## Timeline - Clear phases with START DATE urgency  
7. ## Why Uptrade Media - Trust signals and differentiators
8. ## Next Steps - Strong CTA with urgency

Return JSON with:
{
  "title": "Proposal title",
  "description": "1-2 sentence compelling description",
  "mdxContent": "Full MDX proposal content with ALL sections",
  "lineItems": [
    {
      "serviceType": "web-design|seo|marketing|development|consulting|custom",
      "description": "Service description",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0
    }
  ],
  "totalAmount": 0,
  "suggestedValidDays": 10,
  "keyValueProps": ["Value 1", "Value 2", "Value 3"],
  "deliverables": ["Deliverable 1", "Deliverable 2"],
  "urgencyTriggers": ["Urgency message 1", "Urgency message 2"],
  "limitedSlots": "Only 2 project slots available for Q1 2025",
  "bonusOffer": {
    "title": "Sign This Week Bonus",
    "description": "Accept by [date] and receive [bonus worth $X]"
  },
  "guarantee": {
    "title": "Our Guarantee",
    "description": "Satisfaction or performance guarantee statement"
  },
  "timeline": {
    "phases": [
      { "name": "Phase name", "duration": "X weeks", "description": "..." }
    ],
    "totalDuration": "X weeks",
    "startDateUrgency": "To launch by [goal date], we need to begin by [start date]"
  }
}

CRITICAL: 
- Use the EXACT pricing provided ($${formData.pricing || budget})
- Include urgency triggers throughout the MDX content
- Generate compelling limitedSlots, bonusOffer, and guarantee fields
- Set suggestedValidDays to 7-14 days (creates urgency)
- Make it ready to send and close the deal
- Return ONLY valid JSON`
        }
      ],
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    })

    const aiContent = JSON.parse(response.choices[0].message.content)
    
    // Generate slug
    const proposalSlug = generateSlug(aiContent.title) + '-' + Date.now()

    // Calculate valid until date
    const validUntilDate = validUntil || (() => {
      const date = new Date()
      date.setDate(date.getDate() + (aiContent.suggestedValidDays || 30))
      return date.toISOString().split('T')[0]
    })()

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
        total_amount: aiContent.totalAmount ? String(aiContent.totalAmount) : null,
        valid_until: validUntilDate
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
        service_type: item.serviceType || 'custom',
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total: item.total || (item.quantity || 1) * (item.unitPrice || 0),
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
