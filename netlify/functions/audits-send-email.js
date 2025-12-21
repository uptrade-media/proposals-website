/**
 * Send Audit Email Function
 * 
 * Sends a personalized audit completion email with magic link.
 * Uses Signal SupportSkill to generate personalized messaging.
 * Uses multi-tenant system email templates.
 * Called manually by admin after reviewing the audit.
 */

import { createSupabaseAdmin, getAuthenticatedUser, getOrgFromRequest } from './utils/supabase.js'
import { sendSystemEmail } from './utils/system-email-sender.js'
import { SupportSkill } from './skills/support-skill.js'
import crypto from 'crypto'

// Helper to calculate grade from overall score or summary
function getAuditGrade(audit) {
  if (audit.summary?.grade) return audit.summary.grade
  if (audit.summary?.metrics?.grade) return audit.summary.metrics.grade
  
  const score = audit.score_overall || 0
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

/**
 * Generate personalized audit email content using SupportSkill
 */
async function generatePersonalizedAuditMessage(supabase, orgId, recipientName, audit, userId) {
  const firstName = recipientName?.split(' ')[0] || 'there'
  
  try {
    const supportSkill = new SupportSkill(supabase, orgId, { userId })
    return await supportSkill.generateAuditEmailMessage(recipientName, audit)
  } catch (error) {
    console.error('SupportSkill personalization failed:', error)
    return getDefaultMessage(firstName, audit)
  }
}

function getDefaultMessage(firstName, audit) {
  const lowestScore = Math.min(
    audit.performance_score || 100,
    audit.seo_score || 100,
    audit.accessibility_score || 100,
    audit.score_security || 100
  )
  
  const grade = getAuditGrade(audit)
  if (grade === 'A') {
    return `Great news, ${firstName}! Your website is performing exceptionally well. We've identified a few opportunities to make it even better.`
  } else if (lowestScore < 50) {
    return `Hi ${firstName}, we've completed your audit and found some important areas where your website could significantly improve. The good news? These are all fixable.`
  } else {
    return `Hi ${firstName}! Your website audit is ready. We've analyzed everything from performance to SEO, and have some actionable recommendations for you.`
  }
}

/**
 * Generate a magic token for audit access
 */
function generateMagicToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify admin user
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact || contact.role !== 'admin') {
      return { statusCode: 401, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const { auditId, recipientEmail, recipientName } = JSON.parse(event.body || '{}')

    if (!auditId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Audit ID required' }) }
    }

    if (!recipientEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Recipient email required' }) }
    }

    console.log('[audits-send-email] Processing email for audit:', auditId)

    const supabase = createSupabaseAdmin()

    // Get audit record
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*')
      .eq('id', auditId)
      .single()
    
    if (auditError || !audit) {
      console.error('[audits-send-email] Audit not found:', auditId, auditError)
      return { statusCode: 404, body: JSON.stringify({ error: 'Audit not found' }) }
    }

    // Validate that audit is complete with scores
    if (audit.status !== 'complete' && audit.status !== 'completed') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Audit is not complete yet' }) }
    }

    const hasScores = (audit.performance_score > 0 || audit.seo_score > 0 || 
                       audit.accessibility_score > 0 || audit.score_security > 0)
    
    if (!hasScores) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Audit has no scores yet' }) }
    }

    // Generate magic token if needed
    let magicToken = audit.magic_token
    if (!magicToken) {
      magicToken = generateMagicToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 day expiration
      
      await supabase
        .from('audits')
        .update({ 
          magic_token: magicToken,
          magic_token_expires_at: expiresAt.toISOString()
        })
        .eq('id', auditId)
    }

    // Find or create contact for recipient
    let recipientContact = null
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, email, name')
      .eq('email', recipientEmail.toLowerCase())
      .single()

    if (existingContact) {
      recipientContact = existingContact
      // Update name if provided and different
      if (recipientName && !existingContact.name) {
        await supabase
          .from('contacts')
          .update({ name: recipientName })
          .eq('id', existingContact.id)
      }
    } else {
      // Create new contact as prospect
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          email: recipientEmail.toLowerCase(),
          name: recipientName || null,
          role: 'client',
          pipeline_stage: 'prospect'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('[audits-send-email] Failed to create contact:', createError)
      } else {
        recipientContact = newContact
      }
    }

    // Update audit with contact_id if we have one
    if (recipientContact && !audit.contact_id) {
      await supabase
        .from('audits')
        .update({ contact_id: recipientContact.id })
        .eq('id', auditId)
    }

    // Get org context for multi-tenant email templates
    const orgId = getOrgFromRequest(event) || contact.organization_id

    // Generate personalized message using SupportSkill
    const personalizedMessage = await generatePersonalizedAuditMessage(
      supabase, 
      orgId, 
      recipientName || recipientEmail.split('@')[0], 
      audit,
      contact.id
    )
    const firstName = recipientName?.split(' ')[0] || recipientEmail.split('@')[0]
    const grade = getAuditGrade(audit)
    
    // Magic link to portal
    const magicLink = `https://portal.uptrademedia.com/audit/${auditId}?token=${magicToken}`

    // Send email via multi-tenant system email sender
    console.log('[audits-send-email] Sending email to:', recipientEmail)
    
    const emailResult = await sendSystemEmail({
      emailId: 'audit-complete',
      to: recipientEmail,
      orgId,
      variables: {
        first_name: firstName,
        personalized_message: personalizedMessage,
        grade,
        target_url: audit.target_url,
        performance_score: audit.performance_score || 0,
        seo_score: audit.seo_score || 0,
        accessibility_score: audit.accessibility_score || 0,
        security_score: audit.score_security || 0,
        magic_link: magicLink
      }
    })
    
    if (!emailResult.success) {
      console.error('[audits-send-email] Email send failed:', emailResult.error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send email', message: emailResult.error })
      }
    }
    
    console.log('[audits-send-email] Email sent successfully via multi-tenant template:', emailResult.emailId)

    // Update audit to mark email sent
    await supabase
      .from('audits')
      .update({ 
        email_sent_at: new Date().toISOString(),
        email_sent_to: recipientEmail
      })
      .eq('id', auditId)

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        emailId: emailResult.emailId,
        magicLink 
      })
    }

  } catch (error) {
    console.error('[audits-send-email] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email', message: error.message })
    }
  }
}
