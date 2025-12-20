// netlify/functions/proposals-create.js
// Migrated to Supabase
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getAuthenticatedUser } from './utils/supabase.js'
import { requireTeamMember } from './utils/permissions.js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`
const PORTAL_URL = process.env.URL || 'https://portal.uptrademedia.com'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Generate URL-safe slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
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

    // Require team member access
    try {
      requireTeamMember(contact)
    } catch (err) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: err.message })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      contactId,
      projectId,
      title,
      description,
      mdxContent,
      status = 'draft',
      totalAmount,
      validUntil,
      slug,
      lineItems
    } = body

    // Validate required fields
    if (!contactId || !title || !mdxContent) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId, title, and mdxContent are required' })
      }
    }

    // Verify contact exists
    const { data: targetContact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, account_setup, role')
      .eq('id', contactId)
      .single()

    if (contactError || !targetContact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // If projectId provided, verify it exists
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }
    }

    // Generate or validate slug
    let proposalSlug = slug || generateSlug(title)
    
    // Ensure slug is unique
    const { data: existingProposal } = await supabase
      .from('proposals')
      .select('id')
      .eq('slug', proposalSlug)
      .single()

    if (existingProposal) {
      proposalSlug = `${proposalSlug}-${Date.now()}`
    }

    // Create proposal
    const { data: proposal, error: createError } = await supabase
      .from('proposals')
      .insert({
        contact_id: contactId,
        project_id: projectId || null,
        slug: proposalSlug,
        title,
        description: description || null,
        mdx_content: mdxContent,
        status,
        total_amount: totalAmount ? String(totalAmount) : null,
        valid_until: validUntil || null,
        created_by: contact.id, // Track who created this proposal
        assigned_to: contact.id // Initially assigned to creator
      })
      .select()
      .single()

    if (createError) {
      console.error('Create proposal error:', createError)
      throw createError
    }

    // Insert line items if provided
    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      const lineItemsToInsert = lineItems.map((item, index) => ({
        proposal_id: proposal.id,
        title: item.title || item.serviceType || 'Service',
        item_type: item.serviceType || item.itemType || 'custom',
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice,
        total_price: (item.quantity || 1) * item.unitPrice,
        sort_order: index
      }))

      const { error: lineItemsError } = await supabase
        .from('proposal_line_items')
        .insert(lineItemsToInsert)

      if (lineItemsError) {
        console.error('Line items error:', lineItemsError)
        // Non-fatal, continue
      }
    }

    // Format response
    const formattedProposal = {
      id: proposal.id,
      contactId: proposal.contact_id,
      projectId: proposal.project_id,
      slug: proposal.slug,
      title: proposal.title,
      description: proposal.description,
      mdxContent: proposal.mdx_content,
      status: proposal.status,
      totalAmount: proposal.total_amount ? parseFloat(proposal.total_amount) : null,
      validUntil: proposal.valid_until,
      signedAt: proposal.signed_at,
      adminSignedAt: proposal.admin_signed_at,
      fullyExecutedAt: proposal.fully_executed_at,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at
    }

    // Send email notification if not draft
    if (RESEND_API_KEY && status !== 'draft') {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const needsSetup = targetContact.account_setup === false || targetContact.account_setup === 'false'
        
        // Generate Supabase magic link
        const redirectPath = needsSetup ? '/account-setup' : `/proposals/${proposal.slug}`
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: targetContact.email,
          options: {
            redirectTo: `${PORTAL_URL}${redirectPath}`
          }
        })
        
        if (linkError) {
          console.error('Error generating magic link:', linkError)
        }
        
        const magicUrl = linkData?.properties?.action_link || `${PORTAL_URL}/login`
        const emailSubject = needsSetup 
          ? 'New Proposal Ready - Set Up Your Account' 
          : `New Proposal: ${proposal.title}`
        
        const emailBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
            <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #4bbf39 0%, #2d7a24 100%); color: white; padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">📋 New Proposal Ready!</h1>
              </div>
              
              <div style="padding: 40px 30px;">
                <p style="margin: 0 0 20px; font-size: 16px;">Hi ${targetContact.name},</p>
                <p style="margin: 0 0 20px; font-size: 16px;">${needsSetup ? 'Great news! We\'ve prepared a new proposal for you:' : 'We\'ve prepared a new proposal for your review:'}</p>
                
                <div style="background: #f8f9fa; border-left: 4px solid #4bbf39; padding: 20px; border-radius: 6px; margin: 24px 0;">
                  <h2 style="margin: 0 0 12px; font-size: 20px; color: #2d7a24;">${proposal.title}</h2>
                  ${proposal.total_amount ? `<div style="margin: 8px 0; font-size: 14px; color: #555;"><strong>Total Investment:</strong> $${parseFloat(proposal.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
                  ${proposal.valid_until ? `<div style="margin: 8px 0; font-size: 14px; color: #555;"><strong>Valid Until:</strong> ${new Date(proposal.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
                </div>
                
                ${needsSetup ? `
                <div style="background: #fff8e6; border-left: 4px solid #ffc107; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-size: 14px; color: #856404;"><strong>🎯 First Time Here?</strong> You'll need to set up your portal account to view this proposal.</p>
                </div>
                ` : ''}
                
                <div style="text-align: center;">
                  <a href="${magicUrl}" style="display: inline-block; background: #4bbf39; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0;">${needsSetup ? 'Set Up Account & View Proposal' : 'View Proposal'}</a>
                </div>
                
                <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #856404;">
                  ⏰ This link expires in 24 hours. You can always sign in at <a href="${PORTAL_URL}/login">${PORTAL_URL}/login</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 16px;">
                  <strong>The Uptrade Media Team</strong>
                </p>
              </div>
              
              <div style="background: #f8f9fa; padding: 24px 30px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Uptrade Media. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
        
        await resend.emails.send({
          from: RESEND_FROM,
          to: targetContact.email,
          subject: emailSubject,
          html: emailBody
        })

        console.log(`Proposal notification sent to ${targetContact.email}`)
      } catch (emailError) {
        console.error('Failed to send proposal notification:', emailError)
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        proposal: formattedProposal,
        message: 'Proposal created successfully'
      })
    }

  } catch (error) {
    console.error('Error creating proposal:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create proposal',
        message: error.message 
      })
    }
  }
}
