// netlify/functions/projects-get.js
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
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Get project ID from path or query params
  let projectId = event.path.split('/').pop()
  // If path segment is the function name, check query params
  if (projectId === 'projects-get' || !projectId) {
    projectId = event.queryStringParameters?.id
  }
  if (!projectId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Project ID required' })
    }
  }

  try {
    // Verify authentication via Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    // Fetch project with all related data
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select(`
        *,
        contact:contacts!projects_contact_id_fkey (id, name, email, company, avatar),
        milestones:project_milestones (id, title, description, status, due_date, completed_at, order, created_at),
        members:project_members (
          id, member_id, role, joined_at,
          member:contacts!project_members_member_id_fkey (id, name, email, avatar)
        ),
        proposals (id, slug, title, status, total_amount, signed_at, fully_executed_at, created_at),
        invoices (id, invoice_number, total_amount, status, due_date, paid_at, created_at)
      `)
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Check authorization
    // Admins can see all projects, clients can only see their own
    if (contact.role !== 'admin' && project.contact_id !== contact.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to view this project' })
      }
    }

    // Fetch messages separately (with limit)
    const { data: messages } = await supabase
      .from('messages')
      .select(`
        id, subject, content, read_at, created_at,
        sender:contacts!messages_sender_id_fkey (id, name, email, avatar)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Format response
    const formattedProject = {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      budget: project.budget ? parseFloat(project.budget) : null,
      startDate: project.start_date,
      endDate: project.end_date,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      contact: project.contact,
      milestones: (project.milestones || []).map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        dueDate: m.due_date,
        completedAt: m.completed_at,
        order: m.order,
        createdAt: m.created_at
      })),
      members: (project.members || []).map(m => ({
        id: m.id,
        memberId: m.member_id,
        role: m.role,
        joinedAt: m.joined_at,
        member: m.member
      })),
      proposals: (project.proposals || []).map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        status: p.status,
        totalAmount: p.total_amount ? parseFloat(p.total_amount) : null,
        signedAt: p.signed_at,
        fullyExecutedAt: p.fully_executed_at,
        createdAt: p.created_at
      })),
      files: [], // Files are now in Google Drive
      messages: (messages || []).map(m => ({
        id: m.id,
        subject: m.subject,
        content: m.content,
        readAt: m.read_at,
        createdAt: m.created_at,
        sender: m.sender
      })),
      invoices: (project.invoices || []).map(i => ({
        id: i.id,
        invoiceNumber: i.invoice_number,
        totalAmount: i.total_amount ? parseFloat(i.total_amount) : null,
        status: i.status,
        dueDate: i.due_date,
        paidAt: i.paid_at,
        createdAt: i.created_at
      }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ project: formattedProject })
    }

  } catch (error) {
    console.error('Error fetching project:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch project',
        message: error.message 
      })
    }
  }
}
