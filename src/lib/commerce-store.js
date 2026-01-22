/**
 * Commerce Store
 * 
 * Unified commerce module - products, services, classes, events, sales, customers.
 * Uses Portal API for all operations.
 */
import { create } from 'zustand'
import portalApi from './portal-api'
import { supabase } from './supabase'

// ==================== API Functions ====================

// Settings
export async function getCommerceSettings(projectId) {
  const response = await portalApi.get(`/commerce/settings/${projectId}`)
  return response.data
}

export async function updateCommerceSettings(projectId, settings) {
  const response = await portalApi.put(`/commerce/settings/${projectId}`, settings)
  return response.data
}

// Dashboard
export async function getCommerceDashboard(projectId) {
  const response = await portalApi.get(`/commerce/dashboard/${projectId}`)
  return response.data
}

// Categories
export async function getCategories(projectId) {
  const response = await portalApi.get(`/commerce/categories/${projectId}`)
  return response.data
}

// Offerings
export async function getOfferings(projectId, filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value)
    }
  })
  const response = await portalApi.get(`/commerce/offerings/${projectId}?${params}`)
  return response.data
}

export async function getOffering(offeringId) {
  const response = await portalApi.get(`/commerce/offering/${offeringId}`)
  return response.data
}

export async function createOffering(projectId, data) {
  const response = await portalApi.post(`/commerce/offerings/${projectId}`, data)
  return response.data
}

export async function updateOffering(offeringId, data) {
  const response = await portalApi.put(`/commerce/offering/${offeringId}`, data)
  return response.data
}

export async function deleteOffering(offeringId) {
  const response = await portalApi.delete(`/commerce/offering/${offeringId}`)
  return response.data
}

// Offering Images
export async function uploadOfferingImage(offeringId, file, isFeatured = false) {
  // Generate unique file ID and path
  const fileId = crypto.randomUUID()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const storagePath = `commerce/${offeringId}/${fileId}.${ext}`
  
  // Upload directly to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(storagePath, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })
  
  if (uploadError) throw uploadError
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('files')
    .getPublicUrl(storagePath)
  
  // Register the file with the API
  const response = await portalApi.post(`/commerce/offering/${offeringId}/images/register`, {
    fileId,
    filename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    storagePath,
    publicUrl: urlData.publicUrl,
    isFeatured
  })
  return response.data
}

export async function deleteOfferingImage(offeringId, fileId) {
  const response = await portalApi.delete(`/commerce/offering/${offeringId}/images/${fileId}`)
  return response.data
}

export async function setFeaturedImage(offeringId, fileId) {
  const response = await portalApi.put(`/commerce/offering/${offeringId}/images/${fileId}/featured`)
  return response.data
}

export async function reorderOfferingImages(offeringId, imageIds) {
  const response = await portalApi.put(`/commerce/offering/${offeringId}/images/reorder`, { imageIds })
  return response.data
}

// Variants
export async function getVariants(offeringId) {
  const response = await portalApi.get(`/commerce/variants/${offeringId}`)
  return response.data
}

export async function createVariant(offeringId, data) {
  const response = await portalApi.post(`/commerce/variants/${offeringId}`, data)
  return response.data
}

export async function updateVariant(variantId, data) {
  const response = await portalApi.put(`/commerce/variant/${variantId}`, data)
  return response.data
}

export async function deleteVariant(variantId) {
  const response = await portalApi.delete(`/commerce/variant/${variantId}`)
  return response.data
}

// Schedules (for classes/events)
export async function getSchedules(offeringId) {
  const response = await portalApi.get(`/commerce/schedules/${offeringId}`)
  return response.data
}

export async function createSchedule(offeringId, data) {
  const response = await portalApi.post(`/commerce/schedules/${offeringId}`, data)
  return response.data
}

export async function updateSchedule(scheduleId, data) {
  const response = await portalApi.put(`/commerce/schedule/${scheduleId}`, data)
  return response.data
}

export async function deleteSchedule(scheduleId) {
  const response = await portalApi.delete(`/commerce/schedule/${scheduleId}`)
  return response.data
}

// Sales
export async function getSales(projectId, filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value)
    }
  })
  const response = await portalApi.get(`/commerce/sales/${projectId}?${params}`)
  return response.data
}

export async function getSalesStats(projectId, dateRange = {}) {
  const params = new URLSearchParams()
  if (dateRange.start) params.append('start_date', dateRange.start)
  if (dateRange.end) params.append('end_date', dateRange.end)
  const response = await portalApi.get(`/commerce/sales/${projectId}/stats?${params}`)
  return response.data
}

export async function createSale(projectId, data) {
  const response = await portalApi.post(`/commerce/sales/${projectId}`, data)
  return response.data
}

export async function updateSale(projectId, id, data) {
  const response = await portalApi.put(`/commerce/sales/${projectId}/${id}`, data)
  return response.data
}

export async function completeSale(projectId, id) {
  const response = await portalApi.post(`/commerce/sales/${projectId}/${id}/complete`)
  return response.data
}

export async function refundSale(projectId, id, reason) {
  const response = await portalApi.post(`/commerce/sales/${projectId}/${id}/refund`, { reason })
  return response.data
}

// Customers
export async function getCustomers(projectId, filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        params.append(key, value.join(','))
      } else {
        params.append(key, value)
      }
    }
  })
  const response = await portalApi.get(`/commerce/customers/${projectId}?${params}`)
  return response.data
}

export async function getCustomer(projectId, id) {
  const response = await portalApi.get(`/commerce/customers/${projectId}/${id}`)
  return response.data
}

export async function getCustomerPurchases(projectId, customerId) {
  const response = await portalApi.get(`/commerce/customers/${projectId}/${customerId}/purchases`)
  return response.data
}

export async function createCustomer(projectId, data) {
  const response = await portalApi.post(`/commerce/customers/${projectId}`, data)
  return response.data
}

export async function updateCustomer(projectId, id, data) {
  const response = await portalApi.put(`/commerce/customers/${projectId}/${id}`, data)
  return response.data
}

export async function addCustomerTags(projectId, id, tags) {
  const response = await portalApi.post(`/commerce/customers/${projectId}/${id}/tags`, { tags })
  return response.data
}

export async function linkCustomerGmail(projectId, id, threadId) {
  const response = await portalApi.post(`/commerce/customers/${projectId}/${id}/link-gmail`, { thread_id: threadId })
  return response.data
}

// ==================== Zustand Store ====================

export const useCommerceStore = create((set, get) => ({
  // State
  settings: null,
  settingsLoading: false,
  settingsError: null,
  
  dashboard: null,
  dashboardLoading: false,
  dashboardError: null,
  
  offerings: [],
  offeringsLoading: false,
  offeringsError: null,
  currentOffering: null,
  
  sales: [],
  salesLoading: false,
  salesError: null,
  salesStats: null,
  
  customers: [],
  customersLoading: false,
  customersError: null,
  currentCustomer: null,
  
  categories: [],
  
  // Actions
  fetchSettings: async (projectId) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const settings = await getCommerceSettings(projectId)
      set({ settings, settingsLoading: false })
      return settings
    } catch (error) {
      const message = error.response?.data?.message || error.message
      set({ settingsError: message, settingsLoading: false })
      throw error
    }
  },
  
  updateSettings: async (projectId, settings) => {
    try {
      const updated = await updateCommerceSettings(projectId, settings)
      set({ settings: updated })
      return updated
    } catch (error) {
      throw error
    }
  },
  
  fetchDashboard: async (projectId) => {
    set({ dashboardLoading: true, dashboardError: null })
    try {
      const dashboard = await getCommerceDashboard(projectId)
      set({ 
        dashboard, 
        dashboardLoading: false,
        settings: dashboard.settings,
        categories: dashboard.categories || []
      })
      return dashboard
    } catch (error) {
      const message = error.response?.data?.message || error.message
      set({ dashboardError: message, dashboardLoading: false })
      throw error
    }
  },
  
  fetchOfferings: async (projectId, filters = {}) => {
    set({ offeringsLoading: true, offeringsError: null })
    try {
      const offerings = await getOfferings(projectId, filters)
      set({ offerings, offeringsLoading: false })
      return offerings
    } catch (error) {
      const message = error.response?.data?.message || error.message
      set({ offeringsError: message, offeringsLoading: false })
      throw error
    }
  },
  
  fetchOffering: async (projectId, id) => {
    try {
      // getOffering only needs the offering ID (not projectId)
      const offering = await getOffering(id)
      set({ currentOffering: offering })
      return offering
    } catch (error) {
      throw error
    }
  },
  
  createOffering: async (projectId, data) => {
    try {
      const offering = await createOffering(projectId, data)
      set(state => ({ offerings: [offering, ...state.offerings] }))
      return offering
    } catch (error) {
      console.error('Failed to create offering:', error)
      throw error
    }
  },
  
  updateOffering: async (id, data) => {
    try {
      const offering = await updateOffering(id, data)
      set(state => ({
        offerings: state.offerings.map(o => o.id === id ? offering : o),
        currentOffering: state.currentOffering?.id === id ? offering : state.currentOffering
      }))
      return offering
    } catch (error) {
      console.error('Failed to update offering:', error)
      throw error
    }
  },
  
  deleteOffering: async (id) => {
    try {
      await deleteOffering(id)
      set(state => ({
        offerings: state.offerings.filter(o => o.id !== id),
        currentOffering: state.currentOffering?.id === id ? null : state.currentOffering
      }))
    } catch (error) {
      console.error('Failed to delete offering:', error)
      throw error
    }
  },
  
  fetchSales: async (projectId, filters = {}) => {
    set({ salesLoading: true, salesError: null })
    try {
      const sales = await getSales(projectId, filters)
      set({ sales, salesLoading: false })
      return sales
    } catch (error) {
      const message = error.response?.data?.message || error.message
      set({ salesError: message, salesLoading: false })
      throw error
    }
  },
  
  fetchSalesStats: async (projectId, dateRange = {}) => {
    try {
      const stats = await getSalesStats(projectId, dateRange)
      set({ salesStats: stats })
      return stats
    } catch (error) {
      throw error
    }
  },
  
  createSale: async (projectId, data) => {
    const sale = await createSale(projectId, data)
    set(state => ({ sales: [sale, ...state.sales] }))
    return sale
  },
  
  completeSale: async (projectId, id) => {
    const sale = await completeSale(projectId, id)
    set(state => ({
      sales: state.sales.map(s => s.id === id ? sale : s)
    }))
    return sale
  },
  
  fetchCustomers: async (projectId, filters = {}) => {
    set({ customersLoading: true, customersError: null })
    try {
      const customers = await getCustomers(projectId, filters)
      set({ customers, customersLoading: false })
      return customers
    } catch (error) {
      const message = error.response?.data?.message || error.message
      set({ customersError: message, customersLoading: false })
      throw error
    }
  },
  
  fetchCustomer: async (projectId, id) => {
    const customer = await getCustomer(projectId, id)
    set({ currentCustomer: customer })
    return customer
  },
  
  createCustomer: async (projectId, data) => {
    const customer = await createCustomer(projectId, data)
    set(state => ({ customers: [customer, ...state.customers] }))
    return customer
  },
  
  updateCustomer: async (projectId, id, data) => {
    const customer = await updateCustomer(projectId, id, data)
    set(state => ({
      customers: state.customers.map(c => c.id === id ? customer : c),
      currentCustomer: state.currentCustomer?.id === id ? customer : state.currentCustomer
    }))
    return customer
  },
  
  // Reset store
  reset: () => {
    set({
      settings: null,
      dashboard: null,
      offerings: [],
      sales: [],
      customers: [],
      currentOffering: null,
      currentCustomer: null,
      salesStats: null,
      categories: [],
      discountCodes: []
    })
  }
}))

// ==================== Discount Codes API Functions ====================

export async function getDiscountCodes(projectId, filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value)
    }
  })
  const response = await portalApi.get(`/commerce/discounts/${projectId}?${params}`)
  return response.data
}

export async function getDiscountCode(projectId, id) {
  const response = await portalApi.get(`/commerce/discounts/${projectId}/${id}`)
  return response.data
}

export async function createDiscountCode(projectId, data) {
  const response = await portalApi.post(`/commerce/discounts/${projectId}`, data)
  return response.data
}

export async function updateDiscountCode(projectId, id, data) {
  const response = await portalApi.put(`/commerce/discounts/${projectId}/${id}`, data)
  return response.data
}

export async function deleteDiscountCode(projectId, id) {
  const response = await portalApi.delete(`/commerce/discounts/${projectId}/${id}`)
  return response.data
}

export async function validateDiscountCode(projectId, data) {
  const response = await portalApi.post(`/commerce/discounts/${projectId}/validate`, data)
  return response.data
}

export async function getDiscountUsage(projectId, id, filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value)
    }
  })
  const response = await portalApi.get(`/commerce/discounts/${projectId}/${id}/usage?${params}`)
  return response.data
}

export default useCommerceStore
