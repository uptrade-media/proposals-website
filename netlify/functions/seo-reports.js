/**
 * SEO Reports - Automated SEO Performance Reporting
 * 
 * Generates and sends SEO performance reports via email.
 * Can be triggered manually or scheduled via Netlify scheduled functions.
 * 
 * POST /api/seo-reports
 * Body: { siteId, reportType, recipients?, period?, sendEmail? }
 * 
 * Report Types:
 * - weekly: Weekly performance summary
 * - monthly: Monthly comprehensive report
 * - ranking-changes: Keyword ranking movements
 * - traffic-anomaly: Traffic drops/spikes
 * - technical-health: Technical SEO issues
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  const supabase = createSupabaseAdmin()

  try {
    // GET - List scheduled reports for a site
    if (event.httpMethod === 'GET') {
      const { contact, error: authError } = await getAuthenticatedUser(event)
      if (authError || !contact) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
      }

      const params = event.queryStringParameters || {}
      const { siteId } = params

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      const { data: reports } = await supabase
        .from('seo_reports')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(20)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reports: reports || [] })
      }
    }

    // POST - Generate report
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const { 
      siteId, 
      reportType = 'weekly', 
      recipients = [], 
      period = '7d',
      sendEmail = true 
    } = JSON.parse(event.body || '{}')

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    // Get site info
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(name, contacts(email, name))')
      .eq('id', siteId)
      .single()

    if (!site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Generate report data based on type
    let reportData = {}
    const periodDays = period === '30d' ? 30 : period === '7d' ? 7 : 14

    switch (reportType) {
      case 'weekly':
      case 'monthly':
        reportData = await generatePerformanceReport(supabase, siteId, periodDays)
        break
      case 'ranking-changes':
        reportData = await generateRankingReport(supabase, siteId, periodDays)
        break
      case 'traffic-anomaly':
        reportData = await generateTrafficAnomalyReport(supabase, siteId, periodDays)
        break
      case 'technical-health':
        reportData = await generateTechnicalReport(supabase, siteId)
        break
      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid reportType' }) }
    }

    // Store the report
    const { data: report, error: insertError } = await supabase
      .from('seo_reports')
      .insert({
        site_id: siteId,
        report_type: reportType,
        period,
        data: reportData,
        generated_by: contact.id,
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Send email if requested - ONLY to explicit recipients, never auto-discover
    // This prevents accidentally emailing prospects/leads in the org contacts
    let emailResult = null
    if (sendEmail && process.env.RESEND_API_KEY && recipients.length > 0) {
      // Only send to explicitly provided recipients, not all org contacts
      const emailRecipients = recipients

      if (emailRecipients.length > 0) {
        const emailHtml = generateReportEmailHtml(site, reportType, reportData, periodDays)
        
        try {
          emailResult = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'seo@uptrademedia.com',
            to: emailRecipients,
            subject: `${site.domain} SEO Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`,
            html: emailHtml
          })
        } catch (emailErr) {
          console.error('[seo-reports] Email error:', emailErr)
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        report,
        emailSent: !!emailResult,
        emailRecipients: recipients.length > 0 ? recipients : undefined
      })
    }

  } catch (err) {
    console.error('[seo-reports] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}

// Generate weekly/monthly performance report
async function generatePerformanceReport(supabase, siteId, periodDays) {
  // Get current period GSC data
  const { data: pages } = await supabase
    .from('seo_pages')
    .select('url, clicks_28d, impressions_28d, avg_position_28d, ctr, clicks_prev_28d, impressions_prev_28d, health_score')
    .eq('site_id', siteId)
    .order('clicks_28d', { ascending: false })
    .limit(50)

  // Get keywords
  const { data: keywords } = await supabase
    .from('seo_tracked_keywords')
    .select('keyword, current_position, previous_position, best_position, target_position')
    .eq('site_id', siteId)
    .order('current_position', { ascending: true })
    .limit(30)

  // Get opportunities
  const { data: opportunities } = await supabase
    .from('seo_opportunities')
    .select('type, priority, status, title')
    .eq('site_id', siteId)
    .eq('status', 'open')

  // Get recent alerts
  const { data: alerts } = await supabase
    .from('seo_alerts')
    .select('alert_type, severity, message, created_at')
    .eq('site_id', siteId)
    .gte('created_at', new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  // Calculate totals
  const totalClicks = pages?.reduce((sum, p) => sum + (p.clicks_28d || 0), 0) || 0
  const totalImpressions = pages?.reduce((sum, p) => sum + (p.impressions_28d || 0), 0) || 0
  const prevClicks = pages?.reduce((sum, p) => sum + (p.clicks_prev_28d || 0), 0) || 0
  const prevImpressions = pages?.reduce((sum, p) => sum + (p.impressions_prev_28d || 0), 0) || 0

  // Calculate changes
  const clicksChange = prevClicks > 0 ? ((totalClicks - prevClicks) / prevClicks * 100).toFixed(1) : 0
  const impressionsChange = prevImpressions > 0 ? ((totalImpressions - prevImpressions) / prevImpressions * 100).toFixed(1) : 0

  // Top movers (biggest position improvements)
  const topMovers = keywords?.filter(k => k.previous_position && k.current_position)
    .map(k => ({
      keyword: k.keyword,
      change: k.previous_position - k.current_position,
      position: k.current_position
    }))
    .filter(k => k.change !== 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 5) || []

  return {
    summary: {
      totalClicks,
      totalImpressions,
      clicksChange: parseFloat(clicksChange),
      impressionsChange: parseFloat(impressionsChange),
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0,
      avgPosition: pages?.length > 0 
        ? (pages.reduce((sum, p) => sum + (p.avg_position_28d || 0), 0) / pages.length).toFixed(1)
        : 0
    },
    topPages: pages?.slice(0, 10).map(p => ({
      url: p.url,
      clicks: p.clicks_28d,
      impressions: p.impressions_28d,
      position: p.avg_position_28d?.toFixed(1)
    })) || [],
    topMovers,
    keywordsAtRisk: keywords?.filter(k => 
      k.current_position > k.previous_position && k.current_position <= 20
    ).slice(0, 5) || [],
    opportunities: {
      total: opportunities?.length || 0,
      critical: opportunities?.filter(o => o.priority === 'critical').length || 0,
      high: opportunities?.filter(o => o.priority === 'high').length || 0
    },
    recentAlerts: alerts || []
  }
}

// Generate ranking changes report
async function generateRankingReport(supabase, siteId, periodDays) {
  const { data: keywords } = await supabase
    .from('seo_tracked_keywords')
    .select('keyword, current_position, previous_position, best_position, search_volume, target_position')
    .eq('site_id', siteId)

  const improved = keywords?.filter(k => k.current_position < k.previous_position) || []
  const declined = keywords?.filter(k => k.current_position > k.previous_position) || []
  const stable = keywords?.filter(k => k.current_position === k.previous_position) || []
  const page1 = keywords?.filter(k => k.current_position <= 10) || []
  const striking = keywords?.filter(k => k.current_position > 10 && k.current_position <= 20) || []

  return {
    summary: {
      total: keywords?.length || 0,
      improved: improved.length,
      declined: declined.length,
      stable: stable.length,
      onPage1: page1.length,
      strikingDistance: striking.length
    },
    topImproved: improved.sort((a, b) => 
      (b.previous_position - b.current_position) - (a.previous_position - a.current_position)
    ).slice(0, 10),
    biggestDrops: declined.sort((a, b) => 
      (a.current_position - a.previous_position) - (b.current_position - b.previous_position)
    ).slice(0, 10),
    closestToPage1: striking.sort((a, b) => a.current_position - b.current_position).slice(0, 10)
  }
}

// Generate traffic anomaly report
async function generateTrafficAnomalyReport(supabase, siteId, periodDays) {
  const { data: pages } = await supabase
    .from('seo_pages')
    .select('url, clicks_28d, clicks_prev_28d, impressions_28d, impressions_prev_28d')
    .eq('site_id', siteId)

  // Find significant drops (>30%)
  const trafficDrops = pages?.filter(p => {
    if (!p.clicks_prev_28d || p.clicks_prev_28d < 10) return false
    const change = (p.clicks_28d - p.clicks_prev_28d) / p.clicks_prev_28d
    return change < -0.3
  }).map(p => ({
    url: p.url,
    currentClicks: p.clicks_28d,
    previousClicks: p.clicks_prev_28d,
    changePercent: ((p.clicks_28d - p.clicks_prev_28d) / p.clicks_prev_28d * 100).toFixed(1)
  })).sort((a, b) => a.changePercent - b.changePercent) || []

  // Find significant gains (>30%)
  const trafficGains = pages?.filter(p => {
    if (!p.clicks_prev_28d || p.clicks_prev_28d < 5) return false
    const change = (p.clicks_28d - p.clicks_prev_28d) / p.clicks_prev_28d
    return change > 0.3
  }).map(p => ({
    url: p.url,
    currentClicks: p.clicks_28d,
    previousClicks: p.clicks_prev_28d,
    changePercent: ((p.clicks_28d - p.clicks_prev_28d) / p.clicks_prev_28d * 100).toFixed(1)
  })).sort((a, b) => b.changePercent - a.changePercent) || []

  return {
    summary: {
      pagesWithDrops: trafficDrops.length,
      pagesWithGains: trafficGains.length
    },
    significantDrops: trafficDrops.slice(0, 10),
    significantGains: trafficGains.slice(0, 10)
  }
}

// Generate technical health report
async function generateTechnicalReport(supabase, siteId) {
  // Get pages with issues
  const { data: pages } = await supabase
    .from('seo_pages')
    .select('url, http_status, has_noindex, indexing_status, health_score, pagespeed_mobile, pagespeed_desktop')
    .eq('site_id', siteId)

  // Get indexing issues
  const { data: indexingIssues } = await supabase
    .from('seo_pages')
    .select('url, indexing_status, indexing_verdict, http_status')
    .eq('site_id', siteId)
    .or('indexing_status.neq.Indexed,http_status.gte.400')

  // Categorize issues
  const issues = {
    notIndexed: indexingIssues?.filter(p => p.indexing_status !== 'Indexed').length || 0,
    serverErrors: pages?.filter(p => p.http_status >= 500).length || 0,
    clientErrors: pages?.filter(p => p.http_status >= 400 && p.http_status < 500).length || 0,
    noindex: pages?.filter(p => p.has_noindex).length || 0,
    lowHealthScore: pages?.filter(p => p.health_score && p.health_score < 50).length || 0,
    slowPages: pages?.filter(p => p.pagespeed_mobile && p.pagespeed_mobile < 50).length || 0
  }

  // Get Core Web Vitals averages
  const pagesWithCwv = pages?.filter(p => p.pagespeed_mobile) || []
  const avgMobileScore = pagesWithCwv.length > 0
    ? pagesWithCwv.reduce((sum, p) => sum + p.pagespeed_mobile, 0) / pagesWithCwv.length
    : null

  return {
    summary: {
      totalPages: pages?.length || 0,
      healthyPages: pages?.filter(p => (p.health_score || 0) >= 80).length || 0,
      issuesFound: Object.values(issues).reduce((a, b) => a + b, 0)
    },
    issues,
    avgMobileScore: avgMobileScore?.toFixed(0),
    worstPages: pages?.filter(p => p.health_score)
      .sort((a, b) => (a.health_score || 100) - (b.health_score || 100))
      .slice(0, 10)
      .map(p => ({
        url: p.url,
        healthScore: p.health_score,
        status: p.http_status
      })) || []
  }
}

// Generate HTML email
function generateReportEmailHtml(site, reportType, data, periodDays) {
  const reportTitle = {
    weekly: 'Weekly SEO Performance Report',
    monthly: 'Monthly SEO Performance Report',
    'ranking-changes': 'Keyword Ranking Changes Report',
    'traffic-anomaly': 'Traffic Anomaly Alert',
    'technical-health': 'Technical SEO Health Report'
  }[reportType] || 'SEO Report'

  let content = ''

  if (data.summary) {
    if (reportType === 'weekly' || reportType === 'monthly') {
      const trend = data.summary.clicksChange >= 0 ? '📈' : '📉'
      content = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0;">Performance Summary (Last ${periodDays} days)</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #000;">${data.summary.totalClicks.toLocaleString()}</div>
                <div style="color: #666; font-size: 12px;">Clicks ${trend} ${Math.abs(data.summary.clicksChange)}%</div>
              </td>
              <td style="padding: 10px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #000;">${data.summary.totalImpressions.toLocaleString()}</div>
                <div style="color: #666; font-size: 12px;">Impressions</div>
              </td>
              <td style="padding: 10px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #000;">${data.summary.avgCtr}%</div>
                <div style="color: #666; font-size: 12px;">Avg CTR</div>
              </td>
              <td style="padding: 10px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #000;">${data.summary.avgPosition}</div>
                <div style="color: #666; font-size: 12px;">Avg Position</div>
              </td>
            </tr>
          </table>
        </div>
      `

      if (data.topMovers?.length > 0) {
        content += `
          <h3>🚀 Top Ranking Improvements</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f0f0f0;">
              <th style="padding: 8px; text-align: left;">Keyword</th>
              <th style="padding: 8px; text-align: center;">Position</th>
              <th style="padding: 8px; text-align: center;">Change</th>
            </tr>
            ${data.topMovers.map(k => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${k.keyword}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${k.position}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee; color: green;">+${k.change}</td>
              </tr>
            `).join('')}
          </table>
        `
      }

      if (data.opportunities?.total > 0) {
        content += `
          <h3>📋 Open Opportunities</h3>
          <p>${data.opportunities.critical} critical, ${data.opportunities.high} high priority items need attention.</p>
        `
      }
    }

    if (reportType === 'ranking-changes') {
      content = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0;">Ranking Summary</h3>
          <table style="width: 100%;">
            <tr>
              <td style="text-align: center; color: green;">📈 ${data.summary.improved} improved</td>
              <td style="text-align: center; color: red;">📉 ${data.summary.declined} declined</td>
              <td style="text-align: center;">➡️ ${data.summary.stable} stable</td>
            </tr>
          </table>
          <p style="margin-top: 15px;"><strong>${data.summary.onPage1}</strong> keywords on page 1 | <strong>${data.summary.strikingDistance}</strong> in striking distance</p>
        </div>
      `

      if (data.biggestDrops?.length > 0) {
        content += `
          <h3 style="color: #d32f2f;">⚠️ Keywords That Need Attention</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.biggestDrops.slice(0, 5).map(k => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${k.keyword}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; color: red;">
                  ${k.previous_position} → ${k.current_position}
                </td>
              </tr>
            `).join('')}
          </table>
        `
      }
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 24px;">${reportTitle}</h1>
        <p style="color: #666; margin: 5px 0;">${site.domain}</p>
      </div>
      
      ${content}
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
        <p>Generated by Uptrade Portal SEO Module</p>
        <p><a href="https://portal.uptrademedia.com/p/seo" style="color: #0066cc;">View Full Dashboard</a></p>
      </div>
    </body>
    </html>
  `
}
