// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import Protected from './components/Protected'
import { ThemeProvider } from './components/ThemeProvider'
import useAuthStore from './lib/auth-store'
import UptradeLoading from './components/UptradeLoading'
import './App.css'

// Eager load critical routes (login, dashboard)
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'

// Lazy load less critical routes for code splitting
const MagicLogin = lazy(() => import('./pages/MagicLogin'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AccountSetup = lazy(() => import('./pages/AccountSetup'))
const ProposalGate = lazy(() => import('./components/ProposalGate'))
const AuditGate = lazy(() => import('./components/AuditGate'))
const Audits = lazy(() => import('./pages/Audits'))
const AuditDetail = lazy(() => import('./pages/AuditDetail'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const InvoicePayment = lazy(() => import('./pages/InvoicePayment'))

// SEO Module
const SEOModule = lazy(() => import('./pages/seo/SEOModule'))

// Ecommerce Module
const EcommerceModule = lazy(() => import('./pages/ecommerce/EcommerceModule'))

// Engage Module - Live chat and conversion optimization
const Engage = lazy(() => import('./pages/Engage'))

// Client SEO Dashboard (tenant-facing, read-only)
const ClientSEODashboard = lazy(() => import('./pages/client/ClientSEODashboard'))

export default function App() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore()
  const [initialized, setInitialized] = useState(false)
  const hasCheckedAuthRef = useRef(false)

  // Fade out the HTML loader when React is ready
  const hideInitialLoader = () => {
    const loader = document.getElementById('initial-loader')
    if (loader) {
      loader.classList.add('fade-out')
      // Remove from DOM after animation
      setTimeout(() => loader.remove(), 300)
    }
  }

  // Check authentication on app mount (only once)
  useEffect(() => {
    if (hasCheckedAuthRef.current) return
    
    console.log('[App] Checking authentication on app mount');
    hasCheckedAuthRef.current = true
    
    const checkAuthOnce = async () => {
      try {
        const result = await checkAuth();
        console.log('[App] Initial auth check result:', result);
      } catch (error) {
        console.error('[App] Error during initial auth check:', error);
      } finally {
        setInitialized(true);
        // Wait a tiny bit for React to render, then hide loader
        requestAnimationFrame(() => {
          hideInitialLoader()
        })
      }
    };
    
    checkAuthOnce();
  }, []) // Empty dependency array - only run once on mount

  // Don't show anything while initializing - the HTML loader is still visible
  if (!initialized) {
    return null
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-[var(--surface-page)] transition-colors duration-300">
          <Suspense fallback={<UptradeLoading />}>
            <Routes>
              <Route 
                path="/" 
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/magic" element={<MagicLogin />} />
              <Route path="/setup" element={<AccountSetup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/p/:slug" element={<ProposalGate />} />
              <Route path="/audit/:id" element={<AuditGate />} />
              <Route path="/pay/:token" element={<InvoicePayment />} />
              <Route
                path="/dashboard"
                element={
                  <Protected>
                    <Dashboard />
                  </Protected>
                }
              />
              <Route
                path="/audits"
                element={
                  <Protected>
                    <Audits />
                  </Protected>
                }
              />
              <Route
                path="/audits/:id"
                element={
                  <Protected>
                    <AuditDetail />
                  </Protected>
                }
              />
              <Route
                path="/profile"
                element={
                  <Protected>
                    <UserProfile />
                  </Protected>
                }
              />
              
              {/* SEO Module - Full-featured SEO dashboard */}
              <Route
                path="/seo/*"
                element={
                  <Protected>
                    <SEOModule />
                  </Protected>
                }
              />
              
              {/* Ecommerce Module - Shopify store management */}
              <Route
                path="/ecommerce/*"
                element={
                  <Protected>
                    <EcommerceModule />
                  </Protected>
                }
              />
              
              {/* Engage Module - Live chat and conversion optimization */}
              <Route
                path="/engage/*"
                element={
                  <Protected>
                    <Engage />
                  </Protected>
                }
              />
              
              {/* Client SEO Dashboard - Tenant-facing read-only view */}
              <Route
                path="/client/seo"
                element={
                  <Protected>
                    <ClientSEODashboard />
                  </Protected>
                }
              />
              
              {/* Redirect old /admin route to dashboard */}
              <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

            </Routes>
          </Suspense>
        </div>
      </Router>
    </ThemeProvider>
  )
}
