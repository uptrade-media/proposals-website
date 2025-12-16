// netlify/functions/gmail-sync.js
// Sync emails from Gmail to CRM - pulls emails for contacts in the CRM

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { createGmailClient, parseGmailMessage, extractEmail, isFromOurDomain } from './utils/gmail.js'

const DEFAULT_GMAIL_USER = process.env.GMAIL_DELEGATED_USER || 'ramsey@uptrademedia.com'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // Verify authentication
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Admin access required' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const { gmail } = await createGmailClient(DEFAULT_GMAIL_USER)

    // Parse request
    const params = event.queryStringParameters || {}
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {}
    
    const contactId = params.contactId || body.contactId
    const maxResults = parseInt(params.maxResults || body.maxResults || '20')
    const syncAll = body.syncAll === true

    if (!contactId && !syncAll) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId required, or set syncAll: true' })
      }
    }

    let emailsToSync = []

    if (contactId) {
      // Sync emails for a specific contact
      const { data: targetContact, error } = await supabase
        .from('contacts')
        .select('id, email, name')
        .eq('id', contactId)
        .single()

      if (error || !targetContact?.email) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Contact not found or has no email' })
        }
      }

      emailsToSync = await syncEmailsForContact(gmail, supabase, targetContact, maxResults)
    } else {
      // Sync all contacts with emails (limited)
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, email, name')
        .not('email', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(50) // Limit to prevent timeout

      for (const c of contacts || []) {
        const synced = await syncEmailsForContact(gmail, supabase, c, 5)
        emailsToSync.push(...synced)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        synced: emailsToSync.length,
        emails: emailsToSync
      })
    }

  } catch (error) {
    console.error('[gmail-sync] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * Sync emails for a specific contact
 */
async function syncEmailsForContact(gmail, supabase, contact, maxResults) {
  const contactEmail = contact.email
  const synced = []

  try {
    // Search for emails to/from this contact
    const query = `from:${contactEmail} OR to:${contactEmail}`
    
    const { data: listData } = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    })

    if (!listData.messages?.length) {
      return synced
    }

    // Get existing synced message IDs to avoid duplicates
    const { data: existing } = await supabase
      .from('email_tracking')
      .select('metadata')
      .eq('contact_id', contact.id)
      .not('metadata', 'is', null)

    const existingGmailIds = new Set(
      (existing || [])
        .map(e => e.metadata?.gmail_message_id)
        .filter(Boolean)
    )

    // Fetch and process each message
    for (const msg of listData.messages) {
      if (existingGmailIds.has(msg.id)) {
        continue // Already synced
      }

      try {
        const { data: fullMessage } = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        })

        const parsed = parseGmailMessage(fullMessage)
        const isOutbound = isFromOurDomain(parsed.from)

        // Determine email type
        let emailType = 'gmail_synced'
        if (parsed.subject?.toLowerCase().includes('audit')) {
          emailType = 'audit'
        } else if (parsed.subject?.toLowerCase().includes('proposal')) {
          emailType = 'proposal'
        }

        // Insert into email_tracking
        const { data: inserted, error: insertError } = await supabase
          .from('email_tracking')
          .insert({
            contact_id: contact.id,
            email_type: emailType,
            subject: parsed.subject || '(No Subject)',
            recipient_email: isOutbound ? extractEmail(parsed.to) : extractEmail(parsed.from),
            sender_email: extractEmail(parsed.from),
            status: 'delivered', // Gmail emails are assumed delivered
            sent_at: parsed.internalDate?.toISOString() || new Date().toISOString(),
            delivered_at: parsed.internalDate?.toISOString(),
            metadata: {
              gmail_message_id: msg.id,
              gmail_thread_id: msg.threadId,
              message_id_header: parsed.messageId,
              direction: isOutbound ? 'outbound' : 'inbound',
              via: 'gmail_sync',
              labels: parsed.labelIds
            }
          })
          .select()
          .single()

        if (!insertError && inserted) {
          synced.push({
            id: inserted.id,
            gmailId: msg.id,
            subject: parsed.subject,
            direction: isOutbound ? 'outbound' : 'inbound'
          })
        }

      } catch (msgError) {
        console.error(`[gmail-sync] Error processing message ${msg.id}:`, msgError.message)
      }
    }

  } catch (error) {
    console.error(`[gmail-sync] Error syncing contact ${contact.email}:`, error.message)
  }

  return synced
}
