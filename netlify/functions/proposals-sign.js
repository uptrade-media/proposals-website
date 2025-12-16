// netlify/functions/proposals-sign.js
// Simplified flow: Client signs → Contract executed → Payment screen
// No admin counter-signature required
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@uptrademedia.com'
const PORTAL_URL = process.env.PORTAL_BASE_URL || process.env.URL || 'https://portal.uptrademedia.com'
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

const corsHeaders = (event) => ({
  'Access-Control-Allow-Origin': event.headers.origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
})

function json(statusCode, body, event) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(event)
    },
    body: JSON.stringify(body)
  }
}

// Upload signature to Supabase Storage
async function uploadSignature(proposalId, signatureData, type) {
  try {
    // Remove data:image/png;base64, prefix if present
    const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    const fileName = `${proposalId}/${type}-signature-${Date.now()}.png`
    
    const { data, error } = await supabase.storage
      .from('signatures')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('signatures')
      .getPublicUrl(fileName)

    return urlData?.publicUrl || null
  } catch (err) {
    console.error('Upload signature error:', err)
    return null
  }
}

// Send "Contract Signed" email to all parties (client + admin + any other recipients)
async function sendContractSignedEmails(proposalData) {
  const { 
    proposalId, 
    proposalTitle, 
    clientName, 
    clientEmail, 
    signatureUrl,
    totalAmount,
    depositAmount,
    depositPercentage,
    allRecipients = []
  } = proposalData
  
  const formattedTotal = totalAmount ? `$${parseFloat(totalAmount).toLocaleString()}` : 'TBD'
  const formattedDeposit = depositAmount ? `$${parseFloat(depositAmount).toLocaleString()}` : formattedTotal
  
  const emailContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; text-align: center;">
        <img src="${PORTAL_URL}/logo.png" alt="Uptrade Media" style="height: 40px; margin-bottom: 20px;" />
        <h1 style="color: #22c55e; margin: 0; font-size: 28px;">✓ Contract Signed</h1>
        <p style="color: #94a3b8; margin: 10px 0 0; font-size: 16px;">Agreement is now active</p>
      </div>
      
      <div style="padding: 40px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
          Great news! The proposal <strong>"${proposalTitle}"</strong> has been signed and is now a binding agreement.
        </p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px;">Contract Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Project</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${proposalTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Client</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Total Investment</td>
              <td style="padding: 8px 0; color: #059669; font-size: 14px; font-weight: 600; text-align: right;">${formattedTotal}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Deposit Due (${depositPercentage}%)</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${formattedDeposit}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Signed</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
            </tr>
          </table>
        </div>
        
        ${signatureUrl ? `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px; font-size: 12px; color: #166534; font-weight: 600; text-transform: uppercase;">Signature</p>
          <img src="${signatureUrl}" alt="Signature" style="max-width: 200px; max-height: 60px; border: 1px solid #dcfce7; background: white; padding: 8px; border-radius: 4px;" />
          <p style="margin: 8px 0 0; font-size: 12px; color: #166534;">${clientName}</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${PORTAL_URL}/p/${proposalId}" 
             style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                    color: white; 
                    padding: 16px 40px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    font-weight: 700;
                    display: inline-block;
                    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);">
            View Contract
          </a>
        </div>
        
        <p style="font-size: 14px; color: #64748b; text-align: center;">
          This email serves as confirmation that the agreement is now legally binding.
        </p>
      </div>
      
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
        <p style="margin: 0 0 4px; color: #0f172a; font-size: 14px; font-weight: 600;">Uptrade Media</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">Premium Digital Marketing & Web Design</p>
      </div>
    </div>
  `
  
  // Collect all unique recipients
  const recipients = new Set([clientEmail, ADMIN_EMAIL, ...allRecipients])
  
  for (const email of recipients) {
    if (!email) continue
    
    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: email,
        subject: `✅ Contract Signed: ${proposalTitle}`,
        html: emailContent
      })
      console.log(`Contract signed email sent to: ${email}`)
    } catch (emailError) {
      console.error(`Failed to send contract email to ${email}:`, emailError)
    }
  }
}

// Generate invoice number
function generateInvoiceNumber() {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `INV-${year}${month}-${random}`
}

// Create deposit invoice for the client
async function createDepositInvoice({ contactId, projectId, proposalId, proposalTitle, depositAmount, depositPercentage, totalAmount }) {
  try {
    const invoiceNumber = generateInvoiceNumber()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7) // Due in 7 days

    const lineItems = JSON.stringify([{
      description: `Deposit (${depositPercentage}%) for ${proposalTitle}`,
      quantity: 1,
      unitPrice: parseFloat(depositAmount),
      total: parseFloat(depositAmount)
    }])

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        contact_id: contactId,
        project_id: projectId || null,
        invoice_number: invoiceNumber,
        status: 'sent',
        amount: depositAmount,
        tax: '0.00',
        total: depositAmount,
        due_date: dueDate.toISOString(),
        line_items: lineItems,
        notes: `Deposit invoice for proposal: ${proposalTitle}. Proposal ID: ${proposalId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return null
    }

    console.log('Created deposit invoice:', invoice.id, invoiceNumber)
    return invoice
  } catch (err) {
    console.error('Error in createDepositInvoice:', err)
    return null
  }
}

// Send account setup email with magic link
async function sendAccountSetupEmail({ contact, proposalTitle, proposalSlug, depositAmount, magicToken }) {
  const clientName = contact.name?.split(' ')[0] || 'there'
  const formattedDeposit = depositAmount ? `$${parseFloat(depositAmount).toLocaleString()}` : ''
  
  const magicLink = `${PORTAL_URL}/setup?token=${magicToken}`
  
  const emailContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; text-align: center;">
        <img src="${PORTAL_URL}/logo.png" alt="Uptrade Media" style="height: 40px; margin-bottom: 20px;" />
        <h1 style="color: #22c55e; margin: 0; font-size: 28px;">Welcome to Your Portal</h1>
        <p style="color: #94a3b8; margin: 10px 0 0; font-size: 16px;">Your account is ready</p>
      </div>
      
      <div style="padding: 40px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 24px;">
          Hi ${clientName},
        </p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 24px;">
          Thank you for signing <strong>"${proposalTitle}"</strong>! Your client portal is now ready. 
          From here you can track your project, access files, pay invoices, and communicate with our team.
        </p>
        
        ${depositAmount ? `
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px; color: #92400e; font-size: 16px;">⏳ Deposit Payment Pending</h3>
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            Your deposit of <strong>${formattedDeposit}</strong> is ready for payment. 
            You can pay securely through your portal.
          </p>
        </div>
        ` : ''}
        
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px; color: #0369a1; font-size: 16px;">Your Portal Includes:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #0369a1;">
            <li style="margin-bottom: 8px;">Project dashboard & progress tracking</li>
            <li style="margin-bottom: 8px;">Secure file sharing</li>
            <li style="margin-bottom: 8px;">Invoice history & payments</li>
            <li style="margin-bottom: 8px;">Direct messaging with our team</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${magicLink}" 
             style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                    color: white; 
                    padding: 16px 40px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    font-weight: 700;
                    display: inline-block;
                    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);">
            Access Your Portal
          </a>
        </div>
        
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          This link expires in 7 days. If you need a new link, just reply to this email.
        </p>
      </div>
      
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
        <p style="margin: 0 0 4px; color: #0f172a; font-size: 14px; font-weight: 600;">Uptrade Media</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">Premium Digital Marketing & Web Design</p>
      </div>
    </div>
  `
  
  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: contact.email,
      subject: `🎉 Your Client Portal is Ready - ${proposalTitle}`,
      html: emailContent
    })
    console.log('Account setup email sent to:', contact.email)
    return true
  } catch (err) {
    console.error('Failed to send account setup email:', err)
    return false
  }
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event) }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'METHOD_NOT_ALLOWED' }, event)
  }

  try {
    // Parse request body
    const { 
      proposalId, 
      proposalTitle, 
      signature, 
      signedAt, 
      signedBy, 
      clientEmail
    } = JSON.parse(event.body || '{}')

    if (!proposalId || !signature || !signedAt) {
      console.error('Validation failed: Missing required fields', { proposalId: !!proposalId, signature: !!signature, signedAt: !!signedAt })
      return json(400, { error: 'Missing required fields' }, event)
    }

    console.log('[proposals-sign] Processing signature for:', { proposalId })

    // Get client IP for audit
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     event.headers['client-ip'] || 
                     'unknown'

    // Get existing proposal - try by id first, then by slug
    let proposal = null
    let fetchError = null
    
    // Check if proposalId looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proposalId)
    
    if (isUUID) {
      const result = await supabase
        .from('proposals')
        .select('*, contact:contacts!proposals_contact_id_fkey(*)')
        .eq('id', proposalId)
        .single()
      proposal = result.data
      fetchError = result.error
    }
    
    // If not found by ID, try by slug
    if (!proposal) {
      const result = await supabase
        .from('proposals')
        .select('*, contact:contacts!proposals_contact_id_fkey(*)')
        .eq('slug', proposalId)
        .single()
      proposal = result.data
      fetchError = result.error
    }
    
    if (fetchError || !proposal) {
      console.error('Proposal not found:', proposalId)
      return json(404, { error: 'Proposal not found' }, event)
    }

    // Check if already signed
    if (proposal.signed_at || proposal.status === 'accepted') {
      return json(400, { 
        error: 'Proposal already signed',
        alreadySigned: true,
        depositAmount: proposal.deposit_amount,
        depositPaidAt: proposal.deposit_paid_at
      }, event)
    }

    // Upload signature to storage
    const signatureUrl = await uploadSignature(proposal.id, signature, 'client')

    // Calculate deposit amount
    const totalAmount = parseFloat(proposal.total_amount) || 0
    const depositPercentage = proposal.deposit_percentage || 50
    const depositAmount = (totalAmount * depositPercentage / 100).toFixed(2)

    // Update proposal - mark as ACCEPTED immediately (no counter-signature needed)
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        signed_at: signedAt,
        client_signature_url: signatureUrl || signature,
        client_signed_by: signedBy || null,
        client_signed_at: signedAt,
        client_signed_ip: clientIp,
        fully_executed_at: new Date().toISOString(), // Contract is fully executed on client signature
        deposit_amount: depositAmount,
        status: 'accepted', // Immediately accepted
        updated_at: new Date().toISOString()
      })
      .eq('id', proposal.id)

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    // Get all recipients from when proposal was sent
    const allRecipients = proposal.sent_to_recipients || []
    
    // Send "Contract Signed" emails to all parties
    await sendContractSignedEmails({
      proposalId: proposal.slug || proposal.id,
      proposalTitle: proposalTitle || proposal.title,
      clientName: signedBy || proposal.contact?.name || 'Client',
      clientEmail: clientEmail || proposal.contact?.email || proposal.client_email,
      signatureUrl,
      totalAmount,
      depositAmount,
      depositPercentage,
      allRecipients
    })

    // Convert prospect to client if needed
    let projectCreated = false
    let newProjectId = null
    const contact = proposal.contact
    
    if (contact && contact.type === 'prospect') {
      console.log('Converting prospect to client:', contact.id)
      
      // Update contact type to client
      await supabase
        .from('contacts')
        .update({
          type: 'client',
          updated_at: new Date().toISOString()
        })
        .eq('id', contact.id)
      
      // Create a project from the proposal
      const projectTitle = proposal.title.replace(/^Proposal:\s*/i, '').replace(/\s*Proposal$/i, '')
      
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          contact_id: contact.id,
          title: projectTitle,
          description: `Project created from signed proposal: ${proposal.title}`,
          status: 'pending',
          budget: totalAmount || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()
      
      if (!projectError && newProject) {
        projectCreated = true
        newProjectId = newProject.id
        
        // Link proposal to the new project
        await supabase
          .from('proposals')
          .update({ project_id: newProject.id })
          .eq('id', proposal.id)
        
        console.log('Created project:', newProject.id)
      }
    }

    // Check if contact needs account setup (not already a portal user)
    let magicLinkSent = false
    let invoiceCreated = false
    const contactNeedsAccount = contact && contact.account_setup !== 'true'
    
    if (contact && contactNeedsAccount) {
      console.log('Contact needs account setup:', contact.id)
      
      // Generate magic link token
      const magicToken = randomBytes(32).toString('hex')
      const magicTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      
      // Update contact with magic link token
      await supabase
        .from('contacts')
        .update({
          magic_link_token: magicToken,
          magic_link_expires: magicTokenExpiry.toISOString(),
          account_setup: 'false', // Mark as needing setup
          updated_at: new Date().toISOString()
        })
        .eq('id', contact.id)
      
      // Send account setup email
      await sendAccountSetupEmail({
        contact,
        proposalTitle: proposal.title,
        proposalSlug: proposal.slug,
        depositAmount,
        magicToken
      })
      magicLinkSent = true
    }

    // Create deposit invoice (always, so client has it in billing)
    if (contact && parseFloat(depositAmount) > 0) {
      const invoice = await createDepositInvoice({
        contactId: contact.id,
        projectId: newProjectId,
        proposalId: proposal.id,
        proposalTitle: proposal.title,
        depositAmount,
        depositPercentage,
        totalAmount
      })
      if (invoice) {
        invoiceCreated = true
        console.log('Deposit invoice created:', invoice.invoice_number)
      }
    }

    // Return success with payment info
    return json(200, { 
      success: true,
      message: 'Contract signed successfully! Please complete your deposit payment.',
      status: 'accepted',
      proposalId: proposal.id,
      proposalSlug: proposal.slug,
      signedAt,
      projectCreated,
      projectId: newProjectId,
      magicLinkSent,
      invoiceCreated,
      // Payment info for the frontend
      payment: {
        required: true,
        depositPercentage,
        depositAmount: parseFloat(depositAmount),
        totalAmount,
        proposalTitle: proposal.title
      }
    }, event)

  } catch (error) {
    console.error('=== ERROR IN PROPOSALS-SIGN ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return json(500, { 
      error: 'Failed to process signature',
      message: error.message 
    }, event)
  }
}
