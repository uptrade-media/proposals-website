/**
 * SEO Redirects API
 * 
 * Provides redirect rules for the main site to consume at build time or runtime.
 * The main site's next.config.ts or middleware can fetch this to apply redirects.
 * 
 * GET /api/seo-redirects-api?domain=uptrademedia.com
 * Returns: { redirects: [{ from, to, statusCode, permanent }] }
 * 
 * Also supports CRUD operations for managing redirects.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  const supabase = createSupabaseAdmin()

  try {
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const { domain, format } = params

      // Get site by domain
      let siteId = params.siteId
      if (!siteId && domain) {
        const { data: site } = await supabase
          .from('seo_sites')
          .select('id')
          .eq('domain', domain)
          .single()
        siteId = site?.id
      }

      if (!siteId) {
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ error: 'domain or siteId required' }) 
        }
      }

      // Fetch all active redirects
      const { data: redirects, error } = await supabase
        .from('seo_redirects')
        .select('id, from_path, to_path, status_code, reason, hit_count, created_at')
        .eq('site_id', siteId)
        .eq('is_active', true)
        .order('from_path')

      if (error) throw error

      // Format for Next.js if requested
      if (format === 'nextjs') {
        const nextjsRedirects = redirects?.map(r => ({
          source: r.from_path,
          destination: r.to_path,
          permanent: r.status_code === 301
        })) || []

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ redirects: nextjsRedirects })
        }
      }

      // Format for Netlify _redirects format
      if (format === 'netlify') {
        const lines = redirects?.map(r => 
          `${r.from_path} ${r.to_path} ${r.status_code}`
        ).join('\n') || ''

        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'text/plain' },
          body: lines
        }
      }

      // Default JSON format
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          redirects: redirects?.map(r => ({
            from: r.from_path,
            to: r.to_path,
            statusCode: r.status_code,
            permanent: r.status_code === 301,
            reason: r.reason,
            hitCount: r.hit_count
          })) || [],
          total: redirects?.length || 0,
          lastUpdated: new Date().toISOString()
        })
      }
    }

    // For write operations, require authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const body = JSON.parse(event.body || '{}')
    const { siteId, fromPath, toPath, statusCode = 301, reason } = body

    if (event.httpMethod === 'POST') {
      // Create new redirect
      if (!siteId || !fromPath || !toPath) {
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ error: 'siteId, fromPath, and toPath required' }) 
        }
      }

      const { data: redirect, error } = await supabase
        .from('seo_redirects')
        .insert({
          site_id: siteId,
          from_path: fromPath,
          to_path: toPath,
          status_code: statusCode,
          reason,
          created_by: contact.id
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return { 
            statusCode: 409, 
            headers, 
            body: JSON.stringify({ error: 'Redirect already exists for this path' }) 
          }
        }
        throw error
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ redirect })
      }
    }

    if (event.httpMethod === 'PUT') {
      // Update redirect
      const { id } = body
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) }
      }

      const updates = {}
      if (fromPath) updates.from_path = fromPath
      if (toPath) updates.to_path = toPath
      if (statusCode) updates.status_code = statusCode
      if (reason !== undefined) updates.reason = reason
      if (body.isActive !== undefined) updates.is_active = body.isActive
      updates.updated_at = new Date().toISOString()

      const { data: redirect, error } = await supabase
        .from('seo_redirects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ redirect })
      }
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = body
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) }
      }

      // Soft delete by setting is_active = false
      const { error } = await supabase
        .from('seo_redirects')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  } catch (err) {
    console.error('[seo-redirects-api] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
