/**
 * SEO Internal Links API - Public endpoint for main site
 * 
 * Returns internal link suggestions for a given page.
 * The main site can use this to dynamically add relevant internal links
 * to blog posts or service pages at build time.
 * 
 * Endpoints:
 * GET ?path=/insights/seo-tips/ - Get link suggestions for a page
 * GET ?keyword=web+design - Get pages targeting a keyword
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { path, keyword, domain = 'uptrademedia.com', limit = 10 } = event.queryStringParameters || {}

    // Find the site
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('id')
      .eq('domain', domain)
      .single()

    if (siteError || !site) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Site not found' })
      }
    }

    // Mode 1: Get link suggestions for a specific page
    if (path) {
      // Get the current page's keywords
      const { data: currentPage } = await supabase
        .from('seo_pages')
        .select('id, path, target_keywords, title')
        .eq('site_id', site.id)
        .eq('path', path)
        .single()

      if (!currentPage) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Page not found' })
        }
      }

      // Find related pages based on shared keywords or topics
      const keywords = currentPage.target_keywords || []
      
      // Get pages that share keywords or are in related sections
      const { data: relatedPages } = await supabase
        .from('seo_pages')
        .select(`
          path,
          title,
          managed_title,
          target_keywords,
          seo_health_score,
          clicks_28d
        `)
        .eq('site_id', site.id)
        .neq('path', path)
        .order('clicks_28d', { ascending: false })
        .limit(50)

      // Score pages by relevance
      const scoredPages = (relatedPages || []).map(page => {
        let score = 0
        const pageKeywords = page.target_keywords || []
        
        // Shared keywords
        const sharedKeywords = keywords.filter(k => 
          pageKeywords.some(pk => pk.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(pk.toLowerCase()))
        )
        score += sharedKeywords.length * 10

        // Same section bonus
        const currentSection = path.split('/')[1]
        const pageSection = page.path.split('/')[1]
        if (currentSection === pageSection) {
          score += 5
        }

        // Traffic bonus
        if (page.clicks_28d > 100) score += 3
        else if (page.clicks_28d > 50) score += 2
        else if (page.clicks_28d > 10) score += 1

        // Health score bonus
        if (page.seo_health_score > 80) score += 2

        return {
          path: page.path,
          title: page.managed_title || page.title,
          score,
          sharedKeywords,
          section: pageSection
        }
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          currentPage: {
            path: currentPage.path,
            title: currentPage.title,
            keywords
          },
          suggestions: scoredPages.map(p => ({
            path: p.path,
            url: `https://${domain}${p.path}`,
            title: p.title,
            relevanceScore: p.score,
            reason: p.sharedKeywords.length > 0 
              ? `Shares keywords: ${p.sharedKeywords.join(', ')}`
              : `Same section: ${p.section}`
          }))
        })
      }
    }

    // Mode 2: Find pages targeting a specific keyword
    if (keyword) {
      const searchKeyword = keyword.toLowerCase()
      
      const { data: matchingPages } = await supabase
        .from('seo_pages')
        .select(`
          path,
          title,
          managed_title,
          target_keywords,
          clicks_28d,
          avg_position_28d
        `)
        .eq('site_id', site.id)
        .order('clicks_28d', { ascending: false })
        .limit(100)

      // Filter and score by keyword match
      const results = (matchingPages || [])
        .map(page => {
          const keywords = page.target_keywords || []
          const title = (page.managed_title || page.title || '').toLowerCase()
          
          let matchScore = 0
          let matchType = ''

          // Exact keyword match in target keywords
          if (keywords.some(k => k.toLowerCase() === searchKeyword)) {
            matchScore = 100
            matchType = 'exact_keyword'
          }
          // Partial keyword match
          else if (keywords.some(k => k.toLowerCase().includes(searchKeyword))) {
            matchScore = 80
            matchType = 'partial_keyword'
          }
          // Title contains keyword
          else if (title.includes(searchKeyword)) {
            matchScore = 60
            matchType = 'title_match'
          }
          // Path contains keyword
          else if (page.path.toLowerCase().includes(searchKeyword.replace(/\s+/g, '-'))) {
            matchScore = 40
            matchType = 'path_match'
          }

          return {
            path: page.path,
            title: page.managed_title || page.title,
            matchScore,
            matchType,
            position: page.avg_position_28d,
            clicks: page.clicks_28d
          }
        })
        .filter(p => p.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore || (b.clicks || 0) - (a.clicks || 0))
        .slice(0, parseInt(limit))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          keyword,
          results: results.map(p => ({
            path: p.path,
            url: `https://${domain}${p.path}`,
            title: p.title,
            matchType: p.matchType,
            anchorSuggestion: p.title, // Suggested anchor text
            position: p.position ? Math.round(p.position * 10) / 10 : null
          }))
        })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Either path or keyword parameter is required' })
    }

  } catch (err) {
    console.error('[seo-internal-links-api] Error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
