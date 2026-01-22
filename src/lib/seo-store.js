// src/lib/seo-store.js
// Zustand store for SEO module state management
import { create } from 'zustand'
import { seoApi } from './portal-api'
import { signalSeoApi } from './signal-api'

export const useSeoStore = create((set, get) => ({
  // Sites
  projects: [],
  currentProject: null,
  projectsLoading: false,
  projectsError: null,

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
  // NOTE: With new architecture, projectId === projectId
  // The API returns the SEO overview directly (no .site wrapper)
  fetchProjectForOrg: async (projectId, createIfMissing = false) => {
    set({ projectsLoading: true, projectsError: null })
    try {
      const response = await seoApi.getProjectForOrg(projectId)
      const data = response.data || response
      
      // New API returns overview directly with projectId, domain, healthScore, etc.
      // Normalize to site-like object for backwards compatibility
      const site = data.site || {
        id: data.projectId || projectId,
        domain: data.domain,
        healthScore: data.healthScore,
        metrics: data.metrics,
        indexing: data.indexing,
        coreWebVitals: data.coreWebVitals,
        opportunities: data.opportunities,
        topPages: data.topPages,
        topQueries: data.topQueries,
        gscConnected: data.gscConnected,
        lastSyncAt: data.lastSyncAt,
        syncStatus: data.syncStatus,
      }
      
      if (site.id || site.domain) {
        set({ currentProject: site, projectsLoading: false })
        return site
      }
      
      set({ currentProject: null, projectsLoading: false })
      return null
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ projectsError: message, projectsLoading: false })
      return null
    }
  },

  fetchProjects: async (contactId = null) => {
    set({ projectsLoading: true, projectsError: null })
    try {
      const response = await seoApi.listSites({ contactId })
      const data = response.data || response
      set({ projects: data.sites || data || [], projectsLoading: false })
      return data.sites || data || []
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ projectsError: message, projectsLoading: false })
      throw error
    }
  },

  fetchProject: async (projectId) => {
    set({ projectsLoading: true, projectsError: null })
    try {
      const response = await seoApi.getProject(projectId)
      const data = response.data || response
      
      // New API returns overview directly (no .site wrapper)
      // Normalize to site-like object for backwards compatibility
      const siteData = data.site ? {
        ...data.site,
        stats: data.stats,
        topPages: data.topPages,
        strikingQueries: data.strikingQueries,
        recentOpportunities: data.opportunities,
        gscConnected: data.gscConnected,
        lastSyncAt: data.lastSyncAt,
        syncStatus: data.syncStatus,
      } : {
        id: data.projectId || projectId,
        domain: data.domain,
        healthScore: data.healthScore,
        metrics: data.metrics,
        indexing: data.indexing,
        coreWebVitals: data.coreWebVitals,
        opportunities: data.opportunities,
        topPages: data.topPages,
        topQueries: data.topQueries,
        strikingQueries: data.topQueries?.queries || [],
        recentOpportunities: data.opportunities?.topOpportunities || [],
        gscConnected: data.gscConnected,
        lastSyncAt: data.lastSyncAt,
        syncStatus: data.syncStatus,
      }
      
      set({ 
        currentProject: siteData,
        strikingQueries: siteData.strikingQueries || data.topQueries?.queries || [],
        projectsLoading: false 
      })
      return siteData
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ projectsError: message, projectsLoading: false })
      throw error
    }
  },

  // DEPRECATED: Projects ARE sites, use projectsApi to create projects
  createProject: async (siteData) => {
    console.warn('seoStore.createProject is deprecated. Projects are SEO sites (projectId === projectId)')
    // Just return the projectId as the site
    const projectId = siteData.project_id || siteData.projectId || siteData.org_id
    const site = { 
      id: projectId, 
      domain: siteData.domain,
      site_name: siteData.siteName || siteData.domain 
    }
    set(state => ({ projects: [site, ...state.projects] }))
    return site
  },

  selectSite: async (projectId) => {
    return get().fetchProject(projectId)
  },

  selectPage: async (pageId) => {
    return get().fetchPage(pageId)
  },

  // ==================== PAGES ====================

  fetchPages: async (projectId, options = {}) => {
    set({ pagesLoading: true, pagesError: null })
    try {
      const response = await seoApi.listPages(projectId, options)
      const data = response.data || response
      console.log('[SEO Store] fetchPages raw data:', data)
      
      const pages = Array.isArray(data?.pages) ? data.pages
                  : Array.isArray(data) ? data
                  : []
      
      console.log('[SEO Store] Setting pages to:', pages)
      
      set({ 
        pages: pages, 
        pagesPagination: data.pagination || {},
        pagesLoading: false 
      })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      console.error('[SEO Store] fetchPages error:', error)
      set({ pagesError: message, pagesLoading: false, pages: [] })
      throw error
    }
  },

  fetchPage: async (pageId) => {
    set({ pagesLoading: true, pagesError: null })
    try {
      // Note: API now only needs pageId (projectId is no longer needed for individual page fetch)
      const response = await seoApi.getPage(pageId)
      const data = response.data || response
      set({ 
        currentPage: data.page || data,
        queries: data.queries || [],
        pagesLoading: false 
      })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ pagesError: message, pagesLoading: false })
      throw error
    }
  },

  // Alias for fetchPage (used by SEOPageDetail with route params)
  fetchPageDetails: async (projectId, pageId) => {
    return get().fetchPage(pageId)
  },

  // ==================== CRAWLING ====================

  crawlSitemap: async (projectId, sitemapUrl = null) => {
    try {
      const response = await seoApi.crawlSitemap(projectId, { sitemapUrl })
      const data = response.data || response
      return data
    } catch (error) {
      throw error
    }
  },

  crawlPage: async (pageId) => {
    try {
      const state = get()
      const currentProject = state.currentProject
      const projectId = currentProject?.id
      
      // Find the page to get its URL
      const page = state.pages.find(p => p.id === pageId) || state.currentPage
      if (!page?.url) {
        throw new Error('Page URL not found')
      }
      
      const response = await seoApi.crawlPage(projectId, page.url)
      const data = response.data || response
      
      // Update the page in the local state
      set(state => ({
        pages: state.pages.map(p => 
          p.id === pageId 
            ? { ...p, ...data.data, lastCrawled: new Date().toISOString() }
            : p
        )
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },

  // ==================== OPPORTUNITIES ====================

  fetchOpportunities: async (projectId, options = {}) => {
    set({ opportunitiesLoading: true, opportunitiesError: null })
    try {
      const response = await seoApi.getOpportunities(projectId, options)
      const data = response.data || response
      set({ 
        opportunities: data.opportunities || data || [],
        opportunitiesSummary: data.summary,
        opportunitiesPagination: data.pagination || {},
        opportunitiesLoading: false 
      })
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ opportunitiesError: message, opportunitiesLoading: false })
      throw error
    }
  },

  detectOpportunities: async (projectId, pageId = null) => {
    try {
      const response = await seoApi.detectOpportunities(projectId, { pageId })
      const data = response.data || response
      return data
    } catch (error) {
      throw error
    }
  },

  updateOpportunity: async (id, updates) => {
    try {
      const response = await seoApi.updateOpportunity(id, updates)
      const data = response.data || response
      
      // Update local state
      set(state => ({
        opportunities: state.opportunities.map(o =>
          o.id === id ? { ...o, ...updates } : o
        )
      }))
      
      return data
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
  fetchGscOverview: async (projectIdOrDomain, domainParam = null) => {
    set({ gscLoading: true, gscError: null })
    try {
      // Support both old and new signatures
      let projectId, domain
      if (domainParam) {
        // New signature: fetchGscOverview(projectId, domain)
        projectId = projectIdOrDomain
        domain = domainParam
      } else {
        // Old signature: fetchGscOverview(domain) - get projectId from state
        domain = projectIdOrDomain
        const currentProject = get().currentProject
        projectId = currentProject?.id
      }
      
      if (!projectId) {
        throw new Error('Project ID is required')
      }
      
      const response = await seoApi.getGscOverview(projectId, { domain })
      const data = response.data || response
      set({ gscOverview: data, gscLoading: false })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ gscError: message, gscLoading: false })
      console.error('[GSC] Overview error:', message)
      return null
    }
  },

  // Fetch top search queries from GSC
  fetchGscQueries: async (projectIdOrDomain, domainOrOptions = null, optionsParam = {}) => {
    set({ gscLoading: true, gscError: null })
    try {
      // Support both old and new signatures
      let projectId, domain, options
      if (typeof domainOrOptions === 'string') {
        // New signature: fetchGscQueries(projectId, domain, options)
        projectId = projectIdOrDomain
        domain = domainOrOptions
        options = optionsParam
      } else {
        // Old signature: fetchGscQueries(domain, options) - get projectId from state
        domain = projectIdOrDomain
        options = domainOrOptions || {}
        const currentProject = get().currentProject
        projectId = currentProject?.id
      }
      
      if (!projectId) {
        throw new Error('Project ID is required')
      }
      
      const response = await seoApi.getGscQueries(projectId, { domain, ...options })
      const data = response.data || response
      set({ gscQueries: data.queries || data || [], gscLoading: false })
      return data.queries || data || []
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ gscError: message, gscLoading: false })
      console.error('[GSC] Queries error:', message)
      return []
    }
  },

  // Fetch page performance from GSC
  fetchGscPages: async (projectIdOrDomain, domainOrOptions = null, optionsParam = {}) => {
    set({ gscLoading: true, gscError: null })
    try {
      // Support both old and new signatures
      let projectId, domain, options
      if (typeof domainOrOptions === 'string') {
        // New signature: fetchGscPages(projectId, domain, options)
        projectId = projectIdOrDomain
        domain = domainOrOptions
        options = optionsParam
      } else {
        // Old signature: fetchGscPages(domain, options) - get projectId from state
        domain = projectIdOrDomain
        options = domainOrOptions || {}
        const currentProject = get().currentProject
        projectId = currentProject?.id
      }
      
      if (!projectId) {
        throw new Error('Project ID is required')
      }
      
      const response = await seoApi.getGscPages(projectId, { domain, ...options })
      const data = response.data || response
      set({ gscPages: data.pages || data || [], gscLoading: false })
      return data.pages || data || []
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

  // Train AI on site content - builds knowledge base (SIGNAL AI)
  trainSite: async (projectId) => {
    set({ siteKnowledgeLoading: true, aiTrainingStatus: 'training' })
    try {
      const data = await signalSeoApi.trainSite(projectId)
      set({ 
        siteKnowledge: data.knowledge || data,
        siteKnowledgeLoading: false,
        aiTrainingStatus: 'complete'
      })
      return data
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
  fetchProjectKnowledge: async (projectId) => {
    set({ siteKnowledgeLoading: true })
    try {
      const data = await signalSeoApi.getProjectKnowledge(projectId)
      set({ 
        siteKnowledge: data.knowledge || data,
        siteKnowledgeLoading: false,
        aiTrainingStatus: data.knowledge || data ? 'complete' : 'idle'
      })
      return data.knowledge || data
    } catch (error) {
      set({ siteKnowledgeLoading: false })
      return null
    }
  },

  // Run AI Brain analysis - generates comprehensive recommendations
  runAiBrain: async (projectId, options = {}) => {
    set({ aiAnalysisInProgress: true, aiRecommendationsError: null })
    try {
      const data = await signalSeoApi.runAiBrain(projectId, {
        analysisType: options.analysisType || 'comprehensive',
        focusAreas: options.focusAreas || [],
        pageIds: options.pageIds || []
      })
      
      // Merge new recommendations with existing
      set(state => ({
        aiRecommendations: data.recommendations || [],
        aiAnalysisInProgress: false
      }))
      
      return data
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
  fetchSignalLearning: async (projectId, period = '30d') => {
    set({ signalLearningLoading: true })
    try {
      const data = await signalSeoApi.getSignalLearning(projectId, { period })
      set({ 
        signalLearning: data,
        signalLearningLoading: false
      })
      return data
    } catch (error) {
      set({ signalLearningLoading: false })
      throw error
    }
  },
  
  // Apply all auto-fixable recommendations
  applySignalAutoFixes: async (projectId, recommendationIds = null) => {
    try {
      const data = await signalSeoApi.applySignalAutoFixes(projectId, { recommendationIds, safeOnly: true })
      
      // Refresh recommendations after applying
      await get().fetchAiRecommendations(projectId)
      
      return data
    } catch (error) {
      throw error
    }
  },
  
  // Get Signal suggestions for a specific page
  // Now requires projectId and pageUrl instead of just pageId
  getSignalSuggestions: async (pageId, field = 'all') => {
    try {
      // Get page URL from state
      const page = get().pages.find(p => p.id === pageId) || get().currentPage
      const projectId = get().currentProject?.id
      
      if (!projectId || !page?.url) {
        console.warn('getSignalSuggestions: Missing projectId or page URL')
        return []
      }
      
      const data = await signalSeoApi.getSignalSuggestions(projectId, page.url, { field })
      return data.suggestions || data || []
    } catch (error) {
      throw error
    }
  },
  
  // Update page metadata (title, description, schema) - CRUD operation, uses portal API
  updatePageMetadata: async (pageId, updates) => {
    try {
      // API now only needs pageId (projectId is no longer needed for individual page updates)
      const data = await seoApi.updatePageMetadata(pageId, updates)
      
      // Update local state
      set(state => ({
        pages: state.pages.map(p => 
          p.id === pageId ? { ...p, ...updates } : p
        ),
        currentPage: state.currentPage?.id === pageId 
          ? { ...state.currentPage, ...updates } 
          : state.currentPage
      }))
      
      return data.page || data
    } catch (error) {
      throw error
    }
  },

  // Fetch existing AI recommendations
  // Tries Signal API first (AI-powered), falls back to Portal API (rule-based) 
  fetchAiRecommendations: async (projectId, options = {}) => {
    set({ aiRecommendationsLoading: true, aiRecommendationsError: null })
    try {
      // Try Signal API first (AI-powered recommendations)
      const data = await signalSeoApi.getAiRecommendations(projectId, options)
      set({ 
        aiRecommendations: data.recommendations || data || [],
        aiRecommendationsLoading: false
      })
      return data.recommendations || data || []
    } catch (error) {
      // If Signal fails (access denied or unavailable), try Portal API for rule-based recommendations
      try {
        const portalData = await seoApi.getAiRecommendations(projectId, options)
        const recommendations = portalData.data?.data || portalData.data || []
        set({ 
          aiRecommendations: recommendations,
          aiRecommendationsLoading: false
        })
        return recommendations
      } catch (portalError) {
        const message = portalError.response?.data?.error || portalError.message || 'Failed to fetch recommendations'
        set({ aiRecommendationsError: message, aiRecommendationsLoading: false })
        return []
      }
    }
  },

  // Generate new rule-based recommendations (Portal API)
  generateRecommendations: async (projectId) => {
    set({ aiRecommendationsLoading: true, aiRecommendationsError: null })
    try {
      const result = await seoApi.generateRecommendations(projectId)
      const recommendations = result.data?.data || result.data || []
      set({ 
        aiRecommendations: recommendations,
        aiRecommendationsLoading: false
      })
      return recommendations
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ aiRecommendationsError: message, aiRecommendationsLoading: false })
      throw error
    }
  },

  // Apply a single AI recommendation (uses Portal API)
  applyRecommendation: async (recommendationId) => {
    try {
      const currentProject = get().currentProject
      const projectId = currentProject?.id
      const data = await seoApi.applyRecommendation(projectId, recommendationId)
      
      // Update local state
      set(state => ({
        aiRecommendations: state.aiRecommendations.map(r =>
          r.id === recommendationId 
            ? { ...r, status: 'applied', applied_at: new Date().toISOString() }
            : r
        )
      }))
      
      return data.data || data
    } catch (error) {
      throw error
    }
  },

  // Batch apply multiple recommendations (uses Portal API)
  applyRecommendations: async (recommendationIds) => {
    try {
      const currentProject = get().currentProject
      const projectId = currentProject?.id
      const data = await seoApi.applyRecommendations(projectId, recommendationIds)
      
      // Update local state for all applied
      const result = data.data || data
      const appliedIds = (result.results?.applied || result.applied || []).map(r => r.id || r)
      set(state => ({
        aiRecommendations: state.aiRecommendations.map(r =>
          appliedIds.includes(r.id)
            ? { ...r, status: 'applied', applied_at: new Date().toISOString() }
            : r
        )
      }))
      
      return result
    } catch (error) {
      throw error
    }
  },

  // Dismiss a recommendation (uses Portal API)
  dismissRecommendation: async (recommendationId, reason = null) => {
    try {
      const data = await seoApi.dismissRecommendation(null, recommendationId, reason)
      
      set(state => ({
        aiRecommendations: state.aiRecommendations.map(r =>
          r.id === recommendationId 
            ? { ...r, status: 'dismissed', dismissed_at: new Date().toISOString() }
            : r
        )
      }))
      
      return data.data || data
    } catch (error) {
      throw error
    }
  },

  // Analyze a single page with AI
  // Now requires projectId and url instead of just pageId
  analyzePageWithAi: async (pageId) => {
    try {
      // Get page URL and projectId from state
      const page = get().pages.find(p => p.id === pageId) || get().currentPage
      const projectId = get().currentProject?.id
      
      if (!projectId || !page?.url) {
        throw new Error('Missing projectId or page URL for AI analysis')
      }
      
      const data = await signalSeoApi.analyzePageWithAi(projectId, page.url)
      return data
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
  fetchTrackedKeywords: async (projectId, options = {}) => {
    set({ keywordsLoading: true })
    try {
      const data = await seoApi.listKeywords(projectId, options)
      console.log('[SEO Store] fetchTrackedKeywords raw data:', data)
      
      // API returns {queries: [], total, page, ...} structure
      const keywords = Array.isArray(data?.queries) ? data.queries 
                     : Array.isArray(data?.keywords) ? data.keywords
                     : Array.isArray(data) ? data 
                     : []
      
      console.log('[SEO Store] Setting trackedKeywords to:', keywords)
      
      set({ 
        trackedKeywords: keywords,
        keywordsSummary: data.summary,
        keywordsLoading: false
      })
      return data
    } catch (error) {
      console.error('[SEO Store] fetchTrackedKeywords error:', error)
      set({ keywordsLoading: false, trackedKeywords: [] })
      throw error
    }
  },

  // Add keywords to track
  trackKeywords: async (projectId, keywords) => {
    try {
      const data = await seoApi.addKeywords(projectId, keywords)
      // Refresh the list
      await get().fetchTrackedKeywords(projectId)
      return data
    } catch (error) {
      throw error
    }
  },

  // Auto-discover and track top keywords
  autoDiscoverKeywords: async (projectId) => {
    try {
      const data = await seoApi.autoDiscoverKeywords(projectId)
      await get().fetchTrackedKeywords(projectId)
      return data
    } catch (error) {
      throw error
    }
  },

  // Refresh all keyword rankings
  refreshKeywordRankings: async (projectId) => {
    try {
      const data = await seoApi.refreshKeywordRankings(projectId)
      await get().fetchTrackedKeywords(projectId)
      return data
    } catch (error) {
      throw error
    }
  },

  // ==================== COMPETITORS ====================

  // Competitor state
  competitors: [],
  competitorsLoading: false,

  // Fetch competitors
  fetchCompetitors: async (projectId) => {
    set({ competitorsLoading: true })
    try {
      const data = await seoApi.getCompetitors(projectId)
      set({ 
        competitors: data.competitors || data || [],
        competitorsLoading: false
      })
      return data.competitors || data
    } catch (error) {
      set({ competitorsLoading: false })
      throw error
    }
  },

  // Analyze a competitor (AI-powered, uses Signal API)
  analyzeCompetitor: async (projectId, competitorDomain) => {
    try {
      const data = await signalSeoApi.analyzeCompetitorWithAi(projectId, competitorDomain)
      // Refresh competitors list
      await get().fetchCompetitors(projectId)
      return data
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
  fetchContentBriefs: async (projectId, options = {}) => {
    set({ briefsLoading: true })
    try {
      const data = await seoApi.getContentBriefs(projectId, options)
      set({ 
        contentBriefs: data.briefs || data || [],
        briefsLoading: false
      })
      return data.briefs || data
    } catch (error) {
      set({ briefsLoading: false })
      throw error
    }
  },

  // Generate a content brief
  // Generate content brief (AI-powered, uses Signal API)
  generateContentBrief: async (projectId, targetKeyword, contentType = 'blog', additionalContext = '') => {
    try {
      const data = await signalSeoApi.generateContentBrief(projectId, {
        targetKeyword,
        contentType,
        additionalContext
      })
      set({ currentBrief: data.brief || data })
      // Refresh briefs list
      await get().fetchContentBriefs(projectId)
      return data
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
  fetchAlerts: async (projectId, options = {}) => {
    set({ alertsLoading: true })
    try {
      const data = await seoApi.getAlerts(projectId, options)
      set({ 
        alerts: data.alerts || data || [],
        alertsStats: data.stats,
        alertsLoading: false
      })
      return data
    } catch (error) {
      set({ alertsLoading: false })
      throw error
    }
  },

  // Check for new alerts
  checkAlerts: async (projectId, sendNotifications = false) => {
    try {
      const data = await seoApi.checkAlerts(projectId, { sendNotifications })
      // Refresh alerts
      await get().fetchAlerts(projectId)
      return data
    } catch (error) {
      throw error
    }
  },

  // Acknowledge an alert
  acknowledgeAlert: async (alertId) => {
    try {
      const data = await seoApi.acknowledgeAlert(alertId)
      set(state => ({
        alerts: state.alerts.map(a =>
          a.id === alertId ? { ...a, status: 'acknowledged' } : a
        )
      }))
      return data
    } catch (error) {
      throw error
    }
  },

  // Resolve an alert
  resolveAlert: async (alertId, notes = '') => {
    try {
      const data = await seoApi.resolveAlert(alertId, { notes })
      set(state => ({
        alerts: state.alerts.map(a =>
          a.id === alertId ? { ...a, status: 'resolved' } : a
        )
      }))
      return data
    } catch (error) {
      throw error
    }
  },

  // ==================== SERP FEATURES ====================

  // SERP features state
  serpFeatures: null,
  serpFeaturesLoading: false,

  // Fetch SERP feature analysis
  fetchSerpFeatures: async (projectId) => {
    set({ serpFeaturesLoading: true })
    try {
      const data = await seoApi.getSerpFeatures(projectId)
      set({ 
        serpFeatures: data,
        serpFeaturesLoading: false
      })
      return data
    } catch (error) {
      set({ serpFeaturesLoading: false })
      throw error
    }
  },

  // Analyze SERP features for keywords
  analyzeSerpFeatures: async (projectId, keywords = []) => {
    try {
      const data = await seoApi.analyzeSerpFeatures(projectId, { keywords })
      set({ serpFeatures: data })
      return data
    } catch (error) {
      throw error
    }
  },

  // ==================== LOCAL SEO ====================

  // Local SEO state
  localSeoAnalysis: null,
  localSeoLoading: false,
  
  // Local SEO Grid & Heat Map state
  localGrids: [],
  localGridsLoading: false,
  heatMapData: [],
  
  // Entity Health state
  entityScore: null,
  entityScoreLoading: false,
  
  // Geo Pages state
  geoPages: [],
  geoPagesLoading: false,
  geoPagesSummary: null,
  
  // Citations state
  citations: [],
  citationsLoading: false,
  citationsSummary: null,
  canonicalNap: null,

  // GBP Connection state
  gbpConnection: null,
  gbpLoading: false,

  // Fetch local grids for heat map
  fetchLocalGrids: async (projectId) => {
    set({ localGridsLoading: true })
    try {
      const response = await seoApi.getLocalGrids(projectId)
      const data = response.data || response
      set({ localGrids: data.grids || [], localGridsLoading: false })
      return data.grids || []
    } catch (error) {
      set({ localGridsLoading: false })
      console.error('Failed to fetch local grids:', error)
      throw error
    }
  },

  // Fetch heat map data for a specific grid
  fetchHeatMapData: async (gridId, keyword = null) => {
    try {
      const params = keyword ? { keyword } : {}
      const response = await seoApi.getHeatMapData(gridId, params)
      const data = response.data || response
      set({ heatMapData: data.data || [] })
      return data.data || []
    } catch (error) {
      console.error('Failed to fetch heat map data:', error)
      throw error
    }
  },

  // Create a new local grid
  createLocalGrid: async (projectId, gridData) => {
    try {
      const response = await seoApi.createLocalGrid(projectId, gridData)
      const newGrid = response.data || response
      set(state => ({ localGrids: [...state.localGrids, newGrid] }))
      return newGrid
    } catch (error) {
      console.error('Failed to create local grid:', error)
      throw error
    }
  },

  // Update a local grid
  updateLocalGrid: async (gridId, gridData) => {
    try {
      const response = await seoApi.updateLocalGrid(gridId, gridData)
      const updatedGrid = response.data || response
      set(state => ({
        localGrids: state.localGrids.map(g => g.id === gridId ? updatedGrid : g)
      }))
      return updatedGrid
    } catch (error) {
      console.error('Failed to update local grid:', error)
      throw error
    }
  },

  // Delete a local grid
  deleteLocalGrid: async (gridId) => {
    try {
      await seoApi.deleteLocalGrid(gridId)
      set(state => ({
        localGrids: state.localGrids.filter(g => g.id !== gridId)
      }))
      return { deleted: true }
    } catch (error) {
      console.error('Failed to delete local grid:', error)
      throw error
    }
  },

  // Fetch entity health score
  fetchEntityScore: async (projectId) => {
    set({ entityScoreLoading: true })
    try {
      const response = await seoApi.getEntityScore(projectId)
      const data = response.data || response
      set({ entityScore: data, entityScoreLoading: false })
      return data
    } catch (error) {
      set({ entityScoreLoading: false })
      // Might be 404 if no score yet, don't throw
      if (error.response?.status === 404) {
        set({ entityScore: null })
        return null
      }
      console.error('Failed to fetch entity score:', error)
      throw error
    }
  },

  // Request fresh entity health analysis from Signal AI
  refreshEntityScore: async (projectId) => {
    try {
      // Call Signal AI for local SEO analysis
      const aiAnalysis = await signalSeoApi.analyzeLocalSeo(projectId)
      
      // Save the result to the database via Portal API
      const saved = await seoApi.saveEntityScore(projectId, {
        overall_score: aiAnalysis.overallScore || 80,
        gbp_health: aiAnalysis.gbpOptimization?.length > 3 ? 70 : 90,
        local_authority: 75,
        citation_consistency: 80,
        review_velocity: 70,
        recommendations: aiAnalysis.priorityActions || [],
        details: aiAnalysis,
      })
      
      const data = saved.data || saved
      set({ entityScore: data })
      return data
    } catch (error) {
      console.error('Failed to refresh entity score:', error)
      throw error
    }
  },

  // Fetch geo pages
  fetchGeoPages: async (projectId) => {
    set({ geoPagesLoading: true })
    try {
      const response = await seoApi.getLocalPages(projectId)
      const data = response.data || response
      set({ 
        geoPages: data.pages || [], 
        geoPagesSummary: data.summary || null,
        geoPagesLoading: false 
      })
      return data.pages || []
    } catch (error) {
      set({ geoPagesLoading: false })
      console.error('Failed to fetch geo pages:', error)
      throw error
    }
  },

  // Create a geo page
  createGeoPage: async (projectId, pageData) => {
    try {
      const response = await seoApi.createLocalPage(projectId, pageData)
      const newPage = response.data || response
      set(state => ({ geoPages: [...state.geoPages, newPage] }))
      return newPage
    } catch (error) {
      console.error('Failed to create geo page:', error)
      throw error
    }
  },

  // Update a geo page
  updateGeoPage: async (pageId, pageData) => {
    try {
      const response = await seoApi.updateLocalPage(pageId, pageData)
      const updatedPage = response.data || response
      set(state => ({
        geoPages: state.geoPages.map(p => p.id === pageId ? updatedPage : p)
      }))
      return updatedPage
    } catch (error) {
      console.error('Failed to update geo page:', error)
      throw error
    }
  },

  // Delete a geo page
  deleteGeoPage: async (pageId) => {
    try {
      await seoApi.deleteLocalPage(pageId)
      set(state => ({
        geoPages: state.geoPages.filter(p => p.id !== pageId)
      }))
      return { deleted: true }
    } catch (error) {
      console.error('Failed to delete geo page:', error)
      throw error
    }
  },

  // Fetch citations
  fetchCitations: async (projectId) => {
    set({ citationsLoading: true })
    try {
      // Fetch citations and GBP connection in parallel
      const [citationsRes, gbpRes] = await Promise.all([
        seoApi.getCitations(projectId),
        seoApi.getGbpConnection(projectId).catch(() => null)
      ])
      
      const citationsData = citationsRes.data || citationsRes
      const gbp = gbpRes?.data || gbpRes
      
      set({ 
        citations: citationsData.citations || [], 
        citationsSummary: citationsData.summary || null,
        canonicalNap: gbp ? {
          name: gbp.business_name || gbp.businessName,
          address: gbp.address?.formatted || gbp.address,
          phone: gbp.phone
        } : null,
        gbpConnection: gbp,
        citationsLoading: false 
      })
      return citationsData.citations || []
    } catch (error) {
      set({ citationsLoading: false })
      console.error('Failed to fetch citations:', error)
      throw error
    }
  },

  // Create a citation
  createCitation: async (projectId, citationData) => {
    try {
      const response = await seoApi.createCitation(projectId, citationData)
      const newCitation = response.data || response
      set(state => ({ citations: [...state.citations, newCitation] }))
      return newCitation
    } catch (error) {
      console.error('Failed to create citation:', error)
      throw error
    }
  },

  // Update a citation
  updateCitation: async (citationId, citationData) => {
    try {
      const response = await seoApi.updateCitation(citationId, citationData)
      const updatedCitation = response.data || response
      set(state => ({
        citations: state.citations.map(c => c.id === citationId ? updatedCitation : c)
      }))
      return updatedCitation
    } catch (error) {
      console.error('Failed to update citation:', error)
      throw error
    }
  },

  // Delete a citation
  deleteCitation: async (citationId) => {
    try {
      await seoApi.deleteCitation(citationId)
      set(state => ({
        citations: state.citations.filter(c => c.id !== citationId)
      }))
      return { deleted: true }
    } catch (error) {
      console.error('Failed to delete citation:', error)
      throw error
    }
  },

  // Check citation NAP consistency
  checkCitation: async (citationId, canonicalNap) => {
    try {
      const response = await seoApi.checkCitation(citationId, canonicalNap)
      const updatedCitation = response.data || response
      set(state => ({
        citations: state.citations.map(c => c.id === citationId ? updatedCitation : c)
      }))
      return updatedCitation
    } catch (error) {
      console.error('Failed to check citation:', error)
      throw error
    }
  },

  // Fetch GBP connection
  fetchGbpConnection: async (projectId) => {
    set({ gbpLoading: true })
    try {
      const response = await seoApi.getGbpConnection(projectId)
      const data = response.data || response
      set({ 
        gbpConnection: data, 
        canonicalNap: data ? {
          name: data.business_name || data.businessName,
          address: data.address?.formatted || data.address,
          phone: data.phone
        } : null,
        gbpLoading: false 
      })
      return data
    } catch (error) {
      set({ gbpLoading: false, gbpConnection: null })
      if (error.response?.status === 404) {
        return null
      }
      console.error('Failed to fetch GBP connection:', error)
      throw error
    }
  },

  // Create GBP connection
  createGbpConnection: async (projectId, gbpData) => {
    try {
      const response = await seoApi.createGbpConnection(projectId, gbpData)
      const data = response.data || response
      set({ 
        gbpConnection: data,
        canonicalNap: {
          name: data.business_name || data.businessName,
          address: data.address?.formatted || data.address,
          phone: data.phone
        }
      })
      return data
    } catch (error) {
      console.error('Failed to create GBP connection:', error)
      throw error
    }
  },

  // Update GBP connection
  updateGbpConnection: async (projectId, gbpData) => {
    try {
      const response = await seoApi.updateGbpConnection(projectId, gbpData)
      const data = response.data || response
      set({ 
        gbpConnection: data,
        canonicalNap: {
          name: data.business_name || data.businessName,
          address: data.address?.formatted || data.address,
          phone: data.phone
        }
      })
      return data
    } catch (error) {
      console.error('Failed to update GBP connection:', error)
      throw error
    }
  },

  // Delete GBP connection
  deleteGbpConnection: async (projectId) => {
    try {
      await seoApi.deleteGbpConnection(projectId)
      set({ gbpConnection: null, canonicalNap: null })
      return { deleted: true }
    } catch (error) {
      console.error('Failed to delete GBP connection:', error)
      throw error
    }
  },

  // Fetch local SEO analysis (legacy)
  fetchLocalSeoAnalysis: async (projectId) => {
    set({ localSeoLoading: true })
    try {
      const response = await seoApi.getLocalSeoAnalysis(projectId)
      const data = response.data || response
      set({ 
        localSeoAnalysis: data,
        localSeoLoading: false
      })
      return data
    } catch (error) {
      set({ localSeoLoading: false })
      throw error
    }
  },

  // Run local SEO analysis
  analyzeLocalSeo: async (projectId, businessInfo = {}) => {
    try {
      const response = await seoApi.analyzeLocalSeo(projectId, businessInfo)
      const data = response.data || response
      set({ localSeoAnalysis: data })
      return data
    } catch (error) {
      throw error
    }
  },

  // ==================== INTERNAL LINKS ====================

  // Internal links state
  internalLinksAnalysis: null,
  internalLinksLoading: false,

  // Fetch internal links analysis
  fetchInternalLinksAnalysis: async (projectId) => {
    set({ internalLinksLoading: true })
    try {
      const data = await seoApi.getInternalLinksAnalysis(projectId)
      set({ 
        internalLinksAnalysis: data,
        internalLinksLoading: false
      })
      return data
    } catch (error) {
      set({ internalLinksLoading: false })
      throw error
    }
  },

  // Run internal links analysis
  analyzeInternalLinks: async (projectId) => {
    try {
      const data = await seoApi.analyzeInternalLinks(projectId)
      set({ internalLinksAnalysis: data })
      return data
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
  fetchSchemaStatus: async (projectId) => {
    set({ schemaLoading: true })
    try {
      const data = await seoApi.getSchemaStatus(projectId)
      set({ 
        schemaStatus: data,
        schemaLoading: false
      })
      return data
    } catch (error) {
      set({ schemaLoading: false })
      throw error
    }
  },

  // Generate schema for a page
  generateSchema: async (projectId, pageId, pageType = 'auto', additionalData = {}) => {
    try {
      const data = await seoApi.generateSchema(projectId, { pageId, pageType, additionalData })
      set({ generatedSchema: data })
      return data
    } catch (error) {
      throw error
    }
  },

  // ==================== TECHNICAL AUDIT ====================

  // Technical audit state
  technicalAudit: null,
  technicalAuditLoading: false,

  // Fetch latest technical audit
  fetchTechnicalAudit: async (projectId) => {
    set({ technicalAuditLoading: true })
    try {
      const data = await seoApi.getTechnicalAudit(projectId)
      set({ 
        technicalAudit: data,
        technicalAuditLoading: false
      })
      return data
    } catch (error) {
      set({ technicalAuditLoading: false })
      throw error
    }
  },

  // Run technical audit (background function)
  runTechnicalAudit: async (projectId) => {
    set({ technicalAuditLoading: true })
    try {
      const data = await seoApi.runTechnicalAudit(projectId)
      // Background function returns immediately, poll for results
      return data
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
  fetchContentDecay: async (projectId) => {
    set({ decayLoading: true })
    try {
      const data = await seoApi.getContentDecay(projectId)
      set({ 
        decayingContent: data.decayingPages || data || [],
        decaySummary: data.summary,
        decayLoading: false
      })
      return data
    } catch (error) {
      set({ decayLoading: false })
      throw error
    }
  },

  // Run content decay detection
  detectContentDecay: async (projectId, thresholds = {}) => {
    try {
      const data = await seoApi.detectContentDecay(projectId, thresholds)
      set({ 
        decayingContent: data.decayingPages || data || [],
        decaySummary: data.summary
      })
      return data
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
  fetchBacklinkOpportunities: async (projectId, options = {}) => {
    set({ backlinksLoading: true })
    try {
      const data = await seoApi.getBacklinkOpportunities(projectId, options)
      console.log('[SEO Store] fetchBacklinkOpportunities raw data:', data)
      
      const opportunities = Array.isArray(data?.opportunities) ? data.opportunities
                         : Array.isArray(data) ? data
                         : []
      
      console.log('[SEO Store] Setting backlinkOpportunities to:', opportunities)
      
      set({ 
        backlinkOpportunities: opportunities,
        backlinksSummary: data.summary,
        backlinksLoading: false
      })
      return data
    } catch (error) {
      console.error('[SEO Store] fetchBacklinkOpportunities error:', error)
      set({ backlinksLoading: false, backlinkOpportunities: [] })
      throw error
    }
  },

  // Discover new backlink opportunities
  discoverBacklinks: async (projectId) => {
    try {
      const data = await seoApi.discoverBacklinks(projectId, { analysisType: 'comprehensive' })
      
      const opportunities = Array.isArray(data?.opportunities) ? data.opportunities
                         : Array.isArray(data) ? data
                         : []
      
      set({ 
        backlinkOpportunities: opportunities,
        backlinksSummary: data.summary
      })
      return data
    } catch (error) {
      console.error('[SEO Store] discoverBacklinks error:', error)
      set({ backlinkOpportunities: [] })
      throw error
    }
  },

  // Update backlink opportunity status
  updateBacklinkOpportunity: async (opportunityId, status, notes = '') => {
    try {
      const data = await seoApi.updateBacklinkOpportunity(opportunityId, { status, notes })
      set(state => ({
        backlinkOpportunities: state.backlinkOpportunities.map(o =>
          o.id === opportunityId ? { ...o, status } : o
        )
      }))
      return data
    } catch (error) {
      throw error
    }
  },

  // ==================== MASTER AUTOMATION ====================

  // Run all automated optimizations
  runAutoOptimize: async (projectId) => {
    try {
      const data = await seoApi.runAutoOptimize(projectId)
      return data
    } catch (error) {
      throw error
    }
  },

  // Schedule recurring analysis
  scheduleAnalysis: async (projectId, schedule = 'weekly') => {
    try {
      const data = await seoApi.scheduleAnalysis(projectId, { schedule })
      return data
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
  fetchIndexingStatus: async (projectId) => {
    set({ indexingLoading: true, indexingError: null })
    try {
      const data = await seoApi.getIndexingStatus(projectId)
      set({ indexingStatus: data, indexingLoading: false })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ indexingError: message, indexingLoading: false })
      throw error
    }
  },

  // Fetch sitemaps status from GSC
  fetchProjectmapsStatus: async (projectId) => {
    try {
      const data = await seoApi.getProjectmapsStatus(projectId)
      return data
    } catch (error) {
      throw error
    }
  },

  // Inspect a single URL
  inspectUrl: async (projectId, url) => {
    set({ indexingLoading: true })
    try {
      const data = await seoApi.inspectUrl(projectId, { url })
      set({ indexingLoading: false })
      return data
    } catch (error) {
      set({ indexingLoading: false })
      throw error
    }
  },

  // Bulk inspect multiple URLs
  bulkInspectUrls: async (projectId, urls) => {
    set({ indexingLoading: true })
    try {
      const data = await seoApi.bulkInspectUrls(projectId, { urls })
      set({ indexingLoading: false })
      return data
    } catch (error) {
      set({ indexingLoading: false })
      throw error
    }
  },

  // Analyze all pages for indexing issues
  analyzeIndexingIssues: async (projectId) => {
    set({ indexingLoading: true, indexingError: null })
    try {
      const data = await seoApi.analyzeIndexingIssues(projectId)
      set({ indexingStatus: data, indexingLoading: false })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ indexingError: message, indexingLoading: false })
      throw error
    }
  },

  // ==================== UTILITIES ====================

  clearCurrentSite: () => {
    set({ 
      currentProject: null, 
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

  // Get AI-powered topic recommendations based on SEO intelligence (Signal AI)
  fetchBlogTopicRecommendations: async (projectId, options = {}) => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const data = await signalSeoApi.getBlogAiSuggestions(projectId, {
        action: 'recommend-topics',
        ...options
      })
      set({ 
        blogTopicRecommendations: data.recommendations?.topics || data.topics || [],
        blogBrainLoading: false 
      })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Analyze a blog post for SEO and style issues (Signal AI)
  analyzeBlogPost: async (postId, projectId = null) => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const data = await signalSeoApi.getBlogAiSuggestions(projectId, {
        action: 'analyze-post',
        postId
      })
      set({ 
        blogPostAnalysis: data,
        blogBrainLoading: false 
      })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Generate optimized content for a section (Signal AI)
  generateBlogContent: async (options, projectId = null) => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const data = await signalSeoApi.getBlogAiSuggestions(projectId, {
        action: 'generate-content',
        ...options
      })
      set({ blogBrainLoading: false })
      return data.content || data
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
      const data = await seoApi.analyzeAllBlogPosts()
      set({ blogBrainLoading: false })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Fix em dashes in a single post
  fixBlogPostEmDashes: async (postId) => {
    try {
      const data = await seoApi.fixBlogPostEmDashes(postId)
      return data
    } catch (error) {
      throw error
    }
  },

  // Fix em dashes in all posts
  fixAllBlogPostEmDashes: async () => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const data = await seoApi.fixAllBlogPostEmDashes()
      set({ blogBrainLoading: false })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ blogBrainError: message, blogBrainLoading: false })
      throw error
    }
  },

  // Full AI optimization of a blog post (Signal AI)
  optimizeBlogPost: async (postId, projectId, options = {}) => {
    set({ blogBrainLoading: true, blogBrainError: null })
    try {
      const data = await signalSeoApi.getBlogAiSuggestions(projectId, {
        action: 'optimize-post',
        postId,
        ...options
      })
      set({ 
        blogOptimizationResults: data.optimization || data,
        blogBrainLoading: false 
      })
      return data
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
      // Get projectId from current site
      const projectId = get().currentProject?.id
      if (!projectId) {
        throw new Error('No project selected for citation analysis')
      }
      
      const data = await signalSeoApi.getBlogAiSuggestions(projectId, {
        action: 'add-citations',
        postId,
        options: { applyChanges }
      })
      set({ blogBrainLoading: false })
      return data
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
      const data = await seoApi.startBackgroundJob(jobType, options)
      const job = data.job
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
      const data = await seoApi.getJobStatus(jobId)
      const job = data.job
      
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
      const data = await seoApi.listBackgroundJobs()
      set({ backgroundJobs: data.jobs, jobsLoading: false })
      return data.jobs
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
  extractSiteMetadata: async (projectId) => {
    return get().startBackgroundJob('metadata-extract', { projectId })
  },

  // ==================== SITE REVALIDATION ====================

  // Trigger revalidation on the main site after SEO changes
  triggerSiteRevalidation: async (options = {}) => {
    const { paths, revalidateAll, domain, tag } = options
    try {
      const data = await seoApi.revalidateSite({
        domain: domain || 'uptrademedia.com',
        paths,
        revalidateAll,
        tag
      })
      return data
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
  fetchGscIssues: async (projectId) => {
    set({ gscIssuesLoading: true, gscIssuesError: null })
    try {
      const data = await seoApi.getGscIssues(projectId)
      set({ 
        gscIssues: data.issues,
        redirects: data.redirects || [],
        gscIssuesLoading: false 
      })
      return data
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ gscIssuesError: message, gscIssuesLoading: false })
      throw error
    }
  },

  // Apply a GSC fix
  applyGscFix: async (projectId, action, options = {}) => {
    try {
      const data = await seoApi.applyGscFix(projectId, { action, ...options })
      // Refresh issues after applying fix
      await get().fetchGscIssues(projectId)
      return data
    } catch (error) {
      throw error
    }
  },

  // Create a redirect for a 404 page
  createRedirect: async (projectId, fromPath, toPath, reason = 'GSC 404 fix') => {
    return get().applyGscFix(projectId, 'create-redirect', {
      fix: { fromPath, toPath, reason }
    })
  },

  // Remove noindex from a page
  removeNoindex: async (projectId, url) => {
    return get().applyGscFix(projectId, 'remove-noindex', { url })
  },

  // Fix canonical URL
  fixCanonical: async (projectId, url, canonicalUrl) => {
    return get().applyGscFix(projectId, 'fix-canonical', {
      url,
      fix: { canonicalUrl }
    })
  },

  // Apply multiple fixes at once
  bulkApplyFixes: async (projectId, issues) => {
    return get().applyGscFix(projectId, 'bulk-fix', { issues })
  },

  // Generate fix suggestions (AI-powered)
  generateFixSuggestions: async (projectId) => {
    const data = await signalSeoApi.generateGscFixSuggestions(projectId)
    return data.suggestions
  },

  // Manage redirects
  fetchRedirects: async (projectId) => {
    try {
      const data = await seoApi.getRedirects(projectId)
      set({ redirects: data.redirects || [] })
      return data.redirects
    } catch (error) {
      throw error
    }
  },

  createRedirectDirect: async (projectId, fromPath, toPath, statusCode = 301, reason = '') => {
    const data = await seoApi.createRedirect(projectId, { fromPath, toPath, statusCode, reason })
    await get().fetchRedirects(projectId)
    return data.redirect
  },

  deleteRedirect: async (id) => {
    await seoApi.deleteRedirect(id)
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
  fetchReports: async (projectId) => {
    set({ reportsLoading: true, reportsError: null })
    try {
      const data = await seoApi.getReports(projectId)
      set({ reports: data.reports || [], reportsLoading: false })
      return data.reports
    } catch (error) {
      const message = error.response?.data?.error || error.message
      set({ reportsError: message, reportsLoading: false })
      throw error
    }
  },

  // Generate a new report
  generateReport: async (projectId, reportType = 'weekly', options = {}) => {
    set({ reportsLoading: true })
    try {
      const data = await seoApi.generateReport(projectId, reportType, {
        period: options.period || '7d',
        recipients: options.recipients || [],
        sendEmail: options.sendEmail !== false
      })
      // Refresh reports list
      await get().fetchReports(projectId)
      return data
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
  fetchRankingHistory: async (projectId, keyword = null, options = {}) => {
    set({ rankingHistoryLoading: true })
    try {
      const data = await seoApi.getRankingHistory(projectId, keyword, options)
      set({ 
        rankingHistory: data.history || [],
        rankingTrends: data.trends,
        rankingHistoryLoading: false 
      })
      return data
    } catch (error) {
      set({ rankingHistoryLoading: false })
      throw error
    }
  },

  // Archive current rankings (take a snapshot)
  archiveRankings: async (projectId) => {
    const data = await seoApi.archiveRankings(projectId)
    return data
  },

  // Backfill ranking history from GSC
  backfillRankingHistory: async (projectId) => {
    const data = await seoApi.backfillRankingHistory(projectId)
    return data
  },

  // ==================== CORE WEB VITALS ====================
  cwvHistory: [],
  cwvAggregates: null,
  cwvSummary: null,
  cwvLoading: false,

  // Fetch CWV history for a page or site
  fetchCwvHistory: async (projectId, options = {}) => {
    set({ cwvLoading: true })
    try {
      const data = await seoApi.getCwvHistory(projectId, options)
      set({ 
        cwvHistory: data.history || [],
        cwvAggregates: data.aggregates,
        cwvLoading: false 
      })
      return data
    } catch (error) {
      set({ cwvLoading: false })
      throw error
    }
  },

  // Run a CWV check for a single URL
  checkPageCwv: async (projectId, url, pageId = null, device = 'mobile') => {
    set({ cwvLoading: true })
    try {
      const data = await seoApi.checkPageCwv(projectId, { url, pageId, device })
      set({ cwvLoading: false })
      return data.result
    } catch (error) {
      set({ cwvLoading: false })
      throw error
    }
  },

  // Check all pages (batch)
  checkAllPagesCwv: async (projectId, device = 'mobile', limit = 10) => {
    set({ cwvLoading: true })
    try {
      const data = await seoApi.checkAllPagesCwv(projectId, { device, limit })
      set({ cwvLoading: false })
      return data
    } catch (error) {
      set({ cwvLoading: false })
      throw error
    }
  },

  // Get site-wide CWV summary
  fetchCwvSummary: async (projectId) => {
    try {
      const data = await seoApi.getCwvSummary(projectId)
      set({ cwvSummary: data.summary })
      return data.summary
    } catch (error) {
      throw error
    }
  }
}))

// Selectors
export const selectSiteById = (state, id) => 
  state.projects.find(s => s.id === id)

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

// ==================== SIGNAL ACCESS HOOKS ====================
// DEPRECATED: These hooks use the legacy seo_sites.signal_enabled pattern.
// Use the new unified hooks from signal-access.js instead:
//   import { useSignalAccess, useSignalStatus } from '@/lib/signal-access'
//
// The new hooks check project.features.includes('signal') and org.signal_enabled
// See: /docs/SIGNAL-MULTI-TENANT-ARCHITECTURE.md

/**
 * @deprecated Use `useSignalAccess` from '@/lib/signal-access' instead.
 * This checks the deprecated seo_sites.signal_enabled column.
 */
export const useSignalAccess = () => {
  console.warn('[DEPRECATED] useSignalAccess from seo-store.js is deprecated. Use @/lib/signal-access instead.')
  const currentProject = useSeoStore(state => state.currentProject)
  return currentProject?.signal_enabled ?? false
}

/**
 * @deprecated Use `useSignalStatus` from '@/lib/signal-access' instead.
 * This checks the deprecated seo_sites.signal_enabled column.
 */
export const useSignalStatus = () => {
  console.warn('[DEPRECATED] useSignalStatus from seo-store.js is deprecated. Use @/lib/signal-access instead.')
  const currentProject = useSeoStore(state => state.currentProject)
  
  if (!currentProject?.signal_enabled) {
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
    enabledAt: currentProject.signal_enabled_at,
    threadId: currentProject.signal_thread_id,
    analysisCount: currentProject.signal_analysis_count || 0,
    lastAnalysis: currentProject.signal_last_analysis_at
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
