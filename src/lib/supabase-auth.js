import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const redirectUrl = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL || `${window.location.origin}/auth/callback`
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })
  
  if (error) throw error
  return data
}

/**
 * Sign in with email/password
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return { data, error }
}

/**
 * Get current user with contact info
 */
export async function getCurrentUser() {
  const { data: { session } } = await getSession()
  if (!session?.user) return null
  
  // Fetch contact info from your contacts table
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single()
  
  if (error) {
    console.error('Error fetching contact:', error)
    // If contact doesn't exist yet, return basic user info
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.name || session.user.email,
      role: 'client',
      authUserId: session.user.id
    }
  }
  
  return {
    id: contact.id,
    authUserId: session.user.id,
    email: contact.email || session.user.email,
    name: contact.name || session.user.user_metadata?.name,
    role: contact.role || 'client',
    company: contact.company,
    avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
    contact
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

/**
 * Check if user is admin
 */
export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'admin'
}
