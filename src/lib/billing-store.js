import { create } from 'zustand'
import api from './api'

const useBillingStore = create((set, get) => ({
  invoices: [],
  currentInvoice: null,
  summary: null,
  overdueInvoices: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pages: 1,
    per_page: 20,
    total: 0,
    has_next: false,
    has_prev: false
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Fetch invoices
  fetchInvoices: async (filters = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.projectId) params.append('projectId', filters.projectId)
      
      const url = `/.netlify/functions/invoices-list${params.toString() ? `?${params.toString()}` : ''}`
      const response = await api.get(url)
      
      set({ 
        invoices: response.data.invoices,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch invoices'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch single invoice
  fetchInvoice: async (invoiceId) => {
    set({ isLoading: true, error: null })
    
    try {
      // fetchInvoice currently uses the list endpoint
      // Individual invoice fetch can be added later if needed
      const response = await api.get(`/.netlify/functions/invoices-list`)
      const invoice = response.data.invoices.find(inv => inv.id === invoiceId)
      
      if (!invoice) {
        throw new Error('Invoice not found')
      }
      
      set({ 
        currentInvoice: invoice,
        isLoading: false 
      })
      
      return { success: true, data: { invoice } }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch invoice'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Create new invoice (admin only)
  createInvoice: async (invoiceData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post('/.netlify/functions/invoices-create', invoiceData)
      
      // Add new invoice to the list
      set(state => ({ 
        invoices: [response.data.invoice, ...state.invoices],
        isLoading: false 
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create invoice'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Update invoice (admin only)
  updateInvoice: async (invoiceId, invoiceData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.put(`/invoices/${invoiceId}`, invoiceData)
      
      // Update invoice in the list
      set(state => ({
        invoices: state.invoices.map(i => 
          i.id === invoiceId ? response.data.invoice : i
        ),
        currentInvoice: state.currentInvoice?.id === invoiceId 
          ? response.data.invoice 
          : state.currentInvoice,
        isLoading: false
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update invoice'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Mark invoice as paid (admin only)
  markInvoicePaid: async (invoiceId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post(`/invoices/${invoiceId}/mark-paid`)
      
      // Update invoice in the list
      set(state => ({
        invoices: state.invoices.map(i => 
          i.id === invoiceId ? response.data.invoice : i
        ),
        currentInvoice: state.currentInvoice?.id === invoiceId 
          ? response.data.invoice 
          : state.currentInvoice,
        isLoading: false
      }))
      
      // Refresh summary
      get().fetchBillingSummary()
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to mark invoice as paid'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch billing summary
  fetchBillingSummary: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get('/billing/summary')
      set({ 
        summary: response.data.summary,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch billing summary'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch overdue invoices
  fetchOverdueInvoices: async () => {
    try {
      const response = await api.get('/billing/overdue')
      set({ overdueInvoices: response.data.overdue_invoices })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch overdue invoices'
      set({ error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Get status color
  getStatusColor: (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  },

  // Get status icon
  getStatusIcon: (status) => {
    switch (status) {
      case 'paid':
        return 'CheckCircle'
      case 'pending':
        return 'Clock'
      case 'overdue':
        return 'AlertCircle'
      case 'cancelled':
        return 'XCircle'
      default:
        return 'Clock'
    }
  },

  // Format currency
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  },

  // Format date
  formatDate: (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  },

  // Check if invoice is overdue
  isOverdue: (invoice) => {
    if (invoice.status !== 'pending') return false
    const dueDate = new Date(invoice.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  },

  // Get days overdue
  getDaysOverdue: (invoice) => {
    if (!get().isOverdue(invoice)) return 0
    const dueDate = new Date(invoice.due_date)
    const today = new Date()
    const diffTime = today - dueDate
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  },

  // Create payment via Square
  createPayment: async (invoiceId, paymentData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post('/.netlify/functions/invoices-pay', {
        invoiceId,
        sourceId: paymentData.sourceId
      })

      // Update invoice in the list to reflect paid status
      set(state => ({
        invoices: state.invoices.map(inv => 
          inv.id === invoiceId 
            ? response.data.invoice
            : inv
        ),
        currentInvoice: state.currentInvoice?.id === invoiceId
          ? response.data.invoice
          : state.currentInvoice,
        isLoading: false
      }))

      return { 
        success: true, 
        data: response.data,
        payment: response.data.payment
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Payment failed'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Clear current invoice
  clearCurrentInvoice: () => set({ currentInvoice: null }),

  // Clear all data (for logout)
  clearAll: () => set({
    invoices: [],
    currentInvoice: null,
    summary: null,
    overdueInvoices: [],
    error: null,
    pagination: {
      page: 1,
      pages: 1,
      per_page: 20,
      total: 0,
      has_next: false,
      has_prev: false
    }
  })
}))

export default useBillingStore
