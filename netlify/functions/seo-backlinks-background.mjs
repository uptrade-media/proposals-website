// netlify/functions/seo-backlinks-background.mjs
// Background function for Backlink Opportunity Discovery (up to 15 min timeout)
// Comprehensive AI-powered backlink opportunity identification
import { createClient } from '@supabase/supabase-js'
import { SEOSkill } from './skills/seo-skill.js'

const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

function createSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const supabase = createSupabaseAdmin()

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, orgId, userId, analysisType = 'comprehensive', jobId: existingJobId } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    // Create job record
    let jobId = existingJobId
    if (!jobId) {
      const { data: job, error: jobError } = await supabase
        .from('seo_background_jobs')
        .insert({
          site_id: siteId,
          org_id: orgId,
          job_type: 'backlink_discovery',
          status: 'running',
          progress: 0,
          started_by: userId,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (jobError) {
        console.error('[Backlinks Background] Failed to create job:', jobError)
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create job' }) }
      }
      jobId = job.id
    } else {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Return 202 Accepted immediately
    const response = {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        jobId,
        message: 'Backlink discovery started in background',
        pollUrl: `/.netlify/functions/seo-background-jobs?jobId=${jobId}`
      })
    }

    // Start background processing
    processBacklinkDiscovery(supabase, siteId, jobId, analysisType).catch(err => {
      console.error('[Backlinks Background] Processing error:', err)
      supabase
        .from('seo_background_jobs')
        .update({
          status: 'failed',
          error_message: err.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    })

    return response

  } catch (error) {
    console.error('[Backlinks Background] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

async function processBacklinkDiscovery(supabase, siteId, jobId, analysisType) {
  try {
    await updateJobProgress(supabase, jobId, 5, 'Fetching site data...')

    // Get site and knowledge
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(name, domain)')
      .eq('id', siteId)
      .single()

    if (!site) {
      throw new Error('Site not found')
    }

    // Initialize SEOSkill with org_id from site
    const seoSkill = new SEOSkill(supabase, site.org_id, siteId, {})

    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    await updateJobProgress(supabase, jobId, 15, 'Fetching content and competitors...')

    // Get top performing content
    const { data: topContent } = await supabase
      .from('seo_pages')
      .select('url, title, page_type, clicks_28d, impressions_28d, meta_description')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false })
      .limit(30)

    // Get competitor data
    const { data: competitors } = await supabase
      .from('seo_competitor_analysis')
      .select('*')
      .eq('site_id', siteId)
      .limit(5)

    await updateJobProgress(supabase, jobId, 25, 'Running AI analysis for resource opportunities...')

    // Run multiple AI analyses in parallel for different opportunity types
    const [resourceOpps, contentOpps, prOpps, competitorGapOpps, localOpps] = await Promise.all([
      discoverResourceOpportunities(seoSkill, { site, knowledge, topContent }),
      discoverContentOpportunities(seoSkill, { site, knowledge, topContent }),
      discoverPROpportunities(seoSkill, { site, knowledge }),
      discoverCompetitorGapOpportunities(seoSkill, { site, knowledge, competitors }),
      knowledge?.is_local_business ? discoverLocalOpportunities(seoSkill, { site, knowledge }) : Promise.resolve([])
    ])

    await updateJobProgress(supabase, jobId, 70, 'Processing and storing opportunities...')

    // Combine all opportunities
    const allOpportunities = [
      ...resourceOpps.map(o => ({ ...o, type: 'resource' })),
      ...contentOpps.map(o => ({ ...o, type: o.type || 'guest_post' })),
      ...prOpps.map(o => ({ ...o, type: 'digital_pr' })),
      ...competitorGapOpps.map(o => ({ ...o, type: 'competitor_gap' })),
      ...localOpps.map(o => ({ ...o, type: o.type || 'local' }))
    ]

    // Deduplicate by domain
    const seenDomains = new Set()
    const uniqueOpportunities = allOpportunities.filter(opp => {
      const domain = opp.targetDomain?.toLowerCase()
      if (!domain || seenDomains.has(domain)) return false
      seenDomains.add(domain)
      return true
    })

    await updateJobProgress(supabase, jobId, 80, 'Saving to database...')

    // Save opportunities to database
    const opportunitiesToInsert = uniqueOpportunities.map(opp => ({
      site_id: siteId,
      opportunity_type: opp.type,
      target_domain: opp.targetDomain,
      target_url: opp.targetUrl,
      target_page_title: opp.targetPageTitle,
      link_type: opp.linkType || 'unknown',
      suggested_anchor: opp.suggestedAnchor,
      target_page: opp.targetPage,
      outreach_template: opp.outreachTemplate,
      priority_score: opp.priorityScore || 5,
      difficulty_score: opp.difficultyScore || 5,
      estimated_da: opp.estimatedDA,
      reason: opp.reason,
      status: 'discovered',
      discovered_at: new Date().toISOString()
    }))

    // Insert with upsert to avoid duplicates
    let insertedCount = 0
    for (const opp of opportunitiesToInsert) {
      const { error } = await supabase
        .from('seo_backlink_opportunities')
        .upsert(opp, {
          onConflict: 'site_id,target_domain,target_url',
          ignoreDuplicates: true
        })
      if (!error) insertedCount++
    }

    await updateJobProgress(supabase, jobId, 90, 'Saving analysis run...')

    // Save analysis run
    const summary = {
      resource: resourceOpps.length,
      content: contentOpps.length,
      digital_pr: prOpps.length,
      competitor_gap: competitorGapOpps.length,
      local: localOpps.length
    }

    await supabase
      .from('seo_ai_analysis_runs')
      .insert({
        site_id: siteId,
        run_type: 'backlink_opportunities',
        status: 'completed',
        results: {
          opportunitiesFound: uniqueOpportunities.length,
          opportunitiesInserted: insertedCount,
          byType: summary
        },
        ai_model: SEO_AI_MODEL,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

    // Complete job
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result: {
          success: true,
          opportunitiesFound: uniqueOpportunities.length,
          opportunitiesInserted: insertedCount,
          byType: summary,
          topOpportunities: uniqueOpportunities
            .sort((a, b) => (b.priorityScore || 5) - (a.priorityScore || 5))
            .slice(0, 10)
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[Backlinks Background] Completed job ${jobId} - ${insertedCount} opportunities saved`)

  } catch (error) {
    console.error('[Backlinks Background] Processing error:', error)
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
    throw error
  }
}

async function discoverResourceOpportunities(openai, context) {
  const { site, knowledge, topContent } = context

  try {
    const response = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert link builder. Identify specific resource page, directory, and association link opportunities. Be specific with platform names and URLs where possible.'
        },
        {
          role: 'user',
          content: `Find resource link building opportunities:

WEBSITE:
Domain: ${site.domain}
Business: ${knowledge?.business_name || site.org?.name || 'Unknown'}
Industry: ${knowledge?.industry || 'Unknown'}
Services: ${knowledge?.primary_services?.map(s => s.name || s).join(', ') || 'Unknown'}
Location: ${knowledge?.primary_location || 'Unknown'}

TOP CONTENT:
${topContent?.slice(0, 5).map(c => `- ${c.title} (${c.url})`).join('\n')}

Find 8-10 specific opportunities:
1. Industry directories and associations
2. Niche resource pages listing businesses/tools
3. Local business directories (if local)
4. Professional organization memberships
5. Trade association listings

Return JSON:
{
  "opportunities": [
    {
      "targetDomain": "example.org",
      "targetUrl": "https://example.org/resources",
      "targetPageTitle": "Industry Resources Page",
      "suggestedAnchor": "anchor text",
      "targetPage": "which of our pages to link",
      "reason": "Why good opportunity",
      "outreachTemplate": "Brief approach",
      "priorityScore": 1-10,
      "difficultyScore": 1-10,
      "estimatedDA": 0-100
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.opportunities || []
  } catch (error) {
    console.error('[Backlinks] Resource discovery error:', error)
    return []
  }
}

async function discoverContentOpportunities(openai, context) {
  const { site, knowledge, topContent } = context

  try {
    const response = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at finding guest posting, expert roundup, and content-based link opportunities. Focus on realistic, industry-relevant targets.'
        },
        {
          role: 'user',
          content: `Find content-based link opportunities:

WEBSITE:
Domain: ${site.domain}
Business: ${knowledge?.business_name || site.org?.name}
Industry: ${knowledge?.industry || 'Unknown'}
Expertise Areas: ${knowledge?.expertise_areas?.join(', ') || knowledge?.primary_services?.map(s => s.name || s).join(', ') || 'Unknown'}

TOP CONTENT (potential link targets):
${topContent?.slice(0, 5).map(c => `- ${c.title}`).join('\n')}

Find 6-8 opportunities:
1. Industry blogs accepting guest posts
2. Podcast appearance opportunities
3. Expert roundup participation
4. HARO/journalist query targets
5. Content collaboration opportunities

Return JSON:
{
  "opportunities": [
    {
      "type": "guest_post|podcast|roundup|haro|collaboration",
      "targetDomain": "blog.example.com",
      "targetUrl": "https://blog.example.com/write-for-us",
      "targetPageTitle": "Write for Us",
      "suggestedAnchor": "anchor text",
      "targetPage": "which content to pitch",
      "reason": "Why relevant",
      "outreachTemplate": "Pitch approach",
      "priorityScore": 1-10,
      "difficultyScore": 1-10,
      "estimatedDA": 0-100
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.opportunities || []
  } catch (error) {
    console.error('[Backlinks] Content discovery error:', error)
    return []
  }
}

async function discoverPROpportunities(openai, context) {
  const { site, knowledge } = context

  try {
    const response = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a digital PR expert. Identify news angles, data story opportunities, and press outreach targets.'
        },
        {
          role: 'user',
          content: `Find digital PR link opportunities:

BUSINESS:
Name: ${knowledge?.business_name || site.org?.name}
Domain: ${site.domain}
Industry: ${knowledge?.industry || 'Unknown'}
Location: ${knowledge?.primary_location || 'Unknown'}
Unique Angles: ${knowledge?.unique_value_props?.join(', ') || 'Unknown'}

Find 4-6 PR opportunities:
1. Local news outlets
2. Industry publications
3. Data study opportunities
4. Expert commentary angles
5. Press release distribution targets

Return JSON:
{
  "opportunities": [
    {
      "targetDomain": "news.example.com",
      "targetUrl": "https://news.example.com/submit-news",
      "targetPageTitle": "Local Business News",
      "suggestedAnchor": "company name",
      "newsAngle": "What story to pitch",
      "reason": "Why newsworthy",
      "outreachTemplate": "Pitch approach",
      "priorityScore": 1-10,
      "difficultyScore": 1-10,
      "estimatedDA": 0-100
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.opportunities || []
  } catch (error) {
    console.error('[Backlinks] PR discovery error:', error)
    return []
  }
}

async function discoverCompetitorGapOpportunities(openai, context) {
  const { site, knowledge, competitors } = context

  if (!competitors || competitors.length === 0) return []

  try {
    const response = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at competitive link analysis. Identify common backlink sources that competitors likely have that this site may be missing.'
        },
        {
          role: 'user',
          content: `Find competitor backlink gap opportunities:

OUR SITE:
Domain: ${site.domain}
Industry: ${knowledge?.industry || 'Unknown'}

COMPETITORS:
${competitors.map(c => `- ${c.competitor_domain}`).join('\n')}

Based on typical backlink profiles in the ${knowledge?.industry || 'industry'} space, identify 4-6 link sources that competitors likely have:
1. Industry directories they're all listed in
2. Review sites common to the industry
3. Partner/vendor ecosystems
4. Comparison/best-of sites
5. Industry award/recognition programs

Return JSON:
{
  "opportunities": [
    {
      "targetDomain": "bestof.example.com",
      "targetUrl": "https://bestof.example.com/category",
      "targetPageTitle": "Best [Industry] Companies",
      "reason": "Competitors likely listed here",
      "outreachTemplate": "How to get listed",
      "priorityScore": 1-10,
      "difficultyScore": 1-10,
      "estimatedDA": 0-100
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.opportunities || []
  } catch (error) {
    console.error('[Backlinks] Competitor gap error:', error)
    return []
  }
}

async function discoverLocalOpportunities(openai, context) {
  const { site, knowledge } = context

  try {
    const response = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a local SEO expert. Find local link building opportunities including citations, local partnerships, and community involvement.'
        },
        {
          role: 'user',
          content: `Find local link building opportunities:

BUSINESS:
Name: ${knowledge?.business_name || site.org?.name}
Domain: ${site.domain}
Location: ${knowledge?.primary_location || 'Unknown'}
Service Areas: ${knowledge?.service_areas?.map(a => a.name || a).join(', ') || 'Unknown'}
Industry: ${knowledge?.industry || 'Unknown'}

Find 5-7 local opportunities:
1. Local chamber of commerce
2. Local business directories
3. Community sponsorship opportunities
4. Local news/blogs
5. Local business associations
6. Local event sponsorships

Return JSON:
{
  "opportunities": [
    {
      "type": "chamber|directory|sponsorship|local_news|association",
      "targetDomain": "local.example.org",
      "targetUrl": "https://local.example.org/members",
      "targetPageTitle": "Business Directory",
      "reason": "Local relevance",
      "outreachTemplate": "How to join/get listed",
      "priorityScore": 1-10,
      "difficultyScore": 1-10,
      "estimatedDA": 0-100
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.opportunities || []
  } catch (error) {
    console.error('[Backlinks] Local discovery error:', error)
    return []
  }
}

async function updateJobProgress(supabase, jobId, progress, message) {
  await supabase
    .from('seo_background_jobs')
    .update({
      progress,
      progress_message: message,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
}
