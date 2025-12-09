// netlify/functions/crm-users-list.js
// Lists all contacts with portal access (for Users tab in CRM)
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  if (!JWT_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server not configured' })
    }
  }

  const rawCookie = event.headers.cookie || ''
  const token = rawCookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))?.split('=')[1]
  
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    
    // Only admins can view users list
    if (payload.role !== 'admin') {
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

    // Build query - get all contacts that have been invited to the portal
    // (have a magic_link_token set at some point OR have account_setup = true)
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
        created_at,
        updated_at,
        pipeline_stage,
        last_contact_at
      `)
      .order('created_at', { ascending: false })

    // Filter by account setup status
    if (status === 'active') {
      query = query.eq('account_setup', 'true')
    } else if (status === 'pending') {
      query = query.or('account_setup.is.null,account_setup.neq.true')
    }
    // 'all' returns everyone

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
      pending: users.filter(u => u.account_setup !== 'true' && u.account_setup !== true).length,
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
