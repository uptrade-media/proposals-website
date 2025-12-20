// netlify/functions/crm-users-list.js
// Lists all contacts with portal access (for Users tab in CRM)
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    // Only admins can view users list
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Get query params
    const params = event.queryStringParameters || {}
    const status = params.status // 'active', 'pending', 'all'
    const search = params.search

    // Build query - get contacts that have portal access:
    // 1. Active users (account_setup = 'true') - have completed setup
    // 2. Pending invites (magic_link_token is set AND account_setup != 'true') - invited but not setup
    // 
    // This excludes CRM-only leads who were never invited to the portal
    let query = supabase
      .from('contacts')
      .select(`
        id,
        name,
        email,
        company,
        phone,
        role,
        avatar,
        google_id,
        account_setup,
        magic_link_token,
        magic_link_expires,
        created_at,
        updated_at,
        pipeline_stage,
        last_contact_at
      `)
      .order('created_at', { ascending: false })

    // Only return contacts with portal access (active OR have been invited)
    // This filters out CRM-only leads who were never sent an invite
    if (status === 'active') {
      query = query.eq('account_setup', 'true')
    } else if (status === 'pending') {
      // Only show pending if they were actually invited (have a magic link token)
      query = query.not('magic_link_token', 'is', null)
        .or('account_setup.is.null,account_setup.neq.true')
    } else {
      // 'all' - return active users OR users who have been invited
      query = query.or('account_setup.eq.true,magic_link_token.not.is.null')
    }

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Failed to fetch users:', error)
      throw error
    }

    // Calculate stats
    const stats = {
      total: users.length,
      active: users.filter(u => u.account_setup === 'true' || u.account_setup === true).length,
      pending: users.filter(u => 
        u.magic_link_token && (u.account_setup !== 'true' && u.account_setup !== true)
      ).length,
      admins: users.filter(u => u.role === 'admin').length,
      clients: users.filter(u => u.role === 'client' || !u.role).length,
      googleAuth: users.filter(u => u.google_id).length,
      passwordAuth: users.filter(u => !u.google_id && (u.account_setup === 'true' || u.account_setup === true)).length
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        users,
        stats,
        count: users.length
      })
    }

  } catch (error) {
    console.error('Error fetching users:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch users',
        message: error.message 
      })
    }
  }
}
