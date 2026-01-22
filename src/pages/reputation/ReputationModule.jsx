/**
 * Reputation Module Router
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Routes for the Reputation management module.
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import ReputationDashboard from './ReputationDashboard'
import ReviewInbox from './ReviewInbox'
import Campaigns from './Campaigns'
import ReputationSettings from './ReputationSettings'

export default function ReputationModule() {
  return (
    <Routes>
      <Route index element={<ReputationDashboard />} />
      <Route path="reviews" element={<ReviewInbox />} />
      <Route path="campaigns" element={<Campaigns />} />
      <Route path="settings" element={<ReputationSettings />} />
      <Route path="*" element={<Navigate to="/reputation" replace />} />
    </Routes>
  )
}
