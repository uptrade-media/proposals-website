// netlify/functions/admin-clients-update.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import bcrypt from 'bcryptjs'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT') {
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
    // Only admins can update clients
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

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { name, company, phone, website, source, role, password } = body

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

    // Build update object
    const updates = {}

    if (name !== undefined) {
      updates.name = name
    }

    if (company !== undefined) {
      updates.company = company
    }

    if (phone !== undefined) {
      updates.phone = phone
    }

    if (website !== undefined) {
      updates.website = website
    }

    if (source !== undefined) {
      updates.source = source
    }

    if (role !== undefined) {
      // Validate role
      if (!['client', 'admin'].includes(role)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid role. Must be "client" or "admin"' })
        }
      }
      updates.role = role
    }

    // Handle password update
    if (password) {
      if (password.length < 8) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Password must be at least 8 characters' })
        }
      }
      
      const hashedPassword = await bcrypt.hash(password, 10)
      updates.password = hashedPassword
    }

    // Perform update
    const { data: updatedClient, error: updateError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', clientId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating client:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update client', message: updateError.message })
      }
    }

    // Format response (exclude password)
    const formattedClient = {
      id: updatedClient.id,
      email: updatedClient.email,
      name: updatedClient.name,
      company: updatedClient.company,
      phone: updatedClient.phone,
      website: updatedClient.website,
      source: updatedClient.source,
      role: updatedClient.role,
      accountSetup: updatedClient.account_setup,
      hasGoogleAuth: !!updatedClient.google_id,
      avatar: updatedClient.avatar,
      createdAt: updatedClient.created_at
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        client: formattedClient,
        message: 'Client updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating client:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update client',
        message: error.message 
      })
    }
  }
}
