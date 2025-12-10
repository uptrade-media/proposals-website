// netlify/functions/admin-activity-log.js
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
    // Only admins can view activity log
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || {})
    const limit = parseInt(params.get('limit') || '50')
    const activityType = params.get('type') // 'all', 'projects', 'proposals', 'invoices', 'messages', 'files'
    const contactId = params.get('contactId')

    // Build activity log from multiple sources
    const activities = []

    // Recent projects (created/updated)
    if (!activityType || activityType === 'all' || activityType === 'projects') {
      let projectsQuery = supabase
        .from('projects')
        .select(\`
          id,
          name,
          contact_id,
          created_at,
          status,
          contact:contacts!projects_contact_id_fkey (
            name,
            company
          )
        \`)
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 50))

      if (contactId) {
        projectsQuery = projectsQuery.eq('contact_id', contactId)
      }

      const { data: projects, error: projectsError } = await projectsQuery

      if (!projectsError && projects) {
        activities.push(...projects.map(row => ({
          type: 'project_created',
          entityId: row.id,
          entityName: row.name,
          contactId: row.contact_id,
          contactName: row.contact?.name,
          contactCompany: row.contact?.company,
          timestamp: row.created_at,
          status: row.status,
          description: \`Project "\${row.name}" created\`
        })))
      }
    }

    // Recent proposals
    if (!activityType || activityType === 'all' || activityType === 'proposals') {
      let proposalsQuery = supabase
        .from('proposals')
        .select(\`
          id,
          title,
          contact_id,
          created_at,
          status,
          contact:contacts!proposals_contact_id_fkey (
            name,
            company
          )
        \`)
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 50))

      if (contactId) {
        proposalsQuery = proposalsQuery.eq('contact_id', contactId)
      }

      const { data: proposals, error: proposalsError } = await proposalsQuery

      if (!proposalsError && proposals) {
        activities.push(...proposals.map(row => ({
          type: row.status === 'accepted' ? 'proposal_accepted' : 'proposal_created',
          entityId: row.id,
          entityName: row.title,
          contactId: row.contact_id,
          contactName: row.contact?.name,
          contactCompany: row.contact?.company,
          timestamp: row.created_at,
          status: row.status,
          description: row.status === 'accepted' 
            ? \`Proposal "\${row.title}" accepted\` 
            : \`Proposal "\${row.title}" created\`
        })))
      }
    }

    // Recent invoices
    if (!activityType || activityType === 'all' || activityType === 'invoices') {
      let invoicesQuery = supabase
        .from('invoices')
        .select(\`
          id,
          invoice_number,
          contact_id,
          created_at,
          status,
          total_amount,
          contact:contacts!invoices_contact_id_fkey (
            name,
            company
          )
        \`)
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 50))

      if (contactId) {
        invoicesQuery = invoicesQuery.eq('contact_id', contactId)
      }

      const { data: invoices, error: invoicesError } = await invoicesQuery

      if (!invoicesError && invoices) {
        activities.push(...invoices.map(row => ({
          type: row.status === 'paid' ? 'invoice_paid' : 'invoice_created',
          entityId: row.id,
          entityName: row.invoice_number,
          contactId: row.contact_id,
          contactName: row.contact?.name,
          contactCompany: row.contact?.company,
          timestamp: row.created_at,
          status: row.status,
          amount: parseFloat(row.total_amount),
          description: row.status === 'paid'
            ? \`Invoice \${row.invoice_number} paid (\$\${parseFloat(row.total_amount).toFixed(2)})\`
            : \`Invoice \${row.invoice_number} created (\$\${parseFloat(row.total_amount).toFixed(2)})\`
        })))
      }
    }

    // Recent messages
    if (!activityType || activityType === 'all' || activityType === 'messages') {
      let messagesQuery = supabase
        .from('messages')
        .select(\`
          id,
          subject,
          contact_id,
          created_at,
          sender,
          contact:contacts!messages_contact_id_fkey (
            name,
            company
          )
        \`)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 50))

      if (contactId) {
        messagesQuery = messagesQuery.eq('contact_id', contactId)
      }

      const { data: messages, error: messagesError } = await messagesQuery

      if (!messagesError && messages) {
        activities.push(...messages.map(row => ({
          type: 'message_sent',
          entityId: row.id,
          entityName: row.subject,
          contactId: row.contact_id,
          contactName: row.contact?.name,
          contactCompany: row.contact?.company,
          timestamp: row.created_at,
          sender: row.sender,
          description: \`Message "\${row.subject}" from \${row.sender === 'client' ? row.contact?.name : 'team'}\`
        })))
      }
    }

    // Recent file uploads
    if (!activityType || activityType === 'all' || activityType === 'files') {
      let filesQuery = supabase
        .from('files')
        .select(\`
          id,
          filename,
          contact_id,
          uploaded_at,
          category,
          size,
          contact:contacts!files_contact_id_fkey (
            name,
            company
          )
        \`)
        .order('uploaded_at', { ascending: false })
        .limit(Math.min(limit, 50))

      if (contactId) {
        filesQuery = filesQuery.eq('contact_id', contactId)
      }

      const { data: files, error: filesError } = await filesQuery

      if (!filesError && files) {
        activities.push(...files.map(row => ({
          type: 'file_uploaded',
          entityId: row.id,
          entityName: row.filename,
          contactId: row.contact_id,
          contactName: row.contact?.name,
          contactCompany: row.contact?.company,
          timestamp: row.uploaded_at,
          category: row.category,
          size: row.size,
          description: \`File "\${row.filename}" uploaded (\${row.category})\`
        })))
      }
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    // Limit results
    const limitedActivities = activities.slice(0, limit)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        activities: limitedActivities,
        total: limitedActivities.length,
        filters: {
          type: activityType || 'all',
          contactId: contactId || null,
          limit
        }
      })
    }

  } catch (error) {
    console.error('Error fetching activity log:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch activity log',
        message: error.message 
      })
    }
  }
}
