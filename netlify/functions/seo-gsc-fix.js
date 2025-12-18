/**
 * SEO GSC Fix - Apply fixes for Google Search Console indexing issues
 * 
 * This function handles:
 * - 404 errors → Creates redirects or flags for content creation
 * - 5xx errors → Flags for investigation
 * - Noindex issues → Removes noindex from managed metadata
 * - Canonical issues → Fixes canonical URL in managed metadata
 * - Robots blocking → Updates robots meta in managed metadata
 * - Orphan pages → Flags for internal linking
 * 
 * POST /api/seo-gsc-fix
 * Body: { siteId, action, issues?, url?, fix? }
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  const { contact, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabase = createSupabaseAdmin()

  try {
    if (event.httpMethod === 'GET') {
      // Get pending fixes for a site
      const params = event.queryStringParameters || {}
      const { siteId } = params

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      // Get pages with indexing issues
      const { data: issuePages, error } = await supabase
        .from('seo_pages')
        .select('id, url, path, indexing_status, indexing_verdict, http_status, has_noindex, canonical_url, managed_canonical_url, managed_robots_meta')
        .eq('site_id', siteId)
        .or('indexing_status.neq.Indexed,http_status.gte.400,has_noindex.eq.true')
        .order('http_status', { ascending: false })
        .limit(100)

      if (error) throw error

      // Get existing redirects
      const { data: redirects } = await supabase
        .from('seo_redirects')
        .select('*')
        .eq('site_id', siteId)

      // Categorize issues
      const categorized = {
        serverErrors: issuePages?.filter(p => p.http_status >= 500) || [],
        notFound: issuePages?.filter(p => p.http_status === 404) || [],
        noindex: issuePages?.filter(p => p.has_noindex && p.indexing_verdict !== 'PASS') || [],
        canonicalIssues: issuePages?.filter(p => 
          p.canonical_url && p.managed_canonical_url && p.canonical_url !== p.managed_canonical_url
        ) || [],
        blocked: issuePages?.filter(p => 
          p.indexing_verdict === 'NEUTRAL' && p.managed_robots_meta?.includes('noindex')
        ) || [],
        other: issuePages?.filter(p => 
          p.indexing_status && p.indexing_status !== 'Indexed' && p.http_status < 400 && !p.has_noindex
        ) || []
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          issues: categorized,
          redirects: redirects || [],
          total: issuePages?.length || 0
        })
      }
    }

    // POST - Apply fixes
    const { siteId, action, issues, url, fix } = JSON.parse(event.body || '{}')

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const results = {
      action,
      applied: [],
      failed: [],
      timestamp: new Date().toISOString()
    }

    switch (action) {
      case 'create-redirect':
        // Create a 301 redirect for a 404 page
        if (!fix?.fromPath || !fix?.toPath) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'fromPath and toPath required' }) }
        }

        const { data: redirect, error: redirectError } = await supabase
          .from('seo_redirects')
          .insert({
            site_id: siteId,
            from_path: fix.fromPath,
            to_path: fix.toPath,
            status_code: fix.statusCode || 301,
            reason: fix.reason || 'GSC 404 fix',
            created_by: contact.id
          })
          .select()
          .single()

        if (redirectError) throw redirectError
        results.applied.push({ type: 'redirect', ...redirect })

        // Update the page to mark it as handled
        await supabase
          .from('seo_pages')
          .update({ 
            indexing_fix_applied: 'redirect',
            indexing_fix_at: new Date().toISOString()
          })
          .eq('site_id', siteId)
          .eq('path', fix.fromPath)

        break

      case 'remove-noindex':
        // Remove noindex from managed metadata
        if (!url) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'url required' }) }
        }

        const { error: noindexError } = await supabase
          .from('seo_pages')
          .update({ 
            managed_robots_meta: 'index, follow',
            has_noindex: false,
            indexing_fix_applied: 'removed-noindex',
            indexing_fix_at: new Date().toISOString()
          })
          .eq('site_id', siteId)
          .eq('url', url)

        if (noindexError) throw noindexError
        results.applied.push({ type: 'remove-noindex', url })
        break

      case 'fix-canonical':
        // Fix canonical URL mismatch
        if (!url || !fix?.canonicalUrl) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'url and fix.canonicalUrl required' }) }
        }

        const { error: canonicalError } = await supabase
          .from('seo_pages')
          .update({ 
            managed_canonical_url: fix.canonicalUrl,
            indexing_fix_applied: 'fixed-canonical',
            indexing_fix_at: new Date().toISOString()
          })
          .eq('site_id', siteId)
          .eq('url', url)

        if (canonicalError) throw canonicalError
        results.applied.push({ type: 'fix-canonical', url, canonicalUrl: fix.canonicalUrl })
        break

      case 'bulk-fix':
        // Apply multiple fixes at once
        if (!issues || !Array.isArray(issues)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'issues array required' }) }
        }

        for (const issue of issues) {
          try {
            switch (issue.fixType) {
              case 'redirect':
                const { error: bulkRedirectErr } = await supabase
                  .from('seo_redirects')
                  .insert({
                    site_id: siteId,
                    from_path: issue.fromPath,
                    to_path: issue.toPath,
                    status_code: 301,
                    reason: 'Bulk GSC fix',
                    created_by: contact.id
                  })
                if (!bulkRedirectErr) {
                  results.applied.push({ type: 'redirect', from: issue.fromPath, to: issue.toPath })
                } else {
                  results.failed.push({ url: issue.fromPath, error: bulkRedirectErr.message })
                }
                break

              case 'remove-noindex':
                const { error: bulkNoindexErr } = await supabase
                  .from('seo_pages')
                  .update({ 
                    managed_robots_meta: 'index, follow',
                    has_noindex: false,
                    indexing_fix_applied: 'removed-noindex',
                    indexing_fix_at: new Date().toISOString()
                  })
                  .eq('site_id', siteId)
                  .eq('url', issue.url)
                if (!bulkNoindexErr) {
                  results.applied.push({ type: 'remove-noindex', url: issue.url })
                } else {
                  results.failed.push({ url: issue.url, error: bulkNoindexErr.message })
                }
                break

              case 'fix-canonical':
                const { error: bulkCanonicalErr } = await supabase
                  .from('seo_pages')
                  .update({ 
                    managed_canonical_url: issue.canonicalUrl,
                    indexing_fix_applied: 'fixed-canonical',
                    indexing_fix_at: new Date().toISOString()
                  })
                  .eq('site_id', siteId)
                  .eq('url', issue.url)
                if (!bulkCanonicalErr) {
                  results.applied.push({ type: 'fix-canonical', url: issue.url })
                } else {
                  results.failed.push({ url: issue.url, error: bulkCanonicalErr.message })
                }
                break
            }
          } catch (err) {
            results.failed.push({ url: issue.url || issue.fromPath, error: err.message })
          }
        }
        break

      case 'request-indexing':
        // Request indexing via Google API (requires URL Inspection API)
        if (!url) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'url required' }) }
        }
        
        // Note: Google's Indexing API only works for Job Posting and Livestream pages
        // For general pages, we can only flag that reindexing was requested
        const { error: indexReqError } = await supabase
          .from('seo_pages')
          .update({ 
            indexing_requested_at: new Date().toISOString()
          })
          .eq('site_id', siteId)
          .eq('url', url)

        if (indexReqError) throw indexReqError
        results.applied.push({ 
          type: 'request-indexing', 
          url,
          note: 'Flagged for reindexing. Manual submission via GSC may be required.'
        })
        break

      case 'generate-fixes':
        // AI-generate fix suggestions for all issues
        const { data: allIssues } = await supabase
          .from('seo_pages')
          .select('id, url, path, indexing_status, indexing_verdict, http_status, has_noindex')
          .eq('site_id', siteId)
          .or('indexing_status.neq.Indexed,http_status.gte.400,has_noindex.eq.true')
          .limit(50)

        const suggestions = []
        
        for (const page of allIssues || []) {
          if (page.http_status === 404) {
            // Suggest redirect to similar page or homepage
            suggestions.push({
              url: page.url,
              issue: '404 Not Found',
              suggestedFix: 'create-redirect',
              suggestion: {
                fromPath: page.path,
                toPath: '/', // Could use AI to find similar content
                reason: 'Page returns 404 - redirect to homepage or relevant page'
              }
            })
          } else if (page.has_noindex) {
            suggestions.push({
              url: page.url,
              issue: 'Has noindex tag',
              suggestedFix: 'remove-noindex',
              suggestion: {
                action: 'Remove noindex to allow indexing'
              }
            })
          } else if (page.http_status >= 500) {
            suggestions.push({
              url: page.url,
              issue: `Server error (${page.http_status})`,
              suggestedFix: 'manual',
              suggestion: {
                action: 'Investigate server error - requires developer attention'
              }
            })
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            suggestions,
            total: suggestions.length
          })
        }

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) }
    }

    // Trigger site revalidation after fixes
    if (results.applied.length > 0) {
      try {
        const secret = process.env.MAIN_SITE_REVALIDATION_SECRET
        if (secret) {
          // Extract paths from applied fixes
          const paths = results.applied
            .filter(a => a.url || a.from)
            .map(a => {
              const urlStr = a.url || a.from
              try {
                const url = new URL(urlStr.startsWith('http') ? urlStr : `https://example.com${urlStr}`)
                return url.pathname
              } catch {
                return urlStr
              }
            })

          if (paths.length > 0) {
            await fetch('https://uptrademedia.com/api/seo-revalidate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ secret, paths })
            })
          }
        }
      } catch (e) {
        console.warn('[seo-gsc-fix] Revalidation failed:', e.message)
      }
    }

    // Log activity
    await supabase.from('seo_activity_log').insert({
      site_id: siteId,
      action: `gsc-fix-${action}`,
      details: {
        applied: results.applied.length,
        failed: results.failed.length,
        triggeredBy: contact.email
      },
      created_at: new Date().toISOString()
    }).catch(() => {})

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results
      })
    }

  } catch (err) {
    console.error('[seo-gsc-fix] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
