import { create } from 'zustand'
import api from './api'

/**
 * Email Platform Store
 * Manages state for the multi-tenant email marketing platform
 * - Campaigns
 * - Automations
 * - Templates
 * - Subscribers
 * - Lists
 * - Settings
 */
export const useEmailPlatformStore = create((set, get) => ({
  // ========================================
  // SETTINGS STATE
  // ========================================
  settings: null,
  settingsLoading: false,
  settingsError: null,

  // ========================================
  // CAMPAIGNS STATE
  // ========================================
  campaigns: [],
  campaignsLoading: false,
  campaignsError: null,
  currentCampaign: null,

  // ========================================
  // TEMPLATES STATE
  // ========================================
  templates: [],
  templatesLoading: false,
  templatesError: null,
  currentTemplate: null,

  // ========================================
  // SUBSCRIBERS STATE
  // ========================================
  subscribers: [],
  subscribersLoading: false,
  subscribersError: null,
  subscribersPagination: { page: 1, limit: 50, total: 0 },

  // ========================================
  // LISTS STATE
  // ========================================
  lists: [],
  listsLoading: false,
  listsError: null,

  // ========================================
  // AUTOMATIONS STATE
  // ========================================
  automations: [],
  automationsLoading: false,
  automationsError: null,
  currentAutomation: null,

  // ========================================
  // SETTINGS ACTIONS
  // ========================================
  fetchSettings: async () => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const res = await api.get('/.netlify/functions/email-settings-get')
      set({ settings: res.data.settings, settingsLoading: false })
      return res.data.settings
    } catch (error) {
      set({ settingsError: error.response?.data?.error || error.message, settingsLoading: false })
      return null
    }
  },

  updateSettings: async (updates) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const res = await api.post('/.netlify/functions/email-settings-update', updates)
      set({ settings: res.data.settings, settingsLoading: false })
      return res.data.settings
    } catch (error) {
      set({ settingsError: error.response?.data?.error || error.message, settingsLoading: false })
      throw error
    }
  },

  validateApiKey: async (apiKey) => {
    try {
      const res = await api.post('/.netlify/functions/email-settings-validate', { api_key: apiKey })
      return res.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Validation failed')
    }
  },

  // ========================================
  // CAMPAIGNS ACTIONS
  // ========================================
  fetchCampaigns: async (filters = {}) => {
    set({ campaignsLoading: true, campaignsError: null })
    try {
      const params = new URLSearchParams(filters).toString()
      const res = await api.get(`/.netlify/functions/email-campaigns-list?${params}`)
      set({ campaigns: res.data.campaigns, campaignsLoading: false })
      return res.data.campaigns
    } catch (error) {
      set({ campaignsError: error.response?.data?.error || error.message, campaignsLoading: false })
      return []
    }
  },

  getCampaign: async (id) => {
    try {
      const res = await api.get(`/.netlify/functions/email-campaigns-get/${id}`)
      set({ currentCampaign: res.data.campaign })
      return res.data.campaign
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get campaign')
    }
  },

  createCampaign: async (campaignData) => {
    try {
      const res = await api.post('/.netlify/functions/email-campaigns-create', campaignData)
      const { campaign } = res.data
      set(state => ({ campaigns: [campaign, ...state.campaigns] }))
      return campaign
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create campaign')
    }
  },

  updateCampaign: async (id, updates) => {
    try {
      const res = await api.put(`/.netlify/functions/email-campaigns-update/${id}`, updates)
      const { campaign } = res.data
      set(state => ({
        campaigns: state.campaigns.map(c => c.id === id ? campaign : c),
        currentCampaign: campaign
      }))
      return campaign
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update campaign')
    }
  },

  sendCampaign: async (campaignId, options = {}) => {
    try {
      const res = await api.post('/.netlify/functions/email-campaigns-send', {
        campaign_id: campaignId,
        ...options
      })
      // Refresh campaigns to get updated stats
      get().fetchCampaigns()
      return res.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send campaign')
    }
  },

  sendTestEmail: async (campaignId, testEmail) => {
    try {
      const res = await api.post('/.netlify/functions/email-campaigns-send', {
        campaign_id: campaignId,
        send_test: true,
        test_email: testEmail
      })
      return res.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send test email')
    }
  },

  // ========================================
  // TEMPLATES ACTIONS
  // ========================================
  fetchTemplates: async () => {
    set({ templatesLoading: true, templatesError: null })
    try {
      const res = await api.get('/.netlify/functions/email-templates-list')
      set({ templates: res.data.templates, templatesLoading: false })
      return res.data.templates
    } catch (error) {
      set({ templatesError: error.response?.data?.error || error.message, templatesLoading: false })
      return []
    }
  },

  getTemplate: async (id) => {
    try {
      const res = await api.get(`/.netlify/functions/email-templates-get/${id}`)
      set({ currentTemplate: res.data.template })
      return res.data.template
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get template')
    }
  },

  createTemplate: async (templateData) => {
    try {
      const res = await api.post('/.netlify/functions/email-templates-create', templateData)
      const { template } = res.data
      set(state => ({ templates: [template, ...state.templates] }))
      return template
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create template')
    }
  },

  updateTemplate: async (id, updates) => {
    try {
      const res = await api.put(`/.netlify/functions/email-templates-update/${id}`, updates)
      const { template } = res.data
      set(state => ({
        templates: state.templates.map(t => t.id === id ? template : t),
        currentTemplate: template
      }))
      return template
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update template')
    }
  },

  // ========================================
  // SUBSCRIBERS ACTIONS
  // ========================================
  fetchSubscribers: async (filters = {}) => {
    set({ subscribersLoading: true, subscribersError: null })
    try {
      const params = new URLSearchParams(filters).toString()
      const res = await api.get(`/.netlify/functions/email-subscribers-list?${params}`)
      set({ 
        subscribers: res.data.subscribers, 
        subscribersPagination: res.data.pagination || { page: 1, limit: 50, total: res.data.subscribers.length },
        subscribersLoading: false 
      })
      return res.data.subscribers
    } catch (error) {
      set({ subscribersError: error.response?.data?.error || error.message, subscribersLoading: false })
      return []
    }
  },

  createSubscriber: async (subscriberData) => {
    try {
      const res = await api.post('/.netlify/functions/email-subscribers-create', subscriberData)
      const { subscriber, created } = res.data
      if (created) {
        set(state => ({ subscribers: [subscriber, ...state.subscribers] }))
      } else {
        set(state => ({
          subscribers: state.subscribers.map(s => s.id === subscriber.id ? subscriber : s)
        }))
      }
      return { subscriber, created }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create subscriber')
    }
  },

  importSubscribers: async (csvData, options = {}) => {
    try {
      const res = await api.post('/.netlify/functions/email-subscribers-import', {
        csv_data: csvData,
        ...options
      })
      // Refresh subscribers and lists after import
      get().fetchSubscribers()
      get().fetchLists()
      return res.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to import subscribers')
    }
  },

  // ========================================
  // LISTS ACTIONS
  // ========================================
  fetchLists: async () => {
    set({ listsLoading: true, listsError: null })
    try {
      const res = await api.get('/.netlify/functions/email-lists-list')
      set({ lists: res.data.lists, listsLoading: false })
      return res.data.lists
    } catch (error) {
      set({ listsError: error.response?.data?.error || error.message, listsLoading: false })
      return []
    }
  },

  createList: async (listData) => {
    try {
      const res = await api.post('/.netlify/functions/email-lists-create', listData)
      const { list } = res.data
      set(state => ({ lists: [list, ...state.lists] }))
      return list
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create list')
    }
  },

  // ========================================
  // AUTOMATIONS ACTIONS
  // ========================================
  fetchAutomations: async () => {
    set({ automationsLoading: true, automationsError: null })
    try {
      const res = await api.get('/.netlify/functions/email-automations-list')
      set({ automations: res.data.automations, automationsLoading: false })
      return res.data.automations
    } catch (error) {
      set({ automationsError: error.response?.data?.error || error.message, automationsLoading: false })
      return []
    }
  },

  getAutomation: async (id) => {
    try {
      const res = await api.get(`/.netlify/functions/email-automations-get/${id}`)
      set({ currentAutomation: res.data.automation })
      return res.data.automation
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get automation')
    }
  },

  createAutomation: async (automationData) => {
    try {
      const res = await api.post('/.netlify/functions/email-automations-create', automationData)
      const { automation } = res.data
      set(state => ({ automations: [automation, ...state.automations] }))
      return automation
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create automation')
    }
  },

  updateAutomation: async (id, updates) => {
    try {
      const res = await api.put(`/.netlify/functions/email-automations-update/${id}`, updates)
      const { automation } = res.data
      set(state => ({
        automations: state.automations.map(a => a.id === id ? automation : a),
        currentAutomation: automation
      }))
      return automation
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update automation')
    }
  },

  toggleAutomationStatus: async (id, newStatus) => {
    return get().updateAutomation(id, { status: newStatus })
  },

  // ========================================
  // UTILITY ACTIONS
  // ========================================
  clearCurrentCampaign: () => set({ currentCampaign: null }),
  clearCurrentTemplate: () => set({ currentTemplate: null }),
  clearCurrentAutomation: () => set({ currentAutomation: null }),
  
  reset: () => set({
    settings: null,
    campaigns: [],
    templates: [],
    subscribers: [],
    lists: [],
    automations: [],
    currentCampaign: null,
    currentTemplate: null,
    currentAutomation: null
  })
}))
