// netlify/functions/portfolio-ai-generate.js
/**
 * Portfolio AI Generation using Signal ContentSkill
 * 
 * Migrated from direct OpenAI calls to use the centralized ContentSkill.
 * Provides: full generation, block regeneration, and chat-based refinement.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { ContentSkill } from './skills/content-skill.js'

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
      existingContent,
      orgId
    } = body

    // Initialize ContentSkill
    const supabase = createSupabaseAdmin()
    const contentSkill = new ContentSkill(supabase, orgId || 'uptrade', {
      userId: contact.id
    })

    // Build project data object for skill methods
    const projectData = {
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
      metrics: {
        trafficIncrease: trafficIncrease ? parseInt(trafficIncrease) : null,
        conversionIncrease: conversionIncrease ? parseInt(conversionIncrease) : null,
        revenueIncrease,
        rankingPosition: rankingPosition ? parseInt(rankingPosition) : null,
        performanceScore: performanceScore ? parseInt(performanceScore) : null
      }
    }

    // If regenerating a specific block
    if (regenerateBlock) {
      const content = await contentSkill.regeneratePortfolioBlock(regenerateBlock, projectData)
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, content: { [regenerateBlock]: content } })
      }
    }

    // If chat message (iterative refinement)
    if (chatMessage && existingContent) {
      const { content, message } = await contentSkill.refinePortfolioWithChat(
        chatMessage,
        existingContent,
        projectData
      )
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, content, message })
      }
    }

    // Full generation
    if (generateAll) {
      const content = await contentSkill.generatePortfolio(projectData)
      
      // Fill in KPIs from form data if AI didn't include them
      if (!content.kpis) content.kpis = {}
      if (trafficIncrease && !content.kpis.traffic) content.kpis.traffic = parseInt(trafficIncrease)
      if (conversionIncrease && !content.kpis.conversions) content.kpis.conversions = parseInt(conversionIncrease)
      if (rankingPosition && !content.kpis.rankings) content.kpis.rankings = parseInt(rankingPosition)
      if (performanceScore && !content.kpis.performance) content.kpis.performance = parseInt(performanceScore)

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
