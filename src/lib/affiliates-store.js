// src/lib/affiliates-store.js
// Zustand store for Affiliates module state

import { create } from 'zustand'
import { portalApi } from './portal-api'

const useAffiliatesStore = create((set, get) => ({
  // Data
  affiliates: [],
  offers: [],
  clicks: [],
  conversions: [],
  
  // UI State
  selectedAffiliateId: null,
  selectedView: 'all', // 'all' | 'active' | 'paused'
  isLoading: false,
  error: null,
  
  // Selected affiliate with stats
  get selectedAffiliate() {
    const { affiliates, selectedAffiliateId } = get()
    return affiliates.find(a => a.id === selectedAffiliateId) || null
  },
  
  // Filtered affiliates based on view
  getFilteredAffiliates: () => {
    const { affiliates, selectedView } = get()
    if (selectedView === 'all') return affiliates
    return affiliates.filter(a => a.status === selectedView)
  },
  
  // Actions
  setSelectedAffiliateId: (id) => set({ selectedAffiliateId: id }),
  setSelectedView: (view) => set({ selectedView: view }),
  
  // Fetch all affiliates
  fetchAffiliates: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.get(`/affiliates?projectId=${projectId}`)
      set({ affiliates: response.data || [], isLoading: false })
    } catch (error) {
      console.error('Failed to fetch affiliates:', error)
      set({ error: error.message, isLoading: false })
    }
  },
  
  // Fetch all offers
  fetchOffers: async (projectId) => {
    try {
      const response = await portalApi.get(`/affiliates/offers/all?projectId=${projectId}`)
      set({ offers: response.data || [] })
    } catch (error) {
      console.error('Failed to fetch offers:', error)
    }
  },
  
  // Fetch clicks for an affiliate
  fetchClicks: async (projectId, affiliateId) => {
    try {
      const url = affiliateId 
        ? `/affiliates/clicks/all?projectId=${projectId}&affiliateId=${affiliateId}`
        : `/affiliates/clicks/all?projectId=${projectId}`
      const response = await portalApi.get(url)
      set({ clicks: response.data || [] })
    } catch (error) {
      console.error('Failed to fetch clicks:', error)
    }
  },
  
  // Fetch conversions for an affiliate
  fetchConversions: async (projectId, affiliateId) => {
    try {
      const url = affiliateId 
        ? `/affiliates/conversions/all?projectId=${projectId}&affiliateId=${affiliateId}`
        : `/affiliates/conversions/all?projectId=${projectId}`
      const response = await portalApi.get(url)
      set({ conversions: response.data || [] })
    } catch (error) {
      console.error('Failed to fetch conversions:', error)
    }
  },
  
  // Create affiliate
  createAffiliate: async (projectId, data) => {
    try {
      const response = await portalApi.post('/affiliates', {
        ...data,
        projectId,
      })
      const newAffiliate = response.data
      set(state => ({
        affiliates: [{ ...newAffiliate, total_clicks: 0, total_conversions: 0, total_payout: 0 }, ...state.affiliates],
        selectedAffiliateId: newAffiliate.id,
      }))
      return newAffiliate
    } catch (error) {
      console.error('Failed to create affiliate:', error)
      throw error
    }
  },
  
  // Update affiliate
  updateAffiliate: async (id, data) => {
    try {
      const response = await portalApi.patch(`/affiliates/${id}`, data)
      const updatedAffiliate = response.data
      set(state => ({
        affiliates: state.affiliates.map(a => 
          a.id === id ? { ...a, ...updatedAffiliate } : a
        ),
      }))
      return updatedAffiliate
    } catch (error) {
      console.error('Failed to update affiliate:', error)
      throw error
    }
  },
  
  // Delete affiliate
  deleteAffiliate: async (id) => {
    try {
      await portalApi.delete(`/affiliates/${id}`)
      set(state => ({
        affiliates: state.affiliates.filter(a => a.id !== id),
        selectedAffiliateId: state.selectedAffiliateId === id ? null : state.selectedAffiliateId,
      }))
    } catch (error) {
      console.error('Failed to delete affiliate:', error)
      throw error
    }
  },
  
  // Create offer
  createOffer: async (projectId, data) => {
    try {
      const response = await portalApi.post('/affiliates/offers', {
        ...data,
        projectId,
      })
      const newOffer = response.data
      set(state => ({
        offers: [newOffer, ...state.offers],
      }))
      return newOffer
    } catch (error) {
      console.error('Failed to create offer:', error)
      throw error
    }
  },
  
  // Update offer
  updateOffer: async (id, data) => {
    try {
      const response = await portalApi.patch(`/affiliates/offers/${id}`, data)
      const updatedOffer = response.data
      set(state => ({
        offers: state.offers.map(o => 
          o.id === id ? { ...o, ...updatedOffer } : o
        ),
      }))
      return updatedOffer
    } catch (error) {
      console.error('Failed to update offer:', error)
      throw error
    }
  },
  
  // Delete offer
  deleteOffer: async (id) => {
    try {
      await portalApi.delete(`/affiliates/offers/${id}`)
      set(state => ({
        offers: state.offers.filter(o => o.id !== id),
      }))
    } catch (error) {
      console.error('Failed to delete offer:', error)
      throw error
    }
  },
  
  // Create conversion
  createConversion: async (projectId, data) => {
    try {
      const response = await portalApi.post('/affiliates/conversions', {
        ...data,
        projectId,
      })
      const newConversion = response.data
      set(state => ({
        conversions: [newConversion, ...state.conversions],
      }))
      
      // Update affiliate stats
      const { fetchAffiliates } = get()
      await fetchAffiliates(projectId)
      
      return newConversion
    } catch (error) {
      console.error('Failed to create conversion:', error)
      throw error
    }
  },
  
  // Reset store
  reset: () => set({
    affiliates: [],
    offers: [],
    clicks: [],
    conversions: [],
    selectedAffiliateId: null,
    selectedView: 'all',
    isLoading: false,
    error: null,
  }),
}))

export default useAffiliatesStore
