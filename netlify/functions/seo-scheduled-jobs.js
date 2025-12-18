/**
 * SEO Scheduled Jobs - Runs daily/weekly SEO maintenance tasks
 * 
 * This is a Netlify Scheduled Function that runs automatically.
 * Configure in netlify.toml:
 * 
 * [[plugins]]
 *   package = "@netlify/plugin-functions"
 * 
 * [functions."seo-scheduled-jobs"]
 *   schedule = "0 6 * * *"  # Run daily at 6 AM UTC
 * 
 * Tasks:
 * - Daily: Archive ranking snapshots
 * - Weekly (Monday): Generate and send weekly reports
 * - Monthly (1st): Generate monthly reports
 */

import { createSupabaseAdmin } from './utils/supabase.js'

const headers = {
  'Content-Type': 'application/json'
}

export async function handler(event) {
  // Allow manual trigger via POST with secret
  if (event.httpMethod === 'POST') {
    const { secret, task } = JSON.parse(event.body || '{}')
    if (secret !== process.env.SCHEDULED_JOB_SECRET) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    return runTask(task || 'all')
  }

  // Scheduled function call (from Netlify scheduler)
  return runTask('all')
}

async function runTask(taskType) {
  const supabase = createSupabaseAdmin()
  const results = {
    timestamp: new Date().toISOString(),
    tasks: {}
  }

  try {
    // Get all active sites
    const { data: sites } = await supabase
      .from('seo_sites')
      .select('id, domain')
      .eq('is_active', true)

    if (!sites || sites.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No active sites to process', results })
      }
    }

    const today = new Date()
    const dayOfWeek = today.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = today.getUTCDate()

    // Daily: Archive ranking snapshots
    if (taskType === 'all' || taskType === 'rankings') {
      results.tasks.rankings = await archiveRankingsForAllSites(supabase, sites)
    }

    // Weekly reports (run on Monday)
    if ((taskType === 'all' && dayOfWeek === 1) || taskType === 'weekly-reports') {
      results.tasks.weeklyReports = await sendScheduledReports(supabase, sites, 'weekly')
    }

    // Monthly reports (run on the 1st)
    if ((taskType === 'all' && dayOfMonth === 1) || taskType === 'monthly-reports') {
      results.tasks.monthlyReports = await sendScheduledReports(supabase, sites, 'monthly')
    }

    // Weekly: Check for content decay (run on Tuesday)
    if ((taskType === 'all' && dayOfWeek === 2) || taskType === 'content-decay') {
      results.tasks.contentDecay = await checkContentDecay(supabase, sites)
    }

    // Weekly: Generate new opportunities (run on Wednesday)
    if ((taskType === 'all' && dayOfWeek === 3) || taskType === 'opportunities') {
      results.tasks.opportunities = await generateOpportunities(supabase, sites)
    }

    console.log('[seo-scheduled-jobs] Completed:', results)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results })
    }

  } catch (err) {
    console.error('[seo-scheduled-jobs] Error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, results })
    }
  }
}

// Archive current rankings for all sites
async function archiveRankingsForAllSites(supabase, sites) {
  const results = []
  const today = new Date().toISOString().split('T')[0]

  for (const site of sites) {
    try {
      // Get tracked keywords with positions
      const { data: keywords } = await supabase
        .from('seo_tracked_keywords')
        .select('id, keyword, current_position, best_ranking_url')
        .eq('site_id', site.id)
        .not('current_position', 'is', null)

      if (!keywords || keywords.length === 0) {
        results.push({ siteId: site.id, domain: site.domain, archived: 0 })
        continue
      }

      // Get GSC metrics for these keywords
      const { data: gscData } = await supabase
        .from('seo_gsc_queries')
        .select('query, clicks, impressions, ctr')
        .eq('site_id', site.id)

      const gscMap = new Map()
      gscData?.forEach(q => gscMap.set(q.query.toLowerCase(), q))

      // Create history records
      const records = keywords.map(kw => {
        const gsc = gscMap.get(kw.keyword.toLowerCase())
        return {
          site_id: site.id,
          keyword_id: kw.id,
          keyword: kw.keyword,
          url: kw.best_ranking_url,
          position: kw.current_position,
          clicks: gsc?.clicks || 0,
          impressions: gsc?.impressions || 0,
          ctr: gsc?.ctr || null,
          date: today,
          source: 'scheduled'
        }
      })

      // Upsert to avoid duplicates
      const { error } = await supabase
        .from('seo_ranking_history')
        .upsert(records, { onConflict: 'site_id,keyword,date' })

      if (error) throw error

      results.push({ siteId: site.id, domain: site.domain, archived: records.length })

    } catch (err) {
      results.push({ siteId: site.id, domain: site.domain, error: err.message })
    }
  }

  return results
}

// Send scheduled reports
async function sendScheduledReports(supabase, sites, reportType) {
  const results = []

  // Get scheduled report configurations
  const { data: scheduledReports } = await supabase
    .from('seo_scheduled_reports')
    .select('*')
    .eq('report_type', reportType)
    .eq('is_active', true)

  if (!scheduledReports || scheduledReports.length === 0) {
    return { message: `No ${reportType} reports configured` }
  }

  for (const config of scheduledReports) {
    try {
      // Call the reports function
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      // Get site info
      const site = sites.find(s => s.id === config.site_id)
      if (!site) continue

      // Generate report data
      const reportData = await generateReportData(supabase, config.site_id, reportType)

      // Store the report
      await supabase
        .from('seo_reports')
        .insert({
          site_id: config.site_id,
          report_type: reportType,
          period: reportType === 'monthly' ? '30d' : '7d',
          data: reportData,
          generated_at: new Date().toISOString()
        })

      // Send emails
      const recipients = config.recipients || []
      if (recipients.length > 0 && process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'seo@uptrademedia.com',
          to: recipients,
          subject: `${site.domain} ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} SEO Report`,
          html: generateEmailHtml(site, reportType, reportData)
        })
      }

      // Update last run time
      await supabase
        .from('seo_scheduled_reports')
        .update({ 
          last_run_at: new Date().toISOString(),
          next_run_at: calculateNextRun(reportType)
        })
        .eq('id', config.id)

      results.push({ siteId: config.site_id, domain: site.domain, sent: recipients.length })

    } catch (err) {
      results.push({ siteId: config.site_id, error: err.message })
    }
  }

  return results
}

// Check for content decay across sites
async function checkContentDecay(supabase, sites) {
  const results = []

  for (const site of sites) {
    try {
      // Find pages with significant traffic drops
      const { data: decayingPages } = await supabase
        .from('seo_pages')
        .select('id, url, clicks_28d, clicks_prev_28d')
        .eq('site_id', site.id)
        .not('clicks_prev_28d', 'is', null)
        .gt('clicks_prev_28d', 10)

      const decaying = decayingPages?.filter(p => {
        const dropPercent = ((p.clicks_prev_28d - p.clicks_28d) / p.clicks_prev_28d) * 100
        return dropPercent > 30
      }) || []

      // Create alerts for significant drops
      for (const page of decaying.slice(0, 5)) {
        const dropPercent = Math.round(((page.clicks_prev_28d - page.clicks_28d) / page.clicks_prev_28d) * 100)
        
        await supabase
          .from('seo_alerts')
          .upsert({
            site_id: site.id,
            page_id: page.id,
            alert_type: 'content_decay',
            severity: dropPercent > 50 ? 'high' : 'medium',
            message: `Traffic dropped ${dropPercent}% (${page.clicks_prev_28d} → ${page.clicks_28d} clicks)`,
            metadata: { url: page.url, dropPercent }
          }, {
            onConflict: 'site_id,page_id,alert_type'
          })
      }

      results.push({ siteId: site.id, domain: site.domain, decayingPages: decaying.length })

    } catch (err) {
      results.push({ siteId: site.id, error: err.message })
    }
  }

  return results
}

// Generate new SEO opportunities
async function generateOpportunities(supabase, sites) {
  const results = []

  for (const site of sites) {
    try {
      let newOpportunities = 0

      // 1. Find striking distance keywords (position 11-20)
      const { data: strikingKeywords } = await supabase
        .from('seo_gsc_queries')
        .select('query, avg_position, clicks, impressions')
        .eq('site_id', site.id)
        .gte('avg_position', 11)
        .lte('avg_position', 20)
        .gt('impressions', 100)
        .order('impressions', { ascending: false })
        .limit(10)

      for (const kw of (strikingKeywords || [])) {
        const { error } = await supabase
          .from('seo_opportunities')
          .upsert({
            site_id: site.id,
            type: 'keyword_optimization',
            priority: 'high',
            status: 'open',
            title: `Push "${kw.query}" to page 1`,
            description: `Currently ranking #${Math.round(kw.avg_position)} with ${kw.impressions} impressions. Small improvements could drive significant traffic.`,
            impact_estimate: Math.round(kw.impressions * 0.05), // 5% CTR estimate
            metadata: { keyword: kw.query, currentPosition: kw.avg_position }
          }, {
            onConflict: 'site_id,type,title',
            ignoreDuplicates: true
          })
        
        if (!error) newOpportunities++
      }

      // 2. Find pages with low CTR but good positions
      const { data: lowCtrPages } = await supabase
        .from('seo_pages')
        .select('url, avg_position_28d, ctr, impressions_28d')
        .eq('site_id', site.id)
        .lte('avg_position_28d', 10)
        .lt('ctr', 0.02) // Less than 2% CTR
        .gt('impressions_28d', 500)
        .limit(5)

      for (const page of (lowCtrPages || [])) {
        await supabase
          .from('seo_opportunities')
          .upsert({
            site_id: site.id,
            type: 'title_description_optimization',
            priority: 'medium',
            status: 'open',
            title: `Improve CTR for top-ranking page`,
            description: `${page.url} ranks #${Math.round(page.avg_position_28d)} but has only ${(page.ctr * 100).toFixed(1)}% CTR. Optimize title/description.`,
            affected_url: page.url,
            metadata: { ctr: page.ctr, position: page.avg_position_28d }
          }, {
            onConflict: 'site_id,affected_url,type',
            ignoreDuplicates: true
          })
        
        newOpportunities++
      }

      results.push({ siteId: site.id, domain: site.domain, newOpportunities })

    } catch (err) {
      results.push({ siteId: site.id, error: err.message })
    }
  }

  return results
}

// Helper: Generate report data
async function generateReportData(supabase, siteId, reportType) {
  const periodDays = reportType === 'monthly' ? 30 : 7

  const { data: pages } = await supabase
    .from('seo_pages')
    .select('url, clicks_28d, impressions_28d, avg_position_28d, clicks_prev_28d')
    .eq('site_id', siteId)
    .order('clicks_28d', { ascending: false })
    .limit(20)

  const totalClicks = pages?.reduce((sum, p) => sum + (p.clicks_28d || 0), 0) || 0
  const totalImpressions = pages?.reduce((sum, p) => sum + (p.impressions_28d || 0), 0) || 0
  const prevClicks = pages?.reduce((sum, p) => sum + (p.clicks_prev_28d || 0), 0) || 0

  return {
    summary: {
      totalClicks,
      totalImpressions,
      clicksChange: prevClicks > 0 ? ((totalClicks - prevClicks) / prevClicks * 100).toFixed(1) : 0,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0
    },
    topPages: pages?.slice(0, 10) || [],
    generatedAt: new Date().toISOString()
  }
}

// Helper: Generate email HTML
function generateEmailHtml(site, reportType, data) {
  const trend = parseFloat(data.summary.clicksChange) >= 0 ? '📈' : '📉'
  
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1>${site.domain} ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} SEO Report</h1>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h2>Performance Summary</h2>
        <p><strong>${data.summary.totalClicks.toLocaleString()}</strong> clicks ${trend} ${Math.abs(data.summary.clicksChange)}%</p>
        <p><strong>${data.summary.totalImpressions.toLocaleString()}</strong> impressions</p>
        <p><strong>${data.summary.avgCtr}%</strong> average CTR</p>
      </div>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        Generated by Uptrade Portal SEO Module
      </p>
    </body>
    </html>
  `
}

// Helper: Calculate next run time
function calculateNextRun(reportType) {
  const now = new Date()
  if (reportType === 'weekly') {
    // Next Monday at 6 AM UTC
    const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7
    const nextRun = new Date(now)
    nextRun.setUTCDate(now.getUTCDate() + daysUntilMonday)
    nextRun.setUTCHours(6, 0, 0, 0)
    return nextRun.toISOString()
  } else if (reportType === 'monthly') {
    // 1st of next month at 6 AM UTC
    const nextRun = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 6, 0, 0, 0)
    return nextRun.toISOString()
  }
  return null
}
