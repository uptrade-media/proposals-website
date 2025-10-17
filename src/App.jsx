// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import Protected from './components/Protected'
import useAuthStore from './lib/auth-store'
import './App.css'

// Eager load critical routes (login, dashboard)
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'

// Lazy load less critical routes for code splitting
const AccountSetup = lazy(() => import('./pages/AccountSetup'))
const MagicLogin = lazy(() => import('./pages/MagicLogin'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const ProposalGate = lazy(() => import('./components/ProposalGate'))
const Audits = lazy(() => import('./pages/Audits'))
const AuditDetail = lazy(() => import('./pages/AuditDetail'))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4bbf39] mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

export default function App() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore()
  const [initialized, setInitialized] = useState(false)
  const hasCheckedAuthRef = useRef(false)

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
      }
    };
    
    checkAuthOnce();
  }, []) // Empty dependency array - only run once on mount

  // Show loading ONLY while checking initial auth (not for subsequent checks)
  if (!initialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4bbf39] mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route 
              path="/" 
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/account-setup" element={<AccountSetup />} />
            <Route path="/auth/magic" element={<MagicLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/p/:slug" element={<ProposalGate />} />
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
            
            {/* Redirect old /admin route to dashboard */}
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

          </Routes>
        </Suspense>
      </div>
    </Router>
  )
}
