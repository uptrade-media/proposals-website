/**
 * Reputation Store
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Zustand store for Reputation module state management.
 * Handles reviews, campaigns, health score, and settings.
 */

import { create } from 'zustand'
import portalApi from './portal-api'
import { signalApi } from './signal-api'
import useProjectsStore from './projects-store'

// Types
const ReviewStatus = {
  NEW: 'new',
  RESPONDED: 'responded',
  ARCHIVED: 'archived',
}

const Sentiment = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
}

// Initial state
const initialState = {
  // Overview
  overview: null,
  overviewLoading: false,
  
  // Reviews
  reviews: [],
  reviewsTotal: 0,
  reviewsPage: 1,
  reviewsLoading: false,
  selectedReview: null,
  reviewFilters: {
    status: null,
    platform: null,
    rating: null,
    sentiment: null,
    needsAttention: false,
    unanswered: false,
    search: '',
  },
  
  // Platforms
  platforms: [],
  platformsLoading: false,
  
  // Health Score
  healthScore: null,
  healthScoreHistory: [],
  healthInsights: null,
  healthLoading: false,
  
  // Campaigns
  campaigns: [],
  campaignsLoading: false,
  selectedCampaign: null,
  
  // Requests
  requests: [],
  requestsLoading: false,
  
  // Settings
  settings: null,
  settingsLoading: false,
  
  // Templates
  templates: [],
  templatesLoading: false,
  
  // Triggers
  triggers: [],
  triggersLoading: false,
  
  // AI Response
  generatingResponse: false,
  responseSuggestions: [],
  
  // Errors
  error: null,
}

export const useReputationStore = create((set, get) => ({
  ...initialState,

  // ============================================================================
  // HELPERS
  // ============================================================================

  getProjectId: () => {
    const projectsStore = useProjectsStore.getState()
    return projectsStore.currentProject?.id
  },

  setError: (error) => set({ error: error?.message || error }),
  clearError: () => set({ error: null }),

  // ============================================================================
  // OVERVIEW
  // ============================================================================

  fetchOverview: async () => {
    const projectId = get().getProjectId()
    if (!projectId) return

    set({ overviewLoading: true, error: null })
    try {
      const overview = await portalApi.get(`/reputation/projects/${projectId}/overview`)
      set({ overview, overviewLoading: false })
    } catch (error) {
      set({ error: error.message, overviewLoading: false })
    }
  },

  // ============================================================================
  // PLATFORMS
  // ============================================================================

  fetchPlatforms: async () => {
    const projectId = get().getProjectId()
    if (!projectId) return

    set({ platformsLoading: true })
    try {
      const platforms = await portalApi.get(`/reputation/projects/${projectId}/platforms`)
      set({ platforms, platformsLoading: false })
    } catch (error) {
      set({ error: error.message, platformsLoading: false })
    }
  },

  connectPlatform: async (platformData) => {
    const projectId = get().getProjectId()
    if (!projectId) return

    try {
      const platform = await portalApi.post(`/reputation/platforms/connect`, {
        ...platformData,
        projectId,
      })
      set((state) => ({ platforms: [...state.platforms, platform] }))
      return platform
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  /**
   * Get OAuth URL to initiate platform connection (for Google, Facebook)
   * Returns the URL to redirect the user to for OAuth consent
   */
  getOAuthUrl: async (platform) => {
    const projectId = get().getProjectId()
    if (!projectId) throw new Error('No project selected')

    try {
      const returnUrl = `${window.location.origin}/reputation/settings?tab=platforms`
      const result = await portalApi.get(
        `/reputation/platforms/oauth/initiate/${platform}?projectId=${projectId}&returnUrl=${encodeURIComponent(returnUrl)}`
      )
      return result
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  /**
   * Search for a business on Yelp
   */
  searchYelpBusiness: async (name, location) => {
    try {
      const results = await portalApi.get(
        `/reputation/platforms/yelp/search?name=${encodeURIComponent(name)}&location=${encodeURIComponent(location)}`
      )
      return results
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  /**
   * Connect a Yelp business (no OAuth, just search and connect)
   */
  connectYelpBusiness: async (businessId, businessName) => {
    const projectId = get().getProjectId()
    if (!projectId) throw new Error('No project selected')

    try {
      const platform = await portalApi.post('/reputation/platforms/yelp/connect', {
        projectId,
        businessId,
        businessName,
      })
      set((state) => ({ platforms: [...state.platforms, platform] }))
      return platform
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  disconnectPlatform: async (platformId, revokeTokens = false) => {
    try {
      await portalApi.delete(`/reputation/platforms/${platformId}`, {
        data: { revokeTokens },
      })
      set((state) => ({
        platforms: state.platforms.filter((p) => p.id !== platformId),
      }))
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  syncPlatform: async (platformId) => {
    try {
      const result = await portalApi.post(`/reputation/platforms/${platformId}/sync`)
      // Refresh platforms to get updated stats
      get().fetchPlatforms()
      return result
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // ============================================================================
  // CREDENTIAL MANAGEMENT (Admin only)
  // ============================================================================

  /**
   * Check credential source for a platform
   */
  getCredentialSource: async (platform) => {
    const projectId = get().getProjectId()
    if (!projectId) throw new Error('No project selected')

    try {
      return await portalApi.get(`/reputation/platforms/credentials/source/${projectId}/${platform}`)
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  /**
   * Save organization-level OAuth credentials
   */
  saveOrgCredentials: async (orgId, platformType, credentials) => {
    try {
      return await portalApi.post('/reputation/platforms/credentials/org', {
        orgId,
        platformType,
        ...credentials,
      })
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  /**
   * Save platform-specific credentials
   */
  savePlatformCredentials: async (platformId, credentials) => {
    try {
      return await portalApi.post(`/reputation/platforms/credentials/${platformId}`, credentials)
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  /**
   * Delete organization-level credentials (revert to global)
   */
  deleteOrgCredentials: async (orgId, platform) => {
    try {
      return await portalApi.delete(`/reputation/platforms/credentials/org/${orgId}/${platform}`)
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // ============================================================================
  // REVIEWS
  // ============================================================================

  fetchReviews: async (page = 1) => {
    const projectId = get().getProjectId()
    if (!projectId) return

    const { reviewFilters } = get()
    set({ reviewsLoading: true, reviewsPage: page })

    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', 20)
      
      if (reviewFilters.status) params.append('status', reviewFilters.status)
      if (reviewFilters.platform) params.append('platform', reviewFilters.platform)
      if (reviewFilters.rating) params.append('rating', reviewFilters.rating)
      if (reviewFilters.sentiment) params.append('sentiment', reviewFilters.sentiment)
      if (reviewFilters.needsAttention) params.append('needsAttention', true)
      if (reviewFilters.unanswered) params.append('unanswered', true)
      if (reviewFilters.search) params.append('search', reviewFilters.search)

      const result = await portalApi.get(`/reputation/projects/${projectId}/reviews?${params}`)
      set({
        reviews: result.reviews,
        reviewsTotal: result.total,
        reviewsLoading: false,
      })
    } catch (error) {
      set({ error: error.message, reviewsLoading: false })
    }
  },

  setReviewFilters: (filters) => {
    set((state) => ({
      reviewFilters: { ...state.reviewFilters, ...filters },
    }))
    get().fetchReviews(1)
  },

  selectReview: async (reviewId) => {
    if (!reviewId) {
      set({ selectedReview: null })
      return
    }
    
    try {
      const review = await portalApi.get(`/reputation/reviews/${reviewId}`)
      set({ selectedReview: review })
    } catch (error) {
      set({ error: error.message })
    }
  },

  updateReview: async (reviewId, updates) => {
    try {
      const review = await portalApi.put(`/reputation/reviews/${reviewId}`, updates)
      set((state) => ({
        reviews: state.reviews.map((r) => (r.id === reviewId ? review : r)),
        selectedReview: state.selectedReview?.id === reviewId ? review : state.selectedReview,
      }))
      return review
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  respondToReview: async (reviewId, responseText, options = {}) => {
    try {
      const review = await portalApi.post(`/reputation/reviews/${reviewId}/respond`, {
        responseText,
        responseSource: options.source || 'manual',
        postToPlatform: options.postToPlatform || false,
      })
      set((state) => ({
        reviews: state.reviews.map((r) => (r.id === reviewId ? review : r)),
        selectedReview: state.selectedReview?.id === reviewId ? review : state.selectedReview,
      }))
      
      // Refresh overview for updated stats
      get().fetchOverview()
      
      return review
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  archiveReview: async (reviewId) => {
    try {
      await portalApi.post(`/reputation/reviews/${reviewId}/archive`)
      set((state) => ({
        reviews: state.reviews.filter((r) => r.id !== reviewId),
        selectedReview: state.selectedReview?.id === reviewId ? null : state.selectedReview,
      }))
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // ============================================================================
  // AI RESPONSES
  // ============================================================================

  generateAIResponse: async (reviewId) => {
    const { selectedReview, settings } = get()
    const review = selectedReview || get().reviews.find(r => r.id === reviewId)
    
    if (!review) return null

    set({ generatingResponse: true })
    try {
      const response = await signalApi.post('/skills/reputation/generate-response', {
        reviewText: review.reviewText,
        rating: review.rating,
        reviewerName: review.reviewerName,
        brandVoice: settings?.brandVoice || 'professional',
        businessName: settings?.businessName,
        ownerName: settings?.ownerName,
        includeKeywords: settings?.useSeoKeywords,
        platform: review.platformType,
      })
      
      set({ generatingResponse: false })
      return response.responseText
    } catch (error) {
      set({ generatingResponse: false, error: error.message })
      throw error
    }
  },

  getResponseSuggestions: async (reviewId) => {
    const review = get().reviews.find(r => r.id === reviewId) || get().selectedReview
    if (!review) return []

    const { settings } = get()
    set({ generatingResponse: true })

    try {
      const response = await signalApi.post('/skills/reputation/response-suggestions', {
        reviewText: review.reviewText,
        rating: review.rating,
        reviewerName: review.reviewerName,
        brandVoice: settings?.brandVoice,
        businessName: settings?.businessName,
        count: 3,
      })
      
      set({ responseSuggestions: response.suggestions, generatingResponse: false })
      return response.suggestions
    } catch (error) {
      set({ generatingResponse: false, error: error.message })
      throw error
    }
  },

  // ============================================================================
  // HEALTH SCORE
  // ============================================================================

  fetchHealthScore: async () => {
    const projectId = get().getProjectId()
    if (!projectId) return

    set({ healthLoading: true })
    try {
      const [healthScore, history] = await Promise.all([
        portalApi.get(`/reputation/projects/${projectId}/health-score`),
        portalApi.get(`/reputation/projects/${projectId}/health-score/history?days=30`),
      ])
      set({ healthScore, healthScoreHistory: history, healthLoading: false })
    } catch (error) {
      set({ error: error.message, healthLoading: false })
    }
  },

  getHealthInsights: async () => {
    const { healthScore } = get()
    if (!healthScore) return null

    try {
      const insights = await signalApi.post('/skills/reputation/health-insights', {
        overallScore: healthScore.overallScore,
        totalReviews: healthScore.totalReviews,
        averageRating: healthScore.averageRating,
        responseRate: healthScore.responseRate,
        positivePct: healthScore.positivePct,
        negativePct: healthScore.negativePct,
        alerts: healthScore.alerts,
      })
      set({ healthInsights: insights })
      return insights
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  fetchCampaigns: async () => {
    const projectId = get().getProjectId()
    if (!projectId) return

    set({ campaignsLoading: true })
    try {
      const result = await portalApi.get(`/reputation/projects/${projectId}/campaigns`)
      set({ campaigns: result.campaigns, campaignsLoading: false })
    } catch (error) {
      set({ error: error.message, campaignsLoading: false })
    }
  },

  createCampaign: async (campaignData) => {
    const projectId = get().getProjectId()
    if (!projectId) return

    try {
      const campaign = await portalApi.post(`/reputation/projects/${projectId}/campaigns`, campaignData)
      set((state) => ({ campaigns: [campaign, ...state.campaigns] }))
      return campaign
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  updateCampaign: async (campaignId, updates) => {
    try {
      const campaign = await portalApi.put(`/reputation/campaigns/${campaignId}`, updates)
      set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === campaignId ? campaign : c)),
        selectedCampaign: state.selectedCampaign?.id === campaignId ? campaign : state.selectedCampaign,
      }))
      return campaign
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  deleteCampaign: async (campaignId) => {
    try {
      await portalApi.delete(`/reputation/campaigns/${campaignId}`)
      set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== campaignId),
        selectedCampaign: state.selectedCampaign?.id === campaignId ? null : state.selectedCampaign,
      }))
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  activateCampaign: async (campaignId) => {
    try {
      const campaign = await portalApi.post(`/reputation/campaigns/${campaignId}/activate`)
      set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === campaignId ? campaign : c)),
      }))
      return campaign
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  pauseCampaign: async (campaignId) => {
    try {
      const campaign = await portalApi.post(`/reputation/campaigns/${campaignId}/pause`)
      set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === campaignId ? campaign : c)),
      }))
      return campaign
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // ============================================================================
  // REQUESTS
  // ============================================================================

  fetchRequests: async (page = 1) => {
    const projectId = get().getProjectId()
    if (!projectId) return

    set({ requestsLoading: true })
    try {
      const result = await portalApi.get(`/reputation/projects/${projectId}/requests?page=${page}`)
      set({ requests: result.requests, requestsLoading: false })
    } catch (error) {
      set({ error: error.message, requestsLoading: false })
    }
  },

  sendRequest: async (requestData) => {
    const projectId = get().getProjectId()
    if (!projectId) return

    try {
      const request = await portalApi.post(`/reputation/projects/${projectId}/requests`, requestData)
      set((state) => ({ requests: [request, ...state.requests] }))
      return request
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // ============================================================================
  // SETTINGS
  // ============================================================================

  fetchSettings: async () => {
    const projectId = get().getProjectId()
    if (!projectId) return

    set({ settingsLoading: true })
    try {
      const settings = await portalApi.get(`/reputation/projects/${projectId}/settings`)
      set({ settings, settingsLoading: false })
    } catch (error) {
      set({ error: error.message, settingsLoading: false })
    }
  },

  updateSettings: async (updates) => {
    const projectId = get().getProjectId()
    if (!projectId) return

    try {
      const settings = await portalApi.put(`/reputation/projects/${projectId}/settings`, updates)
      set({ settings })
      return settings
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  fetchTemplates: async () => {
    const projectId = get().getProjectId()
    if (!projectId) return

    set({ templatesLoading: true })
    try {
      const templates = await portalApi.get(`/reputation/projects/${projectId}/templates`)
      set({ templates, templatesLoading: false })
    } catch (error) {
      set({ error: error.message, templatesLoading: false })
    }
  },

  createTemplate: async (templateData) => {
    const projectId = get().getProjectId()
    if (!projectId) return

    try {
      const template = await portalApi.post(`/reputation/projects/${projectId}/templates`, templateData)
      set((state) => ({ templates: [...state.templates, template] }))
      return template
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  updateTemplate: async (templateId, updates) => {
    try {
      const template = await portalApi.put(`/reputation/templates/${templateId}`, updates)
      set((state) => ({
        templates: state.templates.map((t) => (t.id === templateId ? template : t)),
      }))
      return template
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  deleteTemplate: async (templateId) => {
    try {
      await portalApi.delete(`/reputation/templates/${templateId}`)
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== templateId),
      }))
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // ============================================================================
  // TRIGGERS
  // ============================================================================

  fetchTriggers: async () => {
    const projectId = get().getProjectId()
    if (!projectId) return

    set({ triggersLoading: true })
    try {
      const triggers = await portalApi.get(`/reputation/projects/${projectId}/triggers`)
      set({ triggers, triggersLoading: false })
    } catch (error) {
      set({ error: error.message, triggersLoading: false })
    }
  },

  createTrigger: async (triggerData) => {
    const projectId = get().getProjectId()
    if (!projectId) return

    try {
      const trigger = await portalApi.post(`/reputation/projects/${projectId}/triggers`, triggerData)
      set((state) => ({ triggers: [...state.triggers, trigger] }))
      return trigger
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  updateTrigger: async (triggerId, updates) => {
    try {
      const trigger = await portalApi.put(`/reputation/triggers/${triggerId}`, updates)
      set((state) => ({
        triggers: state.triggers.map((t) => (t.id === triggerId ? trigger : t)),
      }))
      return trigger
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  deleteTrigger: async (triggerId) => {
    try {
      await portalApi.delete(`/reputation/triggers/${triggerId}`)
      set((state) => ({
        triggers: state.triggers.filter((t) => t.id !== triggerId),
      }))
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // ============================================================================
  // RESET
  // ============================================================================

  reset: () => set(initialState),
}))

// Export constants
export { ReviewStatus, Sentiment }
