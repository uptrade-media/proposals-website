/**
 * Signal Access Hooks
 * 
 * Unified hooks for checking Signal AI feature access across the portal.
 * Replaces deprecated seo_sites.signal_enabled pattern with projects.features pattern.
 * 
 * TWO-TIER SIGNAL MODEL:
 * 
 * 1. ORG-LEVEL SIGNAL (organizations.signal_enabled = true):
 *    - Echo chat visible for ALL users in the org
 *    - Sync Signal integration enabled (AI in calendar/scheduling)
 *    - Signal enabled for ALL projects within that org
 *    - Full AI capabilities across the entire organization
 * 
 * 2. PROJECT-LEVEL SIGNAL (project.features.includes('signal')):
 *    - Signal functions within project-specific modules ONLY (SEO, Engage, CRM skills)
 *    - Echo chat is NOT visible for users
 *    - Sync Signal integration is NOT available
 *    - AI features scoped to that specific project only
 * 
 * @see /docs/SIGNAL-MULTI-TENANT-ARCHITECTURE.md
 */

import useAuthStore from './auth-store'

/**
 * Get the current user's Signal access context.
 * This is the primary hook for determining Signal capabilities.
 * 
 * @returns {SignalAccessContext}
 */
export const useSignalAccess = () => {
  const currentOrg = useAuthStore(state => state.currentOrg)
  const currentProject = useAuthStore(state => state.currentProject)
  const availableProjects = useAuthStore(state => state.availableProjects)
  const accessLevel = useAuthStore(state => state.accessLevel) // 'organization' | 'project'
  const isSuperAdmin = useAuthStore(state => state.isSuperAdmin)
  const user = useAuthStore(state => state.user)
  
  // Check if user is an admin (superAdmin or admin role)
  // Admins always have full Signal access for testing/management purposes
  const isAdmin = isSuperAdmin || user?.role === 'admin'
  
  // Check org-level Signal (covers all projects, enables Echo + Sync Signal)
  const orgSignalEnabled = currentOrg?.signal_enabled === true
  
  // Check current project's Signal (project-level only, no Echo/Sync)
  const currentProjectHasSignal = hasSignalFeature(currentProject)
  
  // Get all Signal-enabled projects the user can access
  const signalEnabledProjects = (availableProjects || []).filter(hasSignalFeature)
  
  // User has Signal access if:
  // 1. They are an admin (always has access), OR
  // 2. Org has Signal enabled, OR
  // 3. Any project has Signal enabled
  const hasAccess = isAdmin || orgSignalEnabled || signalEnabledProjects.length > 0
  
  // Determine scope
  let scope = 'none'
  if (isAdmin) {
    scope = 'admin' // Admin override - full access
  } else if (orgSignalEnabled) {
    scope = 'org'
  } else if (signalEnabledProjects.length > 0) {
    scope = 'project'
  }
  
  return {
    // Core access flags
    hasAccess,                      // User has any Signal access
    hasOrgSignal: isAdmin || orgSignalEnabled, // Org-level Signal (enables Echo + Sync Signal)
    hasCurrentProjectSignal: isAdmin || orgSignalEnabled || currentProjectHasSignal, // Signal for current project
    isAdmin,                        // Is admin with override access
    
    // Actual subscription status (without admin override)
    orgActuallyHasSignal: orgSignalEnabled, // True only if org is actually subscribed
    projectActuallyHasSignal: currentProjectHasSignal, // True only if project has signal feature
    
    // Feature-specific access
    canUseEcho: isAdmin || orgSignalEnabled,     // Echo requires org-level Signal
    canUseSyncSignal: isAdmin || orgSignalEnabled, // Sync Signal requires org-level Signal
    canUseProjectSignal: isAdmin || orgSignalEnabled || currentProjectHasSignal, // Project module AI features
    
    // Scope information
    scope,                          // 'none' | 'project' | 'org' | 'admin'
    signalEnabledProjects,          // Array of projects with Signal
    signalProjectIds: signalEnabledProjects.map(p => p.id),
    
    // Context
    isOrgLevel: accessLevel === 'organization',
    isProjectLevel: accessLevel === 'project',
    currentProjectId: currentProject?.id || null,
    orgId: currentOrg?.id || null,
  }
}

/**
 * Check if a project has the Signal feature enabled.
 * Handles both array and object feature formats.
 * 
 * @param {Object} project - Project object with features
 * @returns {boolean}
 */
export const hasSignalFeature = (project) => {
  if (!project) return false
  
  const features = project.features
  
  // Array format: ['seo', 'signal', 'engage']
  if (Array.isArray(features)) {
    return features.includes('signal')
  }
  
  // Object format: { seo: true, signal: true }
  if (features && typeof features === 'object') {
    return features.signal === true
  }
  
  return false
}

/**
 * Get detailed Signal status for UI display.
 * Use this for showing Signal status badges, upgrade prompts, etc.
 * 
 * @returns {SignalStatus}
 */
export const useSignalStatus = () => {
  const { 
    hasAccess, 
    hasOrgSignal, 
    hasCurrentProjectSignal,
    scope,
    signalEnabledProjects,
    currentProjectId,
    isOrgLevel,
  } = useSignalAccess()
  
  const currentOrg = useAuthStore(state => state.currentOrg)
  const currentProject = useAuthStore(state => state.currentProject)
  
  // No access at all
  if (!hasAccess) {
    return {
      enabled: false,
      reason: 'not_subscribed',
      scope: 'none',
      canUpgrade: true,
      message: 'Signal AI is not enabled. Upgrade to unlock AI-powered insights.',
    }
  }
  
  // Org-level Signal
  if (hasOrgSignal) {
    return {
      enabled: true,
      reason: 'org_signal',
      scope: 'org',
      tier: currentOrg?.signal_tier || 'org',
      enabledAt: currentOrg?.signal_enabled_at,
      message: 'Full Signal AI access across all projects.',
    }
  }
  
  // Project-level Signal - check current project
  if (hasCurrentProjectSignal) {
    return {
      enabled: true,
      reason: 'project_signal',
      scope: 'project',
      tier: 'project',
      projectId: currentProjectId,
      projectName: currentProject?.title,
      message: `Signal AI enabled for ${currentProject?.title || 'this project'}.`,
    }
  }
  
  // Has Signal on other projects but not current one
  if (signalEnabledProjects.length > 0) {
    const projectNames = signalEnabledProjects.map(p => p.title).join(', ')
    return {
      enabled: false,
      reason: 'not_enabled_for_current_project',
      scope: 'project',
      hasOtherProjects: true,
      signalProjects: signalEnabledProjects,
      canUpgrade: true,
      message: isOrgLevel 
        ? `Signal AI is available for: ${projectNames}. Enable it for this project or upgrade to Org Signal.`
        : `Signal AI is not enabled for this project.`,
    }
  }
  
  // Fallback
  return {
    enabled: false,
    reason: 'unknown',
    scope: 'none',
    message: 'Unable to determine Signal status.',
  }
}

/**
 * Get list of project IDs that have Signal enabled.
 * Useful for API calls that need to scope queries.
 * 
 * @returns {string[]} Array of project IDs with Signal access
 */
export const useSignalEnabledProjectIds = () => {
  const { signalProjectIds, hasOrgSignal } = useSignalAccess()
  const availableProjects = useAuthStore(state => state.availableProjects)
  
  // Org Signal = all projects enabled
  if (hasOrgSignal) {
    return (availableProjects || []).map(p => p.id)
  }
  
  return signalProjectIds
}

/**
 * Check if Echo AI should be visible in the current context.
 * Echo requires ORG-LEVEL Signal access (not project-level).
 * 
 * Project-level Signal only enables AI features within project modules,
 * not the Echo chat interface.
 * 
 * @returns {boolean}
 */
export const useEchoAccess = () => {
  const { canUseEcho } = useSignalAccess()
  return canUseEcho
}

/**
 * Check if Sync Signal integration should be available.
 * Sync Signal requires ORG-LEVEL Signal access (not project-level).
 * 
 * @returns {boolean}
 */
export const useSyncSignalAccess = () => {
  const { canUseSyncSignal } = useSignalAccess()
  return canUseSyncSignal
}

/**
 * Get Echo configuration for the current context.
 * Used when initializing Echo conversations.
 * 
 * @returns {EchoConfig}
 */
export const useEchoConfig = () => {
  const { 
    hasAccess,
    hasOrgSignal,
    scope,
    signalProjectIds,
    currentProjectId,
    orgId,
  } = useSignalAccess()
  
  if (!hasAccess) {
    return {
      available: false,
      scope: 'none',
      projectIds: [],
    }
  }
  
  return {
    available: true,
    scope,
    orgId,
    currentProjectId,
    projectIds: hasOrgSignal 
      ? null // null = all projects (org-level)
      : signalProjectIds,
  }
}

/**
 * Higher-order component wrapper for Signal-gated features.
 * Wraps a component to only render if user has Signal access.
 * 
 * @param {React.Component} WrappedComponent 
 * @param {Object} options - { requireCurrentProject: boolean, fallback: React.Component }
 */
export const withSignalAccess = (WrappedComponent, options = {}) => {
  const { requireCurrentProject = false, fallback: Fallback = null } = options
  
  return function SignalGatedComponent(props) {
    const { hasAccess, hasCurrentProjectSignal } = useSignalAccess()
    const React = require('react')
    const { createElement } = React
    
    if (!hasAccess) {
      return Fallback ? createElement(Fallback, props) : null
    }
    
    if (requireCurrentProject && !hasCurrentProjectSignal) {
      return Fallback ? createElement(Fallback, { ...props, notEnabledForProject: true }) : null
    }
    
    return createElement(WrappedComponent, props)
  }
}

// Type definitions for documentation
/**
 * @typedef {Object} SignalAccessContext
 * @property {boolean} hasAccess - User has any Signal access (org or project level)
 * @property {boolean} hasOrgSignal - Org-level Signal subscription (enables Echo + Sync Signal)
 * @property {boolean} hasCurrentProjectSignal - Current project has Signal (org-level or project-level)
 * @property {boolean} isAdmin - Is admin with override access
 * @property {boolean} canUseEcho - Can use Echo chat (requires org-level Signal)
 * @property {boolean} canUseSyncSignal - Can use Sync Signal integration (requires org-level Signal)
 * @property {boolean} canUseProjectSignal - Can use Signal in project modules (SEO, Engage, CRM)
 * @property {'none'|'project'|'org'|'admin'} scope - Access scope level
 * @property {Object[]} signalEnabledProjects - Projects with Signal access
 * @property {string[]} signalProjectIds - IDs of projects with Signal
 * @property {boolean} isOrgLevel - User is org-level (not project-scoped)
 * @property {boolean} isProjectLevel - User is project-level only
 * @property {string|null} currentProjectId
 * @property {string|null} orgId
 */

/**
 * @typedef {Object} SignalStatus
 * @property {boolean} enabled - Signal is enabled in current context
 * @property {string} reason - Why enabled/disabled
 * @property {'none'|'project'|'org'} scope
 * @property {string} [tier] - 'project' or 'org'
 * @property {string} [enabledAt] - ISO date when enabled
 * @property {string} [projectId] - If project-level
 * @property {string} [projectName]
 * @property {boolean} [hasOtherProjects] - Has Signal on other projects
 * @property {Object[]} [signalProjects] - Other projects with Signal
 * @property {boolean} [canUpgrade] - Can upgrade to get access
 * @property {string} message - Human-readable status message
 */

/**
 * @typedef {Object} EchoConfig
 * @property {boolean} available - Echo is available
 * @property {'none'|'project'|'org'} scope
 * @property {string} [orgId]
 * @property {string} [currentProjectId]
 * @property {string[]|null} projectIds - null = all projects
 */
