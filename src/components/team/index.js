/**
 * Team Module - Unified team and user management
 * 
 * Export all components for use in the app
 */

// Main module
export { default as TeamModule } from './TeamModule'

// Panels
export { default as UptradeTeamPanel } from './panels/UptradeTeamPanel'
export { default as OrganizationUsersPanel } from './panels/OrganizationUsersPanel'
export { default as ProjectTeamPanel } from './panels/ProjectTeamPanel'

// Cards
export { default as TeamMemberCard } from './cards/TeamMemberCard'
export { default as UserCard } from './cards/UserCard'
export { default as ProjectMemberCard } from './cards/ProjectMemberCard'

// Dialogs
export { default as InviteTeamMemberDialog } from './dialogs/InviteTeamMemberDialog'
export { default as InviteUserDialog } from './dialogs/InviteUserDialog'
export { default as EditUserDialog } from './dialogs/EditUserDialog'

// Shared components
export { default as RoleBadge, UPTRADE_ROLES, ORG_ROLES, PROJECT_ROLES } from './shared/RoleBadge'
export { default as AccessLevelBadge, ACCESS_LEVELS } from './shared/AccessLevelBadge'
export { default as StatusBadge, STATUS_CONFIG } from './shared/StatusBadge'
export { default as UserAvatar } from './shared/UserAvatar'

// Store
export { default as useTeamStore } from './store'
