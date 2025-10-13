// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import ProposalGate from './pages/ProposalGate'
import Dashboard from './pages/Dashboard'
import AccountSetup from './pages/AccountSetup'
import MagicLogin from './pages/MagicLogin'
import ResetPassword from './pages/ResetPassword'
import Protected from './components/Protected'
import useAuthStore from './lib/auth-store'
import './App.css'

export default function App() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  // Check authentication on app mount (only once)
  useEffect(() => {
    checkAuth().finally(() => setInitialized(true))
  }, []) // Empty dependency array - only run once on mount

  // Show loading while checking initial auth
  if (!initialized || isLoading) {
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
        <Routes>
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account-setup" element={<AccountSetup />} />
          <Route path="/auth/magic" element={<MagicLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/p/:slug"
            element={
              <Protected>
                <ProposalGate />
              </Protected>
            }
          />
        </Routes>
      </div>
    </Router>
  )
}
