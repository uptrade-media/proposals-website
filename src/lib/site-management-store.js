/**
 * Site Management Store
 * 
 * Manages state for the Website tab in Projects module.
 * Handles images, redirects, FAQs, content, links, scripts, and pages.
 */
import { create } from 'zustand'
import { portalApi } from './portal-api'

// View types for the site navigation
export const SITE_VIEWS = {
  PAGES: 'pages',
  IMAGES: 'images',
  REDIRECTS: 'redirects',
  FAQS: 'faqs',
  CONTENT: 'content',
  LINKS: 'links',
  SCRIPTS: 'scripts',
  SCHEMA: 'schema',
}

export const useSiteManagementStore = create((set, get) => ({
  // Current project context
  projectId: null,
  
  // Active view in the site navigation
  activeView: SITE_VIEWS.PAGES,
  
  // Data collections
  pages: [],
  images: [],
  redirects: [],
  faqs: [],
  content: [],
  links: [],
  scripts: [],
  schema: [],
  
  // Statistics
  stats: {
    pagesCount: 0,
    pendingPages: 0,
    imagesCount: 0,
    unassignedImages: 0,
    redirectsCount: 0,
    redirectHitsTotal: 0,
    faqsCount: 0,
    faqQuestionsCount: 0,
    contentCount: 0,
    unpublishedContent: 0,
    linksCount: 0,
    pendingLinks: 0,
    scriptsCount: 0,
    activeScripts: 0,
  },
  
  // Loading states
  isLoading: false,
  loadingView: null,
  
  // Error state
  error: null,
  
  // ============================================================================
  // Actions
  // ============================================================================
  
  /**
   * Set the active project and optionally load all data
   */
  setProject: async (projectId, autoLoad = true) => {
    set({ projectId, error: null })
    if (autoLoad && projectId) {
      await get().fetchStats()
      await get().fetchActiveViewData()
    }
  },
  
  /**
   * Change the active view in site navigation
   */
  setActiveView: async (view) => {
    set({ activeView: view })
    await get().fetchActiveViewData()
  },
  
  /**
   * Fetch data for the currently active view
   */
  fetchActiveViewData: async () => {
    const { activeView, projectId } = get()
    if (!projectId) return
    
    switch (activeView) {
      case SITE_VIEWS.PAGES:
        return get().fetchPages()
      case SITE_VIEWS.IMAGES:
        return get().fetchImages()
      case SITE_VIEWS.REDIRECTS:
        return get().fetchRedirects()
      case SITE_VIEWS.FAQS:
        return get().fetchFaqs()
      case SITE_VIEWS.CONTENT:
        return get().fetchContent()
      case SITE_VIEWS.LINKS:
        return get().fetchLinks()
      case SITE_VIEWS.SCRIPTS:
        return get().fetchScripts()
      case SITE_VIEWS.SCHEMA:
        return get().fetchSchema()
      default:
        return
    }
  },
  
  /**
   * Fetch stats for all managed items
   */
  fetchStats: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await portalApi.get(`/projects/${projectId}/site/stats`)
      set({ stats: response.data })
    } catch (error) {
      console.error('Failed to fetch site stats:', error)
      // Don't set error - stats are optional
    }
  },
  
  // ============================================================================
  // Pages
  // ============================================================================
  
  fetchPages: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    set({ loadingView: SITE_VIEWS.PAGES })
    try {
      const response = await portalApi.get(`/projects/${projectId}/site/pages`)
      set({ 
        pages: response.data.pages || response.data,
        loadingView: null,
      })
    } catch (error) {
      console.error('Failed to fetch pages:', error)
      set({ error: error.message, loadingView: null })
    }
  },
  
  updatePage: async (pageId, updates) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.put(`/projects/${projectId}/site/pages/${pageId}`, updates)
      await get().fetchPages()
    } catch (error) {
      console.error('Failed to update page:', error)
      throw error
    }
  },
  
  // ============================================================================
  // Images
  // ============================================================================
  
  fetchImages: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    set({ loadingView: SITE_VIEWS.IMAGES })
    try {
      const response = await portalApi.get(`/projects/${projectId}/site/images`)
      set({ 
        images: response.data.images || response.data,
        loadingView: null,
      })
    } catch (error) {
      console.error('Failed to fetch images:', error)
      set({ error: error.message, loadingView: null })
    }
  },
  
  createImage: async (imageData) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await portalApi.post(`/projects/${projectId}/site/images`, imageData)
      await get().fetchImages()
      await get().fetchStats()
      return response.data
    } catch (error) {
      console.error('Failed to create image:', error)
      throw error
    }
  },
  
  updateImage: async (imageId, updates) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.put(`/projects/${projectId}/site/images/${imageId}`, updates)
      await get().fetchImages()
    } catch (error) {
      console.error('Failed to update image:', error)
      throw error
    }
  },
  
  deleteImage: async (imageId) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.delete(`/projects/${projectId}/site/images/${imageId}`)
      await get().fetchImages()
      await get().fetchStats()
    } catch (error) {
      console.error('Failed to delete image:', error)
      throw error
    }
  },
  
  triggerImageCategorization: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.post(`/projects/${projectId}/site/images/categorize`)
      await get().fetchImages()
    } catch (error) {
      console.error('Failed to trigger categorization:', error)
      throw error
    }
  },
  
  // ============================================================================
  // Redirects
  // ============================================================================
  
  fetchRedirects: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    set({ loadingView: SITE_VIEWS.REDIRECTS })
    try {
      const response = await portalApi.get(`/projects/${projectId}/site/redirects`)
      set({ 
        redirects: response.data.redirects || response.data,
        loadingView: null,
      })
    } catch (error) {
      console.error('Failed to fetch redirects:', error)
      set({ error: error.message, loadingView: null })
    }
  },
  
  createRedirect: async (redirectData) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await portalApi.post(`/projects/${projectId}/site/redirects`, redirectData)
      await get().fetchRedirects()
      await get().fetchStats()
      return response.data
    } catch (error) {
      console.error('Failed to create redirect:', error)
      throw error
    }
  },
  
  updateRedirect: async (redirectId, updates) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.put(`/projects/${projectId}/site/redirects/${redirectId}`, updates)
      await get().fetchRedirects()
    } catch (error) {
      console.error('Failed to update redirect:', error)
      throw error
    }
  },
  
  deleteRedirect: async (redirectId) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.delete(`/projects/${projectId}/site/redirects/${redirectId}`)
      await get().fetchRedirects()
      await get().fetchStats()
    } catch (error) {
      console.error('Failed to delete redirect:', error)
      throw error
    }
  },
  
  importRedirects: async (csvData) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await portalApi.post(`/projects/${projectId}/site/redirects/import`, { csv: csvData })
      await get().fetchRedirects()
      await get().fetchStats()
      return response.data
    } catch (error) {
      console.error('Failed to import redirects:', error)
      throw error
    }
  },
  
  // ============================================================================
  // FAQs
  // ============================================================================
  
  fetchFaqs: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    set({ loadingView: SITE_VIEWS.FAQS })
    try {
      const response = await portalApi.get(`/projects/${projectId}/site/faqs`)
      set({ 
        faqs: response.data.faqs || response.data,
        loadingView: null,
      })
    } catch (error) {
      console.error('Failed to fetch FAQs:', error)
      set({ error: error.message, loadingView: null })
    }
  },
  
  createFaq: async (faqData) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await portalApi.post(`/projects/${projectId}/site/faqs`, faqData)
      await get().fetchFaqs()
      await get().fetchStats()
      return response.data
    } catch (error) {
      console.error('Failed to create FAQ:', error)
      throw error
    }
  },
  
  updateFaq: async (faqId, updates) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.put(`/projects/${projectId}/site/faqs/${faqId}`, updates)
      await get().fetchFaqs()
    } catch (error) {
      console.error('Failed to update FAQ:', error)
      throw error
    }
  },
  
  deleteFaq: async (faqId) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.delete(`/projects/${projectId}/site/faqs/${faqId}`)
      await get().fetchFaqs()
      await get().fetchStats()
    } catch (error) {
      console.error('Failed to delete FAQ:', error)
      throw error
    }
  },
  
  // ============================================================================
  // Content
  // ============================================================================
  
  fetchContent: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    set({ loadingView: SITE_VIEWS.CONTENT })
    try {
      const response = await portalApi.get(`/projects/${projectId}/site/content`)
      set({ 
        content: response.data.content || response.data,
        loadingView: null,
      })
    } catch (error) {
      console.error('Failed to fetch content:', error)
      set({ error: error.message, loadingView: null })
    }
  },
  
  createContent: async (contentData) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await portalApi.post(`/projects/${projectId}/site/content`, contentData)
      await get().fetchContent()
      await get().fetchStats()
      return response.data
    } catch (error) {
      console.error('Failed to create content:', error)
      throw error
    }
  },
  
  updateContent: async (contentId, updates) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.put(`/projects/${projectId}/site/content/${contentId}`, updates)
      await get().fetchContent()
    } catch (error) {
      console.error('Failed to update content:', error)
      throw error
    }
  },
  
  deleteContent: async (contentId) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.delete(`/projects/${projectId}/site/content/${contentId}`)
      await get().fetchContent()
      await get().fetchStats()
    } catch (error) {
      console.error('Failed to delete content:', error)
      throw error
    }
  },
  
  // ============================================================================
  // Links
  // ============================================================================
  
  fetchLinks: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    set({ loadingView: SITE_VIEWS.LINKS })
    try {
      const response = await portalApi.get(`/projects/${projectId}/site/links`)
      set({ 
        links: response.data.links || response.data,
        loadingView: null,
      })
    } catch (error) {
      console.error('Failed to fetch links:', error)
      set({ error: error.message, loadingView: null })
    }
  },
  
  createLink: async (linkData) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await portalApi.post(`/projects/${projectId}/site/links`, linkData)
      await get().fetchLinks()
      await get().fetchStats()
      return response.data
    } catch (error) {
      console.error('Failed to create link:', error)
      throw error
    }
  },
  
  updateLink: async (linkId, updates) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.put(`/projects/${projectId}/site/links/${linkId}`, updates)
      await get().fetchLinks()
    } catch (error) {
      console.error('Failed to update link:', error)
      throw error
    }
  },
  
  deleteLink: async (linkId) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.delete(`/projects/${projectId}/site/links/${linkId}`)
      await get().fetchLinks()
      await get().fetchStats()
    } catch (error) {
      console.error('Failed to delete link:', error)
      throw error
    }
  },
  
  approveLink: async (linkId) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.post(`/projects/${projectId}/site/links/${linkId}/approve`)
      await get().fetchLinks()
    } catch (error) {
      console.error('Failed to approve link:', error)
      throw error
    }
  },
  
  // ============================================================================
  // Scripts
  // ============================================================================
  
  fetchScripts: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    set({ loadingView: SITE_VIEWS.SCRIPTS })
    try {
      const response = await portalApi.get(`/projects/${projectId}/site/scripts`)
      set({ 
        scripts: response.data.scripts || response.data,
        loadingView: null,
      })
    } catch (error) {
      console.error('Failed to fetch scripts:', error)
      set({ error: error.message, loadingView: null })
    }
  },
  
  createScript: async (scriptData) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      const response = await portalApi.post(`/projects/${projectId}/site/scripts`, scriptData)
      await get().fetchScripts()
      await get().fetchStats()
      return response.data
    } catch (error) {
      console.error('Failed to create script:', error)
      throw error
    }
  },
  
  updateScript: async (scriptId, updates) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.put(`/projects/${projectId}/site/scripts/${scriptId}`, updates)
      await get().fetchScripts()
    } catch (error) {
      console.error('Failed to update script:', error)
      throw error
    }
  },
  
  deleteScript: async (scriptId) => {
    const { projectId } = get()
    if (!projectId) return
    
    try {
      await portalApi.delete(`/projects/${projectId}/site/scripts/${scriptId}`)
      await get().fetchScripts()
      await get().fetchStats()
    } catch (error) {
      console.error('Failed to delete script:', error)
      throw error
    }
  },
  
  // ============================================================================
  // Schema
  // ============================================================================
  
  fetchSchema: async () => {
    const { projectId } = get()
    if (!projectId) return
    
    set({ loadingView: SITE_VIEWS.SCHEMA })
    try {
      const response = await portalApi.get(`/projects/${projectId}/site/schema`)
      set({ 
        schema: response.data.schema || response.data,
        loadingView: null,
      })
    } catch (error) {
      console.error('Failed to fetch schema:', error)
      set({ error: error.message, loadingView: null })
    }
  },
  
  // ============================================================================
  // Reset
  // ============================================================================
  
  reset: () => {
    set({
      projectId: null,
      activeView: SITE_VIEWS.PAGES,
      pages: [],
      images: [],
      redirects: [],
      faqs: [],
      content: [],
      links: [],
      scripts: [],
      schema: [],
      stats: {
        pagesCount: 0,
        pendingPages: 0,
        imagesCount: 0,
        unassignedImages: 0,
        redirectsCount: 0,
        redirectHitsTotal: 0,
        faqsCount: 0,
        faqQuestionsCount: 0,
        contentCount: 0,
        unpublishedContent: 0,
        linksCount: 0,
        pendingLinks: 0,
        scriptsCount: 0,
        activeScripts: 0,
      },
      isLoading: false,
      loadingView: null,
      error: null,
    })
  },
}))
