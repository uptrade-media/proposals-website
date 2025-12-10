// netlify/functions/clients-list.js
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

  try {
    // Only admins can list clients
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Parse query parameters (for future filtering)
    const params = new URLSearchParams(event.queryStringParameters || {})
    const search = params.get('search') || ''
    const role = params.get('role') // 'client' or 'admin'
    const accountSetup = params.get('accountSetup') // 'true' or 'false'

    // Query all non-admin contacts
    const { data: result, error } = await supabase
      .from('contacts')
      .select('id, email, name, company, role, account_setup, google_id, avatar, created_at')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Format results
    const clients = (result || []).map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      company: row.company,
      role: row.role,
      accountSetup: row.account_setup,
      hasGoogleAuth: !!row.google_id,
      avatar: row.avatar,
      createdAt: row.created_at,
      stats: {
        projectCount: 0,
        proposalCount: 0,
        invoiceCount: 0,
        pendingAmount: 0,
        paidAmount: 0,
        lastProjectActivity: null,
        lastMessageActivity: null
      }
    }))

    // Calculate summary stats
    const summary = {
      totalClients: clients.length,
      totalClientsWithProjects: clients.filter(c => c.stats.projectCount > 0).length,
      totalPendingAmount: clients.reduce((sum, c) => sum + c.stats.pendingAmount, 0),
      totalPaidAmount: clients.reduce((sum, c) => sum + c.stats.paidAmount, 0),
      clientsWithAccountSetup: clients.filter(c => c.accountSetup).length,
      clientsWithGoogleAuth: clients.filter(c => c.hasGoogleAuth).length
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        clients,
        summary,
        filters: {
          search,
          role,
          accountSetup
        }
      })
    }

  } catch (error) {
    console.error('Error listing clients:', error)
    
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
        error: 'Failed to list clients',
        message: error.message 
      })
    }
  }
}
