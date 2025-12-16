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
const PORTAL_URL = process.env.URL || 'https://portal.uptrademedia.com'

/**
 * Parse payment terms from proposal and determine invoice schedule
 * Supported formats:
 * - "50% upfront, 50% on completion"
 * - "100% upfront"
 * - "Net 30" / "Net 15" / "Due on receipt"
 * - "Monthly milestones"
 * - Custom JSONB in metadata.payment_schedule
 */
function parsePaymentTerms(proposal) {
  const terms = proposal.payment_terms?.toLowerCase() || ''
  const depositPercentage = proposal.deposit_percentage || 0
  const totalAmount = parseFloat(proposal.total_amount) || 0
  
  // Check for custom payment schedule in metadata
  if (proposal.metadata?.payment_schedule) {
    return proposal.metadata.payment_schedule
  }
  
  // Parse common payment term patterns
  if (terms.includes('100% upfront') || terms.includes('full upfront')) {
    return {
      type: 'upfront',
      invoices: [
        { 
          percentage: 100, 
          amount: totalAmount, 
          trigger: 'acceptance', 
          description: 'Full Payment - Due upon acceptance' 
        }
      ]
    }
  }
  
  if (terms.includes('50%') && terms.includes('upfront')) {
    return {
      type: 'split',
      invoices: [
        { 
          percentage: 50, 
          amount: totalAmount * 0.5, 
          trigger: 'acceptance', 
          description: 'Deposit - 50% upfront' 
        },
        { 
          percentage: 50, 
          amount: totalAmount * 0.5, 
          trigger: 'completion', 
          description: 'Final Payment - Due on completion' 
        }
      ]
    }
  }
  
  if (depositPercentage > 0) {
    const depositAmount = totalAmount * (depositPercentage / 100)
    const remainingAmount = totalAmount - depositAmount
    return {
      type: 'deposit',
      invoices: [
        { 
          percentage: depositPercentage, 
          amount: depositAmount, 
          trigger: 'acceptance', 
          description: `Deposit - ${depositPercentage}% upfront` 
        },
        { 
          percentage: 100 - depositPercentage, 
          amount: remainingAmount, 
          trigger: 'completion', 
          description: 'Final Payment - Due on completion' 
        }
      ]
    }
  }
  
  if (terms.includes('net 30') || terms.includes('net30')) {
    return {
      type: 'net30',
      invoices: [
        { 
          percentage: 100, 
          amount: totalAmount, 
          trigger: 'completion', 
          dueDays: 30,
          description: 'Full Payment - Net 30' 
        }
      ]
    }
  }
  
  if (terms.includes('net 15') || terms.includes('net15')) {
    return {
      type: 'net15',
      invoices: [
        { 
          percentage: 100, 
          amount: totalAmount, 
          trigger: 'completion', 
          dueDays: 15,
          description: 'Full Payment - Net 15' 
        }
      ]
    }
  }
  
  if (terms.includes('due on receipt') || terms.includes('due upon receipt')) {
    return {
      type: 'receipt',
      invoices: [
        { 
          percentage: 100, 
          amount: totalAmount, 
          trigger: 'completion', 
          dueDays: 0,
          description: 'Full Payment - Due on receipt' 
        }
      ]
    }
  }
  
  if (terms.includes('milestone')) {
    return {
      type: 'milestones',
      invoices: [] // Will be generated from line items
    }
  }
  
  // Default: 50/50 split
  return {
    type: 'default',
    invoices: [
      { 
        percentage: 50, 
        amount: totalAmount * 0.5, 
        trigger: 'acceptance', 
        description: 'Deposit - 50% upfront' 
      },
      { 
        percentage: 50, 
        amount: totalAmount * 0.5, 
        trigger: 'completion', 
        description: 'Final Payment - Due on completion' 
      }
    ]
  }
}

/**
 * Generate invoice number
 */
async function generateInvoiceNumber() {
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  const lastNumber = lastInvoice?.invoice_number 
    ? parseInt(lastInvoice.invoice_number.replace(/\D/g, '')) 
    : 0
  return `INV-${String(lastNumber + 1).padStart(5, '0')}`
}

/**
 * Create an invoice from payment schedule
 */
async function createInvoice(proposal, project, paymentInfo, contact) {
  const invoiceNumber = await generateInvoiceNumber()
  const now = new Date()
  const dueDate = paymentInfo.dueDays !== undefined
    ? new Date(now.getTime() + paymentInfo.dueDays * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
  
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      contact_id: proposal.contact_id,
      project_id: project?.id || null,
      proposal_id: proposal.id,
      invoice_number: invoiceNumber,
      amount: paymentInfo.amount,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: paymentInfo.amount,
      description: paymentInfo.description,
      status: 'pending',
      due_date: dueDate.toISOString(),
      payment_terms: proposal.payment_terms,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      metadata: {
        proposal_id: proposal.id,
        proposal_title: proposal.title,
        trigger: paymentInfo.trigger,
        percentage: paymentInfo.percentage
      }
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating invoice:', error)
    return null
  }
  
  return invoice
}

/**
 * Send invoice notification email
 */
async function sendInvoiceEmail(invoice, proposal, contact) {
  if (!RESEND_API_KEY) return
  
  try {
    const resend = new Resend(RESEND_API_KEY)
    const paymentLink = `${PORTAL_URL}/pay/${invoice.id}`
    
    await resend.emails.send({
      from: RESEND_FROM,
      to: contact.email,
      subject: `Invoice ${invoice.invoice_number} - ${proposal.title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Invoice ${invoice.invoice_number}</h2>
          
          <p>Hi ${contact.name || 'there'},</p>
          
          <p>Thank you for accepting our proposal for <strong>${proposal.title}</strong>!</p>
          
          <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #666;">Invoice Details:</p>
            <p style="margin: 0; font-size: 14px;"><strong>Description:</strong> ${invoice.description}</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Amount:</strong> $${parseFloat(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
          </div>
          
          <a href="${paymentLink}" 
             style="display: inline-block; background: #4bbf39; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Pay Invoice
          </a>
          
          <p style="margin-top: 32px; color: #666; font-size: 14px;">
            If you have any questions, just reply to this email.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Uptrade Media • ${PORTAL_URL}
          </p>
        </div>
      `
    })
    
    // Update invoice as sent
    await supabase
      .from('invoices')
      .update({ 
        sent_at: new Date().toISOString(),
        sent_to: contact.email
      })
      .eq('id', invoice.id)
      
  } catch (error) {
    console.error('Failed to send invoice email:', error)
  }
}

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

    // ============================================
    // AUTOMATIC INVOICE GENERATION
    // ============================================
    const createdInvoices = []
    
    // Fetch proposal line items for potential milestone invoicing
    const { data: lineItems } = await supabase
      .from('proposal_line_items')
      .select('*')
      .eq('proposal_id', proposalId)
      .eq('selected', true)
      .order('sort_order', { ascending: true })
    
    // Parse payment terms and determine invoice schedule
    const paymentSchedule = parsePaymentTerms(proposal)
    console.log(`[proposals-accept] Payment schedule type: ${paymentSchedule.type}`, paymentSchedule)
    
    // Handle milestone-based invoicing from line items
    if (paymentSchedule.type === 'milestones' && lineItems?.length > 0) {
      // Create invoice for each line item marked as a milestone
      for (const item of lineItems) {
        if (item.item_type === 'milestone' || paymentSchedule.type === 'milestones') {
          const invoice = await createInvoice(proposal, project, {
            percentage: Math.round((item.total_price / proposal.total_amount) * 100),
            amount: item.total_price,
            trigger: 'milestone',
            description: `Milestone: ${item.title}`,
            dueDays: 7
          }, proposal.contact)
          
          if (invoice) {
            createdInvoices.push(invoice)
            // Don't auto-send milestone invoices - they'll be triggered when milestone is completed
          }
        }
      }
    } else {
      // Handle standard payment schedules
      for (const paymentInfo of paymentSchedule.invoices) {
        // Only create invoices triggered on acceptance immediately
        if (paymentInfo.trigger === 'acceptance') {
          const invoice = await createInvoice(proposal, project, paymentInfo, proposal.contact)
          
          if (invoice) {
            createdInvoices.push(invoice)
            // Auto-send deposit/upfront invoices
            await sendInvoiceEmail(invoice, proposal, proposal.contact)
          }
        } else if (paymentInfo.trigger === 'completion') {
          // Create completion invoice but mark as draft (not sent yet)
          const invoice = await createInvoice(proposal, project, {
            ...paymentInfo,
            dueDays: paymentInfo.dueDays || 7
          }, proposal.contact)
          
          if (invoice) {
            // Mark as draft - will be sent when project is completed
            await supabase
              .from('invoices')
              .update({ status: 'draft' })
              .eq('id', invoice.id)
            
            createdInvoices.push({ ...invoice, status: 'draft' })
          }
        }
      }
    }
    
    console.log(`[proposals-accept] Created ${createdInvoices.length} invoice(s)`)

    // Send email notification to admin
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        
        const invoiceSummary = createdInvoices.length > 0
          ? `<h3>Invoices Created:</h3><ul>${createdInvoices.map(inv => 
              `<li>${inv.invoice_number}: $${parseFloat(inv.total_amount).toFixed(2)} - ${inv.description} (${inv.status})</li>`
            ).join('')}</ul>`
          : '<p><em>No automatic invoices created based on payment terms.</em></p>'
        
        await resend.emails.send({
          from: RESEND_FROM,
          to: ADMIN_EMAIL,
          subject: `🎉 Proposal Accepted: ${proposal.title}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px;">
              <h2 style="color: #4bbf39;">Proposal Accepted!</h2>
              
              <p><strong>${proposal.contact.name}</strong> (${proposal.contact.email}) has accepted the proposal:</p>
              
              <div style="background: #f5f5f7; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Title:</strong> ${proposal.title}</p>
                <p style="margin: 8px 0 0 0;"><strong>Amount:</strong> $${proposal.total_amount ? parseFloat(proposal.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</p>
                <p style="margin: 8px 0 0 0;"><strong>Payment Terms:</strong> ${proposal.payment_terms || 'Default (50/50)'}</p>
                <p style="margin: 8px 0 0 0;"><strong>Accepted:</strong> ${new Date(now).toLocaleString()}</p>
              </div>
              
              ${project ? `<p>✅ <strong>Project Created:</strong> ${project.title}</p>` : ''}
              
              ${invoiceSummary}
              
              <p style="margin-top: 24px;">
                <a href="${PORTAL_URL}/admin/proposals/${proposal.id}" 
                   style="display: inline-block; background: #4bbf39; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  View Proposal
                </a>
                ${project ? `
                <a href="${PORTAL_URL}/admin/projects/${project.id}" 
                   style="display: inline-block; background: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-left: 8px;">
                  View Project
                </a>
                ` : ''}
              </p>
            </div>
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
        } : null,
        invoices: createdInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          amount: inv.total_amount,
          status: inv.status,
          description: inv.description
        })),
        paymentSchedule: {
          type: paymentSchedule.type,
          totalInvoices: createdInvoices.length
        }
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
