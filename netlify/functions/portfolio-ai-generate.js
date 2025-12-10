// netlify/functions/portfolio-ai-generate.js
import OpenAI from 'openai'
import { getAuthenticatedUser } from './utils/supabase.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// System prompt for comprehensive portfolio generation
const SYSTEM_PROMPT = `You are an expert copywriter for Uptrade Media, a digital marketing agency specializing in web design, SEO, and media production. Your task is to generate compelling portfolio content that showcases successful client projects.

Style Guidelines:
- Professional yet conversational tone
- Focus on tangible results and benefits
- Use active voice and strong action verbs
- Keep paragraphs concise (2-3 sentences max)
- Emphasize ROI and business impact
- Include specific metrics when available
- Use industry-specific terminology appropriately

Content Structure:
- Start with strong, benefit-driven headlines
- Highlight the challenge or opportunity
- Explain the strategic approach clearly
- Showcase key services and implementations
- Emphasize measurable results
- Include technical innovations when relevant

Icon Names Available (use exactly these names):
- General: CheckCircle, Sparkles, Zap, Target, Award, TrendingUp, Star
- Services: Palette, Code, Code2, Search, Rocket, Globe, Megaphone
- Technical: Gauge, Shield, Smartphone, BarChart3, Database, Server
- Project: Calendar, Clock, Users, Building, MapPin`

export async function handler(event) {
  // Only POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify admin auth using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact || contact.role !== 'admin') {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      companyName,
      websiteUrl,
      industry,
      location,
      category,
      servicesProvided,
      projectGoals,
      challengesSolved,
      targetAudience,
      projectTimeline,
      uniqueFeatures,
      clientTestimonial,
      trafficIncrease,
      conversionIncrease,
      revenueIncrease,
      rankingPosition,
      performanceScore,
      generateAll,
      regenerateBlock,
      chatMessage,
      existingContent
    } = body

    // If regenerating a specific block
    if (regenerateBlock) {
      const content = await regenerateSpecificBlock(regenerateBlock, body)
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, content: { [regenerateBlock]: content } })
      }
    }

    // If chat message (iterative refinement)
    if (chatMessage && existingContent) {
      const { content, message } = await handleChatRefinement(chatMessage, existingContent, body)
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, content, message })
      }
    }

    // Full generation
    if (generateAll) {
      const content = await generateFullPortfolioContent(body)
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, content })
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request - specify generateAll, regenerateBlock, or chatMessage' })
    }

  } catch (error) {
    console.error('Portfolio AI generation error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'AI generation failed' })
    }
  }
}

// Generate all portfolio content at once
async function generateFullPortfolioContent(formData) {
  const {
    companyName,
    websiteUrl,
    industry,
    location,
    category,
    servicesProvided,
    projectGoals,
    challengesSolved,
    targetAudience,
    projectTimeline,
    uniqueFeatures,
    clientTestimonial,
    trafficIncrease,
    conversionIncrease,
    revenueIncrease,
    rankingPosition,
    performanceScore
  } = formData

  const prompt = `Generate a comprehensive portfolio case study for the following project:

**Company:** ${companyName}
**Industry:** ${industry}
**Location:** ${location}
**Website:** ${websiteUrl}
**Category:** ${category || 'Web Design'}
**Services:** ${servicesProvided?.join(', ') || 'Not specified'}
**Goals:** ${projectGoals || 'Not specified'}
**Challenges:** ${challengesSolved || 'Not specified'}
**Target Audience:** ${targetAudience || 'Not specified'}
${projectTimeline ? `**Timeline:** ${projectTimeline}` : ''}
${uniqueFeatures ? `**Unique Features:** ${uniqueFeatures}` : ''}
${trafficIncrease ? `**Traffic Increase:** ${trafficIncrease}%` : ''}
${conversionIncrease ? `**Conversion Increase:** ${conversionIncrease}%` : ''}
${revenueIncrease ? `**Revenue Impact:** ${revenueIncrease}` : ''}
${rankingPosition ? `**Ranking Position:** #${rankingPosition}` : ''}
${performanceScore ? `**Performance Score:** ${performanceScore}/100` : ''}
${clientTestimonial ? `**Client Quote:** "${clientTestimonial}"` : ''}

Generate ALL of the following sections in a single JSON response:

{
  "subtitle": "5-8 word catchy tagline (e.g., 'Modern Restaurant Website & Local SEO Success')",
  
  "description": "150-200 character meta description for previews and SEO",
  
  "kpis": {
    "traffic": number or null (percentage increase),
    "conversions": number or null (percentage increase),
    "revenue": number or null (percentage or dollar amount),
    "rankings": number or null (position achieved),
    "performance": number or null (score 0-100)
  },
  
  "services_showcase": [
    {
      "icon": "IconName",
      "title": "Service Title",
      "description": "1-2 sentence description",
      "features": ["Feature 1", "Feature 2", "Feature 3"]
    }
    // 3-4 services
  ],
  
  "strategic_approach": [
    {
      "phase": "Phase 1: Discovery",
      "description": "2-3 sentences about this phase",
      "icon": "Search",
      "timeline": "Week 1-2",
      "deliverables": ["Deliverable 1", "Deliverable 2"]
    }
    // 3-4 phases
  ],
  
  "comprehensive_results": [
    {
      "icon": "TrendingUp",
      "metric": "+245%",
      "label": "Organic Traffic",
      "description": "Explanation of this result"
    }
    // 4-6 results
  ],
  
  "technical_innovations": [
    {
      "icon": "Zap",
      "title": "Innovation Title",
      "description": "What we implemented",
      "metrics": ["Metric 1", "Metric 2", "Metric 3"]
    }
    // 3-5 innovations
  ],
  
  "challenges": [
    {
      "challenge": "The problem they faced",
      "solution": "How we solved it",
      "result": "+150% improvement",
      "icon": "performance" // or "design", "seo", "conversion"
    }
    // 3-4 challenges
  ],
  
  "tech_stack": [
    { "name": "Next.js", "category": "frontend" },
    { "name": "Tailwind CSS", "category": "frontend" },
    { "name": "Vercel", "category": "hosting" }
    // 6-10 technologies
  ],
  
  "content": "## Project Overview\\n\\nMarkdown content for the case study...\\n\\n## The Challenge\\n\\n...\\n\\n## Our Approach\\n\\n...\\n\\n## Results\\n\\n...",
  
  "seo": {
    "title": "60 char max SEO title",
    "description": "150-160 char meta description",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
}

Return ONLY valid JSON. Do not include markdown code fences or explanations. Ensure all arrays have realistic, high-quality content based on the project details provided.`

  const response = await openai.chat.completions.create({
    model: 'gpt-5.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
    max_completion_tokens: 4000
  })

  const content = JSON.parse(response.choices[0].message.content)
  
  // Fill in KPIs from form data if AI didn't include them
  if (!content.kpis) content.kpis = {}
  if (trafficIncrease && !content.kpis.traffic) content.kpis.traffic = parseInt(trafficIncrease)
  if (conversionIncrease && !content.kpis.conversions) content.kpis.conversions = parseInt(conversionIncrease)
  if (rankingPosition && !content.kpis.rankings) content.kpis.rankings = parseInt(rankingPosition)
  if (performanceScore && !content.kpis.performance) content.kpis.performance = parseInt(performanceScore)

  return content
}

// Regenerate a specific block
async function regenerateSpecificBlock(blockId, formData) {
  const blockPrompts = {
    services_showcase: `Generate a services_showcase array for ${formData.companyName}. Services provided: ${formData.servicesProvided?.join(', ')}. Each service should have: icon (Lucide icon name), title, description (1-2 sentences), and features array (3-4 items). Return 3-4 services as JSON array.`,
    
    strategic_approach: `Generate a strategic_approach array for ${formData.companyName}'s ${formData.category || 'web design'} project. Include 3-4 phases, each with: phase (name), description (2-3 sentences), icon (Lucide icon name), timeline, and deliverables array. Return as JSON array.`,
    
    comprehensive_results: `Generate a comprehensive_results array for ${formData.companyName}. Known metrics: ${formData.trafficIncrease ? `Traffic +${formData.trafficIncrease}%` : ''} ${formData.conversionIncrease ? `Conversions +${formData.conversionIncrease}%` : ''} ${formData.rankingPosition ? `Ranking #${formData.rankingPosition}` : ''}. Each result should have: icon, metric (with + or - or #), label, description. Return 4-6 results as JSON array.`,
    
    technical_innovations: `Generate a technical_innovations array for ${formData.companyName}'s ${formData.servicesProvided?.join(', ') || 'web'} project. Each innovation should have: icon, title, description, metrics array (3 items). Return 3-5 innovations as JSON array.`,
    
    challenges: `Generate a challenges array for ${formData.companyName}. Original challenges: ${formData.challengesSolved || 'Not specified'}. Each item should have: challenge (problem), solution (how we fixed it), result (metric improvement), icon ("performance", "design", "seo", or "conversion"). Return 3-4 challenges as JSON array.`,
    
    tech_stack: `Generate a tech_stack array for ${formData.companyName}'s ${formData.servicesProvided?.join(', ') || 'web design'} project. Each item: name (technology), category ("frontend", "backend", "database", "hosting", "cms", or "tools"). Return 6-10 relevant technologies as JSON array.`,
    
    content: `Generate markdown case study content for ${formData.companyName}. Include sections: ## Project Overview (2-3 paragraphs), ## The Challenge (describe problems), ## Our Approach (strategic solution), ## Key Features (bullet points), ## Results (measurable outcomes). Goals: ${formData.projectGoals || 'Not specified'}. Challenges: ${formData.challengesSolved || 'Not specified'}. Return as a markdown string.`
  }

  const prompt = blockPrompts[blockId] || `Generate the ${blockId} block for ${formData.companyName}.`

  const response = await openai.chat.completions.create({
    model: 'gpt-5.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `${prompt}\n\nReturn ONLY valid JSON (array or object as appropriate). No markdown fences.` }
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' },
    max_completion_tokens: 2000
  })

  const result = JSON.parse(response.choices[0].message.content)
  
  // Handle if result is wrapped in a key
  if (result[blockId]) return result[blockId]
  if (result.data) return result.data
  if (result.content) return result.content
  return result
}

// Handle chat-based refinement
async function handleChatRefinement(chatMessage, existingContent, formData) {
  const prompt = `The user wants to modify the portfolio content for ${formData.companyName}.

Current content (partial):
- Subtitle: "${existingContent.subtitle || 'Not set'}"
- Services: ${existingContent.services_showcase?.length || 0} items
- Results: ${existingContent.comprehensive_results?.length || 0} items

User's request: "${chatMessage}"

Based on the user's request, determine what changes to make. Return a JSON object with:
1. "message": A friendly response explaining what you changed
2. Any updated blocks that need to change (use the same structure as the original)

For example, if user says "make the results more impressive", update comprehensive_results.
If user says "add more technical details", update technical_innovations.
If user says "change the subtitle", update subtitle.

Return ONLY valid JSON. Include only the fields that need to change, plus "message".`

  const response = await openai.chat.completions.create({
    model: 'gpt-5.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
    max_completion_tokens: 2000
  })

  const result = JSON.parse(response.choices[0].message.content)
  const { message, ...updates } = result

  return {
    content: updates,
    message: message || 'I\'ve made the requested changes.'
  }
}
