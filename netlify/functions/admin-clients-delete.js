// netlify/functions/admin-clients-delete.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'DELETE') {
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
    // Only admins can delete clients
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

    // Verify client exists
    const { data: existingClient, error: fetchError } = await supabase
      .from('contacts')
      .select('id, email')
      .eq('id', clientId)
      .single()

    if (fetchError || !existingClient) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    // Prevent deleting yourself
    if (clientId === contact.id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot delete your own account' })
      }
    }

    // Check if client has related data
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('contact_id', clientId)

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id')
      .eq('contact_id', clientId)

    const { data: proposals, error: proposalsError } = await supabase
      .from('proposals')
      .select('id')
      .eq('contact_id', clientId)

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('contact_id', clientId)

    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('id')
      .eq('contact_id', clientId)

    // If client has data, we should archive instead of delete
    const hasRelatedData = 
      (projects && projects.length > 0) || 
      (invoices && invoices.length > 0) || 
      (proposals && proposals.length > 0) || 
      (messages && messages.length > 0) || 
      (files && files.length > 0)

    if (hasRelatedData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Cannot delete client with existing data',
          details: {
            projects: projects?.length || 0,
            invoices: invoices?.length || 0,
            proposals: proposals?.length || 0,
            messages: messages?.length || 0,
            files: files?.length || 0
          },
          suggestion: 'Consider updating the client role or company name instead of deleting'
        })
      }
    }

    // Delete client (only if no related data)
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', clientId)

    if (deleteError) {
      console.error('Error deleting client:', deleteError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete client', message: deleteError.message })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Client deleted successfully',
        clientId
      })
    }

  } catch (error) {
    console.error('Error deleting client:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete client',
        message: error.message 
      })
    }
  }
}
