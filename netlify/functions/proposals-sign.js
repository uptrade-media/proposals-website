// netlify/functions/proposals-sign.js (CommonJS)
const { getStore } = require('@netlify/blobs')
const { Resend } = require('resend')

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

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

// Send email to admin for counter-signature
const sendAdminCounterSignatureEmail = async (proposalData) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@uptrademedia.com'
  const portalUrl = process.env.PORTAL_BASE_URL || 'https://portal.uptrademedia.com'
  
  const { proposalId, proposalTitle, clientName, clientEmail, clientSignature } = proposalData
  
  await resend.emails.send({
    from: process.env.RESEND_FROM || 'proposals@uptrademedia.com',
    to: adminEmail,
    subject: `⏳ Counter-Signature Required: ${proposalTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Counter-Signature Needed</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <p style="font-size: 16px; color: #333;">Hi Admin,</p>
          
          <p style="font-size: 16px; color: #333;">
            <strong>${clientName}</strong> has signed the proposal <strong>"${proposalTitle}"</strong>.
          </p>
          
          <p style="font-size: 16px; color: #333;">
            Please review and add your counter-signature to complete the contract.
          </p>
          
          <div style="background: white; border-left: 4px solid #4bbf39; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Proposal Details</h3>
            <p style="margin: 5px 0;"><strong>Title:</strong> ${proposalTitle}</p>
            <p style="margin: 5px 0;"><strong>Client:</strong> ${clientName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${clientEmail}</p>
            <p style="margin: 5px 0;"><strong>Signed:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}/admin/proposals/${proposalId}/counter-sign" 
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
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
              <strong>Client's Signature:</strong><br>
              <img src="${clientSignature}" alt="Client Signature" style="max-width: 300px; border: 1px solid #ddd; padding: 10px; margin-top: 10px;">
            </p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Uptrade Media. All rights reserved.</p>
        </div>
      </div>
    `
  })
}

// Send fully executed contract to both parties
const sendFullyExecutedContract = async (proposalData) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@uptrademedia.com'
  
  const { proposalId, proposalTitle, clientName, clientEmail, clientSignature, adminSignature } = proposalData
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">✓ Contract Fully Executed</h1>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9;">
        <p style="font-size: 16px; color: #333;">
          Great news! The proposal <strong>"${proposalTitle}"</strong> has been fully executed by both parties.
        </p>
        
        <div style="background: white; border-left: 4px solid #4bbf39; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Contract Details</h3>
          <p style="margin: 5px 0;"><strong>Title:</strong> ${proposalTitle}</p>
          <p style="margin: 5px 0;"><strong>Client:</strong> ${clientName}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Fully Executed</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #2e7d32;">Signatures</h4>
          
          <div style="margin-bottom: 20px;">
            <p style="margin: 5px 0; font-weight: bold;">Client Signature:</p>
            <img src="${clientSignature}" alt="Client Signature" style="max-width: 250px; border: 1px solid #ddd; padding: 10px; background: white;">
            <p style="margin: 5px 0; font-size: 12px; color: #666;">Signed by: ${clientName}</p>
          </div>
          
          <div>
            <p style="margin: 5px 0; font-weight: bold;">Uptrade Media Signature:</p>
            <img src="${adminSignature}" alt="Admin Signature" style="max-width: 250px; border: 1px solid #ddd; padding: 10px; background: white;">
            <p style="margin: 5px 0; font-size: 12px; color: #666;">Signed by: Uptrade Media</p>
          </div>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          This email serves as confirmation that both parties have signed the agreement. 
          The fully executed contract is now legally binding.
        </p>
      </div>
      
      <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Uptrade Media. All rights reserved.</p>
      </div>
    </div>
  `
  
  // Send to client
  await resend.emails.send({
    from: process.env.RESEND_FROM || 'proposals@uptrademedia.com',
    to: clientEmail,
    subject: `✅ Contract Fully Executed: ${proposalTitle}`,
    html: emailContent
  })
  
  // Send to admin
  await resend.emails.send({
    from: process.env.RESEND_FROM || 'proposals@uptrademedia.com',
    to: adminEmail,
    subject: `✅ Contract Executed: ${proposalTitle} - ${clientName}`,
    html: emailContent
  })
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(event)
    }
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
      return json(400, { error: 'Missing required fields' }, event)
    }

    const store = getStore('signed-contracts')
    const contractKey = `${proposalId}.json`
    
    // Get existing contract data if it exists
    let contractData
    try {
      contractData = await store.getJSON(contractKey)
    } catch (error) {
      // Contract doesn't exist yet (first signature)
      contractData = null
    }

    if (isAdminSignature) {
      // Admin is counter-signing
      if (!contractData || !contractData.clientSignature) {
        return json(400, { 
          error: 'Client must sign first before admin counter-signature' 
        }, event)
      }

      // Add admin signature
      contractData.adminSignature = signature
      contractData.adminSignedAt = signedAt
      contractData.adminSignedBy = signedBy || 'Uptrade Media'
      contractData.status = 'fully_executed'
      contractData.fullyExecutedAt = new Date().toISOString()

      // Store updated contract
      await store.setJSON(contractKey, contractData)

      // Send fully executed contract to both parties
      await sendFullyExecutedContract({
        proposalId,
        proposalTitle,
        clientName: contractData.clientSignedBy,
        clientEmail: contractData.clientEmail,
        clientSignature: contractData.clientSignature,
        adminSignature: signature
      })

      return json(200, {
        success: true,
        message: 'Proposal fully executed',
        status: 'fully_executed',
        proposalId
      }, event)

    } else {
      // Client is signing (first signature)
      contractData = {
        proposalId,
        proposalTitle,
        clientSignature: signature,
        clientSignedAt: signedAt,
        clientSignedBy: signedBy || 'Client',
        clientEmail: clientEmail || 'unknown@example.com',
        status: 'pending_counter_signature',
        createdAt: new Date().toISOString(),
        ipAddress: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown',
        userAgent: event.headers['user-agent'] || 'unknown'
      }

      // Store contract with client signature only
      await store.setJSON(contractKey, contractData)

      // Send email to admin for counter-signature
      await sendAdminCounterSignatureEmail({
        proposalId,
        proposalTitle,
        clientName: signedBy || 'Client',
        clientEmail: clientEmail || 'unknown@example.com',
        clientSignature: signature
      })

      return json(200, { 
        success: true,
        message: 'Client signature recorded. Admin will counter-sign and you\'ll receive the fully executed contract via email.',
        status: 'pending_counter_signature',
        proposalId,
        signedAt
      }, event)
    }

  } catch (error) {
    console.error('Proposal signing error:', error)
    return json(500, { 
      error: 'Failed to process signature',
      message: error.message 
    }, event)
  }
}


