/**
 * @uptrade/site-kit - Shared Supabase client
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

/**
 * Get or create Supabase client
 * Uses environment variables or explicit config
 */
export function getSupabaseClient(config?: {
  url?: string
  anonKey?: string
}): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  const url = config?.url || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = config?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      '@uptrade/site-kit: Missing Supabase configuration. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    )
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return supabaseClient
}

/**
 * Reset client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null
}
