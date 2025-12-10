// netlify/functions/clients-get.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication using Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    // Verify admin role
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Get client ID from query params
    const url = new URL(event.rawUrl || `http://localhost${event.rawPath}`)
    const clientId = url.searchParams.get('id')

    if (!clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('contacts')
      .select('id, email, name, company, phone, role, subscribed, source, notes, tags, last_login, created_at, updated_at')
      .eq('id', clientId)
      .eq('role', 'client')
      .single()

    if (clientError || !client) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    // Get client activity (recent interactions)
    const { data: activity, error: activityError } = await supabase
      .from('client_activity')
      .select('id, activity_type, description, metadata, created_at')
      .eq('contact_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (activityError) {
      console.error('Error fetching activity:', activityError)
    }

    // Get client projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, status, budget, start_date, end_date, created_at')
      .eq('contact_id', clientId)
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
    }

    // Get client proposals
    const { data: proposals, error: proposalsError } = await supabase
      .from('proposals')
      .select('id, slug, title, status, total_amount, sent_at, viewed_at, created_at')
      .eq('contact_id', clientId)
      .order('created_at', { ascending: false })

    if (proposalsError) {
      console.error('Error fetching proposals:', proposalsError)
    }

    // Get client invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, status, due_date, created_at')
      .eq('contact_id', clientId)
      .order('created_at', { ascending: false })

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        client,
        activity: activity || [],
        projects: projects || [],
        proposals: proposals || [],
        invoices: invoices || []
      })
    }
  } catch (error) {
    console.error('Clients get error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch client',
        details: error.message
      })
    }
  }
}
