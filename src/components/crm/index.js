/**
 * CRM Components - Barrel Export
 * Glass-styled CRM dashboard components
 */

// Main Dashboard
export { default as CRMDashboard } from './CRMDashboard'

// Pipeline
export { default as PipelineKanban, PIPELINE_STAGES } from './PipelineKanban'
export { default as ProspectCard } from './ProspectCard'
export { default as ProspectDetailPanel } from './ProspectDetailPanel'

// Tabs
export { default as CallsTab } from './CallsTab'
export { default as TasksTab } from './TasksTab'
export { default as FollowUpsTab } from './FollowUpsTab'
export { default as TeamTab } from './TeamTab'

// Dialogs
export { default as AddProspectDialog } from './AddProspectDialog'
export { default as ConvertDialog } from './ConvertDialog'
export { default as AssignContactDialog } from './AssignContactDialog'

// UI Components
export * from './ui'
