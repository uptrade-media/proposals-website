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
 * - Not-indexed URLs → Bulk management from seo_not_indexed_urls table
 * 
 * POST /api/seo-gsc-fix
 * Body: { siteId, action, issues?, url?, fix? }
 * 
 * Actions:
 * - get-not-indexed: Get all not-indexed URLs from the table
 * - bulk-remove: Mark multiple URLs for removal
 * - bulk-redirect: Create redirects for multiple URLs
 * - apply-recommendation: Apply the AI recommendation for a URL
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
        .select('id, url, path, indexing_status, indexing_verdict, http_status, has_noindex, canonical_url, managed_canonical_url, managed_robots_meta, discovery_source')
        .eq('site_id', siteId)
        .or('indexing_status.neq.Indexed,http_status.gte.400,has_noindex.eq.true,discovery_source.eq.gsc')
        .order('http_status', { ascending: false })
        .limit(100)

      if (error) throw error

      // Get existing redirects
      const { data: redirects } = await supabase
        .from('seo_redirects')
        .select('*')
        .eq('site_id', siteId)

      // Get not-indexed URLs from the dedicated table
      const { data: notIndexedUrls } = await supabase
        .from('seo_not_indexed_urls')
        .select('*')
        .eq('site_id', siteId)
        .order('last_checked_at', { ascending: false })

      // Categorize issues
      const categorized = {
        gscDiscovered: issuePages?.filter(p => p.discovery_source === 'gsc') || [], // Not in sitemap
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
          notIndexedUrls: notIndexedUrls || [],
          total: issuePages?.length || 0,
          notIndexedTotal: notIndexedUrls?.length || 0
        })
      }
    }

    // POST - Apply fixes
    const { siteId, action, issues, url, fix, urls } = JSON.parse(event.body || '{}')

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

              case 'request-removal':
                const { error: bulkRemovalErr } = await supabase
                  .from('seo_pages')
                  .update({ 
                    index_removal_requested_at: new Date().toISOString(),
                    index_status: 'removal_requested'
                  })
                  .eq('site_id', siteId)
                  .eq('url', issue.url)
                if (!bulkRemovalErr) {
                  results.applied.push({ type: 'request-removal', url: issue.url })
                } else {
                  results.failed.push({ url: issue.url, error: bulkRemovalErr.message })
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

      case 'request-removal':
        // Request removal of GSC-discovered pages that aren't in sitemap
        if (!url) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'url required' }) }
        }
        
        // Mark for removal - the actual removal should be done via GSC's Removals tool
        // Google doesn't have an API for URL removal anymore
        const { error: removalError } = await supabase
          .from('seo_pages')
          .update({ 
            index_removal_requested_at: new Date().toISOString(),
            index_status: 'removal_requested'
          })
          .eq('site_id', siteId)
          .eq('url', url)

        if (removalError) throw removalError
        results.applied.push({ 
          type: 'request-removal', 
          url,
          note: 'Flagged for removal. Submit removal request in Google Search Console > Removals tool.'
        })
        break

      case 'generate-fixes':
        // AI-generate fix suggestions for all issues
        const { data: allIssues } = await supabase
          .from('seo_pages')
          .select('id, url, path, indexing_status, indexing_verdict, http_status, has_noindex, discovery_source')
          .eq('site_id', siteId)
          .or('indexing_status.neq.Indexed,http_status.gte.400,has_noindex.eq.true,discovery_source.eq.gsc')
          .limit(50)

        const suggestions = []
        
        for (const page of allIssues || []) {
          if (page.discovery_source === 'gsc') {
            // GSC-discovered pages that aren't in sitemap should be removed
            suggestions.push({
              url: page.url,
              issue: 'Found in GSC but not in sitemap',
              suggestedFix: 'request-removal',
              suggestion: {
                action: 'Request removal from Google index - page not in NextJS sitemap'
              },
              priority: 'high'
            })
          } else if (page.http_status === 404) {
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

      case 'get-not-indexed':
        // Get all not-indexed URLs from the dedicated table
        const { data: notIndexed, error: niError } = await supabase
          .from('seo_not_indexed_urls')
          .select('*')
          .eq('site_id', siteId)
          .order('last_checked_at', { ascending: false })

        if (niError) throw niError

        // Group by action status
        const grouped = {
          pending: notIndexed?.filter(u => u.action === 'pending') || [],
          remove: notIndexed?.filter(u => u.action === 'remove') || [],
          redirect: notIndexed?.filter(u => u.action === 'redirect') || [],
          keep: notIndexed?.filter(u => u.action === 'keep') || [],
          fixed: notIndexed?.filter(u => u.action === 'fixed') || []
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            urls: notIndexed || [],
            grouped,
            total: notIndexed?.length || 0
          })
        }

      case 'bulk-mark-remove':
        // Mark multiple URLs for removal from index
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'urls array required' }) }
        }

        for (const urlItem of urls) {
          try {
            const { error: markErr } = await supabase
              .from('seo_not_indexed_urls')
              .update({
                action: 'remove',
                removal_requested_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('site_id', siteId)
              .eq('url', urlItem.url || urlItem)

            if (!markErr) {
              results.applied.push({ type: 'mark-remove', url: urlItem.url || urlItem })
            } else {
              results.failed.push({ url: urlItem.url || urlItem, error: markErr.message })
            }
          } catch (err) {
            results.failed.push({ url: urlItem.url || urlItem, error: err.message })
          }
        }
        break

      case 'bulk-redirect':
        // Create redirects for multiple not-indexed URLs
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'urls array required with toPath' }) }
        }

        for (const urlItem of urls) {
          try {
            const fromUrl = urlItem.url || urlItem
            const toPath = urlItem.toPath || '/'
            
            // Parse the URL to get the path
            let fromPath
            try {
              const parsed = new URL(fromUrl)
              fromPath = parsed.pathname
            } catch {
              fromPath = fromUrl.startsWith('/') ? fromUrl : `/${fromUrl}`
            }

            // Create redirect
            const { error: redirectErr } = await supabase
              .from('seo_redirects')
              .insert({
                site_id: siteId,
                from_path: fromPath,
                to_path: toPath,
                status_code: 301,
                reason: 'Not-indexed URL redirect',
                created_by: contact.id
              })

            if (!redirectErr) {
              // Update the not-indexed URL status
              await supabase
                .from('seo_not_indexed_urls')
                .update({
                  action: 'redirect',
                  redirect_to: toPath,
                  updated_at: new Date().toISOString()
                })
                .eq('site_id', siteId)
                .eq('url', fromUrl)

              results.applied.push({ type: 'redirect', from: fromPath, to: toPath })
            } else {
              results.failed.push({ url: fromUrl, error: redirectErr.message })
            }
          } catch (err) {
            results.failed.push({ url: urlItem.url || urlItem, error: err.message })
          }
        }
        break

      case 'mark-keep':
        // Mark a URL to keep (don't remove, will be indexed eventually)
        if (!url) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'url required' }) }
        }

        const { error: keepErr } = await supabase
          .from('seo_not_indexed_urls')
          .update({
            action: 'keep',
            updated_at: new Date().toISOString()
          })
          .eq('site_id', siteId)
          .eq('url', url)

        if (keepErr) throw keepErr
        results.applied.push({ type: 'mark-keep', url })
        break

      case 'apply-recommendation':
        // Apply the AI recommendation for a specific not-indexed URL
        if (!url) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'url required' }) }
        }

        // Get the URL's recommendation
        const { data: urlData, error: urlErr } = await supabase
          .from('seo_not_indexed_urls')
          .select('*')
          .eq('site_id', siteId)
          .eq('url', url)
          .single()

        if (urlErr) throw urlErr
        if (!urlData) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'URL not found' }) }
        }

        // Apply based on recommendation
        if (urlData.recommendation?.includes('Remove') || urlData.recommendation?.includes('removal')) {
          await supabase
            .from('seo_not_indexed_urls')
            .update({
              action: 'remove',
              removal_requested_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', urlData.id)
          results.applied.push({ type: 'mark-remove', url, reason: urlData.recommendation })
        } else if (urlData.recommendation?.includes('redirect') || urlData.recommendation?.includes('Redirect')) {
          // Mark for redirect - user needs to specify destination
          await supabase
            .from('seo_not_indexed_urls')
            .update({
              action: 'redirect',
              updated_at: new Date().toISOString()
            })
            .eq('id', urlData.id)
          results.applied.push({ type: 'mark-redirect', url, reason: urlData.recommendation })
        } else {
          // Default: mark as keep and improve content
          await supabase
            .from('seo_not_indexed_urls')
            .update({
              action: 'keep',
              updated_at: new Date().toISOString()
            })
            .eq('id', urlData.id)
          results.applied.push({ type: 'mark-keep', url, reason: urlData.recommendation })
        }
        break

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
