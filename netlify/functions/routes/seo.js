// netlify/functions/routes/seo.js
// ═══════════════════════════════════════════════════════════════════════════════
// SEO Routes - All SEO-related endpoints
// ═══════════════════════════════════════════════════════════════════════════════
// Consolidates ~60+ SEO functions into a single route module
// Background functions remain separate (they need the .mjs extension)
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'
import OpenAI from 'openai'
import { google } from 'googleapis'

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function handle(ctx) {
  const { method, subPath, segments } = ctx
  
  // Match routes: /sites, /sites/:id, /sites/:id/pages, etc.
  const [resource, id, subResource, subId] = segments.slice(1) // Remove 'seo' prefix
  
  // Route to appropriate handler
  switch (resource) {
    // ── Sites ────────────────────────────────────────────────────────────────
    case 'sites':
      if (!id) {
        if (method === 'GET') return await listSites(ctx)
        if (method === 'POST') return await createSite(ctx)
      } else {
        if (!subResource) {
          if (method === 'GET') return await getSite(ctx, id)
          if (method === 'PUT' || method === 'PATCH') return await updateSite(ctx, id)
          if (method === 'DELETE') return await deleteSite(ctx, id)
        } else {
          // Sub-resources: /sites/:id/pages, /sites/:id/keywords, etc.
          return await handleSiteSubResource(ctx, id, subResource, subId)
        }
      }
      break

    // ── Pages ────────────────────────────────────────────────────────────────
    case 'pages':
      if (!id) {
        if (method === 'GET') return await listPages(ctx)
      } else {
        if (method === 'GET') return await getPage(ctx, id)
        if (method === 'PUT' || method === 'PATCH') return await updatePage(ctx, id)
      }
      break

    // ── Keywords ─────────────────────────────────────────────────────────────
    case 'keywords':
      if (method === 'GET') return await listKeywords(ctx)
      if (method === 'POST') return await trackKeyword(ctx)
      if (method === 'DELETE' && id) return await untrackKeyword(ctx, id)
      break

    // ── GSC (Google Search Console) ──────────────────────────────────────────
    case 'gsc':
      return await handleGSC(ctx, id)

    // ── AI Brain ─────────────────────────────────────────────────────────────
    case 'brain':
      if (method === 'GET') return await getBrainStatus(ctx)
      if (method === 'POST') return await triggerBrainAnalysis(ctx)
      break

    case 'train':
      if (method === 'POST') return await triggerTraining(ctx)
      if (method === 'GET') return await getTrainingStatus(ctx)
      break

    // ── Recommendations ──────────────────────────────────────────────────────
    case 'recommendations':
      if (method === 'GET') return await listRecommendations(ctx)
      if (method === 'PUT' && id) return await updateRecommendation(ctx, id)
      if (method === 'POST' && id === 'apply') return await applyRecommendation(ctx)
      break

    // ── Opportunities ────────────────────────────────────────────────────────
    case 'opportunities':
      if (method === 'GET') return await listOpportunities(ctx)
      if (method === 'PUT' && id) return await updateOpportunity(ctx, id)
      if (method === 'POST' && id === 'detect') return await detectOpportunities(ctx)
      break

    // ── Reports ──────────────────────────────────────────────────────────────
    case 'reports':
      return await handleReports(ctx, id)

    // ── Alerts ───────────────────────────────────────────────────────────────
    case 'alerts':
      if (method === 'GET') return await listAlerts(ctx)
      if (method === 'PUT' && id) return await updateAlert(ctx, id)
      break

    // ── Background Jobs ──────────────────────────────────────────────────────
    case 'jobs':
      if (method === 'GET') return await getJobStatus(ctx, id)
      break

    // ── Competitors ──────────────────────────────────────────────────────────
    case 'competitors':
      if (method === 'GET') return await listCompetitors(ctx)
      if (method === 'POST') return await analyzeCompetitor(ctx)
      break

    // ── Technical ────────────────────────────────────────────────────────────
    case 'technical':
      if (method === 'GET') return await getTechnicalAudit(ctx)
      if (method === 'POST') return await runTechnicalAudit(ctx)
      break

    // ── CWV (Core Web Vitals) ────────────────────────────────────────────────
    case 'cwv':
      if (method === 'GET') return await getCWV(ctx)
      if (method === 'POST') return await checkCWV(ctx)
      break

    // ── Internal Links ───────────────────────────────────────────────────────
    case 'internal-links':
      if (method === 'GET') return await getInternalLinks(ctx)
      if (method === 'POST') return await analyzeInternalLinks(ctx)
      break

    // ── Content ──────────────────────────────────────────────────────────────
    case 'content':
      return await handleContent(ctx, id)

    // ── Schema ───────────────────────────────────────────────────────────────
    case 'schema':
      if (method === 'GET') return await getSchema(ctx)
      if (method === 'POST') return await generateSchema(ctx)
      break

    // ── Backlinks ────────────────────────────────────────────────────────────
    case 'backlinks':
      if (method === 'GET') return await getBacklinks(ctx)
      if (method === 'POST') return await discoverBacklinks(ctx)
      break

    // ── Local SEO ────────────────────────────────────────────────────────────
    case 'local':
      if (method === 'GET') return await getLocalSEO(ctx)
      if (method === 'POST') return await analyzeLocalSEO(ctx)
      break

    // ── SERP Features ────────────────────────────────────────────────────────
    case 'serp':
      if (method === 'GET') return await getSERPFeatures(ctx)
      if (method === 'POST') return await analyzeSERP(ctx)
      break

    // ── Title A/B Tests ──────────────────────────────────────────────────────
    case 'title-tests':
      if (method === 'GET') return id ? await getTitleTest(ctx, id) : await listTitleTests(ctx)
      if (method === 'POST') return await createTitleTest(ctx)
      if (method === 'PUT' && id) return await updateTitleTest(ctx, id)
      if (method === 'DELETE' && id) return await deleteTitleTest(ctx, id)
      break

    // ── Knowledge Base ───────────────────────────────────────────────────────
    case 'knowledge':
      if (method === 'GET') return await getKnowledge(ctx)
      if (method === 'PUT' || method === 'POST') return await updateKnowledge(ctx)
      break

    // ── Redirects ────────────────────────────────────────────────────────────
    case 'redirects':
      if (method === 'GET') return await listRedirects(ctx)
      if (method === 'POST') return await createRedirect(ctx)
      if (method === 'PUT' && id) return await updateRedirect(ctx, id)
      if (method === 'DELETE' && id) return await deleteRedirect(ctx, id)
      break

    // ── Metadata ─────────────────────────────────────────────────────────────
    case 'metadata':
      if (method === 'GET') return await getMetadata(ctx)
      if (method === 'PUT') return await updateMetadata(ctx)
      break

    default:
      return response(404, { error: `Unknown SEO resource: ${resource}` })
  }

  return response(405, { error: 'Method not allowed' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// SITES HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function listSites(ctx) {
  const { supabase, orgId, query } = ctx
  
  let q = supabase
    .from('seo_sites')
    .select('*, org:organizations(name, domain)')
    .order('created_at', { ascending: false })
  
  if (orgId) {
    q = q.eq('org_id', orgId)
  }
  
  const { data, error } = await q.limit(query.limit || 50)
  
  if (error) return response(500, { error: error.message })
  return response(200, { sites: data })
}

async function createSite(ctx) {
  const { supabase, body, orgId, contact } = ctx
  
  const { domain, name } = body
  if (!domain) return response(400, { error: 'domain is required' })
  
  const { data, error } = await supabase
    .from('seo_sites')
    .insert({
      domain,
      name: name || domain,
      org_id: orgId,
      created_by: contact.id,
      status: 'pending_setup'
    })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(201, { site: data })
}

async function getSite(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('seo_sites')
    .select('*, org:organizations(name, domain), knowledge:seo_knowledge_base(*)')
    .eq('id', id)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { site: data })
}

async function updateSite(ctx, id) {
  const { supabase, body } = ctx
  
  const { data, error } = await supabase
    .from('seo_sites')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { site: data })
}

async function deleteSite(ctx, id) {
  const { supabase } = ctx
  
  const { error } = await supabase
    .from('seo_sites')
    .delete()
    .eq('id', id)
  
  if (error) return response(500, { error: error.message })
  return response(200, { success: true })
}

async function handleSiteSubResource(ctx, siteId, subResource, subId) {
  const { method, supabase, query, body } = ctx
  
  switch (subResource) {
    case 'pages':
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('seo_pages')
          .select('*')
          .eq('site_id', siteId)
          .order('impressions_28d', { ascending: false })
          .limit(query.limit || 100)
        
        if (error) return response(500, { error: error.message })
        return response(200, { pages: data })
      }
      break
    
    case 'keywords':
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('seo_keyword_universe')
          .select('*')
          .eq('site_id', siteId)
          .order('impressions_28d', { ascending: false })
          .limit(query.limit || 200)
        
        if (error) return response(500, { error: error.message })
        return response(200, { keywords: data })
      }
      break
    
    case 'recommendations':
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('seo_ai_recommendations')
          .select('*')
          .eq('site_id', siteId)
          .eq('status', query.status || 'pending')
          .order('priority', { ascending: true })
          .limit(50)
        
        if (error) return response(500, { error: error.message })
        return response(200, { recommendations: data })
      }
      break
    
    case 'crawl':
      if (method === 'POST') {
        // Trigger background crawl
        return await triggerBackgroundJob(ctx, siteId, 'crawl_sitemap')
      }
      break
    
    case 'sync':
      if (method === 'POST') {
        // Trigger GSC sync
        return await triggerGSCSync(ctx, siteId)
      }
      break
  }
  
  return response(404, { error: `Unknown sub-resource: ${subResource}` })
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function listPages(ctx) {
  const { supabase, query } = ctx
  const { siteId, pageType, limit = 100, offset = 0 } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  let q = supabase
    .from('seo_pages')
    .select('*', { count: 'exact' })
    .eq('site_id', siteId)
    .order('impressions_28d', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (pageType) q = q.eq('page_type', pageType)
  
  const { data, count, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { pages: data, total: count })
}

async function getPage(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('seo_pages')
    .select('*, keywords:seo_keyword_universe(*)') 
    .eq('id', id)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { page: data })
}

async function updatePage(ctx, id) {
  const { supabase, body } = ctx
  
  const { data, error } = await supabase
    .from('seo_pages')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { page: data })
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORDS HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function listKeywords(ctx) {
  const { supabase, query } = ctx
  const { siteId, isTracked, isLocal, limit = 200 } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  let q = supabase
    .from('seo_keyword_universe')
    .select('*')
    .eq('site_id', siteId)
    .order('impressions_28d', { ascending: false })
    .limit(limit)
  
  if (isTracked !== undefined) q = q.eq('is_tracked', isTracked === 'true')
  if (isLocal !== undefined) q = q.eq('is_local', isLocal === 'true')
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { keywords: data })
}

async function trackKeyword(ctx) {
  const { supabase, body } = ctx
  const { siteId, keyword, targetPosition, targetUrl } = body
  
  if (!siteId || !keyword) {
    return response(400, { error: 'siteId and keyword are required' })
  }
  
  const { data, error } = await supabase
    .from('seo_keyword_universe')
    .upsert({
      site_id: siteId,
      keyword,
      is_tracked: true,
      target_position: targetPosition,
      target_url: targetUrl,
      updated_at: new Date().toISOString()
    }, { onConflict: 'site_id,keyword' })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { keyword: data })
}

async function untrackKeyword(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('seo_keyword_universe')
    .update({ is_tracked: false })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { keyword: data })
}

// ═══════════════════════════════════════════════════════════════════════════════
// GSC HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function handleGSC(ctx, action) {
  const { method, query, body, supabase } = ctx
  const siteId = query.siteId || body.siteId
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  switch (action) {
    case 'overview':
      return await getGSCOverview(ctx, siteId)
    case 'queries':
      return await getGSCQueries(ctx, siteId)
    case 'pages':
      return await getGSCPages(ctx, siteId)
    case 'sync':
      if (method === 'POST') return await triggerGSCSync(ctx, siteId)
      break
    case 'indexing':
      if (method === 'GET') return await getIndexingStatus(ctx, siteId)
      if (method === 'POST') return await requestIndexing(ctx, siteId)
      break
    default:
      return response(404, { error: `Unknown GSC action: ${action}` })
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function getGSCOverview(ctx, siteId) {
  const { supabase, query } = ctx
  const days = parseInt(query.days) || 28
  
  // Get site with GSC credentials
  const { data: site, error: siteError } = await supabase
    .from('seo_sites')
    .select('domain, gsc_property_url')
    .eq('id', siteId)
    .single()
  
  if (siteError) return response(500, { error: siteError.message })
  
  // Get cached overview data
  const { data: overview } = await supabase
    .from('seo_gsc_snapshots')
    .select('*')
    .eq('site_id', siteId)
    .order('snapshot_date', { ascending: false })
    .limit(days)
  
  return response(200, { 
    site: site.domain,
    property: site.gsc_property_url,
    overview: overview || []
  })
}

async function getGSCQueries(ctx, siteId) {
  const { supabase, query } = ctx
  const { page, limit = 100 } = query
  
  let q = supabase
    .from('seo_keyword_universe')
    .select('keyword, current_position, impressions_28d, clicks_28d, ctr_28d, position_change_7d')
    .eq('site_id', siteId)
    .order('impressions_28d', { ascending: false })
    .limit(limit)
  
  if (page) {
    q = q.eq('primary_page', page)
  }
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { queries: data })
}

async function getGSCPages(ctx, siteId) {
  const { supabase, query } = ctx
  const { limit = 100 } = query
  
  const { data, error } = await supabase
    .from('seo_pages')
    .select('url, title, clicks_28d, impressions_28d, avg_position_28d, ctr_28d')
    .eq('site_id', siteId)
    .order('impressions_28d', { ascending: false })
    .limit(limit)
  
  if (error) return response(500, { error: error.message })
  return response(200, { pages: data })
}

async function triggerGSCSync(ctx, siteId) {
  // This would trigger the background sync
  return await triggerBackgroundJob(ctx, siteId, 'gsc_sync')
}

async function getIndexingStatus(ctx, siteId) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('seo_pages')
    .select('url, indexing_status, last_indexed_at')
    .eq('site_id', siteId)
    .not('indexing_status', 'is', null)
    .limit(100)
  
  if (error) return response(500, { error: error.message })
  return response(200, { pages: data })
}

async function requestIndexing(ctx, siteId) {
  const { body } = ctx
  const { urls } = body
  
  if (!urls || !Array.isArray(urls)) {
    return response(400, { error: 'urls array is required' })
  }
  
  // This would use the Indexing API
  return await triggerBackgroundJob(ctx, siteId, 'request_indexing', { urls })
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI BRAIN HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function getBrainStatus(ctx) {
  const { supabase, query } = ctx
  const { siteId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  // Get latest analysis run
  const { data: latestRun } = await supabase
    .from('seo_ai_analysis_runs')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  // Get knowledge base status
  const { data: knowledge } = await supabase
    .from('seo_knowledge_base')
    .select('training_status, last_trained_at, training_data')
    .eq('site_id', siteId)
    .single()
  
  return response(200, {
    latestRun,
    knowledge: knowledge ? {
      status: knowledge.training_status,
      lastTrained: knowledge.last_trained_at,
      hasData: !!knowledge.training_data
    } : null
  })
}

async function triggerBrainAnalysis(ctx) {
  const { body } = ctx
  const { siteId, analysisType = 'comprehensive', focusAreas = [] } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'ai_brain_analysis', { analysisType, focusAreas })
}

async function triggerTraining(ctx) {
  const { body } = ctx
  const { siteId } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'ai_train')
}

async function getTrainingStatus(ctx) {
  const { supabase, query } = ctx
  const { siteId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  const { data, error } = await supabase
    .from('seo_knowledge_base')
    .select('training_status, last_trained_at, training_data')
    .eq('site_id', siteId)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { training: data })
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function listRecommendations(ctx) {
  const { supabase, query } = ctx
  const { siteId, status = 'pending', category, limit = 50 } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  let q = supabase
    .from('seo_ai_recommendations')
    .select('*')
    .eq('site_id', siteId)
    .order('priority', { ascending: true })
    .limit(limit)
  
  if (status !== 'all') q = q.eq('status', status)
  if (category) q = q.eq('category', category)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { recommendations: data })
}

async function updateRecommendation(ctx, id) {
  const { supabase, body } = ctx
  
  const { data, error } = await supabase
    .from('seo_ai_recommendations')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { recommendation: data })
}

async function applyRecommendation(ctx) {
  const { body } = ctx
  const { recommendationId, siteId } = body
  
  if (!recommendationId || !siteId) {
    return response(400, { error: 'recommendationId and siteId are required' })
  }
  
  return await triggerBackgroundJob(ctx, siteId, 'apply_recommendation', { recommendationId })
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITIES HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function listOpportunities(ctx) {
  const { supabase, query } = ctx
  const { siteId, status, type, limit = 50 } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  let q = supabase
    .from('seo_opportunities')
    .select('*')
    .eq('site_id', siteId)
    .order('priority_score', { ascending: false })
    .limit(limit)
  
  if (status) q = q.eq('status', status)
  if (type) q = q.eq('opportunity_type', type)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { opportunities: data })
}

async function updateOpportunity(ctx, id) {
  const { supabase, body } = ctx
  
  const { data, error } = await supabase
    .from('seo_opportunities')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { opportunity: data })
}

async function detectOpportunities(ctx) {
  const { body } = ctx
  const { siteId } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'detect_opportunities')
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function handleReports(ctx, action) {
  const { method, query, body, supabase } = ctx
  const siteId = query.siteId || body?.siteId
  
  if (!siteId && action !== 'list') {
    return response(400, { error: 'siteId is required' })
  }
  
  switch (action) {
    case 'list':
    case undefined:
      return await listReports(ctx, siteId)
    case 'generate':
      return await triggerBackgroundJob(ctx, siteId, 'generate_report', body)
    case 'ranking-history':
      return await getRankingHistory(ctx, siteId)
    default:
      // action might be a report ID
      if (method === 'GET') {
        return await getReport(ctx, action)
      }
  }
  
  return response(404, { error: `Unknown reports action: ${action}` })
}

async function listReports(ctx, siteId) {
  const { supabase, query } = ctx
  
  let q = supabase
    .from('seo_reports')
    .select('id, site_id, report_type, status, created_at, period_start, period_end')
    .order('created_at', { ascending: false })
    .limit(query.limit || 20)
  
  if (siteId) q = q.eq('site_id', siteId)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { reports: data })
}

async function getReport(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('seo_reports')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { report: data })
}

async function getRankingHistory(ctx, siteId) {
  const { supabase, query } = ctx
  const { keyword, days = 30 } = query
  
  let q = supabase
    .from('seo_ranking_history')
    .select('*')
    .eq('site_id', siteId)
    .gte('snapshot_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('snapshot_date', { ascending: false })
  
  if (keyword) q = q.eq('keyword', keyword)
  
  const { data, error } = await q.limit(1000)
  
  if (error) return response(500, { error: error.message })
  return response(200, { history: data })
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function listAlerts(ctx) {
  const { supabase, query } = ctx
  const { siteId, status, severity, limit = 50 } = query
  
  let q = supabase
    .from('seo_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (siteId) q = q.eq('site_id', siteId)
  if (status) q = q.eq('status', status)
  if (severity) q = q.eq('severity', severity)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { alerts: data })
}

async function updateAlert(ctx, id) {
  const { supabase, body } = ctx
  
  const { data, error } = await supabase
    .from('seo_alerts')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { alert: data })
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOBS HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

async function getJobStatus(ctx, jobId) {
  const { supabase, query } = ctx
  
  if (!jobId) {
    // List recent jobs
    const { siteId, status, limit = 20 } = query
    
    let q = supabase
      .from('seo_background_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (siteId) q = q.eq('site_id', siteId)
    if (status) q = q.eq('status', status)
    
    const { data, error } = await q
    
    if (error) return response(500, { error: error.message })
    return response(200, { jobs: data })
  }
  
  const { data, error } = await supabase
    .from('seo_background_jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, data) // Return job directly, not wrapped
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER HANDLERS (to be implemented)
// ═══════════════════════════════════════════════════════════════════════════════

async function listCompetitors(ctx) {
  const { supabase, query } = ctx
  const { siteId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  const { data, error } = await supabase
    .from('seo_competitor_analysis')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
  
  if (error) return response(500, { error: error.message })
  return response(200, { competitors: data })
}

async function analyzeCompetitor(ctx) {
  const { body } = ctx
  const { siteId, competitorDomain } = body
  
  if (!siteId || !competitorDomain) {
    return response(400, { error: 'siteId and competitorDomain are required' })
  }
  
  return await triggerBackgroundJob(ctx, siteId, 'competitor_analyze', { competitorDomain })
}

async function getTechnicalAudit(ctx) {
  const { supabase, query } = ctx
  const { siteId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  const { data, error } = await supabase
    .from('seo_technical_audits')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error && error.code !== 'PGRST116') return response(500, { error: error.message })
  return response(200, { audit: data || null })
}

async function runTechnicalAudit(ctx) {
  const { body } = ctx
  const { siteId } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'technical_audit')
}

async function getCWV(ctx) {
  const { supabase, query } = ctx
  const { siteId, url } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  let q = supabase
    .from('seo_cwv_scores')
    .select('*')
    .eq('site_id', siteId)
    .order('checked_at', { ascending: false })
  
  if (url) q = q.eq('url', url)
  
  const { data, error } = await q.limit(url ? 10 : 100)
  
  if (error) return response(500, { error: error.message })
  return response(200, { scores: data })
}

async function checkCWV(ctx) {
  const { body } = ctx
  const { siteId, urls } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'cwv_check', { urls })
}

async function getInternalLinks(ctx) {
  const { supabase, query } = ctx
  const { siteId, pageId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  const { data, error } = await supabase
    .from('seo_internal_links')
    .select('*')
    .eq('site_id', siteId)
    .limit(500)
  
  if (error) return response(500, { error: error.message })
  return response(200, { links: data })
}

async function analyzeInternalLinks(ctx) {
  const { body } = ctx
  const { siteId } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'internal_links_analyze')
}

async function handleContent(ctx, action) {
  const { method, query, body, supabase } = ctx
  const siteId = query.siteId || body?.siteId
  
  switch (action) {
    case 'brief':
      if (method === 'POST') return await triggerBackgroundJob(ctx, siteId, 'content_brief', body)
      break
    case 'decay':
      if (method === 'GET') return await getContentDecay(ctx, siteId)
      if (method === 'POST') return await triggerBackgroundJob(ctx, siteId, 'content_decay_analyze')
      break
    case 'gaps':
      if (method === 'GET') return await getContentGaps(ctx, siteId)
      if (method === 'POST') return await triggerBackgroundJob(ctx, siteId, 'content_gap_analyze')
      break
    case 'cannibalization':
      if (method === 'GET') return await getCannibalization(ctx, siteId)
      if (method === 'POST') return await triggerBackgroundJob(ctx, siteId, 'cannibalization_analyze')
      break
  }
  
  return response(404, { error: `Unknown content action: ${action}` })
}

async function getContentDecay(ctx, siteId) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('seo_content_decay')
    .select('*')
    .eq('site_id', siteId)
    .order('decay_severity', { ascending: false })
    .limit(50)
  
  if (error) return response(500, { error: error.message })
  return response(200, { decay: data })
}

async function getContentGaps(ctx, siteId) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('seo_content_gaps')
    .select('*')
    .eq('site_id', siteId)
    .order('priority_score', { ascending: false })
    .limit(50)
  
  if (error) return response(500, { error: error.message })
  return response(200, { gaps: data })
}

async function getCannibalization(ctx, siteId) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('seo_cannibalization')
    .select('*')
    .eq('site_id', siteId)
    .order('ctr_loss', { ascending: false })
    .limit(50)
  
  if (error) return response(500, { error: error.message })
  return response(200, { cannibalization: data })
}

async function getSchema(ctx) {
  const { supabase, query } = ctx
  const { siteId, pageId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  let q = supabase
    .from('seo_schema_markup')
    .select('*')
    .eq('site_id', siteId)
  
  if (pageId) q = q.eq('page_id', pageId)
  
  const { data, error } = await q.limit(100)
  
  if (error) return response(500, { error: error.message })
  return response(200, { schemas: data })
}

async function generateSchema(ctx) {
  const { body } = ctx
  const { siteId, pageIds } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'schema_generate', { pageIds })
}

async function getBacklinks(ctx) {
  const { supabase, query } = ctx
  const { siteId, status } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  let q = supabase
    .from('seo_backlink_opportunities')
    .select('*')
    .eq('site_id', siteId)
    .order('priority_score', { ascending: false })
  
  if (status) q = q.eq('status', status)
  
  const { data, error } = await q.limit(100)
  
  if (error) return response(500, { error: error.message })
  return response(200, { backlinks: data })
}

async function discoverBacklinks(ctx) {
  const { body } = ctx
  const { siteId } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'backlinks_discover')
}

async function getLocalSEO(ctx) {
  const { supabase, query } = ctx
  const { siteId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  const { data: knowledge } = await supabase
    .from('seo_knowledge_base')
    .select('is_local_business, primary_location, service_areas, service_radius_miles')
    .eq('site_id', siteId)
    .single()
  
  const { data: recommendations } = await supabase
    .from('seo_ai_recommendations')
    .select('*')
    .eq('site_id', siteId)
    .eq('category', 'local')
    .eq('status', 'pending')
  
  return response(200, { 
    knowledge: knowledge || {}, 
    recommendations: recommendations || [] 
  })
}

async function analyzeLocalSEO(ctx) {
  const { body } = ctx
  const { siteId } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'local_seo_analyze')
}

async function getSERPFeatures(ctx) {
  const { supabase, query } = ctx
  const { siteId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  const { data, error } = await supabase
    .from('seo_keyword_universe')
    .select('keyword, current_position, serp_features, serp_opportunity_score')
    .eq('site_id', siteId)
    .not('serp_features', 'is', null)
    .order('serp_opportunity_score', { ascending: false })
    .limit(100)
  
  if (error) return response(500, { error: error.message })
  return response(200, { keywords: data })
}

async function analyzeSERP(ctx) {
  const { body } = ctx
  const { siteId, keywords } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  return await triggerBackgroundJob(ctx, siteId, 'serp_analyze', { keywords })
}

async function listTitleTests(ctx) {
  const { supabase, query } = ctx
  const { siteId, status } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  let q = supabase
    .from('seo_title_tests')
    .select('*, page:seo_pages(id, url, title)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
  
  if (status) q = q.eq('status', status)
  
  const { data, error } = await q.limit(50)
  
  if (error) return response(500, { error: error.message })
  return response(200, { tests: data })
}

async function getTitleTest(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('seo_title_tests')
    .select('*, page:seo_pages(*)')
    .eq('id', id)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { test: data })
}

async function createTitleTest(ctx) {
  const { body } = ctx
  const { siteId, pageId, generateVariants } = body
  
  if (!siteId || !pageId) {
    return response(400, { error: 'siteId and pageId are required' })
  }
  
  if (generateVariants) {
    return await triggerBackgroundJob(ctx, siteId, 'title_test_generate', { pageId })
  }
  
  // Create test directly if variants provided
  const { supabase } = ctx
  const { data, error } = await supabase
    .from('seo_title_tests')
    .insert({
      site_id: siteId,
      page_id: pageId,
      ...body,
      status: 'draft'
    })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(201, { test: data })
}

async function updateTitleTest(ctx, id) {
  const { supabase, body } = ctx
  
  const { data, error } = await supabase
    .from('seo_title_tests')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { test: data })
}

async function deleteTitleTest(ctx, id) {
  const { supabase } = ctx
  
  const { error } = await supabase
    .from('seo_title_tests')
    .delete()
    .eq('id', id)
  
  if (error) return response(500, { error: error.message })
  return response(200, { success: true })
}

async function getKnowledge(ctx) {
  const { supabase, query } = ctx
  const { siteId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  const { data, error } = await supabase
    .from('seo_knowledge_base')
    .select('*')
    .eq('site_id', siteId)
    .single()
  
  if (error && error.code !== 'PGRST116') return response(500, { error: error.message })
  return response(200, { knowledge: data || null })
}

async function updateKnowledge(ctx) {
  const { supabase, body } = ctx
  const { siteId, ...knowledgeData } = body
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  const { data, error } = await supabase
    .from('seo_knowledge_base')
    .upsert({
      site_id: siteId,
      ...knowledgeData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'site_id' })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { knowledge: data })
}

async function listRedirects(ctx) {
  const { supabase, query } = ctx
  const { siteId } = query
  
  if (!siteId) return response(400, { error: 'siteId is required' })
  
  const { data, error } = await supabase
    .from('seo_redirects')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
  
  if (error) return response(500, { error: error.message })
  return response(200, { redirects: data })
}

async function createRedirect(ctx) {
  const { supabase, body, contact } = ctx
  const { siteId, fromPath, toPath, statusCode = 301 } = body
  
  if (!siteId || !fromPath || !toPath) {
    return response(400, { error: 'siteId, fromPath, and toPath are required' })
  }
  
  const { data, error } = await supabase
    .from('seo_redirects')
    .insert({
      site_id: siteId,
      from_path: fromPath,
      to_path: toPath,
      status_code: statusCode,
      created_by: contact.id
    })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(201, { redirect: data })
}

async function updateRedirect(ctx, id) {
  const { supabase, body } = ctx
  
  const { data, error } = await supabase
    .from('seo_redirects')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { redirect: data })
}

async function deleteRedirect(ctx, id) {
  const { supabase } = ctx
  
  const { error } = await supabase
    .from('seo_redirects')
    .delete()
    .eq('id', id)
  
  if (error) return response(500, { error: error.message })
  return response(200, { success: true })
}

async function getMetadata(ctx) {
  const { supabase, query } = ctx
  const { siteId, pageId } = query
  
  if (!pageId) return response(400, { error: 'pageId is required' })
  
  const { data, error } = await supabase
    .from('seo_pages')
    .select('id, url, title, managed_title, meta_description, managed_meta_description, og_title, og_description, og_image')
    .eq('id', pageId)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { metadata: data })
}

async function updateMetadata(ctx) {
  const { supabase, body } = ctx
  const { pageId, ...metadata } = body
  
  if (!pageId) return response(400, { error: 'pageId is required' })
  
  const { data, error } = await supabase
    .from('seo_pages')
    .update({
      ...metadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', pageId)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { metadata: data })
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND JOB TRIGGER
// ═══════════════════════════════════════════════════════════════════════════════

async function triggerBackgroundJob(ctx, siteId, jobType, params = {}) {
  const { supabase, contact, orgId } = ctx
  
  // Create job record
  const { data: job, error } = await supabase
    .from('seo_background_jobs')
    .insert({
      site_id: siteId,
      org_id: orgId,
      job_type: jobType,
      status: 'pending',
      progress: 0,
      params,
      started_by: contact?.id,
      created_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) {
    return response(500, { error: error.message })
  }
  
  // Map job types to background function endpoints
  const jobEndpoints = {
    'crawl_sitemap': 'seo-crawl-sitemap-background',
    'gsc_sync': 'seo-gsc-sync', // Not background yet
    'ai_brain_analysis': 'seo-ai-brain-v2-background', // v2 uses Assistants API with persistent threads
    'ai_train': 'seo-ai-train-background',
    'detect_opportunities': 'seo-opportunities-detect-background',
    'apply_recommendation': 'seo-ai-apply', // Not background yet
    'competitor_analyze': 'seo-competitor-analyze-background',
    'technical_audit': 'seo-technical-audit',
    'cwv_check': 'seo-cwv-background',
    'internal_links_analyze': 'seo-internal-links-background',
    'content_brief': 'seo-content-brief-background',
    'content_decay_analyze': 'seo-content-decay-background',
    'content_gap_analyze': 'seo-content-gap-analysis-background',
    'cannibalization_analyze': 'seo-cannibalization-background',
    'schema_generate': 'seo-schema-generate-background',
    'backlinks_discover': 'seo-backlinks-background',
    'local_seo_analyze': 'seo-local-analyze-background',
    'serp_analyze': 'seo-serp-analyze-background',
    'title_test_generate': 'seo-title-ab-test-background',
    'generate_report': 'seo-reports',
    'request_indexing': 'seo-gsc-indexing'
  }
  
  // Trigger background function asynchronously
  const endpoint = jobEndpoints[jobType]
  if (endpoint && endpoint.includes('background')) {
    // Fire and forget - the background function will update the job
    fetch(`${process.env.URL}/.netlify/functions/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, orgId, jobId: job.id, ...params })
    }).catch(err => console.error(`[SEO] Failed to trigger ${endpoint}:`, err))
  }
  
  return response(202, {
    success: true,
    jobId: job.id,
    jobType,
    message: `Job queued: ${jobType}`,
    pollUrl: `/.netlify/functions/api/seo/jobs/${job.id}`
  })
}
