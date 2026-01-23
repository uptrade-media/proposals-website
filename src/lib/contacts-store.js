/**
 * Unified Contacts Store - Zustand store for unified contacts
 * Handles all contact types: prospects, leads, clients, customers, team
 * 
 * Uses Portal API (NestJS backend) - /contacts endpoints
 */
import { create } from 'zustand'
import { contactsApi } from './portal-api'

// Contact type constants
export const ContactType = {
  PROSPECT: 'prospect',
  LEAD: 'lead',
  CLIENT: 'client',
  CUSTOMER: 'customer',
  TEAM: 'team',
  PARTNER: 'partner',
  VENDOR: 'vendor',
  OTHER: 'other',
}

// Pipeline stage constants
export const PipelineStage = {
  NEW_LEAD: 'new_lead',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost',
  DISQUALIFIED: 'disqualified',
}

export const useContactsStore = create((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // All contacts
  contacts: [],
  total: 0,
  summary: null,
  loading: false,
  error: null,
  
  // Selected contact
  selectedContact: null,
  selectedContactLoading: false,
  
  // Filters state
  filters: {
    types: [],
    stage: null,
    search: '',
    source: null,
    assignedTo: null,
    tags: [],
  },
  
  // Pagination
  pagination: {
    limit: 50,
    offset: 0,
    hasMore: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED GETTERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Get contacts by type
  getProspects: () => get().contacts.filter(c => 
    [ContactType.PROSPECT, ContactType.LEAD].includes(c.contact_type)
  ),
  
  getLeads: () => get().contacts.filter(c => 
    c.contact_type === ContactType.LEAD
  ),
  
  getClients: () => get().contacts.filter(c => 
    c.contact_type === ContactType.CLIENT
  ),
  
  getCustomers: () => get().contacts.filter(c => 
    c.contact_type === ContactType.CUSTOMER
  ),
  
  getTeam: () => get().contacts.filter(c => 
    c.contact_type === ContactType.TEAM || c.is_team_member
  ),
  
  // Get by pipeline stage
  getByStage: (stage) => get().contacts.filter(c => 
    c.pipeline_stage === stage
  ),
  
  // Get contacts with portal access
  getPortalUsers: () => get().contacts.filter(c => 
    c.auth_user_id !== null
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Fetch contacts with optional filters
  fetchContacts: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const { filters, pagination } = get()
      
      // Merge current filters with passed params
      const queryParams = {
        ...filters,
        ...pagination,
        ...params,
      }
      
      // Clean up empty values
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === null || queryParams[key] === '' || 
            (Array.isArray(queryParams[key]) && queryParams[key].length === 0)) {
          delete queryParams[key]
        }
      })
      
      const response = await contactsApi.list(queryParams)
      const data = response.data || response
      
      set({
        contacts: data.contacts || data,
        total: data.total || (Array.isArray(data) ? data.length : 0),
        summary: data.summary || null,
        pagination: data.pagination || get().pagination,
        loading: false,
      })
      
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
  
  // Fetch contacts for a specific project
  fetchProjectContacts: async (projectId, params = {}) => {
    set({ loading: true, error: null })
    try {
      const response = await contactsApi.listByProject(projectId, params)
      const data = response.data || response
      
      set({
        contacts: data.contacts || data,
        total: data.total || 0,
        summary: data.summary || null,
        loading: false,
      })
      
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
  
  // Fetch single contact
  fetchContact: async (id) => {
    set({ selectedContactLoading: true })
    try {
      const response = await contactsApi.get(id)
      const contact = response.data || response
      
      set({ 
        selectedContact: contact,
        selectedContactLoading: false,
      })
      
      return contact
    } catch (error) {
      set({ selectedContactLoading: false })
      throw error
    }
  },
  
  // Create contact
  createContact: async (data) => {
    try {
      const response = await contactsApi.create(data)
      const newContact = response.data || response
      
      // Add to local state
      set(state => ({
        contacts: [newContact, ...state.contacts],
        total: state.total + 1,
      }))
      
      return newContact
    } catch (error) {
      throw error
    }
  },
  
  // Update contact
  updateContact: async (id, data) => {
    try {
      const response = await contactsApi.update(id, data)
      const updatedContact = response.data || response
      
      // Update in local state
      set(state => ({
        contacts: state.contacts.map(c => 
          c.id === id ? updatedContact : c
        ),
        selectedContact: state.selectedContact?.id === id 
          ? updatedContact 
          : state.selectedContact,
      }))
      
      return updatedContact
    } catch (error) {
      throw error
    }
  },
  
  // Delete contact
  deleteContact: async (id) => {
    try {
      await contactsApi.delete(id)
      
      // Remove from local state
      set(state => ({
        contacts: state.contacts.filter(c => c.id !== id),
        total: state.total - 1,
        selectedContact: state.selectedContact?.id === id 
          ? null 
          : state.selectedContact,
      }))
      
      return true
    } catch (error) {
      throw error
    }
  },
  
  // Convert contact to different type
  convertContact: async (id, newType, options = {}) => {
    try {
      const response = await contactsApi.convert(id, { 
        newType, 
        ...options,
      })
      const updatedContact = response.data || response
      
      // Update in local state
      set(state => ({
        contacts: state.contacts.map(c => 
          c.id === id ? updatedContact : c
        ),
        selectedContact: state.selectedContact?.id === id 
          ? updatedContact 
          : state.selectedContact,
      }))
      
      return updatedContact
    } catch (error) {
      throw error
    }
  },
  
  // Merge contacts
  mergeContacts: async (primaryId, mergeWithId, dataPriority = 'primary') => {
    try {
      const response = await contactsApi.merge(primaryId, mergeWithId, dataPriority)
      const mergedContact = response.data || response
      
      // Update local state - remove merged contact, update primary
      set(state => ({
        contacts: state.contacts
          .filter(c => c.id !== mergeWithId)
          .map(c => c.id === primaryId ? mergedContact : c),
        total: state.total - 1,
        selectedContact: state.selectedContact?.id === primaryId 
          ? mergedContact 
          : state.selectedContact?.id === mergeWithId
            ? null
            : state.selectedContact,
      }))
      
      return mergedContact
    } catch (error) {
      throw error
    }
  },
  
  // Bulk update contacts
  bulkUpdateContacts: async (ids, data) => {
    try {
      const response = await contactsApi.bulkUpdate(ids, data)
      
      // Refresh to get updated data
      await get().fetchContacts()
      
      return response.data || response
    } catch (error) {
      throw error
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value },
      pagination: { ...state.pagination, offset: 0 }, // Reset pagination
    }))
  },
  
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, offset: 0 },
    }))
  },
  
  resetFilters: () => {
    set({
      filters: {
        types: [],
        stage: null,
        search: '',
        source: null,
        assignedTo: null,
        tags: [],
      },
      pagination: { limit: 50, offset: 0, hasMore: false },
    })
  },
  
  // Filter by type preset
  filterByProspects: () => {
    set(state => ({
      filters: { 
        ...state.filters, 
        types: [ContactType.PROSPECT, ContactType.LEAD],
      },
    }))
    get().fetchContacts()
  },
  
  filterByCustomers: () => {
    set(state => ({
      filters: { 
        ...state.filters, 
        types: [ContactType.CUSTOMER],
      },
    }))
    get().fetchContacts()
  },
  
  filterByClients: () => {
    set(state => ({
      filters: { 
        ...state.filters, 
        types: [ContactType.CLIENT],
      },
    }))
    get().fetchContacts()
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  loadMore: async () => {
    const { pagination, contacts, loading } = get()
    if (loading || !pagination.hasMore) return
    
    set(state => ({
      pagination: { 
        ...state.pagination, 
        offset: state.pagination.offset + state.pagination.limit,
      },
    }))
    
    const response = await contactsApi.list({
      ...get().filters,
      ...get().pagination,
    })
    const data = response.data || response
    
    set({
      contacts: [...contacts, ...(data.contacts || data)],
      pagination: data.pagination || get().pagination,
    })
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  setSelectedContact: (contact) => {
    set({ selectedContact: contact })
  },
  
  clearSelectedContact: () => {
    set({ selectedContact: null })
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Find contact by email (locally)
  findByEmail: (email) => {
    return get().contacts.find(c => 
      c.email?.toLowerCase() === email?.toLowerCase()
    )
  },
  
  // Get contact by ID (locally)
  getById: (id) => {
    return get().contacts.find(c => c.id === id)
  },
  
  // Reset entire store
  reset: () => {
    set({
      contacts: [],
      total: 0,
      summary: null,
      loading: false,
      error: null,
      selectedContact: null,
      selectedContactLoading: false,
      filters: {
        types: [],
        stage: null,
        search: '',
        source: null,
        assignedTo: null,
        tags: [],
      },
      pagination: {
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    })
  },
}))

export default useContactsStore
