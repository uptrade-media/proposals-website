/**
 * Customers Module Router
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Standalone module for customer management (post-sale).
 * 
 * Customers vs CRM:
 * - CRM = Prospects, leads, pre-sale pipeline (Uptrade workflow)
 * - Customers = People who have purchased (auto-created from sales)
 * 
 * Features:
 * - Customer list with LTV, purchase count, tags
 * - Customer detail with purchase history
 * - Notes and tagging
 * - Gmail thread linking (shared OAuth with CRM)
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import MainLayout from '@/components/MainLayout'
import UptradeLoading from '@/components/UptradeLoading'

// Lazy load customer pages
const CustomersDashboard = lazy(() => import('./CustomersDashboard'))
const CustomersList = lazy(() => import('./CustomersList'))
const CustomerDetail = lazy(() => import('./CustomerDetail'))

export default function CustomersModule() {
  return (
    <MainLayout>
      <Suspense fallback={<UptradeLoading />}>
        <Routes>
          {/* Dashboard with stats */}
          <Route index element={<CustomersDashboard />} />
          
          {/* Customer list */}
          <Route path="list" element={<CustomersList />} />
          
          {/* Customer detail */}
          <Route path=":id" element={<CustomerDetail />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/customers" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  )
}
