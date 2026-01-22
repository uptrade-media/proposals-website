/**
 * Customers Store
 * 
 * State management for the Customers module.
 * Customers = people who have purchased (post-sale).
 * Auto-created from commerce_sales.
 */
import { create } from 'zustand'
import portalApi from './portal-api'

// ==================== API Functions ====================

export async function getCustomerStats(projectId) {
  const response = await portalApi.get(`/customers/${projectId}/stats`)
  return response.data
}

export async function getCustomers(projectId, filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v))
      } else {
        params.append(key, value)
      }
    }
  })
  const response = await portalApi.get(`/customers/${projectId}?${params}`)
  return response.data
}

export async function getCustomer(projectId, customerId) {
  const response = await portalApi.get(`/customers/${projectId}/${customerId}`)
  return response.data
}

export async function createCustomer(projectId, data) {
  const response = await portalApi.post(`/customers/${projectId}`, data)
  return response.data
}

export async function updateCustomer(projectId, customerId, data) {
  const response = await portalApi.put(`/customers/${projectId}/${customerId}`, data)
  return response.data
}

export async function deleteCustomer(projectId, customerId) {
  const response = await portalApi.delete(`/customers/${projectId}/${customerId}`)
  return response.data
}

export async function getCustomerPurchases(projectId, customerId) {
  const response = await portalApi.get(`/customers/${projectId}/${customerId}/purchases`)
  return response.data
}

export async function addCustomerTag(projectId, customerId, tag) {
  const response = await portalApi.post(`/customers/${projectId}/${customerId}/tags`, { tag })
  return response.data
}

export async function removeCustomerTag(projectId, customerId, tag) {
  const response = await portalApi.delete(`/customers/${projectId}/${customerId}/tags/${encodeURIComponent(tag)}`)
  return response.data
}

export async function addCustomerNote(projectId, customerId, note) {
  const response = await portalApi.post(`/customers/${projectId}/${customerId}/notes`, { note })
  return response.data
}

// ==================== Store ====================

export const useCustomersStore = create((set, get) => ({
  // State
  customers: null,
  currentCustomer: null,
  purchases: null,
  stats: null,
  totalCount: 0,
  isLoading: false,
  error: null,

  // Actions
  fetchStats: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      const stats = await getCustomerStats(projectId)
      set({ stats, isLoading: false })
      return stats
    } catch (error) {
      console.error('[Customers] Failed to fetch stats:', error)
      // Return default stats if endpoint doesn't exist yet
      set({ 
        stats: {
          totalCustomers: 0,
          totalRevenue: 0,
          repeatRate: 0,
          newCustomers30d: 0,
        },
        isLoading: false,
        error: null // Don't show error for missing endpoint
      })
    }
  },

  fetchCustomers: async (projectId, filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const result = await getCustomers(projectId, filters)
      // Handle both array and paginated response
      const customers = Array.isArray(result) ? result : result.data || []
      const totalCount = result.total || customers.length
      set({ customers, totalCount, isLoading: false })
      return customers
    } catch (error) {
      console.error('[Customers] Failed to fetch customers:', error)
      set({ customers: [], isLoading: false, error: error.message })
      return []
    }
  },

  fetchCustomer: async (projectId, customerId) => {
    set({ isLoading: true, error: null })
    try {
      const customer = await getCustomer(projectId, customerId)
      set({ currentCustomer: customer, isLoading: false })
      return customer
    } catch (error) {
      console.error('[Customers] Failed to fetch customer:', error)
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  fetchPurchases: async (projectId, customerId) => {
    try {
      const purchases = await getCustomerPurchases(projectId, customerId)
      set({ purchases })
      return purchases
    } catch (error) {
      console.error('[Customers] Failed to fetch purchases:', error)
      set({ purchases: [] })
      return []
    }
  },

  updateCustomer: async (projectId, customerId, data) => {
    try {
      const updated = await updateCustomer(projectId, customerId, data)
      set({ currentCustomer: updated })
      // Update in list if present
      set(state => ({
        customers: state.customers?.map(c => 
          c.id === customerId ? { ...c, ...updated } : c
        )
      }))
      return updated
    } catch (error) {
      console.error('[Customers] Failed to update customer:', error)
      throw error
    }
  },

  addTag: async (projectId, customerId, tag) => {
    try {
      const updated = await addCustomerTag(projectId, customerId, tag)
      set({ currentCustomer: updated })
      return updated
    } catch (error) {
      console.error('[Customers] Failed to add tag:', error)
      throw error
    }
  },

  removeTag: async (projectId, customerId, tag) => {
    try {
      const updated = await removeCustomerTag(projectId, customerId, tag)
      set({ currentCustomer: updated })
      return updated
    } catch (error) {
      console.error('[Customers] Failed to remove tag:', error)
      throw error
    }
  },

  addNote: async (projectId, customerId, note) => {
    try {
      const updated = await addCustomerNote(projectId, customerId, note)
      set({ currentCustomer: updated })
      return updated
    } catch (error) {
      console.error('[Customers] Failed to add note:', error)
      throw error
    }
  },

  clearCustomer: () => {
    set({ currentCustomer: null, purchases: null })
  },

  reset: () => {
    set({
      customers: null,
      currentCustomer: null,
      purchases: null,
      stats: null,
      totalCount: 0,
      isLoading: false,
      error: null,
    })
  },
}))

export default useCustomersStore
