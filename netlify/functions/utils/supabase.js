// netlify/functions/utils/supabase.js
// Server-side Supabase client for Netlify Functions

import { createClient } from '@supabase/supabase-js'

/**
 * Create Supabase client with service role key (bypasses RLS)
 * Use this for admin operations in Netlify Functions
 */
export function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
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
 * @param {object} event - Netlify function event
 * @returns {Promise<{user: object | null, contact: object | null, error: Error | null}>}
 */
export async function getAuthenticatedUser(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, contact: null, error: new Error('No authorization header') }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createSupabaseAdmin()
  
  try {
    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return { user: null, contact: null, error: authError || new Error('Invalid token') }
    }

    // Get the contact record with role
    // Use case-insensitive email matching via ilike
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, role, company')
      .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
      .single()
    
    if (contactError || !contact) {
      console.log('[Auth] Contact not found for user:', user.email)
      return { user, contact: null, error: contactError || new Error('Contact not found') }
    }

    return { user, contact, error: null }
  } catch (error) {
    console.error('[Auth] Exception in getAuthenticatedUser:', error.message)
    return { user: null, contact: null, error }
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

    // Get the contact record with role
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (contactError) {
      console.log('[Auth] Contact lookup error:', contactError.message, 'Code:', contactError.code)
      console.log('[Auth] Tried to find contact with auth_user_id:', user.id)
      return { user, contact: null, error: contactError }
    }

    console.log('[Auth] Contact found:', contact.email, 'Role:', contact.role)
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
