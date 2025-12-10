import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ramsey@uptrademedia.com'

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
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    // Get proposal ID from query
    const proposalId = event.queryStringParameters?.id
    if (!proposalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Proposal ID required' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { reason } = body

    // Fetch proposal with contact
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        contact:contacts!proposals_contact_id_fkey (*)
      `)
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Verify authorization: client can only decline their own, admin can decline any
    if (contact.role !== 'admin' && proposal.contact_id !== contact.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to decline this proposal' })
      }
    }

    // Update proposal status
    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'declined',
        version: (proposal.version || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Log activity: proposal declined
    await supabase
      .from('proposal_activity')
      .insert({
        proposal_id: proposalId,
        action: 'declined',
        performed_by: contact.id,
        metadata: JSON.stringify({
          reason: reason || 'No reason provided',
          timestamp: new Date().toISOString()
        })
      })
      .then(({ error }) => {
        if (error) console.error('Error logging proposal decline:', error)
      })

    // Send emails
    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY)

        // Email to client
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: proposal.contact.email,
          subject: `Proposal Declined: ${proposal.title}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Proposal Declined</h2>
              <p>We received your response regarding the proposal "${proposal.title}"</p>
              
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              
              <p>We're happy to discuss your needs further. Feel free to reach out if you'd like to explore other options.</p>
              
              <p style="color: #999; font-size: 12px;">
                © Uptrade Media. All rights reserved.
              </p>
            </div>
          `
        })

        // Email to admin
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `Proposal Declined: ${proposal.title}`,
          html: `
            <p><strong>${proposal.contact.name}</strong> (${proposal.contact.email}) declined the proposal "<strong>${proposal.title}</strong>"</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          `
        }).catch(err => console.error('Error sending admin notification:', err))
      } catch (emailError) {
        console.error('Error sending emails:', emailError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        proposal: {
          id: updatedProposal.id,
          slug: updatedProposal.slug,
          title: updatedProposal.title,
          status: updatedProposal.status,
          version: updatedProposal.version
        },
        message: 'Proposal declined successfully'
      })
    }
  } catch (error) {
    console.error('Error declining proposal:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to decline proposal',
        message: error.message
      })
    }
  }
}
