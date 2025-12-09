// netlify/functions/supabase-test.js
// Test endpoint to verify Supabase connection

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  try {
    // Test admin client
    const supabase = createSupabaseAdmin()
    
    // Try to query the auth schema (this will work if connection is valid)
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    })

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message,
          message: 'Supabase connection failed'
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Supabase connection successful!',
        userCount: data.users?.length || 0,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Supabase test error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to connect to Supabase'
      })
    }
  }
}
