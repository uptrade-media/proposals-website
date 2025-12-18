// netlify/functions/seo-opportunities-detect.js
// Detect SEO opportunities for a site
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

// Opportunity type definitions
const OPPORTUNITY_TYPES = {
  // Metadata issues
  'title-missing': { priority: 'critical', impact: 'high', effort: 'quick-win', title: 'Missing title tag' },
  'title-too-short': { priority: 'medium', impact: 'medium', effort: 'quick-win', title: 'Title too short' },
  'title-too-long': { priority: 'low', impact: 'low', effort: 'quick-win', title: 'Title too long' },
  'meta-missing': { priority: 'high', impact: 'high', effort: 'quick-win', title: 'Missing meta description' },
  'meta-too-short': { priority: 'medium', impact: 'medium', effort: 'quick-win', title: 'Meta description too short' },
  'meta-too-long': { priority: 'low', impact: 'low', effort: 'quick-win', title: 'Meta description too long' },
  'h1-missing': { priority: 'high', impact: 'medium', effort: 'quick-win', title: 'Missing H1 tag' },
  'h1-multiple': { priority: 'medium', impact: 'low', effort: 'quick-win', title: 'Multiple H1 tags' },
  
  // Content issues
  'thin-content': { priority: 'high', impact: 'high', effort: 'significant', title: 'Thin content' },
  'images-no-alt': { priority: 'medium', impact: 'low', effort: 'moderate', title: 'Images missing alt text' },
  
  // Technical issues
  'schema-missing': { priority: 'medium', impact: 'medium', effort: 'moderate', title: 'No structured data' },
  'low-performance': { priority: 'high', impact: 'high', effort: 'significant', title: 'Poor PageSpeed score' },
  
  // Keyword opportunities
  'striking-distance': { priority: 'high', impact: 'high', effort: 'moderate', title: 'Striking distance keyword' },
  'low-ctr': { priority: 'high', impact: 'high', effort: 'moderate', title: 'Low CTR despite impressions' }
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    if (contact.role !== 'admin' && contact.role !== 'super_admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const { siteId, pageId, background } = JSON.parse(event.body || '{}')

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Site ID is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Check page count to decide if we should use background
    if (!pageId && !background) {
      const { count } = await supabase
        .from('seo_pages')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', siteId)

      if (count && count > 50) {
        // Use background function for sites with many pages
        const jobId = crypto.randomUUID()
        await supabase.from('seo_background_jobs').insert({
          id: jobId,
          site_id: siteId,
          job_type: 'opportunities-detect',
          status: 'pending',
          payload: { siteId }
        })

        // Trigger background function (fire and forget)
        const baseUrl = process.env.URL || 'https://portal.uptrademedia.com'
        fetch(`${baseUrl}/.netlify/functions/seo-opportunities-detect-background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, jobId })
        }).catch(err => console.error('[seo-opportunities-detect] Background trigger error:', err))

        return {
          statusCode: 202,
          headers,
          body: JSON.stringify({ 
            success: true, 
            background: true,
            jobId,
            message: `Analyzing ${count} pages in background`,
            checkStatusUrl: `/.netlify/functions/seo-background-jobs?jobId=${jobId}`
          })
        }
      }
    }

    // Fetch pages (inline for smaller sites or single page)
    let pagesQuery = supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', siteId)

    if (pageId) {
      pagesQuery = pagesQuery.eq('id', pageId)
    }

    const { data: pages, error: pagesError } = await pagesQuery

    if (pagesError || !pages) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch pages' }) }
    }

    // Fetch queries for striking distance detection
    const { data: queries } = await supabase
      .from('seo_queries')
      .select('*')
      .eq('site_id', siteId)

    // Get existing open opportunities to avoid duplicates
    const { data: existingOpps } = await supabase
      .from('seo_opportunities')
      .select('page_id, type')
      .eq('site_id', siteId)
      .eq('status', 'open')

    const existingKeys = new Set(
      existingOpps?.map(o => `${o.page_id}:${o.type}`) || []
    )

    const newOpportunities = []

    for (const page of pages) {
      // Detect metadata opportunities
      const pageOpps = detectPageOpportunities(page, existingKeys)
      newOpportunities.push(...pageOpps.map(o => ({ ...o, site_id: siteId })))
    }

    // Detect query-based opportunities
    if (queries) {
      const queryOpps = detectQueryOpportunities(queries, pages, existingKeys, siteId)
      newOpportunities.push(...queryOpps)
    }

    // Insert new opportunities
    let insertedCount = 0
    if (newOpportunities.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('seo_opportunities')
        .insert(newOpportunities)
        .select()

      if (insertError) {
        console.error('[seo-opportunities-detect] Insert error:', insertError)
      } else {
        insertedCount = inserted?.length || 0
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Opportunity detection completed',
        pagesAnalyzed: pages.length,
        opportunitiesFound: newOpportunities.length,
        opportunitiesCreated: insertedCount
      })
    }
  } catch (err) {
    console.error('[seo-opportunities-detect] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}

function detectPageOpportunities(page, existingKeys) {
  const opportunities = []
  const addOpp = (type, description, currentValue, recommendedValue, supportingData = null) => {
    const key = `${page.id}:${type}`
    if (existingKeys.has(key)) return
    
    const typeInfo = OPPORTUNITY_TYPES[type]
    opportunities.push({
      page_id: page.id,
      type,
      priority: typeInfo?.priority || 'medium',
      title: typeInfo?.title || type,
      description,
      current_value: currentValue,
      recommended_value: recommendedValue,
      estimated_impact: typeInfo?.impact || 'medium',
      estimated_effort: typeInfo?.effort || 'moderate',
      supporting_data: supportingData,
      status: 'open'
    })
  }

  // Title checks
  if (!page.title || page.title_length === 0) {
    addOpp('title-missing', 'This page has no title tag', null, 'Add a descriptive title tag (50-60 characters)')
  } else if (page.title_length < 30) {
    addOpp('title-too-short', `Title is only ${page.title_length} characters`, page.title, 'Expand to 50-60 characters')
  } else if (page.title_length > 60) {
    addOpp('title-too-long', `Title is ${page.title_length} characters and may be truncated`, page.title, 'Shorten to 50-60 characters')
  }

  // Meta description checks
  if (!page.meta_description || page.meta_description_length === 0) {
    addOpp('meta-missing', 'This page has no meta description', null, 'Add a compelling meta description (120-160 characters)')
  } else if (page.meta_description_length < 120) {
    addOpp('meta-too-short', `Meta description is only ${page.meta_description_length} characters`, page.meta_description, 'Expand to 120-160 characters')
  } else if (page.meta_description_length > 160) {
    addOpp('meta-too-long', `Meta description is ${page.meta_description_length} characters and may be truncated`, page.meta_description, 'Shorten to 120-160 characters')
  }

  // H1 checks
  if (!page.h1 || page.h1_count === 0) {
    addOpp('h1-missing', 'This page has no H1 tag', null, 'Add a single H1 that matches the page topic')
  } else if (page.h1_count > 1) {
    addOpp('h1-multiple', `This page has ${page.h1_count} H1 tags`, `${page.h1_count} H1s found`, 'Use only one H1 tag per page')
  }

  // Content checks
  if (page.word_count && page.word_count < 300) {
    addOpp('thin-content', `This page has only ${page.word_count} words`, `${page.word_count} words`, 'Expand content to at least 500+ words')
  }

  // Images check
  if (page.images_without_alt && page.images_without_alt > 0) {
    addOpp('images-no-alt', `${page.images_without_alt} images are missing alt text`, `${page.images_without_alt} images`, 'Add descriptive alt text to all images')
  }

  // Schema check
  if (!page.has_schema) {
    addOpp('schema-missing', 'No structured data found', null, 'Add relevant schema markup (FAQ, HowTo, etc)')
  }

  // Performance check
  if (page.performance_score && page.performance_score < 50) {
    addOpp('low-performance', `PageSpeed performance score is ${page.performance_score}`, `${page.performance_score}/100`, 'Optimize for 70+ performance score')
  }

  return opportunities
}

function detectQueryOpportunities(queries, pages, existingKeys, siteId) {
  const opportunities = []
  const pageMap = new Map(pages.map(p => [p.id, p]))

  for (const query of queries) {
    const page = query.page_id ? pageMap.get(query.page_id) : null

    // Striking distance (position 8-20 with decent impressions)
    if (query.avg_position_28d >= 8 && query.avg_position_28d <= 20 && query.impressions_28d >= 100) {
      const key = `${query.page_id}:striking-distance:${query.query_hash}`
      if (!existingKeys.has(key)) {
        const typeInfo = OPPORTUNITY_TYPES['striking-distance']
        opportunities.push({
          site_id: siteId,
          page_id: query.page_id,
          query_id: query.id,
          type: 'striking-distance',
          priority: typeInfo.priority,
          title: `"${query.query}" is in striking distance`,
          description: `This keyword is ranking at position ${query.avg_position_28d.toFixed(1)} with ${query.impressions_28d} impressions. A small improvement could push it to page 1.`,
          current_value: `Position ${query.avg_position_28d.toFixed(1)}`,
          recommended_value: 'Position 1-7 (page 1)',
          estimated_impact: typeInfo.impact,
          estimated_effort: typeInfo.effort,
          supporting_data: {
            query: query.query,
            clicks: query.clicks_28d,
            impressions: query.impressions_28d,
            position: query.avg_position_28d,
            ctr: query.ctr_28d
          },
          status: 'open'
        })
      }
    }

    // Low CTR despite high impressions
    if (query.impressions_28d >= 500 && query.ctr_28d < 2.0 && query.avg_position_28d <= 10) {
      const key = `${query.page_id}:low-ctr:${query.query_hash}`
      if (!existingKeys.has(key)) {
        const typeInfo = OPPORTUNITY_TYPES['low-ctr']
        opportunities.push({
          site_id: siteId,
          page_id: query.page_id,
          query_id: query.id,
          type: 'low-ctr',
          priority: typeInfo.priority,
          title: `Low CTR for "${query.query}"`,
          description: `This keyword has ${query.impressions_28d} impressions but only ${query.ctr_28d?.toFixed(2)}% CTR. Improving the title/meta could significantly increase clicks.`,
          current_value: `${query.ctr_28d?.toFixed(2)}% CTR`,
          recommended_value: '3-5% CTR for position ' + Math.round(query.avg_position_28d),
          estimated_impact: typeInfo.impact,
          estimated_effort: typeInfo.effort,
          supporting_data: {
            query: query.query,
            clicks: query.clicks_28d,
            impressions: query.impressions_28d,
            position: query.avg_position_28d,
            ctr: query.ctr_28d,
            pageTitle: page?.title,
            pageMeta: page?.meta_description
          },
          status: 'open'
        })
      }
    }
  }

  return opportunities
}
