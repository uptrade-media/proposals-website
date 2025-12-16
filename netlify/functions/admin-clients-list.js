// netlify/functions/admin-clients-list.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { requireTeamMember } from './utils/permissions.js'

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
    // Require team member access
    requireTeamMember(contact)

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.team_role === 'admin' || contact.team_role === 'manager'

    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || {})
    const search = params.get('search') || ''
    const role = params.get('role') // 'client' or 'admin'
    const accountSetup = params.get('accountSetup') // 'true' or 'false'
    const assignedTo = params.get('assignedTo') // Filter by rep

    // Build query - exclude team members, show only actual clients
    let query = supabase
      .from('contacts')
      .select('id, email, name, company, role, account_setup, google_id, avatar, created_at, assigned_to')
      .eq('is_team_member', false) // Only show clients, not team members
      .order('created_at', { ascending: false })

    // Non-admin reps only see their assigned contacts
    if (!isAdmin) {
      query = query.eq('assigned_to', contact.id)
    }
    
    // Admin can filter by assigned rep
    if (assignedTo && isAdmin) {
      if (assignedTo === 'unassigned') {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', assignedTo)
      }
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    // Apply role filter if provided
    if (role) {
      query = query.eq('role', role)
    }

    // Apply accountSetup filter if provided
    if (accountSetup) {
      query = query.eq('account_setup', accountSetup)
    }

    const { data: result, error: queryError } = await query

    if (queryError) {
      console.error('Error querying contacts:', queryError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to query contacts', message: queryError.message })
      }
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
      assignedTo: row.assigned_to, // Include ownership info
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
      clientsWithAccountSetup: clients.filter(c => c.accountSetup === 'true').length,
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
