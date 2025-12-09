/**
 * Portfolio List Function
 * 
 * Lists all portfolio items (with optional status filter)
 * Uses service role to bypass RLS - frontend controls access via UI
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get status filter from query params
    const status = event.queryStringParameters?.status || null

    // Fetch portfolio items from Supabase using service role (bypasses RLS)
    console.log('[Portfolio API] Fetching portfolio items, status:', status)
    const supabase = createSupabaseAdmin()
    
    let query = supabase
      .from('portfolio_items')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: portfolioItems, error: dbError } = await query
    
    if (dbError) {
      console.error('[Portfolio API] Database error:', dbError)
      throw dbError
    }

    console.log('[Portfolio API] Found', portfolioItems?.length || 0, 'items')

    return {
      statusCode: 200,
      body: JSON.stringify({
        portfolioItems: portfolioItems || [],
        count: portfolioItems?.length || 0
      })
    }

  } catch (error) {
    console.error('[Portfolio API] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        message: 'Failed to fetch portfolio items'
      })
    }
  }
}
