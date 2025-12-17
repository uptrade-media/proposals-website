// netlify/functions/seo-ai-knowledge.js
// Fetch site knowledge for AI brain
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId } = event.queryStringParameters || {}

    if (!siteId) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'siteId required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch site knowledge
    const { data: knowledge, error: knowledgeError } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    if (knowledgeError && knowledgeError.code !== 'PGRST116') {
      console.error('[AI Knowledge] Query error:', knowledgeError)
    }

    // Fetch topics
    const { data: topics } = await supabase
      .from('seo_topics')
      .select('*')
      .eq('site_id', siteId)
      .order('pages_count', { ascending: false })

    // Get training status
    const trainingStatus = knowledge ? {
      lastTrained: knowledge.updated_at,
      pagesAnalyzed: knowledge.pages_analyzed,
      topicsCovered: topics?.length || 0,
      isComplete: true
    } : {
      isComplete: false
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        knowledge: knowledge || null,
        topics: topics || [],
        trainingStatus
      })
    }

  } catch (error) {
    console.error('[AI Knowledge] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
