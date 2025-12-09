// netlify/functions/projects-list.js
// Migrated to Supabase from Neon/Drizzle
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
    
    // Allow authenticated users with role-based access
    if (!payload.userId && !payload.email) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' })
      }
    }

    // Get query parameters for filtering
    const queryParams = event.queryStringParameters || {}
    const { status, contactId, limit: limitParam, offset: offsetParam } = queryParams
    const limit = Math.min(parseInt(limitParam) || 50, 100)
    const offset = parseInt(offsetParam) || 0

    // Build query
    let query = supabase
      .from('projects')
      .select(`
        *,
        contact:contacts!projects_contact_id_fkey (
          id,
          name,
          email,
          company,
          avatar
        ),
        proposals (
          id,
          title,
          status,
          total_amount
        )
      `)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by user role
    if (payload.role !== 'admin') {
      query = query.eq('contact_id', payload.userId)
    } else if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: projects, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Format response
    const formattedProjects = (projects || []).map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      budget: p.budget ? parseFloat(p.budget) : null,
      startDate: p.start_date,
      endDate: p.end_date,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      // Include contact info for admin view
      ...(payload.role === 'admin' && p.contact ? {
        contact: {
          id: p.contact.id,
          name: p.contact.name,
          email: p.contact.email,
          company: p.contact.company,
          avatar: p.contact.avatar
        }
      } : {}),
      // Include proposals summary
      proposals: (p.proposals || []).map(prop => ({
        id: prop.id,
        title: prop.title,
        status: prop.status,
        totalAmount: prop.total_amount ? parseFloat(prop.total_amount) : null
      }))
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        projects: formattedProjects,
        total: formattedProjects.length,
        offset,
        limit
      })
    }

  } catch (error) {
    console.error('Error fetching projects:', error)
    
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
        error: 'Failed to fetch projects',
        message: error.message 
      })
    }
  }
}
