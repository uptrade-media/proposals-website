// src/components/ecommerce/EcommerceModuleWrapper.jsx
// Entry point for Ecommerce module when accessed via sidebar
// Renders the full ecommerce experience within MainLayout

import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEcommerceStore } from '@/lib/ecommerce-store'
import useAuthStore, { useOrgFeatures } from '@/lib/auth-store'
import UptradeLoading from '@/components/UptradeLoading'

// Import ecommerce pages
import EcommerceDashboard from '@/pages/ecommerce/index'
import ProductsList from '@/pages/ecommerce/ProductsList'
import ProductDetail from '@/pages/ecommerce/ProductDetail'
import InventoryPage from '@/pages/ecommerce/InventoryPage'
import OrdersPage from '@/pages/ecommerce/OrdersPage'

export default function EcommerceModuleWrapper({ onNavigate }) {
  const { currentOrg } = useAuthStore()
  const { hasFeature } = useOrgFeatures()
  const { store, storeLoading, fetchStore } = useEcommerceStore()
  const [initialized, setInitialized] = useState(false)
  
  // Track current subpage for internal routing
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [pageData, setPageData] = useState(null)
  
  // Load store data on mount
  useEffect(() => {
    async function loadStore() {
      if (!currentOrg?.id) return
      
      // Don't fetch if already loading or if we have data
      if (storeLoading || store) {
        setInitialized(true)
        return
      }
      
      try {
        await fetchStore()
      } catch (error) {
        console.error('Failed to load Shopify store:', error)
        // Don't throw - let the component handle the error state
      } finally {
        setInitialized(true)
      }
    }
    
    // Only fetch once
    if (!initialized) {
      loadStore()
    }
  }, [currentOrg?.id, initialized, storeLoading, store])
  
  // Check feature flag
  if (!hasFeature('ecommerce')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Ecommerce Not Enabled</h2>
          <p className="text-muted-foreground">
            Contact your administrator to enable the Ecommerce module.
          </p>
        </div>
      </div>
    )
  }
  
  // Loading state
  if (!initialized || storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <UptradeLoading />
      </div>
    )
  }
  
  // Internal navigation
  const navigateTo = (page, data = null) => {
    // Handle product-detail:ID format from ProductsList
    if (page.startsWith('product-detail:')) {
      const productId = page.split(':')[1]
      setCurrentPage('product-detail')
      setPageData({ productId })
    } else {
      setCurrentPage(page)
      setPageData(data)
    }
  }
  
  // Render the appropriate page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <EcommerceDashboard onNavigate={navigateTo} embedded={true} />
      case 'products':
        return <ProductsList onNavigate={navigateTo} embedded={true} />
      case 'product-detail':
        return <ProductDetail productId={pageData?.productId} onNavigate={navigateTo} embedded={true} />
      case 'inventory':
        return <InventoryPage onNavigate={navigateTo} embedded={true} />
      case 'orders':
        return <OrdersPage onNavigate={navigateTo} embedded={true} />
      default:
        return <EcommerceDashboard onNavigate={navigateTo} embedded={true} />
    }
  }
  
  return (
    <div className="h-full">
      {renderPage()}
    </div>
  )
}
