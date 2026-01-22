// src/lib/ecommerce-store.js
// Zustand store for Ecommerce (Shopify) module

import { create } from 'zustand'
import { ecommerceApi } from './portal-api'

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
      const res = await ecommerceApi.getStores()
      const data = res.data || res
      const stores = data.stores || []
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
      const res = await ecommerceApi.connectStore({ shopDomain, accessToken })
      const data = res.data || res
      set({ store: data.store, storeLoading: false })
      return { success: true, store: data.store }
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
      await ecommerceApi.disconnectStore(store.id)
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
      const res = await ecommerceApi.listProducts(params)
      const data = res.data || res
      set({ 
        products: data.products || [],
        productsTotal: data.total || 0,
        productsLoading: false 
      })
      return data.products || []
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
      const res = await ecommerceApi.getProduct(productId)
      const data = res.data || res
      set({ selectedProduct: data.product, selectedProductLoading: false })
      return data.product
    } catch (error) {
      set({ selectedProductLoading: false })
      return null
    }
  },
  
  updateProduct: async (productId, data) => {
    try {
      const res = await ecommerceApi.updateProduct(productId, data)
      const resData = res.data || res
      // Update in local state
      set(state => ({
        products: state.products.map(p => 
          p.id === productId ? { ...p, ...resData.product } : p
        ),
        selectedProduct: state.selectedProduct?.id === productId 
          ? { ...state.selectedProduct, ...resData.product }
          : state.selectedProduct
      }))
      return { success: true, product: resData.product }
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
      const res = await ecommerceApi.updateInventory(variantId, { locationId, quantity })
      const data = res.data || res
      set({ inventoryLoading: false })
      
      // Refresh the selected product to get updated inventory
      const { selectedProduct } = get()
      if (selectedProduct) {
        get().fetchProduct(selectedProduct.id)
      }
      
      return { success: true, level: data.level }
    } catch (error) {
      set({ inventoryLoading: false })
      return { success: false, error: error.response?.data?.error || error.message }
    }
  },
  
  adjustInventory: async (variantId, locationId, adjustment) => {
    set({ inventoryLoading: true })
    try {
      const res = await ecommerceApi.adjustInventory({ variantId, locationId, adjustment })
      const data = res.data || res
      set({ inventoryLoading: false })
      
      // Refresh the selected product to get updated inventory
      const { selectedProduct } = get()
      if (selectedProduct) {
        get().fetchProduct(selectedProduct.id)
      }
      
      return { success: true, level: data.level }
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
      const res = await ecommerceApi.listOrders(params)
      const data = res.data || res
      set({ 
        orders: data.orders || [],
        ordersTotal: data.total || 0,
        ordersLoading: false 
      })
      return data.orders || []
    } catch (error) {
      const msg = error.response?.data?.error || error.message
      set({ ordersError: msg, ordersLoading: false })
      return []
    }
  },
  
  fetchOrder: async (orderId) => {
    try {
      const res = await ecommerceApi.getOrder(orderId)
      const data = res.data || res
      return data.order
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
      const res = await ecommerceApi.updateVariant(variantId, data)
      const resData = res.data || res
      
      // Refresh selected product to reflect changes
      const { selectedProduct } = get()
      if (selectedProduct) {
        get().fetchProduct(selectedProduct.id)
      }
      
      return { success: true, variant: resData.variant }
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
      const res = await ecommerceApi.triggerSync(syncType)
      const data = res.data || res
      set({ 
        syncStatus: data.status,
        isSyncing: data.status === 'syncing'
      })
      return { success: true, status: data.status }
    } catch (error) {
      set({ isSyncing: false })
      return { success: false, error: error.response?.data?.error || error.message }
    }
  },
  
  fetchSyncStatus: async () => {
    try {
      const res = await ecommerceApi.getSyncStatus()
      const data = res.data || res
      set({ 
        syncStatus: data.status,
        isSyncing: data.status === 'syncing'
      })
      return data
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
