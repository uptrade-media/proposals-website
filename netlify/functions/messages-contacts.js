// netlify/functions/messages-contacts.js
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
      body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED' })
    }
  }

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'UNAUTHORIZED' })
    }
  }

  try {
    const userId = contact.id

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'INVALID_TOKEN' })
      }
    }

    // Connect to database
    const targetRole = contact.role === 'admin' ? 'client' : 'admin'
    
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('id, name, email, company, role')
      .eq('role', targetRole)
      .order('name')

    if (fetchError) {
      throw fetchError
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ contacts: contacts || [] })
    }
  } catch (error) {
    console.error('[messages-contacts] Error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' })
    }
  }
}
