// src/pages/commerce/CommerceModule.jsx
// Commerce Module Router - handles all /commerce/* routes
// Unified module for products, services, classes, events, sales, and customers

import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import UptradeLoading from '@/components/UptradeLoading'
import useAuthStore from '@/lib/auth-store'
import { useCommerceStore } from '@/lib/commerce-store'

// Lazy load commerce pages
const CommerceDashboard = lazy(() => import('./CommerceDashboard'))
const OfferingsList = lazy(() => import('./OfferingsList'))
const OfferingDetail = lazy(() => import('./OfferingDetail'))
const OfferingCreate = lazy(() => import('./OfferingCreate'))
const OfferingEdit = lazy(() => import('./OfferingEdit'))
const SalesPage = lazy(() => import('./SalesPage'))
const CustomersPage = lazy(() => import('./CustomersPage'))
const CustomerDetail = lazy(() => import('./CustomerDetail'))

// Wrapper to load settings before rendering
function CommerceModuleWrapper({ children }) {
  const { currentProject } = useAuthStore()
  const { fetchSettings, settings, settingsLoading } = useCommerceStore()

  useEffect(() => {
    if (currentProject?.id && !settings) {
      fetchSettings(currentProject.id)
    }
  }, [currentProject?.id, settings, fetchSettings])

  if (settingsLoading) {
    return <UptradeLoading />
  }

  return children
}

export default function CommerceModule() {
  return (
    <MainLayout>
      <CommerceModuleWrapper>
        <Suspense fallback={<UptradeLoading />}>
          <Routes>
            {/* Dashboard */}
            <Route index element={<CommerceDashboard />} />
            
            {/* Offerings - Products, Services, Classes, Events */}
            <Route path="offerings" element={<OfferingsList />} />
            <Route path="offerings/new" element={<OfferingCreate />} />
            <Route path="offerings/:id" element={<OfferingDetail />} />
            <Route path="offerings/:id/edit" element={<OfferingEdit />} />
            
            {/* Type-specific routes (redirect to filtered list) */}
            <Route path="products" element={<OfferingsList type="product" />} />
            <Route path="products/new" element={<OfferingCreate type="product" />} />
            <Route path="services" element={<OfferingsList type="service" />} />
            <Route path="services/new" element={<OfferingCreate type="service" />} />
            <Route path="classes" element={<OfferingsList type="class" />} />
            <Route path="classes/new" element={<OfferingCreate type="class" />} />
            <Route path="events" element={<OfferingsList type="event" />} />
            <Route path="events/new" element={<OfferingCreate type="event" />} />
            
            {/* Sales */}
            <Route path="sales" element={<SalesPage />} />
            
            {/* Customers */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/commerce" replace />} />
          </Routes>
        </Suspense>
      </CommerceModuleWrapper>
    </MainLayout>
  )
}
