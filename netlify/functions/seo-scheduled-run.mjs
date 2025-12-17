// netlify/functions/seo-scheduled-run.mjs
// Scheduled function to run automated SEO analysis
// This runs on a cron schedule and processes all sites with enabled schedules
// Run via: netlify functions:invoke seo-scheduled-run (or automatic cron)

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Background function for 15-minute timeout
export const config = {
  type: 'background'
}

const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Create Supabase admin client
function createSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Main handler
export async function handler(event) {
  console.log('[SEO Scheduled Run] Starting scheduled analysis...')
  
  const supabase = createSupabaseAdmin()
  const now = new Date()

  try {
    // Find all sites with schedules due to run
    const { data: dueSchedules, error: scheduleError } = await supabase
      .from('seo_schedules')
      .select(`
        *,
        site:seo_sites(id, domain, site_name, org_id)
      `)
      .eq('enabled', true)
      .lte('next_run_at', now.toISOString())

    if (scheduleError) {
      console.error('[SEO Scheduled Run] Error fetching schedules:', scheduleError)
      return { statusCode: 500, body: JSON.stringify({ error: scheduleError.message }) }
    }

    if (!dueSchedules?.length) {
      console.log('[SEO Scheduled Run] No schedules due to run')
      return { statusCode: 200, body: JSON.stringify({ message: 'No schedules due' }) }
    }

    console.log(`[SEO Scheduled Run] Found ${dueSchedules.length} schedules to process`)

    // Process each scheduled site
    const results = []
    for (const schedule of dueSchedules) {
      console.log(`[SEO Scheduled Run] Processing site: ${schedule.site?.domain}`)
      
      try {
        const runResult = await runSiteAnalysis(supabase, schedule, openai)
        results.push({
          siteId: schedule.site_id,
          domain: schedule.site?.domain,
          status: 'success',
          ...runResult
        })

        // Update next run time
        await updateNextRun(supabase, schedule)

        // Send notification if enabled
        if (schedule.notifications) {
          await sendNotification(supabase, schedule, runResult)
        }
      } catch (siteError) {
        console.error(`[SEO Scheduled Run] Error processing site ${schedule.site_id}:`, siteError)
        results.push({
          siteId: schedule.site_id,
          domain: schedule.site?.domain,
          status: 'error',
          error: siteError.message
        })

        // Log the failed run
        await logScheduledRun(supabase, schedule.site_id, 'error', { error: siteError.message })
      }
    }

    console.log('[SEO Scheduled Run] All sites processed')
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Scheduled run complete',
        processed: results.length,
        results
      })
    }
  } catch (error) {
    console.error('[SEO Scheduled Run] Fatal error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Run analysis for a single site
async function runSiteAnalysis(supabase, schedule, openai) {
  const siteId = schedule.site_id
  const modules = schedule.modules?.includes('all') 
    ? ['keywords', 'technical', 'content', 'backlinks', 'local', 'schema']
    : schedule.modules

  const analysisResults = {}
  const timestamp = new Date().toISOString()

  console.log(`[SEO Scheduled Run] Running modules: ${modules.join(', ')}`)

  // Run each module
  for (const module of modules) {
    try {
      switch (module) {
        case 'keywords':
          analysisResults.keywords = await analyzeKeywords(supabase, siteId, openai)
          break
        case 'technical':
          analysisResults.technical = await runTechnicalCheck(supabase, siteId)
          break
        case 'content':
          analysisResults.content = await analyzeContentDecay(supabase, siteId, openai)
          break
        case 'backlinks':
          analysisResults.backlinks = await discoverBacklinks(supabase, siteId, openai)
          break
        case 'local':
          analysisResults.local = await analyzeLocalSeo(supabase, siteId)
          break
        case 'schema':
          analysisResults.schema = await validateSchema(supabase, siteId)
          break
      }
    } catch (moduleError) {
      console.error(`[SEO Scheduled Run] Module ${module} failed:`, moduleError)
      analysisResults[module] = { error: moduleError.message }
    }
  }

  // Generate AI summary of findings
  const summary = await generateAISummary(openai, analysisResults, schedule.site)

  // Log the successful run
  await logScheduledRun(supabase, siteId, 'success', {
    modules_run: modules,
    results: analysisResults,
    summary
  })

  // Auto-apply if enabled
  if (schedule.auto_apply) {
    await autoApplyRecommendations(supabase, siteId)
  }

  return {
    modules_run: modules,
    summary,
    recommendations_count: countRecommendations(analysisResults)
  }
}

// Module implementations
async function analyzeKeywords(supabase, siteId, openai) {
  // Fetch tracked keywords
  const { data: keywords } = await supabase
    .from('seo_tracked_keywords')
    .select('*')
    .eq('site_id', siteId)

  // Check for ranking changes
  const changes = []
  for (const keyword of keywords || []) {
    const previousPosition = keyword.previous_position || keyword.current_position
    const currentPosition = keyword.current_position
    
    if (Math.abs(currentPosition - previousPosition) >= 5) {
      changes.push({
        keyword: keyword.keyword,
        from: previousPosition,
        to: currentPosition,
        change: previousPosition - currentPosition
      })
    }
  }

  // Create alerts for significant changes
  for (const change of changes) {
    const severity = change.change < -10 ? 'critical' : change.change < 0 ? 'warning' : 'info'
    const type = change.change < 0 ? 'ranking_drop' : 'ranking_improvement'
    
    await supabase.from('seo_alerts').insert({
      site_id: siteId,
      type,
      severity,
      title: `${change.keyword}: ${change.change > 0 ? '+' : ''}${change.change} positions`,
      description: `Keyword "${change.keyword}" moved from position ${change.from} to ${change.to}`,
      data: change
    })
  }

  return { tracked: keywords?.length || 0, significant_changes: changes.length }
}

async function runTechnicalCheck(supabase, siteId) {
  // Get site domain
  const { data: site } = await supabase
    .from('seo_sites')
    .select('domain')
    .eq('id', siteId)
    .single()

  if (!site?.domain) return { error: 'No domain found' }

  // Run basic technical checks
  const checks = {
    ssl: false,
    responsive: null,
    robots: null,
    sitemap: null
  }

  try {
    // Check SSL
    const response = await fetch(`https://${site.domain}`, { method: 'HEAD' })
    checks.ssl = response.ok

    // Check robots.txt
    const robotsRes = await fetch(`https://${site.domain}/robots.txt`)
    checks.robots = robotsRes.ok

    // Check sitemap
    const sitemapRes = await fetch(`https://${site.domain}/sitemap.xml`)
    checks.sitemap = sitemapRes.ok
  } catch (e) {
    console.error('[Technical Check] Error:', e.message)
  }

  return checks
}

async function analyzeContentDecay(supabase, siteId, openai) {
  // Fetch pages with declining traffic
  const { data: pages } = await supabase
    .from('seo_pages')
    .select('id, url, title, clicks_30d, clicks_prev_30d')
    .eq('site_id', siteId)
    .order('clicks_30d', { ascending: false })
    .limit(100)

  const decaying = []
  for (const page of pages || []) {
    const prev = page.clicks_prev_30d || 0
    const current = page.clicks_30d || 0
    
    if (prev > 10 && current < prev * 0.7) { // 30% decline
      decaying.push({
        pageId: page.id,
        url: page.url,
        title: page.title,
        decline: Math.round((1 - current / prev) * 100)
      })
    }
  }

  // Create alerts for decaying content
  for (const page of decaying.slice(0, 5)) { // Top 5 only
    await supabase.from('seo_alerts').insert({
      site_id: siteId,
      type: 'content_decay',
      severity: page.decline > 50 ? 'critical' : 'warning',
      title: `Content decay: ${page.decline}% traffic loss`,
      description: `"${page.title}" has lost ${page.decline}% of traffic`,
      data: page
    })
  }

  return { total_pages: pages?.length || 0, decaying_count: decaying.length }
}

async function discoverBacklinks(supabase, siteId, openai) {
  // This would integrate with a backlink API in production
  // For now, we track existing opportunities
  const { data: opportunities } = await supabase
    .from('seo_backlink_opportunities')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', 'open')

  return { open_opportunities: opportunities?.length || 0 }
}

async function analyzeLocalSeo(supabase, siteId) {
  // Fetch local SEO data
  const { data: localData } = await supabase
    .from('seo_local_analysis')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    has_local_data: !!localData,
    score: localData?.score || null
  }
}

async function validateSchema(supabase, siteId) {
  // Check schema markup status
  const { data: schemas } = await supabase
    .from('seo_schema_markup')
    .select('page_id, schema_type, validation_status')
    .eq('site_id', siteId)

  const valid = schemas?.filter(s => s.validation_status === 'valid').length || 0
  const invalid = schemas?.filter(s => s.validation_status === 'invalid').length || 0

  return {
    total: schemas?.length || 0,
    valid,
    invalid
  }
}

// AI Summary generation
async function generateAISummary(openai, results, site) {
  try {
    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an SEO expert. Generate a brief, actionable summary of SEO analysis results. Be concise - 2-3 sentences max.'
        },
        {
          role: 'user',
          content: `SEO Analysis for ${site?.domain || 'site'}:\n${JSON.stringify(results, null, 2)}\n\nProvide a brief summary with top priority action.`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    })

    return completion.choices[0]?.message?.content || 'Analysis complete. Review dashboard for details.'
  } catch (e) {
    console.error('[AI Summary] Error:', e.message)
    return 'Analysis complete. Review dashboard for details.'
  }
}

// Helper functions
async function updateNextRun(supabase, schedule) {
  const now = new Date()
  let nextRun = new Date(now)
  
  switch (schedule.frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1)
      break
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7)
      break
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1)
      break
  }
  nextRun.setHours(2, 0, 0, 0)

  await supabase
    .from('seo_schedules')
    .update({
      next_run_at: nextRun.toISOString(),
      last_run_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('id', schedule.id)
}

async function logScheduledRun(supabase, siteId, status, data) {
  await supabase.from('seo_scheduled_runs').insert({
    site_id: siteId,
    status,
    data,
    created_at: new Date().toISOString()
  })
}

async function sendNotification(supabase, schedule, runResult) {
  // Get org contact for notification
  const { data: site } = await supabase
    .from('seo_sites')
    .select('org:orgs(id, name, contacts(email, name))')
    .eq('id', schedule.site_id)
    .single()

  if (!site?.org?.contacts?.length) return

  const contact = site.org.contacts[0]

  // Queue email notification (would integrate with Resend in production)
  console.log(`[Notification] Would send to ${contact.email}: ${runResult.summary}`)
}

async function autoApplyRecommendations(supabase, siteId) {
  // Find auto-applicable recommendations
  const { data: recommendations } = await supabase
    .from('seo_ai_recommendations')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', 'pending')
    .eq('auto_fixable', true)
    .limit(10)

  // Mark as auto-applied
  for (const rec of recommendations || []) {
    await supabase
      .from('seo_ai_recommendations')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        applied_by: 'auto'
      })
      .eq('id', rec.id)
  }

  console.log(`[Auto-Apply] Applied ${recommendations?.length || 0} recommendations`)
}

function countRecommendations(results) {
  let count = 0
  if (results.keywords?.significant_changes) count += results.keywords.significant_changes
  if (results.content?.decaying_count) count += results.content.decaying_count
  if (results.technical?.ssl === false) count += 1
  return count
}
