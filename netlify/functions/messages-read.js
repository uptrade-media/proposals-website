// netlify/functions/messages-read.js
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
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

  // Get message ID from path
  const messageId = event.path.split('/').filter(p => p).pop()
  if (!messageId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Message ID required' })
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
    // Verify user is authenticated
    if (!contact.id && !contact.email) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Invalid session' })
      }
    }

    // Fetch message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (fetchError || !message) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Message not found' })
      }
    }

    // Verify user is the recipient
    if (message.recipient_id !== contact.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only the recipient can mark this message as read' })
      }
    }

    // Check if already read
    if (message.read_at) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'Message already marked as read',
          readAt: message.read_at
        })
      }
    }

    // Mark as read
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Message marked as read',
        readAt: updatedMessage.read_at
      })
    }

  } catch (error) {
    console.error('Error marking message as read:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to mark message as read',
        message: error.message 
      })
    }
  }
}
