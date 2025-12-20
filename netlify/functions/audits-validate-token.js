// netlify/functions/audits-validate-token.js
// Validates audit magic tokens directly against Supabase
// Used for magic link access to audit reports

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
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
    const { auditId, token } = JSON.parse(event.body || '{}')

    if (!auditId || !token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ valid: false, error: 'Missing auditId or token' })
      }
    }

    const supabase = createSupabaseAdmin()
    
    // Look up the audit by ID and verify the token matches
    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, magic_token, magic_token_expires_at, target_url, status')
      .eq('id', auditId)
      .single()
    
    if (error || !audit) {
      console.error('[validate-token] Audit not found:', auditId, error)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ valid: false, error: 'Audit not found' })
      }
    }
    
    // Check if token matches
    if (audit.magic_token !== token) {
      console.error('[validate-token] Token mismatch for audit:', auditId)
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ valid: false, error: 'Invalid token' })
      }
    }
    
    // Check if token is expired (if expiry is set)
    if (audit.magic_token_expires_at) {
      const expiresAt = new Date(audit.magic_token_expires_at)
      if (expiresAt < new Date()) {
        console.error('[validate-token] Token expired for audit:', auditId)
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ valid: false, error: 'Token expired' })
        }
      }
    }
    
    console.log('[validate-token] Token valid for audit:', auditId)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        valid: true, 
        auditId: audit.id,
        targetUrl: audit.target_url,
        status: audit.status
      })
    }

  } catch (error) {
    console.error('Error validating token:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ valid: false, error: 'Failed to validate token' })
    }
  }
}
