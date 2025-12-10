import { Resend } from 'resend'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  try {
    // Verify auth using Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    if (contact.role !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin only' }) }
    }

    if (event.httpMethod === 'GET') {
      // Search contacts
      const q = event.queryStringParameters?.q || ''
      
      if (q.length < 2) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Query too short' }) }
      }

      const supabase = createSupabaseAdmin()

      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, email, name, company')
        .or(`email.ilike.%${q}%,name.ilike.%${q}%,company.ilike.%${q}%`)
        .limit(20)

      if (error) {
        console.error('Search error:', error)
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to search contacts' })
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ contacts: contacts || [] }),
        headers: { 'Content-Type': 'application/json' }
      }
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    console.error('Search error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to search contacts' })
    }
  }
}
