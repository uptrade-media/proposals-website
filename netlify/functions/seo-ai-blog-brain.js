/**
 * SEO AI Blog Brain Function
 * 
 * MIGRATED: Now uses ContentSkill for all AI operations.
 * This file is a thin wrapper that routes requests to ContentSkill methods.
 * 
 * Actions:
 * - recommend-topics → ContentSkill.suggestTopicsWithSeoContext()
 * - analyze-post → ContentSkill.analyzeBlogPost()
 * - generate-content → ContentSkill.generateBlogSection()
 * - get-writing-guidelines → ContentSkill.getWritingGuidelines()
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { ContentSkill } from './skills/content-skill.js'

/**
 * Uptrade Media Services - for writing guidelines response
 */
const UPTRADE_SERVICES = {
  'seo': { url: '/marketing/seo/', title: 'SEO & Local SEO' },
  'ad-management': { url: '/marketing/ad-management/', title: 'Paid Ads Management' },
  'content-marketing': { url: '/marketing/content-marketing/', title: 'Content Marketing' },
  'web-design': { url: '/design/web-design/', title: 'Custom Web Design' },
  'branding': { url: '/design/branding/', title: 'Brand Identity Design' },
  'video-production': { url: '/media/video-production/', title: 'Video Production' },
  'ai-automation': { url: '/ai-automation/', title: 'AI & Automation' }
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const supabase = createSupabaseAdmin()
    const body = JSON.parse(event.body || '{}')
    const { action, siteId, postId, options = {} } = body

    // Get org_id for ContentSkill initialization
    let orgId = null
    if (siteId) {
      const { data: site } = await supabase
        .from('seo_sites')
        .select('org_id')
        .eq('id', siteId)
        .single()
      orgId = site?.org_id
    }

    // Initialize ContentSkill
    const contentSkill = new ContentSkill(supabase, orgId, { userId: contact.id })

    switch (action) {
      case 'recommend-topics': {
        if (!siteId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'siteId is required for topic recommendations' })
          }
        }

        const result = await contentSkill.suggestTopicsWithSeoContext(siteId, options)
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            recommendations: result,
            seoContext: result.seoContext
          })
        }
      }

      case 'analyze-post': {
        if (!postId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'postId is required' })
          }
        }

        const result = await contentSkill.analyzeBlogPost(postId, siteId)
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        }
      }

      case 'generate-content': {
        const result = await contentSkill.generateBlogSection(options, siteId)
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ content: result })
        }
      }

      case 'get-writing-guidelines': {
        const guidelines = contentSkill.getWritingGuidelines()
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(guidelines)
        }
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` })
        }
    }
  } catch (error) {
    console.error('[SEO Blog Brain] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
