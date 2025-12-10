// netlify/functions/audits-list.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get authenticated user via Supabase
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.role === 'admin'

    let audits

    if (isAdmin) {
      // Admins see all audits with contact info
      const { data, error } = await supabase
        .from('audits')
        .select(`
          id,
          target_url,
          status,
          performance_score,
          seo_score,
          accessibility_score,
          best_practices_score,
          created_at,
          completed_at,
          report_storage_path,
          contact_id,
          project_id,
          device_type,
          magic_token,
          magic_token_expires,
          contacts (
            id,
            name,
            email,
            company
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform to camelCase and flatten contact
      audits = data.map(a => ({
        id: a.id,
        targetUrl: a.target_url,
        status: a.status,
        scores: {
          performance: a.performance_score,
          seo: a.seo_score,
          accessibility: a.accessibility_score,
          bestPractices: a.best_practices_score
        },
        createdAt: a.created_at,
        completedAt: a.completed_at,
        reportStoragePath: a.report_storage_path,
        contactId: a.contact_id,
        projectId: a.project_id,
        deviceType: a.device_type,
        magicToken: a.magic_token,
        magicTokenExpiresAt: a.magic_token_expires,
        contact: a.contacts ? {
          id: a.contacts.id,
          name: a.contacts.name,
          email: a.contacts.email,
          company: a.contacts.company
        } : null
      }))
    } else {
      // Regular users see only their audits
      const { data, error } = await supabase
        .from('audits')
        .select(`
          id,
          target_url,
          status,
          performance_score,
          seo_score,
          accessibility_score,
          best_practices_score,
          created_at,
          completed_at,
          report_storage_path
        `)
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform to camelCase
      audits = data.map(a => ({
        id: a.id,
        targetUrl: a.target_url,
        status: a.status,
        scores: {
          performance: a.performance_score,
          seo: a.seo_score,
          accessibility: a.accessibility_score,
          bestPractices: a.best_practices_score
        },
        // Also include flat properties for compatibility
        scorePerformance: a.performance_score,
        scoreSeo: a.seo_score,
        scoreAccessibility: a.accessibility_score,
        createdAt: a.created_at,
        completedAt: a.completed_at,
        reportStoragePath: a.report_storage_path
      }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audits,
        count: audits.length,
        isAdmin
      })
    }

  } catch (error) {
    console.error('Error fetching audits:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch audits' })
    }
  }
}
