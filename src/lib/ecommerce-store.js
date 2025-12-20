// src/lib/ecommerce-store.js
// Zustand store for Ecommerce (Shopify) module

import { create } from 'zustand'
import api from './api'

export const useEcommerceStore = create((set, get) => ({
  // =========================================================================
  // STATE
  // =========================================================================
  
  // Store connection
  store: null,
  storeLoading: false,
  storeError: null,
  
  // Products
  products: [],
  productsLoading: false,
  productsError: null,
  productsTotal: 0,
  
  // Selected product
  selectedProduct: null,
  selectedProductLoading: false,
  
  // Inventory
  inventoryLoading: false,
  
  // Orders
  orders: [],
  ordersLoading: false,
  ordersError: null,
  ordersTotal: 0,
  
  // Sync status
  syncStatus: null,
  isSyncing: false,

  // =========================================================================
  // STORE CONNECTION
  // =========================================================================
  
  fetchStore: async () => {
    set({ storeLoading: true, storeError: null })
    try {
      const res = await api.get('/.netlify/functions/shopify-stores')
      const stores = res.data.stores || []
      // We support single store per org for now
      set({ store: stores[0] || null, storeLoading: false })
      return stores[0] || null
    } catch (error) {
      const msg = error.response?.data?.error || error.message
      set({ storeError: msg, storeLoading: false })
      return null
    }
  },
  
  connectStore: async (shopDomain, accessToken) => {
    set({ storeLoading: true, storeError: null })
    try {
      const res = await api.post('/.netlify/functions/shopify-stores', {
        shopDomain,
        accessToken
      })
      set({ store: res.data.store, storeLoading: false })
      return { success: true, store: res.data.store }
    } catch (error) {
      const msg = error.response?.data?.error || error.message
      set({ storeError: msg, storeLoading: false })
      return { success: false, error: msg }
    }
  },
  
  disconnectStore: async () => {
    const { store } = get()
    if (!store) return { success: false, error: 'No store connected' }
    
    set({ storeLoading: true, storeError: null })
    try {
      await api.delete('/.netlify/functions/shopify-stores', {
        data: { storeId: store.id }
      })
      set({ 
        store: null, 
        storeLoading: false,
        products: [],
        orders: []
      })
      return { success: true }
    } catch (error) {
      const msg = error.response?.data?.error || error.message
      set({ storeError: msg, storeLoading: false })
      return { success: false, error: msg }
    }
  },

  // =========================================================================
  // PRODUCTS (Phase 2)
  // =========================================================================
  
  fetchProducts: async (params = {}) => {
    set({ productsLoading: true, productsError: null })
    try {
      // api module automatically adds X-Organization-Id and X-Project-Id headers
      const res = await api.get('/.netlify/functions/shopify-products', { params })
      set({ 
        products: res.data.products || [],
        productsTotal: res.data.total || 0,
        productsLoading: false 
      })
      return res.data.products
    } catch (error) {
      const msg = error.response?.data?.error || error.message
      console.error('[ecommerce-store] fetchProducts error:', msg)
      set({ productsError: msg, productsLoading: false })
      return []
    }
  },
  
  fetchProduct: async (productId) => {
    set({ selectedProductLoading: true })
    try {
      const res = await api.get(`/.netlify/functions/shopify-products?id=${productId}`)
      set({ selectedProduct: res.data.product, selectedProductLoading: false })
      return res.data.product
    } catch (error) {
      set({ selectedProductLoading: false })
      return null
    }
  },
  
  updateProduct: async (productId, data) => {
    try {
      const res = await api.put('/.netlify/functions/shopify-products', {
        productId,
        ...data
      })
      // Update in local state
      set(state => ({
        products: state.products.map(p => 
          p.id === productId ? { ...p, ...res.data.product } : p
        ),
        selectedProduct: state.selectedProduct?.id === productId 
          ? { ...state.selectedProduct, ...res.data.product }
          : state.selectedProduct
      }))
      return { success: true, product: res.data.product }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message }
    }
  },

  // =========================================================================
  // INVENTORY (Phase 3)
  // =========================================================================
  
  updateInventory: async (variantId, locationId, quantity) => {
    set({ inventoryLoading: true })
    try {
      const res = await api.post('/.netlify/functions/shopify-inventory', {
        variantId,
        locationId,
        quantity
      })
      set({ inventoryLoading: false })
      
      // Refresh the selected product to get updated inventory
      const { selectedProduct } = get()
      if (selectedProduct) {
        get().fetchProduct(selectedProduct.id)
      }
      
      return { success: true, level: res.data.level }
    } catch (error) {
      set({ inventoryLoading: false })
      return { success: false, error: error.response?.data?.error || error.message }
    }
  },
  
  adjustInventory: async (variantId, locationId, adjustment) => {
    set({ inventoryLoading: true })
    try {
      const res = await api.post('/.netlify/functions/shopify-inventory', {
        variantId,
        locationId,
        adjustment
      })
      set({ inventoryLoading: false })
      
      // Refresh the selected product to get updated inventory
      const { selectedProduct } = get()
      if (selectedProduct) {
        get().fetchProduct(selectedProduct.id)
      }
      
      return { success: true, level: res.data.level }
    } catch (error) {
      set({ inventoryLoading: false })
      return { success: false, error: error.response?.data?.error || error.message }
    }
  },

  // =========================================================================
  // ORDERS (Phase 4)
  // =========================================================================
  
  fetchOrders: async (params = {}) => {
    set({ ordersLoading: true, ordersError: null })
    try {
      const res = await api.get('/.netlify/functions/shopify-orders', { params })
      set({ 
        orders: res.data.orders || [],
        ordersTotal: res.data.total || 0,
        ordersLoading: false 
      })
      return res.data.orders
    } catch (error) {
      const msg = error.response?.data?.error || error.message
      set({ ordersError: msg, ordersLoading: false })
      return []
    }
  },
  
  fetchOrder: async (orderId) => {
    try {
      const res = await api.get(`/.netlify/functions/shopify-orders?id=${orderId}`)
      return res.data.order
    } catch (error) {
      console.error('[ecommerce-store] fetchOrder error:', error)
      return null
    }
  },
  
  // =========================================================================
  // VARIANT / PRICING
  // =========================================================================
  
  updateVariant: async (variantId, data) => {
    try {
      const res = await api.put('/.netlify/functions/shopify-variants', {
        variantId,
        ...data
      })
      
      // Refresh selected product to reflect changes
      const { selectedProduct } = get()
      if (selectedProduct) {
        get().fetchProduct(selectedProduct.id)
      }
      
      return { success: true, variant: res.data.variant }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message }
    }
  },

  // =========================================================================
  // SYNC
  // =========================================================================
  
  triggerSync: async (syncType = 'full') => {
    set({ isSyncing: true })
    try {
      const res = await api.post('/.netlify/functions/shopify-sync', { syncType })
      set({ 
        syncStatus: res.data.status,
        isSyncing: res.data.status === 'syncing'
      })
      return { success: true, status: res.data.status }
    } catch (error) {
      set({ isSyncing: false })
      return { success: false, error: error.response?.data?.error || error.message }
    }
  },
  
  fetchSyncStatus: async () => {
    try {
      const res = await api.get('/.netlify/functions/shopify-sync')
      set({ 
        syncStatus: res.data.status,
        isSyncing: res.data.status === 'syncing'
      })
      return res.data
    } catch (error) {
      return null
    }
  },

  // =========================================================================
  // RESET
  // =========================================================================
  
  reset: () => {
    set({
      store: null,
      storeLoading: false,
      storeError: null,
      products: [],
      productsLoading: false,
      productsError: null,
      selectedProduct: null,
      orders: [],
      ordersLoading: false,
      ordersError: null,
      syncStatus: null,
      isSyncing: false
    })
  }
}))

export default useEcommerceStore
