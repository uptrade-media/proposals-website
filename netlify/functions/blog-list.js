// netlify/functions/blog-list.js
import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers - allow trusted origins
  const origin = event.headers.origin || '*'
  const allowedOrigins = [
    'http://localhost:8888',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://portal.uptrademedia.com',
    'https://godsworkoutapparel.com',
    'https://www.godsworkoutapparel.com',
  ]
  
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Tenant-ID',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Use service role to bypass RLS - frontend controls access
    const supabase = createSupabaseAdmin()
    
    const url = new URL(event.rawUrl || `http://localhost${event.rawPath}`)
    const status = url.searchParams.get('status') // Don't default to 'published' - return all unless specified
    const category = url.searchParams.get('category')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    
    // Check for project/org context
    const projectId = event.headers['x-project-id']
    const orgId = event.headers['x-organization-id']
    
    // Debug logging
    console.log('[Blog List] Headers received:', {
      'x-project-id': event.headers['x-project-id'],
      'x-organization-id': event.headers['x-organization-id'],
      'x-tenant-id': event.headers['x-tenant-id'],
      allHeaders: Object.keys(event.headers)
    })
    
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false }) // Sort by created_at instead of published_at
      .range(offset, offset + limit - 1)
    
    // Only filter by status if explicitly provided
    if (status) {
      query = query.eq('status', status)
    }

    // Project-level filtering (preferred) or org-level fallback
    if (projectId) {
      // When project is selected, show:
      // 1. Posts explicitly assigned to this project (project_id matches)
      // 2. Org-level posts (project_id is NULL but org_id matches the project's org)
      
      // First, get the project to find its org_id
      const { data: project } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single()
      
      if (project?.organization_id) {
        // Show posts that are either:
        // - Directly assigned to this project, OR
        // - Org-level posts (NULL project_id with matching org_id)
        query = query.or(`project_id.eq.${projectId},and(project_id.is.null,org_id.eq.${project.organization_id})`)
        console.log('[Blog API] Filtering by project_id:', projectId, 'OR org-level posts for org:', project.organization_id)
      } else {
        // Fallback to simple project filter if we can't find the org
        query = query.eq('project_id', projectId)
        console.log('[Blog API] Filtering by project_id only:', projectId)
      }
    } else if (orgId) {
      query = query.eq('org_id', orgId)
      console.log('[Blog API] Filtering by org_id:', orgId)
    } else {
      // Default to Uptrade Media for backwards compatibility
      const UPTRADE_MEDIA_ORG_ID = '434c6396-9f79-46f4-9889-59caeb231677'
      query = query.eq('org_id', UPTRADE_MEDIA_ORG_ID)
      console.log('[Blog API] No context, defaulting to Uptrade Media')
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Blog API] Database error:', error)
      throw error
    }

    console.log('[Blog API] Found', data?.length || 0, 'blog posts', status ? `with status: ${status}` : '(all statuses)')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        posts: data || [],
        total: data?.length || 0
      })
    }
  } catch (error) {
    console.error('Blog list error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch blog posts',
        details: error.message
      })
    }
  }
}
