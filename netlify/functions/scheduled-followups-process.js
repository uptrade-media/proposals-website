// netlify/functions/scheduled-followups-process.js
// Process scheduled follow-up emails
// This function should be called via Netlify scheduled function or external cron
// It checks for pending follow-ups due to be sent, and cancels any if recipient has replied

import { createSupabaseAdmin } from './utils/supabase.js'
import { createGmailClient, buildRawEmail } from './utils/gmail.js'

const DEFAULT_GMAIL_SENDER = process.env.GMAIL_DELEGATED_USER || 'ramsey@uptrademedia.com'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  // This can be triggered by:
  // 1. Netlify scheduled functions (cron)
  // 2. External cron service calling this endpoint
  // 3. Manual trigger with secret key
  
  // Verify cron secret for external triggers
  const cronSecret = event.headers['x-cron-secret'] || event.queryStringParameters?.secret
  const isScheduledTrigger = event.headers['x-netlify-event'] === 'schedule'
  
  if (!isScheduledTrigger && cronSecret !== process.env.CRON_SECRET) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  const supabase = createSupabaseAdmin()

  try {
    console.log('[scheduled-followups] Starting processing run')

    // Step 1: Get all pending follow-ups that are due
    const now = new Date().toISOString()
    
    const { data: pendingFollowups, error: fetchError } = await supabase
      .from('scheduled_followups')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(50) // Process in batches

    if (fetchError) {
      console.error('[scheduled-followups] Error fetching pending:', fetchError)
      throw fetchError
    }

    if (!pendingFollowups || pendingFollowups.length === 0) {
      console.log('[scheduled-followups] No pending follow-ups due')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          processed: 0, 
          message: 'No pending follow-ups' 
        })
      }
    }

    console.log('[scheduled-followups] Found', pendingFollowups.length, 'due follow-ups')

    // Group by thread_id to check for replies efficiently
    const threadIds = [...new Set(pendingFollowups.map(f => f.thread_id).filter(Boolean))]
    
    // Step 2: Check Gmail threads for replies
    const threadsWithReplies = new Set()
    
    if (threadIds.length > 0) {
      try {
        const { gmail } = await createGmailClient(DEFAULT_GMAIL_SENDER)
        
        for (const threadId of threadIds) {
          try {
            // Get thread messages
            const thread = await gmail.users.threads.get({
              userId: 'me',
              id: threadId,
              format: 'metadata',
              metadataHeaders: ['From']
            })
            
            // Check if any message in thread is from the recipient (not us)
            const messages = thread.data.messages || []
            for (const msg of messages) {
              const fromHeader = msg.payload?.headers?.find(h => h.name === 'From')?.value || ''
              // If from is not our sender, it's a reply
              if (!fromHeader.includes('@uptrademedia.com')) {
                threadsWithReplies.add(threadId)
                console.log('[scheduled-followups] Reply detected in thread:', threadId)
                break
              }
            }
          } catch (threadError) {
            console.error('[scheduled-followups] Error checking thread:', threadId, threadError.message)
          }
        }
      } catch (gmailError) {
        console.error('[scheduled-followups] Error creating Gmail client:', gmailError)
      }
    }

    // Step 3: Process each follow-up
    let sent = 0
    let cancelled = 0
    let failed = 0

    for (const followup of pendingFollowups) {
      try {
        // Check if we should cancel due to reply
        if (followup.stop_on_reply && followup.thread_id && threadsWithReplies.has(followup.thread_id)) {
          // Cancel this and all subsequent follow-ups in the sequence
          await supabase
            .from('scheduled_followups')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancelled_reason: 'recipient_replied'
            })
            .eq('original_email_id', followup.original_email_id)
            .gte('sequence_number', followup.sequence_number)
            .eq('status', 'pending')

          cancelled++
          console.log('[scheduled-followups] Cancelled follow-up (reply detected):', followup.id)
          continue
        }

        // Send the follow-up email
        const { gmail } = await createGmailClient(followup.sender_email || DEFAULT_GMAIL_SENDER)
        
        // Get sender's name for From header
        const { data: sender } = await supabase
          .from('contacts')
          .select('name, email')
          .eq('email', followup.sender_email)
          .single()

        const fromName = sender?.name || 'Uptrade Media'
        const fromHeader = `${fromName} <${followup.sender_email || DEFAULT_GMAIL_SENDER}>`

        // Build email content
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">
            ${followup.body.replace(/\n/g, '<br>')}
          </div>
        `

        const rawEmail = buildRawEmail({
          to: followup.recipient_email,
          from: fromHeader,
          subject: followup.subject,
          body: followup.body,
          html: htmlContent
        })

        const sendParams = {
          userId: 'me',
          requestBody: {
            raw: rawEmail,
            threadId: followup.thread_id // Keep in same thread
          }
        }

        const result = await gmail.users.messages.send(sendParams)
        console.log('[scheduled-followups] Sent follow-up:', result.data.id)

        // Update follow-up status
        await supabase
          .from('scheduled_followups')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            gmail_message_id: result.data.id
          })
          .eq('id', followup.id)

        // Also track in email_tracking table
        await supabase
          .from('email_tracking')
          .insert({
            contact_id: followup.contact_id,
            email_type: 'gmail',
            subject: followup.subject,
            recipient_email: followup.recipient_email,
            sender_email: followup.sender_email,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: {
              gmail_message_id: result.data.id,
              gmail_thread_id: result.data.threadId,
              is_followup: true,
              original_email_id: followup.original_email_id,
              sequence_number: followup.sequence_number,
              via: 'gmail_api'
            }
          })

        sent++
      } catch (sendError) {
        console.error('[scheduled-followups] Error sending follow-up:', followup.id, sendError.message)
        
        // Mark as failed
        await supabase
          .from('scheduled_followups')
          .update({
            status: 'failed',
            error_message: sendError.message
          })
          .eq('id', followup.id)

        failed++
      }
    }

    console.log('[scheduled-followups] Processing complete:', { sent, cancelled, failed })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        processed: pendingFollowups.length,
        sent,
        cancelled,
        failed
      })
    }

  } catch (error) {
    console.error('[scheduled-followups] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
