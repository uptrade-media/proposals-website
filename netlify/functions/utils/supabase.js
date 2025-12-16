// netlify/functions/utils/supabase.js
// Server-side Supabase client for Netlify Functions
// Multi-tenancy via org_id column (row-level isolation)

import { createClient } from '@supabase/supabase-js'

// All tables are in public schema, filtered by org_id
const DEFAULT_ORG_SLUG = 'uptrade-media'

/**
 * Create Supabase client with service role key (bypasses RLS)
 * Use this for admin operations in Netlify Functions
 * 
 * @param {string} orgSlug - Optional org slug for multi-tenant filtering
 */
export function createSupabaseAdmin(orgSlug = DEFAULT_ORG_SLUG) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Store org slug for multi-tenant queries
  client._orgSlug = orgSlug

  return client
}

/**
 * Create Supabase client for a specific organization schema
 * Use this when you know which tenant's data you're accessing
 * 
 * @param {string} schemaName - The organization schema (e.g., 'org_uptrade_media', 'org_client_xyz')
 */
export function createSupabaseForOrg(schemaName) {
  if (!schemaName || !schemaName.startsWith('org_')) {
    throw new Error(`Invalid organization schema: ${schemaName}`)
  }
  return createSupabaseAdmin(schemaName)
}

/**
 * Create Supabase client for the public schema
 * Use this for cross-tenant operations (organizations table, user_organizations, etc.)
 */
export function createSupabasePublic() {
  return createSupabaseAdmin('public')
}

/**
 * Create Supabase client with anon key (respects RLS)
 * Use this for user-level operations
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Get user from Authorization header
 * @param {object} event - Netlify function event
 * @returns {Promise<{user: object | null, error: Error | null}>}
 */
export async function getUserFromHeader(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: new Error('No authorization header') }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createSupabaseClient()
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  return { user, error }
}

/**
 * Get authenticated user and contact from Authorization header
 * This is the primary auth method for Netlify Functions
 * Now includes organization context for multi-tenant support
 * 
 * @param {object} event - Netlify function event
 * @returns {Promise<{user: object | null, contact: object | null, organization: object | null, isSuperAdmin: boolean, error: Error | null}>}
 */
export async function getAuthenticatedUser(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, contact: null, organization: null, isSuperAdmin: false, error: new Error('No authorization header') }
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Use public schema for auth operations
  const supabasePublic = createSupabasePublic()
  const supabaseOrg = createSupabaseAdmin() // Defaults to org_uptrade_media
  
  try {
    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(token)
    
    if (authError || !user) {
      return { user: null, contact: null, organization: null, isSuperAdmin: false, error: authError || new Error('Invalid token') }
    }

    // Check if user is a super admin
    const { data: superAdminRecord } = await supabasePublic
      .from('super_admins')
      .select('user_email')
      .eq('user_email', user.email)
      .single()
    
    const isSuperAdmin = !!superAdminRecord

    // Get user's organizations
    const { data: userOrgs } = await supabasePublic
      .from('user_organizations')
      .select(`
        role,
        is_primary,
        organization:organizations (
          id,
          slug,
          name,
          domain,
          schema_name,
          features,
          theme,
          plan,
          status
        )
      `)
      .eq('user_email', user.email)

    // Determine current organization
    // Priority: 1) X-Organization-Id header, 2) Primary org, 3) First available, 4) Uptrade (super admin fallback)
    const requestedOrgId = event.headers['x-organization-id']
    let currentOrg = null
    
    if (requestedOrgId && userOrgs) {
      currentOrg = userOrgs.find(uo => uo.organization?.id === requestedOrgId)?.organization
    }
    
    if (!currentOrg && userOrgs?.length > 0) {
      // Try primary org first
      const primaryOrg = userOrgs.find(uo => uo.is_primary)
      currentOrg = primaryOrg?.organization || userOrgs[0]?.organization
    }
    
    // Super admins can access Uptrade if they don't have explicit access
    if (!currentOrg && isSuperAdmin) {
      const { data: uptradeOrg } = await supabasePublic
        .from('organizations')
        .select('*')
        .eq('slug', 'uptrade-media')
        .single()
      currentOrg = uptradeOrg
    }

    // Get the contact record from the current organization's schema
    const orgSchema = currentOrg?.schema_name || 'org_uptrade_media'
    const supabaseOrgClient = createSupabaseForOrg(orgSchema)
    
    const { data: contact, error: contactError } = await supabaseOrgClient
      .from('contacts')
      .select(`
        id, email, name, role, company,
        is_team_member, team_role, team_status,
        openphone_number, gmail_address
      `)
      .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
      .single()
    
    if (contactError || !contact) {
      console.log('[Auth] Contact not found for user:', user.email, 'in schema:', orgSchema)
      // For super admins, this is OK - they might not have a contact in every org
      if (!isSuperAdmin) {
        return { user, contact: null, organization: currentOrg, isSuperAdmin, error: contactError || new Error('Contact not found') }
      }
    }

    // Add permission flags for convenience
    if (contact) {
      contact.canViewAllClients = contact.team_role === 'admin' || isSuperAdmin
      contact.canManageTeam = contact.team_role === 'admin' || contact.team_role === 'manager' || isSuperAdmin
      contact.canReassignLeads = contact.team_role === 'admin' || isSuperAdmin
      contact.canViewTeamMetrics = contact.team_role === 'admin' || contact.team_role === 'manager' || isSuperAdmin
    }

    // Build organization context
    const organization = currentOrg ? {
      ...currentOrg,
      userRole: userOrgs?.find(uo => uo.organization?.id === currentOrg.id)?.role || (isSuperAdmin ? 'admin' : 'member'),
      availableOrgs: isSuperAdmin 
        ? null // Super admins fetch all orgs separately
        : (userOrgs || []).map(uo => ({
            id: uo.organization?.id,
            name: uo.organization?.name,
            slug: uo.organization?.slug,
            role: uo.role
          }))
    } : null

    return { user, contact, organization, isSuperAdmin, error: null }
  } catch (error) {
    console.error('[Auth] Exception in getAuthenticatedUser:', error.message)
    return { user: null, contact: null, organization: null, isSuperAdmin: false, error }
  }
}

/**
 * Get user from Supabase session cookie
 * @param {object} event - Netlify function event  
 * @returns {Promise<{user: object | null, contact: object | null, error: Error | null}>}
 */
export async function getUserFromCookie(event) {
  const supabase = createSupabaseAdmin()
  
  // Extract all Supabase auth cookies
  const cookies = event.headers.cookie || ''
  
  console.log('[Auth] Checking cookies:', cookies.substring(0, 200) + '...')
  
  // Try multiple cookie patterns
  let accessToken = cookies.match(/sb-[^-]+-auth-token=([^;]+)/)?.[1]
  
  if (!accessToken) {
    // Try alternative pattern with session
    accessToken = cookies.match(/sb-[^-]+-auth-token\.0=([^;]+)/)?.[1]
  }
  
  if (!accessToken) {
    console.log('[Auth] No session cookie found in patterns')
    return { user: null, contact: null, error: new Error('No session cookie') }
  }

  try {
    console.log('[Auth] Found cookie, length:', accessToken.length)
    
    // Decode the JWT payload (it's a JSON array with [session, user])
    const decoded = JSON.parse(decodeURIComponent(accessToken))
    const token = decoded[0]?.access_token
    
    if (!token) {
      console.log('[Auth] Invalid session format - no access_token')
      return { user: null, contact: null, error: new Error('Invalid session format') }
    }

    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('[Auth] Supabase auth error:', authError?.message || 'No user')
      return { user: null, contact: null, error: authError || new Error('Invalid session') }
    }

    console.log('[Auth] User authenticated:', user.email, 'ID:', user.id)

    // Get the contact record with role and team info
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(`
        id, email, name, role,
        is_team_member, team_role, team_status,
        openphone_number, gmail_address
      `)
      .eq('auth_user_id', user.id)
      .single()
    
    if (contactError) {
      console.log('[Auth] Contact lookup error:', contactError.message, 'Code:', contactError.code)
      console.log('[Auth] Tried to find contact with auth_user_id:', user.id)
      return { user, contact: null, error: contactError }
    }

    console.log('[Auth] Contact found:', contact.email, 'Role:', contact.role, 'Team:', contact.team_role)
    
    // Add permission flags for convenience
    contact.canViewAllClients = contact.team_role === 'admin'
    contact.canManageTeam = contact.team_role === 'admin' || contact.team_role === 'manager'
    contact.canReassignLeads = contact.team_role === 'admin'
    contact.canViewTeamMetrics = contact.team_role === 'admin' || contact.team_role === 'manager'
    
    return { user, contact, error: null }
  } catch (error) {
    console.log('[Auth] Exception in getUserFromCookie:', error.message)
    return { user: null, contact: null, error }
  }
}

/**
 * Get a secret value from the app_secrets table
 * Use this for large secrets that exceed AWS Lambda's 4KB env var limit
 * @param {string} key - The secret key to fetch
 * @returns {Promise<string | null>}
 */
export async function getSecret(key) {
  try {
    const supabase = createSupabaseAdmin()
    
    const { data, error } = await supabase
      .from('app_secrets')
      .select('value')
      .eq('key', key)
      .single()
    
    if (error || !data) {
      console.error(`[Secrets] Failed to fetch secret '${key}':`, error?.message)
      return null
    }
    
    return data.value
  } catch (error) {
    console.error(`[Secrets] Exception fetching secret '${key}':`, error.message)
    return null
  }
}

/**
 * Get Google Service Account credentials from Supabase
 * Falls back to environment variable if not found in database
 * @returns {Promise<object | null>}
 */
export async function getGoogleServiceAccountCredentials() {
  // First try to get from Supabase (preferred - avoids Lambda env var limits)
  const secretValue = await getSecret('GOOGLE_SERVICE_ACCOUNT_KEY')
  
  if (secretValue) {
    try {
      return JSON.parse(secretValue)
    } catch (e) {
      console.error('[Secrets] Failed to parse Google credentials from Supabase:', e.message)
    }
  }
  
  // Fall back to environment variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    } catch (e) {
      console.error('[Secrets] Failed to parse Google credentials from env:', e.message)
    }
  }
  
  return null
}
