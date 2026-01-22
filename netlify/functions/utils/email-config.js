/**
 * Email Configuration Utility
 * 
 * Handles per-project email sending configuration:
 * - Fetches project's resend_domain and resend_from_name from settings
 * - Constructs proper "from" address (e.g., "Client Name <noreply@send.client.com>")
 * - Falls back to default Uptrade Media domain if project doesn't have custom settings
 * 
 * Usage:
 *   const { from, replyTo } = await getProjectEmailConfig(supabase, projectId)
 *   await resend.emails.send({ from, to, subject, html })
 */

const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM || 'Uptrade Media <portal@send.uptrademedia.com>'
const DEFAULT_REPLY_TO = process.env.ADMIN_EMAIL || 'ramsey@uptrademedia.com'

/**
 * Get email sending configuration for a project
 * 
 * @param {Object} supabase - Supabase client
 * @param {string} projectId - Project UUID
 * @param {Object} options - Additional options
 * @param {string} options.defaultFromName - Override default from name
 * @param {string} options.emailType - Email type for specific handling (invoice, proposal, etc.)
 * @returns {Promise<{from: string, replyTo: string, domain: string}>}
 */
export async function getProjectEmailConfig(supabase, projectId, options = {}) {
  if (!projectId) {
    console.log('[email-config] No project ID provided, using default config')
    return {
      from: options.defaultFromName 
        ? `${options.defaultFromName} <${extractEmail(DEFAULT_FROM_EMAIL)}>`
        : DEFAULT_FROM_EMAIL,
      replyTo: DEFAULT_REPLY_TO,
      domain: extractDomain(DEFAULT_FROM_EMAIL)
    }
  }

  try {
    // Fetch project settings
    const { data: project, error } = await supabase
      .from('projects')
      .select('title, settings, logo_url')
      .eq('id', projectId)
      .single()

    if (error) {
      console.error('[email-config] Error fetching project:', error)
      return getDefaultConfig(options)
    }

    if (!project) {
      console.log('[email-config] Project not found, using default config')
      return getDefaultConfig(options)
    }

    const settings = project.settings || {}
    const resendDomain = settings.resend_domain
    const resendFromName = settings.resend_from_name || project.title || options.defaultFromName

    // If project has custom domain configured, use it
    if (resendDomain && settings.resend_domain_verified !== false) {
      const fromEmail = `noreply@${resendDomain}`
      const from = resendFromName ? `${resendFromName} <${fromEmail}>` : fromEmail
      
      console.log('[email-config] Using project custom domain:', {
        projectId,
        domain: resendDomain,
        fromName: resendFromName,
        from
      })

      return {
        from,
        replyTo: DEFAULT_REPLY_TO, // Always reply to Uptrade team
        domain: resendDomain,
        projectTitle: project.title,
        logoUrl: project.logo_url
      }
    }

    // Fall back to default domain with project branding
    const defaultEmail = extractEmail(DEFAULT_FROM_EMAIL)
    const from = resendFromName ? `${resendFromName} <${defaultEmail}>` : DEFAULT_FROM_EMAIL

    console.log('[email-config] Using default domain with project branding:', {
      projectId,
      fromName: resendFromName,
      from
    })

    return {
      from,
      replyTo: DEFAULT_REPLY_TO,
      domain: extractDomain(DEFAULT_FROM_EMAIL),
      projectTitle: project.title,
      logoUrl: project.logo_url
    }

  } catch (err) {
    console.error('[email-config] Unexpected error:', err)
    return getDefaultConfig(options)
  }
}

/**
 * Get email config for an invoice (includes invoice project lookup)
 * 
 * @param {Object} supabase - Supabase client  
 * @param {string} invoiceId - Invoice UUID
 * @param {Object} options - Additional options
 * @returns {Promise<{from: string, replyTo: string, domain: string}>}
 */
export async function getInvoiceEmailConfig(supabase, invoiceId, options = {}) {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('project_id')
      .eq('id', invoiceId)
      .single()

    if (error || !invoice) {
      console.error('[email-config] Error fetching invoice:', error)
      return getDefaultConfig(options)
    }

    return getProjectEmailConfig(supabase, invoice.project_id, {
      ...options,
      emailType: 'invoice'
    })
  } catch (err) {
    console.error('[email-config] Error in getInvoiceEmailConfig:', err)
    return getDefaultConfig(options)
  }
}

/**
 * Get email config for a proposal (includes proposal project lookup)
 * 
 * @param {Object} supabase - Supabase client
 * @param {string} proposalId - Proposal UUID
 * @param {Object} options - Additional options
 * @returns {Promise<{from: string, replyTo: string, domain: string}>}
 */
export async function getProposalEmailConfig(supabase, proposalId, options = {}) {
  try {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('project_id')
      .eq('id', proposalId)
      .single()

    if (error || !proposal) {
      console.error('[email-config] Error fetching proposal:', error)
      return getDefaultConfig(options)
    }

    return getProjectEmailConfig(supabase, proposal.project_id, {
      ...options,
      emailType: 'proposal'
    })
  } catch (err) {
    console.error('[email-config] Error in getProposalEmailConfig:', err)
    return getDefaultConfig(options)
  }
}

/**
 * Get email config for org-level emails (uses first project's settings or default)
 * 
 * @param {Object} supabase - Supabase client
 * @param {string} orgId - Organization UUID
 * @param {Object} options - Additional options
 * @returns {Promise<{from: string, replyTo: string, domain: string}>}
 */
export async function getOrgEmailConfig(supabase, orgId, options = {}) {
  try {
    // Get first project for org (most orgs have one project)
    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !project) {
      console.log('[email-config] No project found for org, using default config')
      return getDefaultConfig(options)
    }

    return getProjectEmailConfig(supabase, project.id, options)
  } catch (err) {
    console.error('[email-config] Error in getOrgEmailConfig:', err)
    return getDefaultConfig(options)
  }
}

// ============================================
// HELPERS
// ============================================

function getDefaultConfig(options = {}) {
  return {
    from: options.defaultFromName 
      ? `${options.defaultFromName} <${extractEmail(DEFAULT_FROM_EMAIL)}>`
      : DEFAULT_FROM_EMAIL,
    replyTo: DEFAULT_REPLY_TO,
    domain: extractDomain(DEFAULT_FROM_EMAIL)
  }
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmail(fromString) {
  if (!fromString) return 'portal@send.uptrademedia.com'
  const match = fromString.match(/<([^>]+)>/)
  return match ? match[1] : fromString
}

/**
 * Extract domain from email address or from string
 */
function extractDomain(fromString) {
  const email = extractEmail(fromString)
  const parts = email.split('@')
  return parts.length === 2 ? parts[1] : 'send.uptrademedia.com'
}
