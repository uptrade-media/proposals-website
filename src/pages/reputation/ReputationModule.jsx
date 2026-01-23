/**
 * Reputation Module Router
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Routes for the Reputation management module.
 * Updated to use the new unified dashboard with collapsible sidebar.
 */

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import NewReputationDashboard from './NewReputationDashboard'

export default function ReputationModule() {
  const navigate = useNavigate()

  const handleNavigate = (path) => {
    navigate(path)
  }

  return (
    <Routes>
      {/* New unified dashboard handles all views internally via sidebar */}
      <Route index element={<NewReputationDashboard onNavigate={handleNavigate} />} />
      
      {/* Redirect old routes to the unified dashboard */}
      <Route path="reviews" element={<Navigate to="/reputation" replace />} />
      <Route path="campaigns" element={<Navigate to="/reputation" replace />} />
      <Route path="settings" element={<Navigate to="/reputation" replace />} />
      <Route path="*" element={<Navigate to="/reputation" replace />} />
    </Routes>
  )
}
