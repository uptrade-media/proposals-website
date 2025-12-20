/**
 * Send Audit Email Function
 * 
 * Sends a personalized audit completion email with magic link.
 * Uses OpenAI to generate personalized messaging.
 * Called manually by admin after reviewing the audit.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'
import OpenAI from 'openai'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

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

// Lazy OpenAI initialization
let openaiClient = null
function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

/**
 * Generate personalized audit email content using OpenAI
 */
async function generatePersonalizedAuditMessage(recipientName, audit) {
  const client = getOpenAIClient()
  const firstName = recipientName?.split(' ')[0] || 'there'
  
  // Fallback if OpenAI is not configured
  if (!client) {
    return getDefaultMessage(firstName, audit)
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are writing a personalized email message for Uptrade Media, a Cincinnati-based digital agency. 
          The tone should be professional yet warm and approachable - never salesy or pushy.
          Keep it concise (2-3 sentences max).
          Reference specific findings from their audit naturally.
          Be encouraging but honest about areas needing improvement.
          Never use generic phrases like "I hope this finds you well."
          Do NOT include any sign-off like "Best," or "[Your Name]" - just write the message content.
          Do NOT wrap the message in quotes.`
        },
        {
          role: 'user',
          content: `Write a brief personalized message for ${firstName} whose website ${audit.target_url} just received a grade of ${getAuditGrade(audit)}.
          
          Key metrics:
          - Performance: ${audit.performance_score || 0}/100
          - SEO: ${audit.seo_score || 0}/100
          - Accessibility: ${audit.accessibility_score || 0}/100
          - Security: ${audit.score_security || 0}/100
          
          Focus on ${audit.performance_score < 50 ? 'performance' : audit.seo_score < 50 ? 'SEO' : audit.accessibility_score < 50 ? 'accessibility' : 'maintaining their great scores'}.
          Express genuine interest in helping them improve.`
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    })

    return response.choices[0]?.message?.content?.trim() || getDefaultMessage(firstName, audit)
  } catch (error) {
    console.error('OpenAI personalization failed:', error)
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

    // Generate personalized message
    const personalizedMessage = await generatePersonalizedAuditMessage(recipientName || recipientEmail.split('@')[0], audit)
    const firstName = recipientName?.split(' ')[0] || recipientEmail.split('@')[0]
    const grade = getAuditGrade(audit)
    
    // Magic link to portal
    const magicLink = `https://portal.uptrademedia.com/audit/${auditId}?token=${magicToken}`
    
    // Grade colors
    const gradeColors = {
      'A': { bg: '#10b981', text: 'Excellent!' },
      'B': { bg: '#3b82f6', text: 'Good' },
      'C': { bg: '#f59e0b', text: 'Needs Work' },
      'D': { bg: '#f97316', text: 'Poor' },
      'F': { bg: '#ef4444', text: 'Critical' }
    }
    const gradeInfo = gradeColors[grade] || gradeColors['C']

    const subject = `${firstName}, Your Website Audit is Ready - Grade: ${grade}`
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                  
                  <!-- Header with Logo -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #54b948 0%, #39bfb0 100%); padding: 30px; text-align: center;">
                      <img src="https://uptrademedia.com/logo-all-white.png" alt="Uptrade Media" style="height: 40px; width: auto; margin-bottom: 20px;" />
                      <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">
                        Your Website Audit is Ready! 🎉
                      </h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">
                        Hi ${firstName}, we've completed a comprehensive analysis of your website
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Personalized Message -->
                  <tr>
                    <td style="padding: 25px 30px 15px 30px; background-color: #f8fafc; border-bottom: 1px solid #e5e7eb;">
                      <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0;">
                        ${personalizedMessage}
                      </p>
                      <p style="color: #6b7280; font-size: 14px; margin: 12px 0 0 0;">
                        — The Uptrade Media Team
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Grade Display -->
                  <tr>
                    <td style="padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                      <div style="display: inline-block; background-color: ${gradeInfo.bg}; color: white; font-size: 64px; font-weight: bold; width: 100px; height: 100px; line-height: 100px; border-radius: 20px; margin-bottom: 15px;">
                        ${grade}
                      </div>
                      <p style="color: #374151; font-size: 18px; margin: 0; font-weight: 600;">
                        Overall Grade: ${gradeInfo.text}
                      </p>
                      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">
                        ${audit.target_url}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Score Summary -->
                  <tr>
                    <td style="padding: 30px;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="width: 25%; text-align: center; padding: 15px;">
                            <div style="font-size: 28px; font-weight: bold; color: ${(audit.performance_score || 0) >= 70 ? '#10b981' : (audit.performance_score || 0) >= 50 ? '#f59e0b' : '#ef4444'};">
                              ${audit.performance_score || 0}
                            </div>
                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                              Performance
                            </div>
                          </td>
                          <td style="width: 25%; text-align: center; padding: 15px;">
                            <div style="font-size: 28px; font-weight: bold; color: ${(audit.seo_score || 0) >= 70 ? '#10b981' : (audit.seo_score || 0) >= 50 ? '#f59e0b' : '#ef4444'};">
                              ${audit.seo_score || 0}
                            </div>
                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                              SEO
                            </div>
                          </td>
                          <td style="width: 25%; text-align: center; padding: 15px;">
                            <div style="font-size: 28px; font-weight: bold; color: ${(audit.accessibility_score || 0) >= 70 ? '#10b981' : (audit.accessibility_score || 0) >= 50 ? '#f59e0b' : '#ef4444'};">
                              ${audit.accessibility_score || 0}
                            </div>
                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                              Accessibility
                            </div>
                          </td>
                          <td style="width: 25%; text-align: center; padding: 15px;">
                            <div style="font-size: 28px; font-weight: bold; color: ${(audit.score_security || 0) >= 70 ? '#10b981' : (audit.score_security || 0) >= 50 ? '#f59e0b' : '#ef4444'};">
                              ${audit.score_security || 0}
                            </div>
                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                              Security
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td style="padding: 10px 30px 40px 30px; text-align: center;">
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                        View your complete audit report with detailed findings, actionable recommendations, and priority fixes.
                      </p>
                      
                      <table role="presentation" style="margin: 0 auto;">
                        <tr>
                          <td style="border-radius: 12px; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                            <a href="${magicLink}" style="display: inline-block; padding: 18px 40px; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 12px;">
                              View Full Report →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                        This link expires in 30 days.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- What's Included -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
                      <h3 style="color: #111827; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">
                        Your Report Includes:
                      </h3>
                      <table role="presentation" style="width: 100%;">
                        <tr><td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Core Web Vitals & Performance Analysis</td></tr>
                        <tr><td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Technical SEO Health Check</td></tr>
                        <tr><td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Security Headers & HTTPS Analysis</td></tr>
                        <tr><td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Mobile Optimization Review</td></tr>
                        <tr><td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Schema & Structured Data Check</td></tr>
                        <tr><td style="padding: 8px 0; color: #374151; font-size: 14px;">✓ Priority Action Items</td></tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Help Section -->
                  <tr>
                    <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #374151; font-size: 15px; margin: 0 0 15px 0;">
                        <strong>Need help implementing these improvements?</strong>
                      </p>
                      <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0;">
                        Our team can help you fix these issues and boost your rankings.
                      </p>
                      <a href="https://uptrademedia.com/contact/" style="display: inline-block; padding: 12px 24px; background-color: #111827; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">
                        Schedule a Free Consultation
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #111827; padding: 30px; text-align: center;">
                      <p style="color: #9ca3af; font-size: 13px; margin: 0 0 5px 0;">
                        <strong style="color: #fff;">Uptrade Media</strong><br>
                        High-Performance Websites & Digital Marketing
                      </p>
                      <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        Cincinnati & Northern Kentucky | (513) 951-1110
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `

    // Send email via Resend
    console.log('[audits-send-email] Sending email to:', recipientEmail)
    
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Uptrade Media <noreply@send.uptrademedia.com>'
    
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
      replyTo: 'hello@uptrademedia.com'
    })
    
    console.log('[audits-send-email] Email sent successfully:', emailResult)

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
        emailId: emailResult.data?.id,
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
