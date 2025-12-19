/**
 * SEO Opportunities Detection Background Function
 * 
 * Detects SEO opportunities across all pages.
 * For sites with 100+ pages, this can take a while.
 * Background functions can run up to 15 minutes.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Opportunity type definitions - use correct DB column names
const OPPORTUNITY_TYPES = {
  'title-missing': { priority: 'critical', estimated_impact: 'high', estimated_effort: 'quick-win', title: 'Missing title tag' },
  'title-too-short': { priority: 'medium', estimated_impact: 'medium', estimated_effort: 'quick-win', title: 'Title too short' },
  'title-too-long': { priority: 'low', estimated_impact: 'low', estimated_effort: 'quick-win', title: 'Title too long' },
  'meta-missing': { priority: 'high', estimated_impact: 'high', estimated_effort: 'quick-win', title: 'Missing meta description' },
  'meta-too-short': { priority: 'medium', estimated_impact: 'medium', estimated_effort: 'quick-win', title: 'Meta description too short' },
  'meta-too-long': { priority: 'low', estimated_impact: 'low', estimated_effort: 'quick-win', title: 'Meta description too long' },
  'h1-missing': { priority: 'high', estimated_impact: 'medium', estimated_effort: 'quick-win', title: 'Missing H1 tag' },
  'h1-multiple': { priority: 'medium', estimated_impact: 'low', estimated_effort: 'quick-win', title: 'Multiple H1 tags' },
  'thin-content': { priority: 'high', estimated_impact: 'high', estimated_effort: 'significant', title: 'Thin content' },
  'images-no-alt': { priority: 'medium', estimated_impact: 'low', estimated_effort: 'moderate', title: 'Images missing alt text' },
  'schema-missing': { priority: 'medium', estimated_impact: 'medium', estimated_effort: 'moderate', title: 'No structured data' },
  'low-performance': { priority: 'high', estimated_impact: 'high', estimated_effort: 'significant', title: 'Poor PageSpeed score' },
  'striking-distance': { priority: 'high', estimated_impact: 'high', estimated_effort: 'moderate', title: 'Striking distance keyword' },
  'low-ctr': { priority: 'high', estimated_impact: 'high', estimated_effort: 'moderate', title: 'Low CTR despite impressions' }
}

export default async function handler(req) {
  console.log('[seo-opportunities-detect-background] Starting...')

  try {
    const { siteId, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Fetch ALL pages for this site (background can handle more)
    const { data: pages, error: pagesError } = await supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', siteId)

    if (pagesError || !pages) {
      throw new Error('Failed to fetch pages')
    }

    console.log(`[seo-opportunities-detect-background] Analyzing ${pages.length} pages...`)

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
      if (!page.title || page.title.trim() === '') {
        addOpportunity(newOpportunities, siteId, page, 'title-missing', existingKeys)
      } else if (page.title_length && page.title_length < 30) {
        addOpportunity(newOpportunities, siteId, page, 'title-too-short', existingKeys)
      } else if (page.title_length && page.title_length > 60) {
        addOpportunity(newOpportunities, siteId, page, 'title-too-long', existingKeys)
      }

      if (!page.meta_description || page.meta_description.trim() === '') {
        addOpportunity(newOpportunities, siteId, page, 'meta-missing', existingKeys)
      } else if (page.meta_description_length && page.meta_description_length < 70) {
        addOpportunity(newOpportunities, siteId, page, 'meta-too-short', existingKeys)
      } else if (page.meta_description_length && page.meta_description_length > 160) {
        addOpportunity(newOpportunities, siteId, page, 'meta-too-long', existingKeys)
      }

      if (!page.h1 || page.h1.trim() === '') {
        addOpportunity(newOpportunities, siteId, page, 'h1-missing', existingKeys)
      }

      if (page.h1_count && page.h1_count > 1) {
        addOpportunity(newOpportunities, siteId, page, 'h1-multiple', existingKeys)
      }

      // Content issues
      if (page.word_count && page.word_count < 300) {
        addOpportunity(newOpportunities, siteId, page, 'thin-content', existingKeys)
      }

      // Performance issues
      if (page.pagespeed_mobile && page.pagespeed_mobile < 50) {
        addOpportunity(newOpportunities, siteId, page, 'low-performance', existingKeys)
      }
    }

    // Detect striking distance keywords (position 11-20)
    if (queries && queries.length > 0) {
      const strikingDistanceQueries = queries.filter(q => 
        q.avg_position >= 11 && 
        q.avg_position <= 20 && 
        q.impressions_28d >= 50
      )

      for (const query of strikingDistanceQueries) {
        // Find associated page
        const page = pages.find(p => query.page_url && p.url === query.page_url)
        if (page) {
          const key = `${page.id}:striking-distance`
          if (!existingKeys.has(key)) {
            const typeDef = OPPORTUNITY_TYPES['striking-distance']
            newOpportunities.push({
              site_id: siteId,
              page_id: page.id,
              type: 'striking-distance',
              title: typeDef.title,
              priority: typeDef.priority,
              estimated_impact: typeDef.estimated_impact,
              estimated_effort: typeDef.estimated_effort,
              description: `"${query.query}" ranks at position ${query.avg_position.toFixed(1)}. Optimize to reach page 1.`,
              supporting_data: { query: query.query, position: query.avg_position, impressions: query.impressions_28d },
              status: 'open'
            })
            existingKeys.add(key)
          }
        }
      }
    }

    // Detect low CTR (high impressions, low clicks)
    if (queries && queries.length > 0) {
      const lowCtrQueries = queries.filter(q => 
        q.impressions_28d >= 100 && 
        q.avg_position <= 10 &&
        q.ctr_28d && q.ctr_28d < 0.02 // Less than 2% CTR
      )

      for (const query of lowCtrQueries) {
        const page = pages.find(p => query.page_url && p.url === query.page_url)
        if (page) {
          const key = `${page.id}:low-ctr`
          if (!existingKeys.has(key)) {
            const typeDef = OPPORTUNITY_TYPES['low-ctr']
            newOpportunities.push({
              site_id: siteId,
              page_id: page.id,
              type: 'low-ctr',
              title: typeDef.title,
              priority: typeDef.priority,
              estimated_impact: typeDef.estimated_impact,
              estimated_effort: typeDef.estimated_effort,
              description: `"${query.query}" has ${query.impressions_28d} impressions but only ${(query.ctr_28d * 100).toFixed(1)}% CTR. Improve title/description.`,
              supporting_data: { query: query.query, impressions: query.impressions_28d, ctr: query.ctr_28d },
              status: 'open'
            })
            existingKeys.add(key)
          }
        }
      }
    }

    // Insert opportunities in batches
    let created = 0
    if (newOpportunities.length > 0) {
      for (let i = 0; i < newOpportunities.length; i += 50) {
        const batch = newOpportunities.slice(i, i + 50)
        const { error: insertError } = await supabase
          .from('seo_opportunities')
          .insert(batch)

        if (!insertError) {
          created += batch.length
        } else {
          console.error('[seo-opportunities-detect-background] Insert error:', insertError)
        }
      }
    }

    const result = {
      pagesAnalyzed: pages.length,
      opportunitiesFound: newOpportunities.length,
      opportunitiesCreated: created,
      byType: groupBy(newOpportunities, 'type')
    }

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          result
        })
        .eq('id', jobId)
    }

    console.log('[seo-opportunities-detect-background] Completed:', result)

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (err) {
    console.error('[seo-opportunities-detect-background] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

function addOpportunity(opportunities, siteId, page, type, existingKeys) {
  const key = `${page.id}:${type}`
  if (!existingKeys.has(key)) {
    const typeDef = OPPORTUNITY_TYPES[type]
    opportunities.push({
      site_id: siteId,
      page_id: page.id,
      type,
      title: typeDef.title,
      priority: typeDef.priority,
      estimated_impact: typeDef.estimated_impact,
      estimated_effort: typeDef.estimated_effort,
      description: `${typeDef.title} on ${page.path || page.url}`,
      status: 'open'
    })
    existingKeys.add(key)
  }
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const val = item[key]
    acc[val] = (acc[val] || 0) + 1
    return acc
  }, {})
}

export const config = {
  type: 'background'
}
