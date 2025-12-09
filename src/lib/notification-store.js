import { create } from 'zustand'
import api from './api'

/**
 * Notification Store
 * Centralized tracking of notification badges for sidebar and headers
 * 
 * Tracks:
 * - New leads (unviewed prospects in 'new_lead' pipeline stage)
 * - Future: Could track pending proposals, overdue tasks, etc.
 */
const useNotificationStore = create((set, get) => ({
  // New leads that haven't been viewed
  newLeadsCount: 0,
  lastFetchedAt: null,
  isLoading: false,
  error: null,

  // Fetch count of new leads (prospects in 'new_lead' stage)
  fetchNewLeadsCount: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Fetch prospects and count those in 'new_lead' stage
      const response = await api.get('/.netlify/functions/crm-prospects-list?stage=new_lead')
      const prospects = response.data.prospects || []
      
      // Count prospects that are genuinely new (created in last 7 days and in new_lead stage)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const newCount = prospects.filter(p => {
        const createdAt = new Date(p.created_at)
        return createdAt >= sevenDaysAgo
      }).length
      
      set({ 
        newLeadsCount: newCount,
        lastFetchedAt: new Date().toISOString(),
        isLoading: false 
      })
      
      return { success: true, count: newCount }
    } catch (error) {
      console.error('Failed to fetch new leads count:', error)
      set({ 
        isLoading: false, 
        error: error.message 
      })
      return { success: false, error: error.message }
    }
  },

  // Mark leads as viewed (reset the count)
  // Called when user navigates to Clients section
  markLeadsAsViewed: () => {
    // For now, we don't persist this - count resets on fetch
    // In the future, could track "last viewed at" timestamp per user
    set({ newLeadsCount: 0 })
  },

  // Manually set count (useful for real-time updates)
  setNewLeadsCount: (count) => set({ newLeadsCount: count }),

  // Increment count (for real-time new lead notifications)
  incrementNewLeadsCount: () => set(state => ({ 
    newLeadsCount: state.newLeadsCount + 1 
  })),

  // Clear all notification state (for logout)
  clearAll: () => set({
    newLeadsCount: 0,
    lastFetchedAt: null,
    isLoading: false,
    error: null
  })
}))

export default useNotificationStore
