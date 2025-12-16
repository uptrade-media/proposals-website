// netlify/functions/projects-complete.js
// Marks a project as complete and triggers completion invoices
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
const PORTAL_URL = process.env.URL || 'https://portal.uptrademedia.com'

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
    // Verify authentication - admin only
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
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

    const { projectId } = JSON.parse(event.body || '{}')
    
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' })
      }
    }

    // Fetch project with contact
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        contact:contacts!projects_contact_id_fkey (*)
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    const now = new Date().toISOString()

    // Update project status to completed
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        status: 'completed',
        completed_at: now,
        updated_at: now
      })
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Find and send any draft completion invoices
    const { data: draftInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'draft')

    const sentInvoices = []

    if (draftInvoices?.length > 0 && RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY)
      
      for (const invoice of draftInvoices) {
        try {
          const paymentLink = `${PORTAL_URL}/pay/${invoice.id}`
          
          // Send invoice email
          await resend.emails.send({
            from: RESEND_FROM,
            to: project.contact.email,
            subject: `Invoice ${invoice.invoice_number} - Project Complete`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4bbf39;">Project Complete! 🎉</h2>
                
                <p>Hi ${project.contact.name || 'there'},</p>
                
                <p>Great news! Your project <strong>${project.title}</strong> has been completed.</p>
                
                <p>As agreed in your proposal, here is the final invoice:</p>
                
                <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; margin: 24px 0;">
                  <p style="margin: 0 0 8px 0; color: #666;">Invoice ${invoice.invoice_number}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Description:</strong> ${invoice.description}</p>
                  <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Amount:</strong> $${parseFloat(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
                </div>
                
                <a href="${paymentLink}" 
                   style="display: inline-block; background: #4bbf39; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Pay Invoice
                </a>
                
                <p style="margin-top: 32px; color: #666; font-size: 14px;">
                  Thank you for choosing Uptrade Media! If you have any questions, just reply to this email.
                </p>
                
                <p style="color: #999; font-size: 12px; margin-top: 32px;">
                  Uptrade Media • ${PORTAL_URL}
                </p>
              </div>
            `
          })

          // Update invoice status
          await supabase
            .from('invoices')
            .update({ 
              status: 'pending',
              sent_at: now,
              sent_to: project.contact.email
            })
            .eq('id', invoice.id)

          sentInvoices.push({
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.total_amount
          })

        } catch (emailError) {
          console.error(`Failed to send invoice ${invoice.invoice_number}:`, emailError)
        }
      }
    }

    console.log(`[projects-complete] Project ${projectId} completed, sent ${sentInvoices.length} invoice(s)`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Project marked as complete',
        project: {
          id: updatedProject.id,
          title: updatedProject.title,
          status: updatedProject.status,
          completedAt: updatedProject.completed_at
        },
        invoicesSent: sentInvoices
      })
    }

  } catch (error) {
    console.error('Error completing project:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to complete project',
        message: error.message
      })
    }
  }
}
