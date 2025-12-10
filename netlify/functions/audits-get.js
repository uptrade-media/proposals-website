// netlify/functions/audits-get.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // Get audit ID from query params
  const auditId = event.queryStringParameters?.id

  if (!auditId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Audit ID is required' })
    }
  }

  try {
    const userId = contact.id

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch audit with security check (only user's own audits)
    const { data: audit, error } = await supabase
      .from('audits')
      .select('*')
      .eq('id', auditId)
      .eq('contact_id', userId)
      .single()

    if (error || !audit) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Audit not found' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audit
      })
    }

  } catch (error) {
    console.error('Error fetching audit:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch audit' })
    }
  }
}
