// netlify/functions/seo-monthly-reports-background.mjs
// ═══════════════════════════════════════════════════════════════════════════════
// SEO Monthly Report Generator
// ═══════════════════════════════════════════════════════════════════════════════
// Generates and emails monthly SEO performance reports to clients
// Runs on 1st of each month via scheduled job

import { createSupabaseAdmin } from './utils/supabase.js'
import { Resend } from 'resend'

export const config = {
  type: 'background'
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  const startTime = Date.now()
  const supabase = createSupabaseAdmin()
  
  console.log('[Monthly Reports] Starting monthly SEO report generation')
  
  try {
    // Get all active sites with report settings
    const { data: sites, error: sitesError } = await supabase
      .from('seo_sites')
      .select(`
        id,
        domain,
        org:organizations(
          id,
          name,
          features,
          contacts!contacts_org_id_fkey(
            id,
            email,
            name,
            role
          )
        )
      `)
      .eq('is_active', true)
    
    if (sitesError) throw sitesError
    
    const results = {
      sent: 0,
      skipped: 0,
      errors: []
    }
    
    for (const site of sites || []) {
      try {
        // Check if reports are enabled for this org
        const features = site.org?.features || {}
        if (features.seo_reports_enabled === false) {
          results.skipped++
          continue
        }
        
        // Get primary contact for this org
        const primaryContact = site.org?.contacts?.find(c => c.role === 'primary' || c.role === 'owner') 
          || site.org?.contacts?.[0]
        
        if (!primaryContact?.email) {
          console.log(`[Monthly Reports] No contact for ${site.domain}, skipping`)
          results.skipped++
          continue
        }
        
        // Generate report data
        const reportData = await generateReportData(supabase, site)
        
        // Store report in database
        const { data: report, error: reportError } = await supabase
          .from('seo_reports')
          .insert({
            site_id: site.id,
            report_type: 'monthly',
            period_start: reportData.periodStart,
            period_end: reportData.periodEnd,
            metrics: reportData.metrics,
            highlights: reportData.highlights,
            recommendations: reportData.recommendations,
            generated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (reportError) {
          console.error(`[Monthly Reports] Failed to store report for ${site.domain}:`, reportError)
        }
        
        // Send email
        await sendReportEmail(primaryContact, site, reportData)
        
        results.sent++
        console.log(`[Monthly Reports] Sent report for ${site.domain} to ${primaryContact.email}`)
        
      } catch (err) {
        console.error(`[Monthly Reports] Error processing ${site.domain}:`, err)
        results.errors.push({ domain: site.domain, error: err.message })
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`[Monthly Reports] Complete. Sent: ${results.sent}, Skipped: ${results.skipped}, Errors: ${results.errors.length}. Duration: ${duration}ms`)
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, results, duration })
    }
    
  } catch (err) {
    console.error('[Monthly Reports] Fatal error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}

/**
 * Generate report data for a site
 */
async function generateReportData(supabase, site) {
  const now = new Date()
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0) // Last day of prev month
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1) // First day of prev month
  
  // Get metrics for this period
  const { data: currentMetrics } = await supabase
    .from('seo_gsc_queries')
    .select('clicks, impressions, position, ctr')
    .eq('site_id', site.id)
  
  // Calculate totals
  const clicks = currentMetrics?.reduce((sum, q) => sum + (q.clicks || 0), 0) || 0
  const impressions = currentMetrics?.reduce((sum, q) => sum + (q.impressions || 0), 0) || 0
  const positions = currentMetrics?.filter(q => q.position)?.map(q => q.position) || []
  const avgPosition = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null
  const ctr = impressions > 0 ? (clicks / impressions * 100) : 0
  
  // Get top keywords
  const { data: topKeywords } = await supabase
    .from('seo_gsc_queries')
    .select('query, clicks, impressions, position')
    .eq('site_id', site.id)
    .order('clicks', { ascending: false })
    .limit(10)
  
  // Get top pages
  const { data: topPages } = await supabase
    .from('seo_pages')
    .select('url, title, clicks_28d, impressions_28d')
    .eq('site_id', site.id)
    .order('clicks_28d', { ascending: false })
    .limit(10)
  
  // Get wins from outcomes
  const { data: wins } = await supabase
    .from('seo_ai_recommendation_outcomes')
    .select(`
      category,
      outcome_score,
      keyword_position_change,
      clicks_change_pct,
      recommendation:seo_ai_recommendations(title)
    `)
    .eq('site_id', site.id)
    .eq('outcome', 'win')
    .gte('measured_at', periodStart.toISOString())
    .order('outcome_score', { ascending: false })
    .limit(5)
  
  // Get pending recommendations
  const { data: recommendations } = await supabase
    .from('seo_ai_recommendations')
    .select('id, title, priority, category')
    .eq('site_id', site.id)
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .limit(5)
  
  // Build highlights
  const highlights = []
  if (clicks > 0) highlights.push(`Generated ${clicks.toLocaleString()} clicks from organic search`)
  if (avgPosition && avgPosition < 20) highlights.push(`Average position: ${avgPosition.toFixed(1)}`)
  if (wins?.length) highlights.push(`${wins.length} SEO improvements delivered measurable results`)
  if (topKeywords?.[0]) highlights.push(`Top keyword: "${topKeywords[0].query}" with ${topKeywords[0].clicks} clicks`)
  
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    periodLabel: periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    metrics: {
      clicks,
      impressions,
      avgPosition,
      ctr
    },
    topKeywords: topKeywords || [],
    topPages: topPages || [],
    wins: wins || [],
    highlights,
    recommendations: recommendations || []
  }
}

/**
 * Send report email to client
 */
async function sendReportEmail(contact, site, reportData) {
  const { periodLabel, metrics, highlights, topKeywords, wins, recommendations } = reportData
  
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
    .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 28px; font-weight: bold; color: #667eea; }
    .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 18px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .highlight { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px 15px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .keyword { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .keyword:last-child { border-bottom: none; }
    .win { background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px 15px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .recommendation { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px 15px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Monthly SEO Report</h1>
    <p>${site.domain} • ${periodLabel}</p>
  </div>
  
  <div class="metrics">
    <div class="metric">
      <div class="metric-value">${metrics.clicks.toLocaleString()}</div>
      <div class="metric-label">Organic Clicks</div>
    </div>
    <div class="metric">
      <div class="metric-value">${metrics.impressions.toLocaleString()}</div>
      <div class="metric-label">Impressions</div>
    </div>
    <div class="metric">
      <div class="metric-value">${metrics.avgPosition?.toFixed(1) || '—'}</div>
      <div class="metric-label">Avg. Position</div>
    </div>
    <div class="metric">
      <div class="metric-value">${metrics.ctr.toFixed(1)}%</div>
      <div class="metric-label">Click-Through Rate</div>
    </div>
  </div>
  
  ${highlights.length > 0 ? `
  <div class="section">
    <h2>✨ Highlights</h2>
    ${highlights.map(h => `<div class="highlight">${h}</div>`).join('')}
  </div>
  ` : ''}
  
  ${topKeywords.length > 0 ? `
  <div class="section">
    <h2>🔍 Top Keywords</h2>
    ${topKeywords.slice(0, 5).map(kw => `
      <div class="keyword">
        <span>${kw.query}</span>
        <span><strong>${kw.clicks}</strong> clicks</span>
      </div>
    `).join('')}
  </div>
  ` : ''}
  
  ${wins.length > 0 ? `
  <div class="section">
    <h2>🏆 Wins This Month</h2>
    ${wins.map(w => `
      <div class="win">
        <strong>${w.recommendation?.title || w.category}</strong>
        ${w.keyword_position_change > 1 ? `<br>↑ ${w.keyword_position_change.toFixed(0)} positions improved` : ''}
        ${w.clicks_change_pct > 5 ? `<br>↑ ${w.clicks_change_pct.toFixed(0)}% more clicks` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}
  
  ${recommendations.length > 0 ? `
  <div class="section">
    <h2>📋 Next Priorities</h2>
    ${recommendations.map(r => `
      <div class="recommendation">
        <strong>${r.title}</strong>
        <br><span style="color: #666; font-size: 13px;">Priority: ${r.priority} • ${r.category}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}
  
  <div class="footer">
    <p>This report was generated by Uptrade Media's SEO platform.</p>
    <p>Questions? Reply to this email or contact your account manager.</p>
  </div>
</body>
</html>
  `
  
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com',
    to: contact.email,
    subject: `📊 Monthly SEO Report for ${site.domain} - ${reportData.periodLabel}`,
    html: emailHtml
  })
}
