// netlify/functions/proposals-accept.js
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

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

  // Get proposal ID from path
  const proposalId = event.path.split('/').pop()?.replace('/accept', '')
  if (!proposalId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Proposal ID required' })
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

    // Verify user owns this proposal
    if (proposal.contact_id !== contact.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to accept this proposal' })
      }
    }

    // Check if already accepted
    if (proposal.status === 'accepted' || proposal.signed_at) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Proposal already accepted' })
      }
    }

    // Update proposal status
    const now = new Date().toISOString()
    
    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'accepted',
        signed_at: now,
        updated_at: now
      })
      .eq('id', proposalId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Create project if not already linked
    let project = null
    if (!proposal.project_id) {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          contact_id: proposal.contact_id,
          title: proposal.title,
          description: `Project created from proposal: ${proposal.title}`,
          status: 'planning',
          budget: proposal.total_amount,
          start_date: now
        })
        .select()
        .single()
      
      if (projectError) {
        console.error('Error creating project:', projectError)
      } else {
        project = newProject

        // Link proposal to project
        await supabase
          .from('proposals')
          .update({ project_id: project.id })
          .eq('id', proposalId)
      }
    } else {
      // Fetch existing project
      const { data: existingProject } = await supabase
        .from('projects')
        .select('*')
        .eq('id', proposal.project_id)
        .single()
      
      project = existingProject
    }

    // Send email notification to admin
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        await resend.emails.send({
          from: RESEND_FROM,
          to: ADMIN_EMAIL,
          subject: `Proposal Accepted: ${proposal.title}`,
          html: `
            <h2>Proposal Accepted</h2>
            <p><strong>${proposal.contact.name}</strong> (${proposal.contact.email}) has accepted the proposal:</p>
            <p><strong>Title:</strong> ${proposal.title}</p>
            <p><strong>Amount:</strong> $${proposal.total_amount ? parseFloat(proposal.total_amount).toFixed(2) : '0.00'}</p>
            <p><strong>Accepted:</strong> ${new Date(now).toLocaleString()}</p>
            ${project ? `<p><strong>Project Created:</strong> ${project.title}</p>` : ''}
            <p><a href="${process.env.URL}/admin/proposals/${proposal.id}">View Proposal</a></p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send acceptance email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Proposal accepted successfully',
        proposal: {
          id: updatedProposal.id,
          status: updatedProposal.status,
          signedAt: updatedProposal.signed_at
        },
        project: project ? {
          id: project.id,
          title: project.title,
          status: project.status
        } : null
      })
    }
  } catch (error) {
    console.error('Error accepting proposal:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to accept proposal',
        message: error.message
      })
    }
  }
}
