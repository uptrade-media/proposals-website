// netlify/functions/routes/client-seo.js
// ═══════════════════════════════════════════════════════════════════════════════
// Client SEO Routes - Read-only SEO data for tenant/client users
// ═══════════════════════════════════════════════════════════════════════════════
// Provides simplified, read-only access to SEO metrics for clients
// AI features are gated behind org feature flags

import { response } from '../api.js'

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function handle(ctx) {
  const { method, segments } = ctx
  const [, resource] = segments // 'client', then resource
  
  // All client routes are GET-only
  if (method !== 'GET') {
    return response(405, { error: 'Method not allowed' })
  }
  
  switch (resource) {
    case 'overview':
      return await getOverview(ctx)
    case 'keywords':
      return await getKeywords(ctx)
    case 'pages':
      return await getPages(ctx)
    case 'wins':
      return await getWins(ctx)
    case 'recommendations':
      return await getRecommendations(ctx)
    case 'features':
      return await getFeatures(ctx)
    case 'trends':
      return await getTrends(ctx)
    default:
      return response(404, { error: 'Unknown resource' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW - Key metrics summary
// ═══════════════════════════════════════════════════════════════════════════════
async function getOverview(ctx) {
  const { supabase, orgId } = ctx
  
  // Get the site for this org
  const { data: site, error: siteError } = await supabase
    .from('seo_sites')
    .select('*')
    .eq('org_id', orgId)
    .single()
  
  if (siteError || !site) {
    return response(404, { error: 'SEO site not configured for this organization' })
  }
  
  // Get current period metrics (last 28 days)
  const { data: currentMetrics } = await supabase
    .from('seo_gsc_queries')
    .select('clicks, impressions, position, ctr')
    .eq('site_id', site.id)
  
  // Calculate aggregates
  const clicks_28d = currentMetrics?.reduce((sum, q) => sum + (q.clicks || 0), 0) || 0
  const impressions_28d = currentMetrics?.reduce((sum, q) => sum + (q.impressions || 0), 0) || 0
  const positions = currentMetrics?.filter(q => q.position)?.map(q => q.position) || []
  const avg_position = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null
  const ctr = impressions_28d > 0 ? clicks_28d / impressions_28d : 0
  
  // Get previous period for comparison (from site record if cached)
  const overview = {
    clicks_28d,
    impressions_28d,
    avg_position,
    ctr,
    // Previous period (approximation from site record)
    clicks_prev_28d: site.total_clicks_28d_prev,
    impressions_prev_28d: site.total_impressions_28d_prev,
    avg_position_prev: site.avg_position_28d_prev,
    ctr_prev: site.avg_ctr_28d_prev,
    // Additional metrics
    pages_indexed: site.pages_indexed,
    pages_not_indexed: site.pages_not_indexed,
    last_synced: site.gsc_last_sync_at
  }
  
  return response(200, overview)
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORDS - Top performing search queries
// ═══════════════════════════════════════════════════════════════════════════════
async function getKeywords(ctx) {
  const { supabase, orgId, query } = ctx
  const limit = parseInt(query.limit) || 10
  
  // Get site
  const { data: site } = await supabase
    .from('seo_sites')
    .select('id')
    .eq('org_id', orgId)
    .single()
  
  if (!site) {
    return response(404, { error: 'SEO site not configured' })
  }
  
  // Get top keywords by clicks
  const { data: keywords, error } = await supabase
    .from('seo_gsc_queries')
    .select('query, clicks, impressions, position, ctr')
    .eq('site_id', site.id)
    .order('clicks', { ascending: false })
    .limit(limit)
  
  if (error) {
    return response(500, { error: error.message })
  }
  
  return response(200, { keywords: keywords || [] })
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES - Top performing pages
// ═══════════════════════════════════════════════════════════════════════════════
async function getPages(ctx) {
  const { supabase, orgId, query } = ctx
  const limit = parseInt(query.limit) || 10
  const sortBy = query.sortBy || 'clicks'
  
  // Get site
  const { data: site } = await supabase
    .from('seo_sites')
    .select('id')
    .eq('org_id', orgId)
    .single()
  
  if (!site) {
    return response(404, { error: 'SEO site not configured' })
  }
  
  // Get top pages
  const { data: pages, error } = await supabase
    .from('seo_pages')
    .select('id, url, title, clicks_28d, impressions_28d, avg_position_28d, ctr_28d')
    .eq('site_id', site.id)
    .order(sortBy === 'clicks' ? 'clicks_28d' : 'impressions_28d', { ascending: false })
    .limit(limit)
  
  if (error) {
    return response(500, { error: error.message })
  }
  
  // Format for client
  const formattedPages = pages?.map(p => ({
    url: p.url,
    title: p.title,
    clicks: p.clicks_28d || 0,
    impressions: p.impressions_28d || 0,
    position: p.avg_position_28d,
    ctr: p.ctr_28d || 0
  })) || []
  
  return response(200, { pages: formattedPages })
}

// ═══════════════════════════════════════════════════════════════════════════════
// WINS - Recent SEO improvements/achievements
// ═══════════════════════════════════════════════════════════════════════════════
async function getWins(ctx) {
  const { supabase, orgId, query } = ctx
  const limit = parseInt(query.limit) || 5
  
  // Get site
  const { data: site } = await supabase
    .from('seo_sites')
    .select('id')
    .eq('org_id', orgId)
    .single()
  
  if (!site) {
    return response(404, { error: 'SEO site not configured' })
  }
  
  // Get recommendations that were implemented and had positive outcomes
  const { data: wins, error } = await supabase
    .from('seo_ai_recommendation_outcomes')
    .select(`
      id,
      category,
      outcome,
      outcome_score,
      keyword_position_change,
      clicks_change_pct,
      measured_at,
      recommendation:seo_ai_recommendations(title, description)
    `)
    .eq('site_id', site.id)
    .eq('outcome', 'win')
    .order('measured_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    // Table might not exist yet, return empty
    return response(200, { wins: [] })
  }
  
  // Format for client
  const formattedWins = wins?.map(w => ({
    title: w.recommendation?.title || `${w.category} improvement`,
    description: w.recommendation?.description || 'Optimization completed',
    impact: formatImpact(w),
    completed_at: w.measured_at
  })) || []
  
  return response(200, { wins: formattedWins })
}

function formatImpact(outcome) {
  if (outcome.keyword_position_change && outcome.keyword_position_change > 1) {
    return `+${outcome.keyword_position_change.toFixed(0)} positions`
  }
  if (outcome.clicks_change_pct && outcome.clicks_change_pct > 5) {
    return `+${outcome.clicks_change_pct.toFixed(0)}% clicks`
  }
  if (outcome.outcome_score > 30) {
    return 'High impact'
  }
  return 'Improvement measured'
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS - AI-generated suggestions (gated)
// ═══════════════════════════════════════════════════════════════════════════════
async function getRecommendations(ctx) {
  const { supabase, orgId, query } = ctx
  const limit = parseInt(query.limit) || 10
  const status = query.status || 'pending'
  
  // Check if AI is enabled for this org
  const { data: org } = await supabase
    .from('organizations')
    .select('features')
    .eq('id', orgId)
    .single()
  
  if (!org?.features?.seo_ai_enabled) {
    return response(200, { recommendations: [], aiEnabled: false })
  }
  
  // Get site
  const { data: site } = await supabase
    .from('seo_sites')
    .select('id')
    .eq('org_id', orgId)
    .single()
  
  if (!site) {
    return response(404, { error: 'SEO site not configured' })
  }
  
  // Get recommendations
  const { data: recommendations, error } = await supabase
    .from('seo_ai_recommendations')
    .select('id, category, priority, title, description, effort, status, created_at')
    .eq('site_id', site.id)
    .eq('status', status)
    .order('priority', { ascending: true }) // critical first
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    return response(500, { error: error.message })
  }
  
  return response(200, { 
    recommendations: recommendations || [],
    aiEnabled: true
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURES - Check what features are enabled for this org
// ═══════════════════════════════════════════════════════════════════════════════
async function getFeatures(ctx) {
  const { supabase, orgId } = ctx
  
  const { data: org } = await supabase
    .from('organizations')
    .select('features')
    .eq('id', orgId)
    .single()
  
  const features = org?.features || {}
  
  return response(200, {
    aiEnabled: features.seo_ai_enabled === true,
    reportsEnabled: features.seo_reports_enabled !== false, // Default true
    competitorTracking: features.seo_competitor_tracking === true,
    contentBriefs: features.seo_content_briefs === true
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRENDS - Historical data for charts
// ═══════════════════════════════════════════════════════════════════════════════
async function getTrends(ctx) {
  const { supabase, orgId, query } = ctx
  const days = parseInt(query.days) || 28
  
  // Get site
  const { data: site } = await supabase
    .from('seo_sites')
    .select('id')
    .eq('org_id', orgId)
    .single()
  
  if (!site) {
    return response(404, { error: 'SEO site not configured' })
  }
  
  // Get daily performance data
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data: dailyData, error } = await supabase
    .from('seo_gsc_daily_performance')
    .select('date, clicks, impressions, position, ctr')
    .eq('site_id', site.id)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
  
  if (error) {
    // Table might not exist, return empty
    return response(200, { trends: [] })
  }
  
  return response(200, { 
    trends: dailyData || [],
    period: { start: startDate.toISOString(), end: new Date().toISOString() }
  })
}

export default { handle }
