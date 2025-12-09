// netlify/functions/proposals-sign.js
// Migrated to Supabase from Neon - Stores signatures in Supabase Storage
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@uptrademedia.com'
const PORTAL_URL = process.env.PORTAL_BASE_URL || process.env.URL || 'https://portal.uptrademedia.com'

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
    
    const fileName = \`\${proposalId}/\${type}-signature-\${Date.now()}.png\`
    
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

// Send email to admin for counter-signature
async function sendAdminCounterSignatureEmail(proposalData) {
  const { proposalId, proposalTitle, clientName, clientEmail, clientSignatureUrl } = proposalData
  
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'proposals@send.uptrademedia.com',
      to: ADMIN_EMAIL,
      subject: `⏳ Counter-Signature Required: ${proposalTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Counter-Signature Needed</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <p style="font-size: 16px; color: #333;">Hi Admin,</p>
            
            <p style="font-size: 16px; color: #333;">
              <strong>\${clientName}</strong> has signed the proposal <strong>"\${proposalTitle}"</strong>.
            </p>
            
            <p style="font-size: 16px; color: #333;">
              Please review and add your counter-signature to complete the contract.
            </p>
            
            <div style="background: white; border-left: 4px solid #4bbf39; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Proposal Details</h3>
              <p style="margin: 5px 0;"><strong>Title:</strong> \${proposalTitle}</p>
              <p style="margin: 5px 0;"><strong>Client:</strong> \${clientName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> \${clientEmail}</p>
              <p style="margin: 5px 0;"><strong>Signed:</strong> \${new Date().toLocaleString()}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="\${PORTAL_URL}/admin/proposals/\${proposalId}/counter-sign" 
                 style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-size: 16px; 
                        font-weight: bold;
                        display: inline-block;">
                Review & Counter-Sign
              </a>
            </div>
            
            \${clientSignatureUrl ? \`
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 12px; color: #666;">
                <strong>Client's Signature:</strong><br>
                <img src="\${clientSignatureUrl}" alt="Client Signature" style="max-width: 300px; border: 1px solid #ddd; padding: 10px; margin-top: 10px; background: white;">
              </p>
            </div>
            \` : ''}
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© \${new Date().getFullYear()} Uptrade Media. All rights reserved.</p>
          </div>
        </div>
      \`
    })
  } catch (emailError) {
    console.error('Failed to send counter-signature email:', emailError)
  }
}

// Send fully executed contract to both parties
async function sendFullyExecutedContract(proposalData) {
  const { proposalId, proposalTitle, clientName, clientEmail, clientSignatureUrl, adminSignatureUrl } = proposalData
  
  const emailContent = \`
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">✓ Contract Fully Executed</h1>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9;">
        <p style="font-size: 16px; color: #333;">
          Great news! The proposal <strong>"\${proposalTitle}"</strong> has been fully executed by both parties.
        </p>
        
        <div style="background: white; border-left: 4px solid #4bbf39; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Contract Details</h3>
          <p style="margin: 5px 0;"><strong>Title:</strong> \${proposalTitle}</p>
          <p style="margin: 5px 0;"><strong>Client:</strong> \${clientName}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Fully Executed</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> \${new Date().toLocaleString()}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${PORTAL_URL}/proposals/\${proposalId}" 
             style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-size: 16px; 
                    font-weight: bold;
                    display: inline-block;">
            View Contract
          </a>
        </div>
        
        <div style="background: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #2e7d32;">Signatures</h4>
          
          \${clientSignatureUrl ? \`
          <div style="margin-bottom: 20px;">
            <p style="margin: 5px 0; font-weight: bold;">Client Signature:</p>
            <img src="\${clientSignatureUrl}" alt="Client Signature" style="max-width: 250px; border: 1px solid #ddd; padding: 10px; background: white;">
            <p style="margin: 5px 0; font-size: 12px; color: #666;">Signed by: \${clientName}</p>
          </div>
          \` : ''}
          
          \${adminSignatureUrl ? \`
          <div>
            <p style="margin: 5px 0; font-weight: bold;">Uptrade Media Signature:</p>
            <img src="\${adminSignatureUrl}" alt="Admin Signature" style="max-width: 250px; border: 1px solid #ddd; padding: 10px; background: white;">
            <p style="margin: 5px 0; font-size: 12px; color: #666;">Signed by: Uptrade Media</p>
          </div>
          \` : ''}
        </div>
        
        <p style="font-size: 14px; color: #666;">
          This email serves as confirmation that both parties have signed the agreement. 
          The fully executed contract is now legally binding.
        </p>
      </div>
      
      <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p style="margin: 0;">© \${new Date().getFullYear()} Uptrade Media. All rights reserved.</p>
      </div>
    </div>
  \`
  
  try {
// Send to client
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'proposals@send.uptrademedia.com',
      to: clientEmail,
      subject: `✅ Contract Fully Executed: ${proposalTitle}`,
      html: emailContent
    })
    
    // Send to admin
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'proposals@send.uptrademedia.com',
      to: ADMIN_EMAIL,
      subject: `✅ Contract Executed: ${proposalTitle} - ${clientName}`,
      html: emailContent
    })
  } catch (emailError) {
    console.error('Failed to send executed contract email:', emailError)
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
      clientEmail,
      isAdminSignature = false 
    } = JSON.parse(event.body || '{}')

    if (!proposalId || !signature || !signedAt) {
      console.error('Validation failed: Missing required fields')
      return json(400, { error: 'Missing required fields' }, event)
    }

    // Get client IP for audit
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     event.headers['client-ip'] || 
                     'unknown'

    // Get existing proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id, title, status, signed_at, admin_signed_at, client_signature, contact_id')
      .eq('id', proposalId)
      .single()
    
    if (fetchError || !proposal) {
      console.error('Proposal not found:', proposalId)
      return json(404, { error: 'Proposal not found' }, event)
    }

    // Upload signature to storage
    const signatureType = isAdminSignature ? 'admin' : 'client'
    const signatureUrl = await uploadSignature(proposalId, signature, signatureType)

    if (isAdminSignature) {
      // Admin is counter-signing
      if (!proposal.signed_at) {
        console.error('Client signature required first')
        return json(400, { 
          error: 'Client must sign first before admin counter-signature' 
        }, event)
      }

      // Update proposal with admin signature
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          admin_signed_at: signedAt,
          admin_signature: signatureUrl || signature,
          admin_signature_ip: clientIp,
          fully_executed_at: new Date().toISOString(),
          status: 'signed',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposalId)

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      // Send fully executed contract to both parties
      await sendFullyExecutedContract({
        proposalId,
        proposalTitle: proposalTitle || proposal.title,
        clientName: signedBy,
        clientEmail: clientEmail,
        clientSignatureUrl: proposal.client_signature,
        adminSignatureUrl: signatureUrl
      })

      return json(200, {
        success: true,
        message: 'Proposal fully executed',
        status: 'fully_executed',
        proposalId
      }, event)

    } else {
      // Client is signing (first signature)
      
      // Get contact info to check if they're a prospect
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id, type, email, name, company, account_setup')
        .eq('id', proposal.contact_id)
        .single()
      
      // Update proposal with client signature
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          signed_at: signedAt,
          client_signature: signatureUrl || signature,
          client_signature_ip: clientIp,
          status: 'signed',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposalId)

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      // If contact is a prospect, convert to client
      let projectCreated = false
      let newProjectId = null
      
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
            description: `Project created from proposal: ${proposal.title}`,
            status: 'pending',
            budget: proposal.total_amount || null,
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
            .eq('id', proposalId)
          
          console.log('Created project:', newProject.id)
        }
        
        // Send account setup email if not already set up
        if (!contact.account_setup || contact.account_setup === 'false') {
          const setupToken = jwt.sign(
            { contactId: contact.id, email: contact.email, purpose: 'account_setup' },
            JWT_SECRET,
            { expiresIn: '7d' }
          )
          
          const setupUrl = `${PORTAL_URL}/setup-account?token=${setupToken}`
          
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com',
            to: contact.email,
            subject: `🎉 Welcome to Uptrade Media – Set Up Your Account`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0f9b8e 0%, #0ea5e9 100%); padding: 40px; text-align: center;">
                  <img src="${PORTAL_URL}/uptrade_media_logo_white.png" alt="Uptrade Media" style="height: 40px; margin-bottom: 20px;" />
                  <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to the Team!</h1>
                </div>
                
                <div style="padding: 40px; background: #ffffff;">
                  <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                    Hi ${contact.name || 'there'},
                  </p>
                  
                  <p style="font-size: 16px; color: #555; line-height: 1.6;">
                    Thanks for signing the proposal! Your project is being set up and we're excited to get started.
                  </p>
                  
                  <p style="font-size: 16px; color: #555; line-height: 1.6;">
                    Click below to set up your client portal account where you can:
                  </p>
                  
                  <ul style="font-size: 16px; color: #555; line-height: 1.8;">
                    <li>View project progress and milestones</li>
                    <li>Access your files and deliverables</li>
                    <li>Message our team directly</li>
                    <li>View and pay invoices</li>
                  </ul>
                  
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${setupUrl}" 
                       style="background: linear-gradient(135deg, #0f9b8e 0%, #0ea5e9 100%); 
                              color: white; 
                              padding: 16px 48px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-size: 16px; 
                              font-weight: 600;
                              display: inline-block;
                              box-shadow: 0 4px 14px rgba(15, 155, 142, 0.4);">
                      Set Up My Account
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #888; margin-top: 30px;">
                    This link expires in 7 days. If you have any questions, just reply to this email!
                  </p>
                </div>
                
                <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; font-size: 13px;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Uptrade Media. All rights reserved.</p>
                </div>
              </div>
            `
          }).catch(err => console.error('Failed to send setup email:', err))
        }
      }

      // Send email to admin for counter-signature
      await sendAdminCounterSignatureEmail({
        proposalId,
        proposalTitle: proposalTitle || proposal.title,
        clientName: signedBy || 'Client',
        clientEmail: clientEmail || 'unknown@example.com',
        clientSignatureUrl: signatureUrl
      })

      return json(200, { 
        success: true,
        message: 'Client signature recorded. Admin will counter-sign and you will receive the fully executed contract via email.',
        status: 'pending_counter_signature',
        proposalId,
        signedAt,
        projectCreated,
        projectId: newProjectId
      }, event)
    }

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
