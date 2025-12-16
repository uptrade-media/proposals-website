// netlify/functions/utils/permissions.js
// Permission checks for multi-user portal

/**
 * Require user to be a team member
 * @param {object} contact - Contact from getAuthenticatedUser
 * @throws {Error} if not a team member
 */
export function requireTeamMember(contact) {
  if (!contact?.is_team_member || contact.team_status !== 'active') {
    throw new Error('Access denied - team members only')
  }
}

/**
 * Require user to be an admin
 * @param {object} contact - Contact from getAuthenticatedUser
 * @throws {Error} if not an admin
 */
export function requireAdmin(contact) {
  requireTeamMember(contact)
  
  if (contact.team_role !== 'admin') {
    throw new Error('Access denied - admin only')
  }
}

/**
 * Require user to be admin or manager
 * @param {object} contact - Contact from getAuthenticatedUser
 * @throws {Error} if not admin or manager
 */
export function requireManager(contact) {
  requireTeamMember(contact)
  
  if (contact.team_role !== 'admin' && contact.team_role !== 'manager') {
    throw new Error('Access denied - manager or admin only')
  }
}

/**
 * Check if user can access a specific contact
 * @param {object} user - Current user contact
 * @param {object} targetContact - Contact being accessed
 * @returns {boolean}
 */
export function canAccessContact(user, targetContact) {
  // Admin sees everything
  if (user.team_role === 'admin') return true
  
  // Manager sees everything (for now)
  if (user.team_role === 'manager') return true
  
  // Rep sees only their assigned contacts
  return targetContact.assigned_to === user.id
}

/**
 * Check if user can access a specific audit
 * @param {object} user - Current user contact
 * @param {object} audit - Audit being accessed
 * @returns {boolean}
 */
export function canAccessAudit(user, audit) {
  // Admin sees everything
  if (user.team_role === 'admin') return true
  
  // Manager sees everything (for now)
  if (user.team_role === 'manager') return true
  
  // Rep sees only their own audits
  return audit.created_by === user.id
}

/**
 * Check if user can access a specific proposal
 * @param {object} user - Current user contact
 * @param {object} proposal - Proposal being accessed
 * @returns {boolean}
 */
export function canAccessProposal(user, proposal) {
  // Admin sees everything
  if (user.team_role === 'admin') return true
  
  // Manager sees everything (for now)
  if (user.team_role === 'manager') return true
  
  // Rep sees proposals they created or are assigned to
  return proposal.assigned_to === user.id || proposal.created_by === user.id
}

/**
 * Check if user can access a specific project
 * @param {object} user - Current user contact
 * @param {object} project - Project being accessed
 * @returns {boolean}
 */
export function canAccessProject(user, project) {
  // Admin sees everything
  if (user.team_role === 'admin') return true
  
  // Manager sees everything (for now)
  if (user.team_role === 'manager') return true
  
  // Rep sees only their assigned projects
  return project.assigned_to === user.id
}

/**
 * Apply ownership filter to a Supabase query
 * @param {object} query - Supabase query builder
 * @param {object} user - Current user contact
 * @param {string} fieldName - Field to filter on (e.g., 'created_by', 'assigned_to')
 * @returns {object} Filtered query
 */
export function applyOwnershipFilter(query, user, fieldName = 'created_by') {
  // Admin and managers see everything
  if (user.team_role === 'admin' || user.team_role === 'manager') {
    return query
  }
  
  // Reps see only their own records
  return query.eq(fieldName, user.id)
}

/**
 * Build filter params for list queries
 * @param {object} user - Current user contact
 * @param {string} ownershipField - Field name for ownership
 * @param {object} additionalFilters - Additional filters from request
 * @returns {object} Filter object for query
 */
export function buildFilters(user, ownershipField = 'created_by', additionalFilters = {}) {
  const filters = { ...additionalFilters }
  
  // Non-admin/manager users only see their own data
  if (user.team_role !== 'admin' && user.team_role !== 'manager') {
    filters[ownershipField] = user.id
  }
  
  return filters
}

/**
 * Validate that user owns a record before updating/deleting
 * @param {object} user - Current user contact
 * @param {object} record - Record being modified
 * @param {string} ownershipField - Field to check (e.g., 'created_by', 'assigned_to')
 * @throws {Error} if user doesn't own the record
 */
export function validateOwnership(user, record, ownershipField = 'created_by') {
  // Admin can modify anything
  if (user.team_role === 'admin') return
  
  // Manager can modify anything (for now)
  if (user.team_role === 'manager') return
  
  // Check ownership
  if (record[ownershipField] !== user.id) {
    throw new Error(`Access denied - you don't own this record`)
  }
}
