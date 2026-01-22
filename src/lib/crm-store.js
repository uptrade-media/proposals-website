/**
 * CRM Store - Zustand store for CRM module
 * Handles prospects, calls, tasks, follow-ups, timeline, and attribution
 * 
 * Uses Portal API exclusively (NestJS backend)
 */
import { create } from 'zustand'
import { crmApi } from './portal-api'

export const useCrmStore = create((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Prospects
  prospects: [],
  prospectsSummary: null,
  prospectsTotal: 0,
  prospectsLoading: false,
  prospectsError: null,
  
  // Selected prospect
  selectedProspect: null,
  selectedProspectLoading: false,
  
  // Calls
  calls: [],
  callsSummary: null,
  callsTotal: 0,
  callsLoading: false,
  callsError: null,
  
  // Tasks
  tasks: [],
  tasksLoading: false,
  tasksError: null,
  
  // Follow-ups
  followUps: [],
  followUpsLoading: false,
  followUpsError: null,
  
  // Timeline
  timeline: [],
  timelineLoading: false,
  timelineError: null,
  timelineHasMore: false,
  
  // Attribution
  attribution: null,
  attributionLoading: false,
  
  // Attribution stats (org-wide)
  attributionStats: [],
  attributionStatsLoading: false,
  
  // Team users (for assignment)
  teamUsers: [],
  teamUsersLoading: false,
  
  // Target Companies (Prospecting)
  targetCompanies: [],
  targetCompaniesTotal: 0,
  targetCompaniesLoading: false,
  targetCompaniesError: null,
  selectedTargetCompany: null,
  selectedTargetCompanyLoading: false,
  callPrepLoading: false,

  // ═══════════════════════════════════════════════════════════════════════════
  // PROSPECTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  fetchProspects: async (params = {}) => {
    set({ prospectsLoading: true, prospectsError: null })
    try {
      const response = await crmApi.listContacts(params)
      const data = response.data || response
      
      set({
        prospects: data.prospects || data.contacts || data,
        prospectsSummary: data.summary,
        prospectsTotal: data.total || (Array.isArray(data) ? data.length : 0),
        prospectsLoading: false
      })
      
      return data
    } catch (error) {
      set({ prospectsError: error.message, prospectsLoading: false })
      throw error
    }
  },
  
  fetchProspect: async (id) => {
    set({ selectedProspectLoading: true })
    try {
      const response = await crmApi.getContact(id)
      const data = response.data || response
      const prospect = data.prospect || data.contact || data
      
      set({ selectedProspect: prospect, selectedProspectLoading: false })
      return prospect
    } catch (error) {
      set({ selectedProspectLoading: false })
      throw error
    }
  },
  
  updateProspect: async (id, updates) => {
    try {
      const response = await crmApi.updateContact(id, updates)
      const data = response.data || response
      
      // Update local state
      set(state => ({
        prospects: state.prospects.map(p => 
          p.id === id ? { ...p, ...data } : p
        ),
        selectedProspect: state.selectedProspect?.id === id 
          ? { ...state.selectedProspect, ...data }
          : state.selectedProspect
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },
  
  bulkUpdateProspects: async (ids, updates) => {
    try {
      const response = await crmApi.bulkUpdateContacts(ids, updates)
      
      // Refresh prospects list
      await get().fetchProspects()
      
      return response.data || response
    } catch (error) {
      throw error
    }
  },
  
  convertProspect: async (id, options = {}) => {
    try {
      const response = await crmApi.convertProspect(id, options)
      return response.data || response
    } catch (error) {
      throw error
    }
  },
  
  setSelectedProspect: (prospect) => {
    set({ selectedProspect: prospect })
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLS
  // ═══════════════════════════════════════════════════════════════════════════
  
  fetchCalls: async (params = {}) => {
    set({ callsLoading: true, callsError: null })
    try {
      const response = await crmApi.listCalls(params)
      const data = response.data || response
      
      set({
        calls: data.calls || data,
        callsSummary: data.summary,
        callsTotal: data.total || (Array.isArray(data) ? data.length : 0),
        callsLoading: false
      })
      
      return data
    } catch (error) {
      set({ callsError: error.message, callsLoading: false })
      throw error
    }
  },
  
  fetchCall: async (id) => {
    try {
      const response = await crmApi.getCall(id)
      return response.data || response
    } catch (error) {
      throw error
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════════════════════
  
  fetchTasks: async (params = {}) => {
    set({ tasksLoading: true, tasksError: null })
    try {
      const response = await crmApi.listTasks(params)
      const data = response.data || response
      
      set({
        tasks: data.tasks || data,
        tasksLoading: false
      })
      
      return data
    } catch (error) {
      set({ tasksError: error.message, tasksLoading: false })
      throw error
    }
  },
  
  updateTask: async (id, updates) => {
    try {
      const response = await crmApi.updateTask(id, updates)
      const data = response.data || response
      
      // Update local state
      set(state => ({
        tasks: state.tasks.map(t => 
          t.id === id ? { ...t, ...data } : t
        )
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOLLOW-UPS
  // ═══════════════════════════════════════════════════════════════════════════
  
  fetchFollowUps: async (params = {}) => {
    set({ followUpsLoading: true, followUpsError: null })
    try {
      const response = await crmApi.listFollowUps(params)
      const data = response.data || response
      
      set({
        followUps: data.followUps || data,
        followUpsLoading: false
      })
      
      return data
    } catch (error) {
      set({ followUpsError: error.message, followUpsLoading: false })
      throw error
    }
  },
  
  updateFollowUp: async (id, updates) => {
    try {
      const response = await crmApi.updateFollowUp(id, updates)
      const data = response.data || response
      
      // Update local state
      set(state => ({
        followUps: state.followUps.map(f => 
          f.id === id ? { ...f, ...data } : f
        )
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  
  createNote: async (prospectId, content, options = {}) => {
    try {
      const response = await crmApi.createNote({
        prospectId,
        content,
        noteType: options.noteType || 'general',
        isPinned: options.isPinned || false
      })
      
      // Refresh timeline if viewing this prospect
      const { selectedProspect } = get()
      if (selectedProspect?.id === prospectId) {
        await get().fetchTimeline(prospectId)
      }
      
      return response.data || response
    } catch (error) {
      throw error
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  fetchTimeline: async (contactId, params = {}) => {
    set({ timelineLoading: true, timelineError: null })
    try {
      const response = await crmApi.getTimeline(contactId, params)
      const data = response.data || response
      
      const events = data.events || data.timeline || data
      const hasMore = data.hasMore || false
      
      // If cursor is provided, append to existing timeline
      if (params.cursor) {
        set(state => ({
          timeline: [...state.timeline, ...events],
          timelineHasMore: hasMore,
          timelineLoading: false
        }))
      } else {
        set({
          timeline: events,
          timelineHasMore: hasMore,
          timelineLoading: false
        })
      }
      
      return data
    } catch (error) {
      set({ timelineError: error.message, timelineLoading: false })
      throw error
    }
  },
  
  loadMoreTimeline: async (contactId) => {
    const { timeline } = get()
    if (timeline.length === 0) return
    
    // Use the oldest event's timestamp as cursor
    const oldestEvent = timeline[timeline.length - 1]
    const cursor = oldestEvent.event_time || oldestEvent.timestamp
    
    await get().fetchTimeline(contactId, { cursor })
  },
  
  logActivity: async (contactId, activity) => {
    try {
      const response = await crmApi.logActivity(contactId, activity)
      
      // Refresh timeline
      await get().fetchTimeline(contactId)
      
      return response.data || response
    } catch (error) {
      throw error
    }
  },
  
  clearTimeline: () => {
    set({ timeline: [], timelineHasMore: false, timelineError: null })
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTRIBUTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  fetchAttribution: async (contactId) => {
    set({ attributionLoading: true })
    try {
      const response = await crmApi.getAttribution(contactId)
      const data = response.data || response
      
      set({
        attribution: data,
        attributionLoading: false
      })
      
      return data
    } catch (error) {
      set({ attributionLoading: false })
      // Attribution is optional, don't throw
      console.warn('Failed to fetch attribution:', error)
      return null
    }
  },
  
  fetchAttributionStats: async (days = 90) => {
    set({ attributionStatsLoading: true })
    try {
      const response = await crmApi.getAttributionStats({ days })
      const data = response.data || response
      
      set({
        attributionStats: data.stats || data,
        attributionStatsLoading: false
      })
      
      return data
    } catch (error) {
      set({ attributionStatsLoading: false })
      throw error
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM USERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  fetchTeamUsers: async () => {
    set({ teamUsersLoading: true })
    try {
      const response = await crmApi.listUsers()
      const data = response.data || response
      
      set({
        teamUsers: data.users || data,
        teamUsersLoading: false
      })
      
      return data
    } catch (error) {
      set({ teamUsersLoading: false })
      throw error
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TARGET COMPANIES (Prospecting)
  // ═══════════════════════════════════════════════════════════════════════════
  
  fetchTargetCompanies: async (params = {}) => {
    set({ targetCompaniesLoading: true, targetCompaniesError: null })
    try {
      const response = await crmApi.listTargetCompanies(params)
      // API returns { data: TargetCompany[], total: number }
      // Axios wraps it as response.data = { data: [...], total: X }
      const responseData = response.data || response
      const companies = responseData.data || responseData.companies || (Array.isArray(responseData) ? responseData : [])
      const total = responseData.total || (Array.isArray(companies) ? companies.length : 0)
      
      set({
        targetCompanies: companies,
        targetCompaniesTotal: total,
        targetCompaniesLoading: false
      })
      
      return { companies, total }
    } catch (error) {
      set({ targetCompaniesError: error.message, targetCompaniesLoading: false })
      throw error
    }
  },
  
  fetchTargetCompany: async (id) => {
    set({ selectedTargetCompanyLoading: true })
    try {
      const response = await crmApi.getTargetCompany(id)
      const data = response.data || response
      
      set({ selectedTargetCompany: data, selectedTargetCompanyLoading: false })
      return data
    } catch (error) {
      set({ selectedTargetCompanyLoading: false })
      throw error
    }
  },
  
  analyzeWebsite: async (domain, options = {}) => {
    set({ targetCompaniesLoading: true })
    try {
      const response = await crmApi.analyzeWebsite(domain, options)
      const data = response.data || response
      
      // Add to local state
      set(state => ({
        targetCompanies: [data, ...state.targetCompanies.filter(c => c.domain !== domain)],
        targetCompaniesLoading: false
      }))
      
      return data
    } catch (error) {
      set({ targetCompaniesLoading: false })
      throw error
    }
  },
  
  claimTargetCompany: async (id) => {
    try {
      const response = await crmApi.claimTargetCompany(id)
      const data = response.data || response
      
      // Update local state
      set(state => ({
        targetCompanies: state.targetCompanies.map(c => 
          c.id === id ? { ...c, claimed_by: data.claimed_by, status: 'claimed' } : c
        ),
        selectedTargetCompany: state.selectedTargetCompany?.id === id 
          ? { ...state.selectedTargetCompany, claimed_by: data.claimed_by, status: 'claimed' }
          : state.selectedTargetCompany
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },
  
  unclaimTargetCompany: async (id) => {
    try {
      const response = await crmApi.unclaimTargetCompany(id)
      const data = response.data || response
      
      // Update local state
      set(state => ({
        targetCompanies: state.targetCompanies.map(c => 
          c.id === id ? { ...c, claimed_by: null, status: 'new' } : c
        ),
        selectedTargetCompany: state.selectedTargetCompany?.id === id 
          ? { ...state.selectedTargetCompany, claimed_by: null, status: 'new' }
          : state.selectedTargetCompany
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },
  
  getCallPrep: async (id, regenerate = false) => {
    set({ callPrepLoading: true })
    try {
      const response = await crmApi.getCallPrep(id, regenerate)
      const data = response.data || response
      
      // Update local state with call prep
      set(state => ({
        targetCompanies: state.targetCompanies.map(c => 
          c.id === id ? { ...c, call_prep: data.call_prep } : c
        ),
        selectedTargetCompany: state.selectedTargetCompany?.id === id 
          ? { ...state.selectedTargetCompany, call_prep: data.call_prep }
          : state.selectedTargetCompany,
        callPrepLoading: false
      }))
      
      return data
    } catch (error) {
      set({ callPrepLoading: false })
      throw error
    }
  },
  
  updateTargetCompany: async (id, updates) => {
    try {
      const response = await crmApi.updateTargetCompany(id, updates)
      const data = response.data || response
      
      // Update local state
      set(state => ({
        targetCompanies: state.targetCompanies.map(c => 
          c.id === id ? { ...c, ...data } : c
        ),
        selectedTargetCompany: state.selectedTargetCompany?.id === id 
          ? { ...state.selectedTargetCompany, ...data }
          : state.selectedTargetCompany
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },
  
  setSelectedTargetCompany: (company) => {
    set({ selectedTargetCompany: company })
  },
  
  // Trigger audit for a target company
  triggerAudit: async (id, options = {}) => {
    try {
      const response = await crmApi.triggerAudit(id, options)
      const data = response.data || response
      
      // Update local state with pending audit
      set(state => ({
        targetCompanies: state.targetCompanies.map(c => 
          c.id === id ? { ...c, last_audit_id: data.auditId, _auditPending: true } : c
        ),
        selectedTargetCompany: state.selectedTargetCompany?.id === id 
          ? { ...state.selectedTargetCompany, last_audit_id: data.auditId, _auditPending: true }
          : state.selectedTargetCompany
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },
  
  // Get audit status for a target company
  getAuditStatus: async (id) => {
    try {
      const response = await crmApi.getAuditStatus(id)
      const data = response.data || response
      
      // Update local state with audit status
      set(state => ({
        targetCompanies: state.targetCompanies.map(c => 
          c.id === id ? { 
            ...c, 
            _auditStatus: data.status,
            _auditScores: data.scores,
            _auditViewUrl: data.viewUrl,
            _auditPending: data.status === 'pending'
          } : c
        ),
        selectedTargetCompany: state.selectedTargetCompany?.id === id 
          ? { 
              ...state.selectedTargetCompany, 
              _auditStatus: data.status,
              _auditScores: data.scores,
              _auditViewUrl: data.viewUrl,
              _auditPending: data.status === 'pending'
            }
          : state.selectedTargetCompany
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },
  
  // Generate outreach email for a target company
  generateOutreach: async (id, options = {}) => {
    try {
      const response = await crmApi.generateOutreach(id, options)
      return response.data || response
    } catch (error) {
      throw error
    }
  },
  
  // Save scraped contacts for a target company
  saveContacts: async (id, contacts) => {
    try {
      const response = await crmApi.saveContacts(id, contacts)
      return response.data || response
    } catch (error) {
      throw error
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════════════════
  
  reset: () => {
    set({
      prospects: [],
      prospectsSummary: null,
      prospectsTotal: 0,
      prospectsLoading: false,
      prospectsError: null,
      selectedProspect: null,
      selectedProspectLoading: false,
      calls: [],
      callsSummary: null,
      callsTotal: 0,
      callsLoading: false,
      callsError: null,
      tasks: [],
      tasksLoading: false,
      tasksError: null,
      followUps: [],
      followUpsLoading: false,
      followUpsError: null,
      timeline: [],
      timelineLoading: false,
      timelineError: null,
      timelineHasMore: false,
      attribution: null,
      attributionLoading: false,
      attributionStats: [],
      attributionStatsLoading: false,
      teamUsers: [],
      teamUsersLoading: false,
      targetCompanies: [],
      targetCompaniesTotal: 0,
      targetCompaniesLoading: false,
      targetCompaniesError: null,
      selectedTargetCompany: null,
      selectedTargetCompanyLoading: false,
      callPrepLoading: false
    })
  }
}))

export default useCrmStore
