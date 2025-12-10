// netlify/functions/admin-clients-get.js
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
    // Only admins can view client details
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Get client ID from path
    const clientId = event.path.split('/').pop()

    if (!clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Client ID is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch client basic info
    const { data: client, error: clientError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    // Fetch related data in parallel
    const [
      projectsResult,
      proposalsResult,
      invoicesResult,
      messagesResult,
      filesResult
    ] = await Promise.all([
      // Recent projects
      supabase
        .from('projects')
        .select('*')
        .eq('contact_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent proposals
      supabase
        .from('proposals')
        .select('*')
        .eq('contact_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // All invoices for stats
      supabase
        .from('invoices')
        .select('*')
        .eq('contact_id', clientId)
        .order('created_at', { ascending: false }),
      
      // Recent messages (threads only, no parent_id)
      supabase
        .from('messages')
        .select('*')
        .eq('contact_id', clientId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent files
      supabase
        .from('files')
        .select('*')
        .eq('contact_id', clientId)
        .order('uploaded_at', { ascending: false })
        .limit(5)
    ])

    const projects = projectsResult.data || []
    const proposals = proposalsResult.data || []
    const invoices = invoicesResult.data || []
    const messages = messagesResult.data || []
    const files = filesResult.data || []

    // Fetch all projects for stats
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, status')
      .eq('contact_id', clientId)

    // Fetch all messages for stats
    const { data: allMessages } = await supabase
      .from('messages')
      .select('id, sender, read_at')
      .eq('contact_id', clientId)

    // Calculate statistics
    const stats = {
      totalProjects: allProjects?.length || 0,
      activeProjects: allProjects?.filter(p => p.status === 'active').length || 0,
      completedProjects: allProjects?.filter(p => p.status === 'completed').length || 0,
      totalProposals: proposals.length,
      pendingProposals: proposals.filter(p => p.status === 'sent').length,
      acceptedProposals: proposals.filter(p => p.status === 'accepted').length,
      totalInvoices: invoices.length,
      pendingInvoices: invoices.filter(i => i.status === 'pending').length,
      paidInvoices: invoices.filter(i => i.status === 'paid').length,
      totalPendingAmount: invoices
        .filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0),
      totalPaidAmount: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0),
      totalMessages: allMessages?.length || 0,
      unreadMessages: allMessages?.filter(m => m.sender === 'client' && !m.read_at).length || 0,
      totalFiles: files.length
    }

    // Format response
    const formattedClient = {
      id: client.id,
      email: client.email,
      name: client.name,
      company: client.company,
      phone: client.phone,
      website: client.website,
      source: client.source,
      role: client.role,
      accountSetup: client.account_setup,
      hasGoogleAuth: !!client.google_id,
      avatar: client.avatar,
      createdAt: client.created_at,
      stats,
      recentProjects: projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        budget: p.budget ? parseFloat(p.budget) : null,
        startDate: p.start_date,
        endDate: p.end_date,
        createdAt: p.created_at
      })),
      recentProposals: proposals.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        totalAmount: parseFloat(p.total_amount || 0),
        validUntil: p.valid_until,
        createdAt: p.created_at
      })),
      recentInvoices: invoices.slice(0, 5).map(i => ({
        id: i.id,
        invoiceNumber: i.invoice_number,
        status: i.status,
        totalAmount: parseFloat(i.total_amount || 0),
        dueDate: i.due_date,
        paidAt: i.paid_at,
        createdAt: i.created_at
      })),
      recentMessages: messages.map(m => ({
        id: m.id,
        subject: m.subject,
        sender: m.sender,
        readAt: m.read_at,
        createdAt: m.created_at
      })),
      recentFiles: files.map(f => ({
        id: f.id,
        filename: f.filename,
        category: f.category,
        size: f.size,
        uploadedAt: f.uploaded_at
      }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ client: formattedClient })
    }

  } catch (error) {
    console.error('Error fetching client details:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch client details',
        message: error.message 
      })
    }
  }
}
