// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from '@dr.pogodin/react-helmet'
import LoginPage from './pages/LoginPage'
import ProposalGate from './pages/ProposalGate'
import Dashboard from './pages/Dashboard'
import Protected from './components/Protected'
import './App.css'

export default function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
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
    </HelmetProvider>
  )
}
