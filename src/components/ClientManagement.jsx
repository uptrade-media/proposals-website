/**
 * ClientManagement - Wrapper component for CRM Dashboard
 * 
 * This file now serves as a lightweight wrapper that imports the modular
 * CRM dashboard from src/components/crm/
 * 
 * The CRM has been refactored into glass-styled modular components:
 * - CRMDashboard.jsx - Main orchestrator
 * - CRMStats.jsx - Stats bar with glass metrics
 * - PipelineKanban.jsx - Kanban board with glass columns
 * - ProspectCard.jsx - Glass-styled prospect cards
 * - ProspectDetailPanel.jsx - Slide-over detail panel
 * - CallsTab.jsx - Calls list with audio player
 * - TasksTab.jsx - Tasks management
 * - FollowUpsTab.jsx - Follow-ups management
 * - UsersTab.jsx - User management
 * - AddProspectDialog.jsx - Add prospect form
 * - ConvertDialog.jsx - Convert to user confirmation
 * - ui/ - Reusable glass UI primitives
 */

import { CRMDashboard } from './crm'

export default function ClientManagement() {
  return <CRMDashboard />
}
