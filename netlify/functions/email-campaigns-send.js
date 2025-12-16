import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'

// Variable substitution for email content
function substituteVariables(content, subscriber) {
  if (!content) return content
  
  const variables = {
    '{{first_name}}': subscriber.first_name || '',
    '{{last_name}}': subscriber.last_name || '',
    '{{email}}': subscriber.email || '',
    '{{company}}': subscriber.company || '',
    '{{unsubscribe_url}}': `${process.env.URL || 'https://portal.uptrademedia.com'}/unsubscribe?token=${subscriber.id}`,
    '{{subscriber_id}}': subscriber.id || ''
  }
  
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key, 'g'), value)
  }
  
  return result
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can send campaigns
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const orgId = contact.org_id || 'default'
    const body = JSON.parse(event.body || '{}')
    const { campaign_id, send_test, test_email } = body

    if (!campaign_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Campaign ID required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('org_id', orgId)
      .single()

    if (campaignError || !campaign) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Campaign not found' }) }
    }

    // Get tenant email settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_email_settings')
      .select('*')
      .eq('org_id', orgId)
      .single()

    if (settingsError || !settings?.resend_api_key) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Email settings not configured. Please add your Resend API key.' }) 
      }
    }

    // Initialize Resend with tenant's API key
    const resend = new Resend(settings.resend_api_key)

    // Determine sender info
    const fromName = campaign.from_name || settings.default_from_name || 'Newsletter'
    const fromEmail = campaign.from_email || settings.default_from_email
    const replyTo = campaign.reply_to || settings.default_reply_to || fromEmail

    if (!fromEmail) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'From email not configured' }) 
      }
    }

    // If test send, just send to test email
    if (send_test) {
      if (!test_email) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Test email required' }) }
      }

      const testSubscriber = {
        id: 'test',
        first_name: 'Test',
        last_name: 'User',
        email: test_email,
        company: 'Test Company'
      }

      const html = substituteVariables(campaign.content_html, testSubscriber)

      const { data: sendResult, error: sendError } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: test_email,
        subject: `[TEST] ${campaign.subject}`,
        html,
        replyTo
      })

      if (sendError) {
        console.error('Test send error:', sendError)
        return { statusCode: 500, body: JSON.stringify({ error: sendError.message }) }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, message: 'Test email sent', id: sendResult.id })
      }
    }

    // Regular send - get subscribers from associated lists
    const { data: campaignLists, error: listsError } = await supabase
      .from('email_campaign_lists')
      .select('list_id')
      .eq('campaign_id', campaign_id)

    if (listsError || !campaignLists?.length) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'No lists associated with this campaign' }) 
      }
    }

    const listIds = campaignLists.map(cl => cl.list_id)

    // Get subscribers from all associated lists (active and subscribed only)
    const { data: listMembers, error: membersError } = await supabase
      .from('email_list_subscribers')
      .select('subscriber_id')
      .in('list_id', listIds)

    if (membersError) {
      return { statusCode: 500, body: JSON.stringify({ error: membersError.message }) }
    }

    const subscriberIds = [...new Set(listMembers.map(m => m.subscriber_id))]

    if (subscriberIds.length === 0) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'No subscribers in selected lists' }) 
      }
    }

    // Get subscriber details
    const { data: subscribers, error: subsError } = await supabase
      .from('email_subscribers')
      .select('*')
      .in('id', subscriberIds)
      .eq('org_id', orgId)
      .eq('status', 'subscribed')

    if (subsError) {
      return { statusCode: 500, body: JSON.stringify({ error: subsError.message }) }
    }

    if (subscribers.length === 0) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'No active subscribers in selected lists' }) 
      }
    }

    // Update campaign status to sending
    await supabase
      .from('email_campaigns')
      .update({ status: 'sending', sent_at: new Date().toISOString() })
      .eq('id', campaign_id)

    // Send emails (batch processing for large lists)
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    }

    // Send in batches of 10 to avoid rate limiting
    const batchSize = 10
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      
      const sendPromises = batch.map(async (subscriber) => {
        try {
          const html = substituteVariables(campaign.content_html, subscriber)
          const subject = substituteVariables(campaign.subject, subscriber)

          const { data: sendResult, error: sendError } = await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: subscriber.email,
            subject,
            html,
            replyTo,
            headers: {
              'X-Campaign-ID': campaign_id,
              'X-Subscriber-ID': subscriber.id
            }
          })

          if (sendError) {
            results.failed++
            results.errors.push({ email: subscriber.email, error: sendError.message })
            return
          }

          // Track the send
          await supabase
            .from('email_campaign_sends')
            .insert({
              campaign_id,
              subscriber_id: subscriber.id,
              resend_id: sendResult.id,
              status: 'sent',
              sent_at: new Date().toISOString()
            })

          results.sent++
        } catch (err) {
          results.failed++
          results.errors.push({ email: subscriber.email, error: err.message })
        }
      })

      await Promise.all(sendPromises)
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Update campaign with final stats
    const finalStatus = results.failed === subscribers.length ? 'failed' : 'sent'
    await supabase
      .from('email_campaigns')
      .update({
        status: finalStatus,
        total_recipients: subscribers.length,
        total_sent: results.sent,
        total_failed: results.failed
      })
      .eq('id', campaign_id)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        campaign_id,
        stats: {
          total: subscribers.length,
          sent: results.sent,
          failed: results.failed
        },
        errors: results.errors.slice(0, 10) // Only return first 10 errors
      })
    }
  } catch (error) {
    console.error('Email campaigns send error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to send campaign' })
    }
  }
}
