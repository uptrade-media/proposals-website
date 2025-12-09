// netlify/functions/audits-magic-link.js
// Generate or retrieve magic link for an audit (admin only)
import crypto from 'crypto'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.uptrademedia.com'

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
    // Verify admin authentication via Supabase
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Check if admin
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const supabase = createSupabaseAdmin()

    const { auditId } = JSON.parse(event.body || '{}')

    if (!auditId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'auditId is required' })
      }
    }

    // Check if audit already has a magic token
    const { data: audit, error: fetchError } = await supabase
      .from('audits')
      .select('id, magic_token, magic_token_expires')
      .eq('id', auditId)
      .single()

    if (fetchError || !audit) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Audit not found' })
      }
    }

    let magicToken = audit.magic_token
    let expiresAt = audit.magic_token_expires

    // Generate new token if missing or expired
    const now = new Date()
    const tokenExpired = expiresAt && new Date(expiresAt) < now

    if (!magicToken || tokenExpired) {
      magicToken = crypto.randomBytes(32).toString('hex')
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

      const { error: updateError } = await supabase
        .from('audits')
        .update({
          magic_token: magicToken,
          magic_token_expires: expiresAt.toISOString()
        })
        .eq('id', auditId)

      if (updateError) {
        console.error('Failed to update magic token:', updateError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to generate magic link' })
        }
      }
    }

    const magicLink = `${PORTAL_URL}/audit/${auditId}?token=${magicToken}`

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        magicLink,
        expiresAt,
        isNew: tokenExpired || !audit.magic_token
      })
    }

  } catch (error) {
    console.error('Error generating magic link:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
