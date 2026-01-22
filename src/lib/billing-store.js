import { create } from 'zustand'
import { billingApi } from './portal-api'

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
      // For Billing module, only show invoices sent FROM Uptrade TO client
      // Set recipientView and showInBilling to filter appropriately
      const params = {
        ...filters,
        recipientView: filters.recipientView !== false ? true : filters.recipientView,
        showInBilling: filters.showInBilling !== false ? true : filters.showInBilling,
      }

      const response = await billingApi.listInvoices(params)
      const data = response.data || response
      
      set({ 
        invoices: data.invoices || data,
        isLoading: false 
      })
      
      return { success: true, data }
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
      const response = await billingApi.getInvoice(invoiceId)
      const data = response.data || response
      const invoice = data.invoice || data
      
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
      const response = await billingApi.createInvoice(invoiceData)
      const data = response.data || response
      
      // Add new invoice to the list
      set(state => ({ 
        invoices: [data.invoice || data, ...state.invoices],
        isLoading: false 
      }))
      
      return { success: true, data }
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
      const response = await billingApi.updateInvoice(invoiceId, invoiceData)
      const data = response.data || response
      const invoice = data.invoice || data
      
      // Update invoice in the list
      set(state => ({
        invoices: state.invoices.map(i => 
          i.id === invoiceId ? invoice : i
        ),
        currentInvoice: state.currentInvoice?.id === invoiceId 
          ? invoice 
          : state.currentInvoice,
        isLoading: false
      }))
      
      return { success: true, data }
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
      const response = await billingApi.markInvoicePaid(invoiceId)
      const data = response.data || response
      const invoice = data.invoice || data
      
      // Update invoice in the list
      set(state => ({
        invoices: state.invoices.map(i => 
          i.id === invoiceId ? invoice : i
        ),
        currentInvoice: state.currentInvoice?.id === invoiceId 
          ? invoice 
          : state.currentInvoice,
        isLoading: false
      }))
      
      // Refresh summary
      get().fetchBillingSummary()
      
      return { success: true, data }
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
      const response = await billingApi.getSummary()
      const data = response.data || response
      
      set({ 
        summary: data.summary || data,
        isLoading: false 
      })
      
      return { success: true, data }
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
      const response = await billingApi.getOverdue()
      const data = response.data || response
      
      const incoming = data.overdue_invoices || data.overdueInvoices || data
      const normalized = Array.isArray(incoming) ? incoming : []
      set({ overdueInvoices: normalized })
      
      return { success: true, data }
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
        return 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--glass-border)]'
      default:
        return 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--glass-border)]'
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

  formatDateTime: (dateString) => {
    if (!dateString) return ''
    // Ensure we're treating the timestamp as UTC if it doesn't have timezone info
    let date = new Date(dateString)
    
    // If the string doesn't end with 'Z' and doesn't have timezone offset, treat it as UTC
    if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
      date = new Date(dateString + 'Z')
    }
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  },

  // Check if invoice is overdue
  isOverdue: (invoice) => {
    if (invoice.status !== 'pending') return false
    const dueDate = new Date(invoice.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  },

  // Get days overdue
  getDaysOverdue: (invoice) => {
    if (!get().isOverdue(invoice)) return 0
    const dueDate = new Date(invoice.dueDate)
    const today = new Date()
    const diffTime = today - dueDate
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  },

  // Create payment via Square
  createPayment: async (invoiceId, paymentData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await billingApi.payInvoice(invoiceId, { sourceId: paymentData.sourceId })
      const data = response.data || response
      const invoice = data.invoice || data

      // Update invoice in the list to reflect paid status
      set(state => ({
        invoices: state.invoices.map(inv => 
          inv.id === invoiceId 
            ? invoice
            : inv
        ),
        currentInvoice: state.currentInvoice?.id === invoiceId
          ? invoice
          : state.currentInvoice,
        isLoading: false
      }))

      return { 
        success: true, 
        data,
        payment: data.payment
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

  // Send invoice with magic payment link
  sendInvoice: async (invoiceId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await billingApi.sendInvoice(invoiceId)
      const data = response.data || response
      
      // Update invoice in list
      set(state => ({
        invoices: state.invoices.map(inv => 
          inv.id === invoiceId 
            ? { ...inv, status: 'sent', sentAt: new Date().toISOString(), hasPaymentToken: true }
            : inv
        ),
        isLoading: false
      }))

      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to send invoice'
      set({ isLoading: false, error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Send reminder for unpaid invoice
  sendReminder: async (invoiceId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await billingApi.sendReminder(invoiceId)
      const data = response.data || response
      
      // Update invoice in list with new reminder count
      set(state => ({
        invoices: state.invoices.map(inv => 
          inv.id === invoiceId 
            ? { 
                ...inv, 
                reminderCount: data.reminderCount,
                lastReminderSent: new Date().toISOString(),
                nextReminderDate: data.nextReminderDate
              }
            : inv
        ),
        isLoading: false
      }))

      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to send reminder'
      set({ isLoading: false, error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Delete invoice (admin only)
  deleteInvoice: async (invoiceId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await billingApi.deleteInvoice(invoiceId)
      const data = response.data || response
      
      // Remove invoice from the list
      set(state => ({
        invoices: state.invoices.filter(i => i.id !== invoiceId),
        currentInvoice: state.currentInvoice?.id === invoiceId ? null : state.currentInvoice,
        isLoading: false
      }))
      
      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete invoice'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Toggle recurring invoice pause/resume
  toggleRecurringPause: async (invoiceId, paused) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await billingApi.toggleRecurringPause(invoiceId, paused)
      const data = response.data || response
      
      // Update invoice in list
      set(state => ({
        invoices: state.invoices.map(inv => 
          inv.id === invoiceId 
            ? { ...inv, recurringPaused: paused }
            : inv
        ),
        isLoading: false
      }))

      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update recurring status'
      set({ isLoading: false, error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Get recurring interval label
  getRecurringIntervalLabel: (interval) => {
    switch (interval) {
      case 'weekly': return 'Weekly'
      case 'bi-weekly': return 'Bi-Weekly'
      case 'monthly': return 'Monthly'
      case 'quarterly': return 'Quarterly'
      case 'semi-annual': return 'Semi-Annual'
      case 'annual': return 'Annual'
      default: return interval
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
