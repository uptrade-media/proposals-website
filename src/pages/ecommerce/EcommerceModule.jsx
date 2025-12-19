// src/pages/ecommerce/EcommerceModule.jsx
// Ecommerce Module Router - handles all /ecommerce/* routes

import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import MainLayout from '@/components/MainLayout'
import UptradeLoading from '@/components/UptradeLoading'

// Lazy load ecommerce pages
const EcommerceDashboard = lazy(() => import('./index'))
const ProductsList = lazy(() => import('./ProductsList'))
const ProductDetail = lazy(() => import('./ProductDetail'))
// Phase 3 & 4 - placeholders for now
const InventoryPage = lazy(() => import('./InventoryPage'))
const OrdersPage = lazy(() => import('./OrdersPage'))

export default function EcommerceModule() {
  return (
    <MainLayout>
      <Suspense fallback={<UptradeLoading />}>
        <Routes>
          <Route index element={<EcommerceDashboard />} />
          <Route path="products" element={<ProductsList />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="*" element={<Navigate to="/ecommerce" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  )
}
