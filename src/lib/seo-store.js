// src/lib/seo-store.js
// Zustand store for SEO module state management
import { create } from 'zustand'
import api from './api'

export const useSeoStore = create((set, get) => ({
  // Sites
  sites: [],
  currentSite: null,
  sitesLoading: false,
  sitesError: null,

  // Pages
  pages: [],
  currentPage: null,
  pagesLoading: false,
  pagesError: null,
  pagesPagination: { page: 1, limit: 50, total: 0, totalPages: 0 },

  // Opportunities
  opportunities: [],
  opportunitiesSummary: null,
  opportunitiesLoading: false,
  opportunitiesError: null,
  opportunitiesPagination: { page: 1, limit: 50, total: 0, totalPages: 0 },

  // Queries
  queries: [],
  strikingQueries: [],

  // Google Search Console data
  gscOverview: null,
  gscQueries: [],
  gscPages: [],
  gscLoading: false,
  gscError: null,

  // ==================== SITES ====================

  // Fetch the SEO site for the current org (1:1 relationship)
  fetchSiteForOrg: async (orgId, createIfMissing = false) => {
    set({ sitesLoading: true, sitesError: null })
    try {
      const response = await api.get(`/.netlify/functions/seo-sites-get-org?orgId=${orgId}`)
      const site = response.data.site
      
      if (site) {
        set({ currentSite: site, sitesLoading: false })
        return site
      }
      
      // If no site and createIfMissing is true, create one
      if (createIfMissing && response.data.org?.domain) {
        const createResponse = await api.post('/.netlify/functions/seo-sites-create', {
          domain: response.data.org.domain,
          site_name: response.data.org.name,
          org_id: orgId
        })
        set({ currentSite: createResponse.data.site, sitesLoading: false })
        return createResponse.data.site
      }
      
      set({ currentSite: null, sitesLoading: false })
      return null
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ sitesError: message, sitesLoading: false })
      return null
    }
  },

  fetchSites: async (contactId = null) => {
    set({ sitesLoading: true, sitesError: null })
    try {
      const params = contactId ? `?contactId=${contactId}` : ''
      const response = await api.get(`/.netlify/functions/seo-sites-list${params}`)
      set({ sites: response.data.sites, sitesLoading: false })
      return response.data.sites
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ sitesError: message, sitesLoading: false })
      throw error
    }
  },

  fetchSite: async (siteId) => {
    set({ sitesLoading: true, sitesError: null })
    try {
      const response = await api.get(`/.netlify/functions/seo-sites-get?id=${siteId}`)
      const siteData = {
        ...response.data.site,
        stats: response.data.stats,
        topPages: response.data.topPages,
        strikingQueries: response.data.strikingQueries,
        recentOpportunities: response.data.opportunities
      }
      set({ 
        currentSite: siteData,
        strikingQueries: response.data.strikingQueries || [],
        sitesLoading: false 
      })
      return siteData
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ sitesError: message, sitesLoading: false })
      throw error
    }
  },

  createSite: async (siteData) => {
    try {
      const response = await api.post('/.netlify/functions/seo-sites-create', siteData)
      const newSite = response.data.site
      set(state => ({ sites: [newSite, ...state.sites] }))
      return newSite
    } catch (error) {
      throw error
    }
  },

  selectSite: async (siteId) => {
    return get().fetchSite(siteId)
  },

  selectPage: async (pageId) => {
    return get().fetchPage(pageId)
  },

  // ==================== PAGES ====================

  fetchPages: async (siteId, options = {}) => {
    set({ pagesLoading: true, pagesError: null })
    try {
      const params = new URLSearchParams({ siteId, ...options })
      const response = await api.get(`/.netlify/functions/seo-pages-list?${params}`)
      set({ 
        pages: response.data.pages, 
        pagesPagination: response.data.pagination,
        pagesLoading: false 
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ pagesError: message, pagesLoading: false })
      throw error
    }
  },

  fetchPage: async (pageId) => {
    set({ pagesLoading: true, pagesError: null })
    try {
      const response = await api.get(`/.netlify/functions/seo-pages-get?id=${pageId}`)
      set({ 
        currentPage: response.data.page,
        queries: response.data.queries || [],
        pagesLoading: false 
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ pagesError: message, pagesLoading: false })
      throw error
    }
  },

  // ==================== CRAWLING ====================

  crawlSitemap: async (siteId, sitemapUrl = null) => {
    try {
      const response = await api.post('/.netlify/functions/seo-crawl-sitemap', {
        siteId,
        sitemapUrl
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  crawlPage: async (pageId) => {
    try {
      const response = await api.post('/.netlify/functions/seo-crawl-page', { pageId })
      
      // Update the page in the local state
      set(state => ({
        pages: state.pages.map(p => 
          p.id === pageId 
            ? { ...p, ...response.data.data, lastCrawled: new Date().toISOString() }
            : p
        )
      }))
      
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== OPPORTUNITIES ====================

  fetchOpportunities: async (siteId, options = {}) => {
    set({ opportunitiesLoading: true, opportunitiesError: null })
    try {
      const params = new URLSearchParams({ siteId, ...options })
      const response = await api.get(`/.netlify/functions/seo-opportunities-list?${params}`)
      set({ 
        opportunities: response.data.opportunities,
        opportunitiesSummary: response.data.summary,
        opportunitiesPagination: response.data.pagination,
        opportunitiesLoading: false 
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ opportunitiesError: message, opportunitiesLoading: false })
      throw error
    }
  },

  detectOpportunities: async (siteId, pageId = null) => {
    try {
      const response = await api.post('/.netlify/functions/seo-opportunities-detect', {
        siteId,
        pageId
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  updateOpportunity: async (id, updates) => {
    try {
      const response = await api.put('/.netlify/functions/seo-opportunities-update', {
        id,
        ...updates
      })
      
      // Update local state
      set(state => ({
        opportunities: state.opportunities.map(o =>
          o.id === id ? { ...o, ...updates } : o
        )
      }))
      
      return response.data
    } catch (error) {
      throw error
    }
  },

  dismissOpportunity: async (id, reason = null) => {
    return get().updateOpportunity(id, { status: 'dismissed', dismissedReason: reason })
  },

  completeOpportunity: async (id, resultNotes = null) => {
    return get().updateOpportunity(id, { status: 'completed', resultNotes })
  },

  // ==================== GOOGLE SEARCH CONSOLE ====================

  // Fetch GSC overview (totals + trends)
  fetchGscOverview: async (domain) => {
    set({ gscLoading: true, gscError: null })
    try {
      // Format domain for GSC API - use domain property
      const siteUrl = `sc-domain:${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`
      
      const response = await api.post('/.netlify/functions/seo-gsc-overview', { siteUrl })
      set({ gscOverview: response.data, gscLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ gscError: message, gscLoading: false })
      console.error('[GSC] Overview error:', message)
      return null
    }
  },

  // Fetch top search queries from GSC
  fetchGscQueries: async (domain, options = {}) => {
    set({ gscLoading: true, gscError: null })
    try {
      const siteUrl = `sc-domain:${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`
      
      const response = await api.post('/.netlify/functions/seo-gsc-queries', {
        siteUrl,
        dimensions: options.dimensions || ['query'],
        rowLimit: options.limit || 100,
        startDate: options.startDate,
        endDate: options.endDate,
      })
      set({ gscQueries: response.data.queries, gscLoading: false })
      return response.data.queries
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ gscError: message, gscLoading: false })
      console.error('[GSC] Queries error:', message)
      return []
    }
  },

  // Fetch page performance from GSC
  fetchGscPages: async (domain, options = {}) => {
    set({ gscLoading: true, gscError: null })
    try {
      const siteUrl = `sc-domain:${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`
      
      const response = await api.post('/.netlify/functions/seo-gsc-pages', {
        siteUrl,
        rowLimit: options.limit || 100,
        pageFilter: options.pageFilter,
        startDate: options.startDate,
        endDate: options.endDate,
      })
      set({ gscPages: response.data.pages, gscLoading: false })
      return response.data.pages
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ gscError: message, gscLoading: false })
      console.error('[GSC] Pages error:', message)
      return []
    }
  },

  // Clear GSC data
  clearGscData: () => {
    set({ gscOverview: null, gscQueries: [], gscPages: [], gscError: null })
  },

  // ==================== AI BRAIN ====================

  // AI Brain state
  aiRecommendations: [],
  aiRecommendationsLoading: false,
  aiRecommendationsError: null,
  siteKnowledge: null,
  siteKnowledgeLoading: false,
  aiTrainingStatus: null, // 'idle' | 'training' | 'complete' | 'error'
  aiAnalysisInProgress: false,

  // Train AI on site content - builds knowledge base
  trainSite: async (siteId) => {
    set({ siteKnowledgeLoading: true, aiTrainingStatus: 'training' })
    try {
      const response = await api.post('/.netlify/functions/seo-ai-train', { siteId })
      set({ 
        siteKnowledge: response.data.knowledge,
        siteKnowledgeLoading: false,
        aiTrainingStatus: 'complete'
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ 
        siteKnowledgeLoading: false, 
        aiTrainingStatus: 'error',
        aiRecommendationsError: message
      })
      throw error
    }
  },

  // Fetch existing site knowledge
  fetchSiteKnowledge: async (siteId) => {
    set({ siteKnowledgeLoading: true })
    try {
      const response = await api.get(`/.netlify/functions/seo-ai-knowledge?siteId=${siteId}`)
      set({ 
        siteKnowledge: response.data.knowledge,
        siteKnowledgeLoading: false,
        aiTrainingStatus: response.data.knowledge ? 'complete' : 'idle'
      })
      return response.data.knowledge
    } catch (error) {
      set({ siteKnowledgeLoading: false })
      return null
    }
  },

  // Run AI Brain analysis - generates comprehensive recommendations
  runAiBrain: async (siteId, options = {}) => {
    set({ aiAnalysisInProgress: true, aiRecommendationsError: null })
    try {
      const response = await api.post('/.netlify/functions/seo-ai-brain', {
        siteId,
        analysisType: options.analysisType || 'comprehensive',
        focusAreas: options.focusAreas || [],
        pageIds: options.pageIds || []
      })
      
      // Merge new recommendations with existing
      set(state => ({
        aiRecommendations: response.data.recommendations || [],
        aiAnalysisInProgress: false
      }))
      
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ aiAnalysisInProgress: false, aiRecommendationsError: message })
      throw error
    }
  },

  // ==================== SIGNAL AI ====================
  // Signal is the premium AI layer - learning, memory, auto-fix
  
  signalLearning: null,
  signalLearningLoading: false,
  
  // Fetch Signal learning patterns (wins/losses)
  fetchSignalLearning: async (siteId, period = '30d') => {
    set({ signalLearningLoading: true })
    try {
      const response = await api.get(`/.netlify/functions/seo-ai-measure-outcomes?siteId=${siteId}&period=${period}`)
      set({ 
        signalLearning: response.data,
        signalLearningLoading: false
      })
      return response.data
    } catch (error) {
      set({ signalLearningLoading: false })
      throw error
    }
  },
  
  // Apply all auto-fixable recommendations
  applySignalAutoFixes: async (siteId, recommendationIds = null) => {
    try {
      const response = await api.post('/.netlify/functions/seo-auto-optimize', {
        siteId,
        recommendationIds, // If null, applies all safe auto-fixable
        safeOnly: true
      })
      
      // Refresh recommendations after applying
      await get().fetchAiRecommendations(siteId)
      
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get Signal suggestions for a specific page
  getSignalSuggestions: async (pageId, field = 'all') => {
    try {
      const response = await api.post('/.netlify/functions/seo-ai-recommendations', {
        pageId,
        field, // 'title', 'meta', 'schema', 'all'
        action: 'generate'
      })
      return response.data.suggestions || []
    } catch (error) {
      throw error
    }
  },
  
  // Update page metadata (title, description, schema)
  updatePageMetadata: async (pageId, updates) => {
    try {
      const response = await api.put('/.netlify/functions/seo-pages-update', {
        pageId,
        ...updates
      })
      
      // Update local state
      set(state => ({
        pages: state.pages.map(p => 
          p.id === pageId ? { ...p, ...updates } : p
        ),
        currentPage: state.currentPage?.id === pageId 
          ? { ...state.currentPage, ...updates } 
          : state.currentPage
      }))
      
      return response.data.page
    } catch (error) {
      throw error
    }
  },

  // Fetch existing AI recommendations
  fetchAiRecommendations: async (siteId, options = {}) => {
    set({ aiRecommendationsLoading: true, aiRecommendationsError: null })
    try {
      const params = new URLSearchParams({ siteId, ...options })
      const response = await api.get(`/.netlify/functions/seo-ai-recommendations?${params}`)
      set({ 
        aiRecommendations: response.data.recommendations || [],
        aiRecommendationsLoading: false
      })
      return response.data.recommendations
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ aiRecommendationsError: message, aiRecommendationsLoading: false })
      return []
    }
  },

  // Apply a single AI recommendation
  applyRecommendation: async (recommendationId) => {
    try {
      const response = await api.post('/.netlify/functions/seo-ai-apply', {
        recommendationId,
        action: 'apply'
      })
      
      // Update local state
      set(state => ({
        aiRecommendations: state.aiRecommendations.map(r =>
          r.id === recommendationId 
            ? { ...r, status: 'applied', applied_at: new Date().toISOString() }
            : r
        )
      }))
      
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Batch apply multiple recommendations
  applyRecommendations: async (recommendationIds) => {
    try {
      const response = await api.post('/.netlify/functions/seo-ai-apply', {
        recommendationIds,
        action: 'apply'
      })
      
      // Update local state for all applied
      const appliedIds = response.data.results.applied.map(r => r.id)
      set(state => ({
        aiRecommendations: state.aiRecommendations.map(r =>
          appliedIds.includes(r.id)
            ? { ...r, status: 'applied', applied_at: new Date().toISOString() }
            : r
        )
      }))
      
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Dismiss a recommendation
  dismissRecommendation: async (recommendationId, reason = null) => {
    try {
      const response = await api.post('/.netlify/functions/seo-ai-apply', {
        recommendationId,
        action: 'dismiss'
      })
      
      set(state => ({
        aiRecommendations: state.aiRecommendations.map(r =>
          r.id === recommendationId 
            ? { ...r, status: 'dismissed', dismissed_at: new Date().toISOString() }
            : r
        )
      }))
      
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Analyze a single page with AI
  analyzePageWithAi: async (pageId) => {
    try {
      const response = await api.post('/.netlify/functions/seo-ai-analyze', { pageId })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Clear AI state
  clearAiState: () => {
    set({
      aiRecommendations: [],
      aiRecommendationsError: null,
      siteKnowledge: null,
      aiTrainingStatus: null,
      aiAnalysisInProgress: false
    })
  },

  // ==================== KEYWORD TRACKING ====================

  // Keyword tracking state
  trackedKeywords: [],
  keywordsSummary: null,
  keywordsLoading: false,

  // Fetch tracked keywords
  fetchTrackedKeywords: async (siteId, options = {}) => {
    set({ keywordsLoading: true })
    try {
      const params = new URLSearchParams({ siteId, ...options })
      const response = await api.get(`/.netlify/functions/seo-keyword-track?${params}`)
      set({ 
        trackedKeywords: response.data.keywords || [],
        keywordsSummary: response.data.summary,
        keywordsLoading: false
      })
      return response.data
    } catch (error) {
      set({ keywordsLoading: false })
      throw error
    }
  },

  // Add keywords to track
  trackKeywords: async (siteId, keywords) => {
    try {
      const response = await api.post('/.netlify/functions/seo-keyword-track', {
        siteId,
        keywords
      })
      // Refresh the list
      await get().fetchTrackedKeywords(siteId)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Auto-discover and track top keywords
  autoDiscoverKeywords: async (siteId) => {
    try {
      const response = await api.post('/.netlify/functions/seo-keyword-track', {
        siteId,
        autoDiscover: true
      })
      await get().fetchTrackedKeywords(siteId)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Refresh all keyword rankings
  refreshKeywordRankings: async (siteId) => {
    try {
      const response = await api.post('/.netlify/functions/seo-keyword-track', {
        siteId,
        refreshAll: true
      })
      await get().fetchTrackedKeywords(siteId)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== COMPETITORS ====================

  // Competitor state
  competitors: [],
  competitorsLoading: false,

  // Fetch competitors
  fetchCompetitors: async (siteId) => {
    set({ competitorsLoading: true })
    try {
      const response = await api.get(`/.netlify/functions/seo-competitor-analyze?siteId=${siteId}`)
      set({ 
        competitors: response.data.competitors || [],
        competitorsLoading: false
      })
      return response.data.competitors
    } catch (error) {
      set({ competitorsLoading: false })
      throw error
    }
  },

  // Analyze a competitor
  analyzeCompetitor: async (siteId, competitorDomain) => {
    try {
      const response = await api.post('/.netlify/functions/seo-competitor-analyze', {
        siteId,
        competitorDomain
      })
      // Refresh competitors list
      await get().fetchCompetitors(siteId)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== CONTENT BRIEFS ====================

  // Content brief state
  contentBriefs: [],
  currentBrief: null,
  briefsLoading: false,

  // Fetch content briefs
  fetchContentBriefs: async (siteId, options = {}) => {
    set({ briefsLoading: true })
    try {
      const params = new URLSearchParams({ siteId, ...options })
      const response = await api.get(`/.netlify/functions/seo-content-brief?${params}`)
      set({ 
        contentBriefs: response.data.briefs || [],
        briefsLoading: false
      })
      return response.data.briefs
    } catch (error) {
      set({ briefsLoading: false })
      throw error
    }
  },

  // Generate a content brief
  generateContentBrief: async (siteId, targetKeyword, contentType = 'blog', additionalContext = '') => {
    try {
      const response = await api.post('/.netlify/functions/seo-content-brief', {
        siteId,
        targetKeyword,
        contentType,
        additionalContext
      })
      set({ currentBrief: response.data.brief })
      // Refresh briefs list
      await get().fetchContentBriefs(siteId)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== ALERTS ====================

  // Alert state
  alerts: [],
  alertsStats: null,
  alertsLoading: false,

  // Fetch alerts
  fetchAlerts: async (siteId, options = {}) => {
    set({ alertsLoading: true })
    try {
      const params = new URLSearchParams({ siteId, ...options })
      const response = await api.get(`/.netlify/functions/seo-alerts?${params}`)
      set({ 
        alerts: response.data.alerts || [],
        alertsStats: response.data.stats,
        alertsLoading: false
      })
      return response.data
    } catch (error) {
      set({ alertsLoading: false })
      throw error
    }
  },

  // Check for new alerts
  checkAlerts: async (siteId, sendNotifications = false) => {
    try {
      const response = await api.post('/.netlify/functions/seo-alerts', {
        siteId,
        sendNotifications
      })
      // Refresh alerts
      await get().fetchAlerts(siteId)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Acknowledge an alert
  acknowledgeAlert: async (alertId) => {
    try {
      const response = await api.put('/.netlify/functions/seo-alerts', {
        alertId,
        status: 'acknowledged'
      })
      set(state => ({
        alerts: state.alerts.map(a =>
          a.id === alertId ? { ...a, status: 'acknowledged' } : a
        )
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Resolve an alert
  resolveAlert: async (alertId, notes = '') => {
    try {
      const response = await api.put('/.netlify/functions/seo-alerts', {
        alertId,
        status: 'resolved',
        notes
      })
      set(state => ({
        alerts: state.alerts.map(a =>
          a.id === alertId ? { ...a, status: 'resolved' } : a
        )
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== SERP FEATURES ====================

  // SERP features state
  serpFeatures: null,
  serpFeaturesLoading: false,

  // Fetch SERP feature analysis
  fetchSerpFeatures: async (siteId) => {
    set({ serpFeaturesLoading: true })
    try {
      const response = await api.get(`/.netlify/functions/seo-serp-analyze?siteId=${siteId}`)
      set({ 
        serpFeatures: response.data,
        serpFeaturesLoading: false
      })
      return response.data
    } catch (error) {
      set({ serpFeaturesLoading: false })
      throw error
    }
  },

  // Analyze SERP features for keywords
  analyzeSerpFeatures: async (siteId, keywords = []) => {
    try {
      const response = await api.post('/.netlify/functions/seo-serp-analyze', {
        siteId,
        keywords
      })
      set({ serpFeatures: response.data })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== LOCAL SEO ====================

  // Local SEO state
  localSeoAnalysis: null,
  localSeoLoading: false,

  // Fetch local SEO analysis
  fetchLocalSeoAnalysis: async (siteId) => {
    set({ localSeoLoading: true })
    try {
      const response = await api.get(`/.netlify/functions/seo-local-analyze?siteId=${siteId}`)
      set({ 
        localSeoAnalysis: response.data,
        localSeoLoading: false
      })
      return response.data
    } catch (error) {
      set({ localSeoLoading: false })
      throw error
    }
  },

  // Run local SEO analysis
  analyzeLocalSeo: async (siteId, businessInfo = {}) => {
    try {
      const response = await api.post('/.netlify/functions/seo-local-analyze', {
        siteId,
        ...businessInfo
      })
      set({ localSeoAnalysis: response.data })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== INTERNAL LINKS ====================

  // Internal links state
  internalLinksAnalysis: null,
  internalLinksLoading: false,

  // Fetch internal links analysis
  fetchInternalLinksAnalysis: async (siteId) => {
    set({ internalLinksLoading: true })
    try {
      const response = await api.get(`/.netlify/functions/seo-internal-links?siteId=${siteId}`)
      set({ 
        internalLinksAnalysis: response.data,
        internalLinksLoading: false
      })
      return response.data
    } catch (error) {
      set({ internalLinksLoading: false })
      throw error
    }
  },

  // Run internal links analysis
  analyzeInternalLinks: async (siteId) => {
    try {
      const response = await api.post('/.netlify/functions/seo-internal-links', { siteId })
      set({ internalLinksAnalysis: response.data })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== SCHEMA MARKUP ====================

  // Schema state
  schemaStatus: null,
  schemaLoading: false,
  generatedSchema: null,

  // Fetch schema status for site
  fetchSchemaStatus: async (siteId) => {
    set({ schemaLoading: true })
    try {
      const response = await api.get(`/.netlify/functions/seo-schema-generate?siteId=${siteId}`)
      set({ 
        schemaStatus: response.data,
        schemaLoading: false
      })
      return response.data
    } catch (error) {
      set({ schemaLoading: false })
      throw error
    }
  },

  // Generate schema for a page
  generateSchema: async (siteId, pageId, pageType = 'auto', additionalData = {}) => {
    try {
      const response = await api.post('/.netlify/functions/seo-schema-generate', {
        siteId,
        pageId,
        pageType,
        additionalData
      })
      set({ generatedSchema: response.data })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== TECHNICAL AUDIT ====================

  // Technical audit state
  technicalAudit: null,
  technicalAuditLoading: false,

  // Fetch latest technical audit
  fetchTechnicalAudit: async (siteId) => {
    set({ technicalAuditLoading: true })
    try {
      const response = await api.get(`/.netlify/functions/seo-technical-audit?siteId=${siteId}`)
      set({ 
        technicalAudit: response.data,
        technicalAuditLoading: false
      })
      return response.data
    } catch (error) {
      set({ technicalAuditLoading: false })
      throw error
    }
  },

  // Run technical audit (background function)
  runTechnicalAudit: async (siteId) => {
    set({ technicalAuditLoading: true })
    try {
      const response = await api.post('/.netlify/functions/seo-technical-audit', { siteId })
      // Background function returns immediately, poll for results
      return response.data
    } catch (error) {
      set({ technicalAuditLoading: false })
      throw error
    }
  },

  // ==================== CONTENT DECAY ====================

  // Content decay state
  decayingContent: [],
  decaySummary: null,
  decayLoading: false,

  // Fetch content decay analysis
  fetchContentDecay: async (siteId) => {
    set({ decayLoading: true })
    try {
      const response = await api.get(`/.netlify/functions/seo-content-decay?siteId=${siteId}`)
      set({ 
        decayingContent: response.data.decayingPages || [],
        decaySummary: response.data.summary,
        decayLoading: false
      })
      return response.data
    } catch (error) {
      set({ decayLoading: false })
      throw error
    }
  },

  // Run content decay detection
  detectContentDecay: async (siteId, thresholds = {}) => {
    try {
      const response = await api.post('/.netlify/functions/seo-content-decay', {
        siteId,
        thresholds
      })
      set({ 
        decayingContent: response.data.decayingPages || [],
        decaySummary: response.data.summary
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== BACKLINKS ====================

  // Backlink opportunities state
  backlinkOpportunities: [],
  backlinksSummary: null,
  backlinksLoading: false,

  // Fetch backlink opportunities
  fetchBacklinkOpportunities: async (siteId, options = {}) => {
    set({ backlinksLoading: true })
    try {
      const params = new URLSearchParams({ siteId, ...options })
      const response = await api.get(`/.netlify/functions/seo-backlinks?${params}`)
      set({ 
        backlinkOpportunities: response.data.opportunities || [],
        backlinksSummary: response.data.summary,
        backlinksLoading: false
      })
      return response.data
    } catch (error) {
      set({ backlinksLoading: false })
      throw error
    }
  },

  // Discover new backlink opportunities
  discoverBacklinks: async (siteId) => {
    try {
      const response = await api.post('/.netlify/functions/seo-backlinks', {
        siteId,
        analysisType: 'comprehensive'
      })
      set({ 
        backlinkOpportunities: response.data.opportunities || [],
        backlinksSummary: response.data.summary
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Update backlink opportunity status
  updateBacklinkOpportunity: async (opportunityId, status, notes = '') => {
    try {
      const response = await api.put('/.netlify/functions/seo-backlinks', {
        opportunityId,
        status,
        notes
      })
      set(state => ({
        backlinkOpportunities: state.backlinkOpportunities.map(o =>
          o.id === opportunityId ? { ...o, status } : o
        )
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== MASTER AUTOMATION ====================

  // Run all automated optimizations
  runAutoOptimize: async (siteId) => {
    try {
      const response = await api.post('/.netlify/functions/seo-auto-optimize', { siteId })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Schedule recurring analysis
  scheduleAnalysis: async (siteId, schedule = 'weekly') => {
    try {
      const response = await api.post('/.netlify/functions/seo-schedule', {
        siteId,
        schedule
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // ==================== INDEXING & GSC COVERAGE ====================

  // Indexing state
  indexingStatus: null,
  indexingLoading: false,
  indexingError: null,

  // Fetch indexing status for all pages
  fetchIndexingStatus: async (siteId) => {
    set({ indexingLoading: true, indexingError: null })
    try {
      const response = await api.get(`/.netlify/functions/seo-gsc-indexing?siteId=${siteId}`)
      set({ indexingStatus: response.data, indexingLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ indexingError: message, indexingLoading: false })
      throw error
    }
  },

  // Fetch sitemaps status from GSC
  fetchSitemapsStatus: async (siteId) => {
    try {
      const response = await api.get(`/.netlify/functions/seo-gsc-indexing?siteId=${siteId}&action=sitemaps`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Inspect a single URL
  inspectUrl: async (siteId, url) => {
    set({ indexingLoading: true })
    try {
      const response = await api.post('/.netlify/functions/seo-gsc-indexing', {
        siteId,
        action: 'inspect',
        url
      })
      set({ indexingLoading: false })
      return response.data
    } catch (error) {
      set({ indexingLoading: false })
      throw error
    }
  },

  // Bulk inspect multiple URLs
  bulkInspectUrls: async (siteId, urls) => {
    set({ indexingLoading: true })
    try {
      const response = await api.post('/.netlify/functions/seo-gsc-indexing', {
        siteId,
        action: 'bulk-inspect',
        urls
      })
      set({ indexingLoading: false })
      return response.data
    } catch (error) {
      set({ indexingLoading: false })
      throw error
    }
  },

  // Analyze all pages for indexing issues
  analyzeIndexingIssues: async (siteId) => {
    set({ indexingLoading: true, indexingError: null })
    try {
      const response = await api.post('/.netlify/functions/seo-gsc-indexing', {
        siteId,
        action: 'analyze-all'
      })
      set({ indexingStatus: response.data, indexingLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ indexingError: message, indexingLoading: false })
      throw error
    }
  },

  // ==================== UTILITIES ====================

  clearCurrentSite: () => {
    set({ 
      currentSite: null, 
      pages: [], 
      opportunities: [],
      strikingQueries: [],
      queries: [],
      gscOverview: null,
      gscQueries: [],
      gscPages: [],
      gscError: null
    })
  },

  clearCurrentPage: () => {
    set({ currentPage: null, queries: [] })
  },

  // Calculate change percentages
  calculateChange: (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  },

  // ==================== BLOG AI BRAIN ====================

  // Blog brain state
  blogTopicRecommendations: [],
  blogPostAnalysis: null,
  blogOptimizationResults: null,
  blogBrainLoading: false,
  blogBrainError: null,

  // Get AI-powered topic recommendations based on SEO intelligence
  fetchBlogTopicRecommendations: async (siteId, options = {}) => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const response = await api.post('/.netlify/functions/seo-ai-blog-brain', {
        action: 'recommend-topics',
        siteId,
        options
      })
      set({ 
        blogTopicRecommendations: response.data.recommendations?.topics || [],
        blogBrainLoading: false 
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Analyze a blog post for SEO and style issues
  analyzeBlogPost: async (postId, siteId = null) => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const response = await api.post('/.netlify/functions/seo-ai-blog-brain', {
        action: 'analyze-post',
        postId,
        siteId
      })
      set({ 
        blogPostAnalysis: response.data,
        blogBrainLoading: false 
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Generate optimized content for a section
  generateBlogContent: async (options, siteId = null) => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const response = await api.post('/.netlify/functions/seo-ai-blog-brain', {
        action: 'generate-content',
        options,
        siteId
      })
      set({ blogBrainLoading: false })
      return response.data.content
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Analyze all blog posts for issues (em dashes, style, etc.)
  analyzeAllBlogPosts: async () => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const response = await api.post('/.netlify/functions/blog-auto-optimize', {
        action: 'analyze-all'
      })
      set({ blogBrainLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Fix em dashes in a single post
  fixBlogPostEmDashes: async (postId) => {
    try {
      const response = await api.post('/.netlify/functions/blog-auto-optimize', {
        action: 'fix-em-dashes',
        postId
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Fix em dashes in all posts
  fixAllBlogPostEmDashes: async () => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const response = await api.post('/.netlify/functions/blog-auto-optimize', {
        action: 'fix-all-em-dashes'
      })
      set({ blogBrainLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Full AI optimization of a blog post
  optimizeBlogPost: async (postId, options = {}) => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const response = await api.post('/.netlify/functions/blog-auto-optimize', {
        action: 'optimize-post',
        postId,
        options
      })
      set({ 
        blogOptimizationResults: response.data.optimization,
        blogBrainLoading: false 
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Add citations to a blog post
  addBlogPostCitations: async (postId, applyChanges = false) => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const response = await api.post('/.netlify/functions/blog-auto-optimize', {
        action: 'add-citations',
        postId,
        options: { applyChanges }
      })
      set({ blogBrainLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Clear blog brain state
  clearBlogBrainState: () => {
    set({
      blogTopicRecommendations: [],
      blogPostAnalysis: null,
      blogOptimizationResults: null,
      blogBrainError: null
    })
  },

  // ==================== BACKGROUND JOBS ====================
  backgroundJobs: [],
  currentJob: null,
  jobsLoading: false,
  jobsError: null,

  // Start a background job
  startBackgroundJob: async (jobType, options = {}) => {
    set({ jobsLoading: true, jobsError: null })
    try {
      const response = await api.post('/.netlify/functions/seo-background-jobs', {
        jobType,
        siteId: options.siteId,
        postId: options.postId,
        options: options.options
      })
      const job = response.data.job
      set(state => ({
        backgroundJobs: [job, ...state.backgroundJobs],
        currentJob: job,
        jobsLoading: false
      }))
      return job
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ jobsError: message, jobsLoading: false })
      throw error
    }
  },

  // Check job status
  checkJobStatus: async (jobId) => {
    try {
      const response = await api.get(`/.netlify/functions/seo-background-jobs?jobId=${jobId}`)
      const job = response.data.job
      
      // Update job in list
      set(state => ({
        backgroundJobs: state.backgroundJobs.map(j => 
          j.id === jobId ? job : j
        ),
        currentJob: state.currentJob?.id === jobId ? job : state.currentJob
      }))
      
      return job
    } catch (error) {
      console.error('Failed to check job status:', error)
      return null
    }
  },

  // Fetch recent jobs
  fetchBackgroundJobs: async () => {
    set({ jobsLoading: true, jobsError: null })
    try {
      const response = await api.get('/.netlify/functions/seo-background-jobs')
      set({ backgroundJobs: response.data.jobs, jobsLoading: false })
      return response.data.jobs
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ jobsError: message, jobsLoading: false })
      throw error
    }
  },

  // Poll job until complete
  pollJobUntilComplete: async (jobId, intervalMs = 2000, maxAttempts = 60) => {
    let attempts = 0
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        attempts++
        const job = await get().checkJobStatus(jobId)
        
        if (!job) {
          reject(new Error('Job not found'))
          return
        }
        
        if (job.status === 'completed') {
          resolve(job)
          return
        }
        
        if (job.status === 'failed') {
          reject(new Error(job.error || 'Job failed'))
          return
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('Job timed out'))
          return
        }
        
        setTimeout(poll, intervalMs)
      }
      
      poll()
    })
  },

  // Trigger metadata extraction for a site
  extractSiteMetadata: async (siteId) => {
    return get().startBackgroundJob('metadata-extract', { siteId })
  },

  // ==================== SITE REVALIDATION ====================

  // Trigger revalidation on the main site after SEO changes
  triggerSiteRevalidation: async (options = {}) => {
    const { paths, revalidateAll, domain, tag } = options
    try {
      const response = await api.post('/.netlify/functions/seo-site-revalidate', {
        domain: domain || 'uptrademedia.com',
        paths,
        revalidateAll,
        tag
      })
      return response.data
    } catch (error) {
      console.error('[SEO Store] Revalidation failed:', error)
      throw error
    }
  },

  // Revalidate specific paths
  revalidatePaths: async (paths) => {
    return get().triggerSiteRevalidation({ paths })
  },

  // Revalidate all SEO-managed pages
  revalidateAllPages: async () => {
    return get().triggerSiteRevalidation({ revalidateAll: true })
  },

  // Clear current job
  clearCurrentJob: () => {
    set({ currentJob: null })
  },

  // ==================== GSC FIXES ====================

  // GSC indexing issues state
  gscIssues: null,
  gscIssuesLoading: false,
  gscIssuesError: null,
  redirects: [],

  // Fetch GSC indexing issues for a site
  fetchGscIssues: async (siteId) => {
    set({ gscIssuesLoading: true, gscIssuesError: null })
    try {
      const response = await api.get(`/.netlify/functions/seo-gsc-fix?siteId=${siteId}`)
      set({ 
        gscIssues: response.data.issues,
        redirects: response.data.redirects || [],
        gscIssuesLoading: false 
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ gscIssuesError: message, gscIssuesLoading: false })
      throw error
    }
  },

  // Apply a GSC fix
  applyGscFix: async (siteId, action, options = {}) => {
    try {
      const response = await api.post('/.netlify/functions/seo-gsc-fix', {
        siteId,
        action,
        ...options
      })
      // Refresh issues after applying fix
      await get().fetchGscIssues(siteId)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Create a redirect for a 404 page
  createRedirect: async (siteId, fromPath, toPath, reason = 'GSC 404 fix') => {
    return get().applyGscFix(siteId, 'create-redirect', {
      fix: { fromPath, toPath, reason }
    })
  },

  // Remove noindex from a page
  removeNoindex: async (siteId, url) => {
    return get().applyGscFix(siteId, 'remove-noindex', { url })
  },

  // Fix canonical URL
  fixCanonical: async (siteId, url, canonicalUrl) => {
    return get().applyGscFix(siteId, 'fix-canonical', {
      url,
      fix: { canonicalUrl }
    })
  },

  // Apply multiple fixes at once
  bulkApplyFixes: async (siteId, issues) => {
    return get().applyGscFix(siteId, 'bulk-fix', { issues })
  },

  // Generate fix suggestions
  generateFixSuggestions: async (siteId) => {
    const response = await api.post('/.netlify/functions/seo-gsc-fix', {
      siteId,
      action: 'generate-fixes'
    })
    return response.data.suggestions
  },

  // Manage redirects
  fetchRedirects: async (siteId) => {
    try {
      const response = await api.get(`/.netlify/functions/seo-redirects-api?siteId=${siteId}`)
      set({ redirects: response.data.redirects || [] })
      return response.data.redirects
    } catch (error) {
      throw error
    }
  },

  createRedirectDirect: async (siteId, fromPath, toPath, statusCode = 301, reason = '') => {
    const response = await api.post('/.netlify/functions/seo-redirects-api', {
      siteId,
      fromPath,
      toPath,
      statusCode,
      reason
    })
    await get().fetchRedirects(siteId)
    return response.data.redirect
  },

  deleteRedirect: async (id) => {
    await api.delete('/.netlify/functions/seo-redirects-api', {
      data: { id }
    })
    // Remove from local state
    set(state => ({
      redirects: state.redirects.filter(r => r.id !== id)
    }))
  },

  // ==================== REPORTS ====================
  reports: [],
  reportsLoading: false,
  reportsError: null,

  // Fetch report history
  fetchReports: async (siteId) => {
    set({ reportsLoading: true, reportsError: null })
    try {
      const response = await api.get(`/.netlify/functions/seo-reports?siteId=${siteId}`)
      set({ reports: response.data.reports || [], reportsLoading: false })
      return response.data.reports
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ reportsError: message, reportsLoading: false })
      throw error
    }
  },

  // Generate a new report
  generateReport: async (siteId, reportType = 'weekly', options = {}) => {
    set({ reportsLoading: true })
    try {
      const response = await api.post('/.netlify/functions/seo-reports', {
        siteId,
        reportType,
        period: options.period || '7d',
        recipients: options.recipients || [],
        sendEmail: options.sendEmail !== false
      })
      // Refresh reports list
      await get().fetchReports(siteId)
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ reportsError: message, reportsLoading: false })
      throw error
    }
  },

  // ==================== RANKING HISTORY ====================
  rankingHistory: [],
  rankingTrends: null,
  rankingHistoryLoading: false,

  // Fetch ranking history for a keyword
  fetchRankingHistory: async (siteId, keyword = null, options = {}) => {
    set({ rankingHistoryLoading: true })
    try {
      const params = new URLSearchParams({ siteId })
      if (keyword) params.append('keyword', keyword)
      if (options.startDate) params.append('startDate', options.startDate)
      if (options.endDate) params.append('endDate', options.endDate)
      if (options.limit) params.append('limit', options.limit)

      const response = await api.get(`/.netlify/functions/seo-ranking-history?${params}`)
      set({ 
        rankingHistory: response.data.history || [],
        rankingTrends: response.data.trends,
        rankingHistoryLoading: false 
      })
      return response.data
    } catch (error) {
      set({ rankingHistoryLoading: false })
      throw error
    }
  },

  // Archive current rankings (take a snapshot)
  archiveRankings: async (siteId) => {
    const response = await api.post('/.netlify/functions/seo-ranking-history', {
      siteId,
      action: 'snapshot'
    })
    return response.data
  },

  // Backfill ranking history from GSC
  backfillRankingHistory: async (siteId) => {
    const response = await api.post('/.netlify/functions/seo-ranking-history', {
      siteId,
      action: 'backfill-gsc'
    })
    return response.data
  },

  // ==================== CORE WEB VITALS ====================
  cwvHistory: [],
  cwvAggregates: null,
  cwvSummary: null,
  cwvLoading: false,

  // Fetch CWV history for a page or site
  fetchCwvHistory: async (siteId, options = {}) => {
    set({ cwvLoading: true })
    try {
      const params = new URLSearchParams({ siteId })
      if (options.pageId) params.append('pageId', options.pageId)
      if (options.url) params.append('url', options.url)
      if (options.device) params.append('device', options.device)
      if (options.days) params.append('days', options.days)

      const response = await api.get(`/.netlify/functions/seo-cwv?${params}`)
      set({ 
        cwvHistory: response.data.history || [],
        cwvAggregates: response.data.aggregates,
        cwvLoading: false 
      })
      return response.data
    } catch (error) {
      set({ cwvLoading: false })
      throw error
    }
  },

  // Run a CWV check for a single URL
  checkPageCwv: async (siteId, url, pageId = null, device = 'mobile') => {
    set({ cwvLoading: true })
    try {
      const response = await api.post('/.netlify/functions/seo-cwv', {
        siteId,
        pageId,
        url,
        device,
        action: 'check'
      })
      set({ cwvLoading: false })
      return response.data.result
    } catch (error) {
      set({ cwvLoading: false })
      throw error
    }
  },

  // Check all pages (batch)
  checkAllPagesCwv: async (siteId, device = 'mobile', limit = 10) => {
    set({ cwvLoading: true })
    try {
      const response = await api.post('/.netlify/functions/seo-cwv', {
        siteId,
        device,
        limit,
        action: 'check-all'
      })
      set({ cwvLoading: false })
      return response.data
    } catch (error) {
      set({ cwvLoading: false })
      throw error
    }
  },

  // Get site-wide CWV summary
  fetchCwvSummary: async (siteId) => {
    try {
      const response = await api.post('/.netlify/functions/seo-cwv', {
        siteId,
        action: 'summary'
      })
      set({ cwvSummary: response.data.summary })
      return response.data.summary
    } catch (error) {
      throw error
    }
  }
}))

// Selectors
export const selectSiteById = (state, id) => 
  state.sites.find(s => s.id === id)

export const selectOpenOpportunities = (state) => 
  state.opportunities.filter(o => o.status === 'open')

export const selectCriticalOpportunities = (state) =>
  state.opportunities.filter(o => o.status === 'open' && o.priority === 'critical')

export const selectStrikingDistanceQueries = (state) =>
  state.strikingQueries.filter(q => q.avgPosition28d >= 8 && q.avgPosition28d <= 20)

// AI Selectors
export const selectPendingRecommendations = (state) =>
  state.aiRecommendations.filter(r => r.status === 'pending')

export const selectHighImpactRecommendations = (state) =>
  state.aiRecommendations.filter(r => 
    r.status === 'pending' && (r.impact === 'high' || r.impact === 'critical')
  )

export const selectAutoFixableRecommendations = (state) =>
  state.aiRecommendations.filter(r => 
    r.status === 'pending' && r.auto_fixable === true
  )

export const selectRecommendationsByCategory = (state, category) =>
  state.aiRecommendations.filter(r => r.category === category)

export const selectAppliedRecommendations = (state) =>
  state.aiRecommendations.filter(r => r.status === 'applied')

export const selectIsSiteTrained = (state) =>
  state.aiTrainingStatus === 'complete' && state.siteKnowledge !== null

// ==================== SIGNAL ACCESS HOOK ====================
// Check if Signal (premium AI features) is enabled for the current site

export const useSignalAccess = () => {
  const currentSite = useSeoStore(state => state.currentSite)
  return currentSite?.signal_enabled ?? false
}

export const useSignalStatus = () => {
  const currentSite = useSeoStore(state => state.currentSite)
  
  if (!currentSite?.signal_enabled) {
    return { 
      enabled: false, 
      reason: 'not_subscribed',
      threadId: null,
      analysisCount: 0,
      lastAnalysis: null
    }
  }
  
  return {
    enabled: true,
    enabledAt: currentSite.signal_enabled_at,
    threadId: currentSite.signal_thread_id,
    analysisCount: currentSite.signal_analysis_count || 0,
    lastAnalysis: currentSite.signal_last_analysis_at
  }
}

// Signal-specific selectors
export const selectSignalRecommendations = (state) =>
  state.aiRecommendations.filter(r => r.status === 'pending')

export const selectSignalAutoFixable = (state) =>
  state.aiRecommendations.filter(r => 
    r.status === 'pending' && r.auto_fixable === true && r.confidence >= 0.8
  )

export const selectSignalHighConfidence = (state) =>
  state.aiRecommendations.filter(r => 
    r.status === 'pending' && r.confidence >= 0.9
  )

export const selectSignalWins = (state) =>
  state.aiRecommendations.filter(r => r.status === 'applied' && r.outcome === 'win')

export const selectSignalLosses = (state) =>
  state.aiRecommendations.filter(r => r.status === 'applied' && r.outcome === 'loss')
