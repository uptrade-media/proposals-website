// netlify/functions/projects-create.js
// Migrated to Supabase from Neon/Drizzle
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
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

    // Only admins can create projects
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can create projects' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      contactId, 
      title, 
      description, 
      status = 'planning',
      budget,
      startDate,
      endDate,
      proposalId
    } = body

    // Validate required fields
    if (!contactId || !title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId and title are required' })
      }
    }

    // Verify contact exists
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Create project
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        contact_id: contactId,
        title,
        description: description || null,
        status,
        budget: budget ? String(budget) : null,
        start_date: startDate || null,
        end_date: endDate || null
      })
      .select()
      .single()

    if (createError) {
      console.error('Create project error:', createError)
      throw createError
    }

    // If created from a proposal, link the proposal to this project
    if (proposalId) {
      await supabase
        .from('proposals')
        .update({ project_id: project.id })
        .eq('id', proposalId)
    }

    // Format response
    const formattedProject = {
      id: project.id,
      contactId: project.contact_id,
      title: project.title,
      description: project.description,
      status: project.status,
      budget: project.budget ? parseFloat(project.budget) : null,
      startDate: project.start_date,
      endDate: project.end_date,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        project: formattedProject,
        message: 'Project created successfully'
      })
    }

  } catch (error) {
    console.error('Error creating project:', error)
    
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
        error: 'Failed to create project',
        message: error.message 
      })
    }
  }
}
