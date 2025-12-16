// netlify/functions/utils/gmail.js
// Gmail API client using domain-wide delegation (service account)

import { google } from 'googleapis'
import { getGoogleServiceAccountCredentials } from './supabase.js'

/**
 * Create Gmail API client with domain-wide delegation
 * Uses service account stored in Supabase to impersonate a user in the domain
 * 
 * @param {string} impersonateEmail - The user to impersonate (e.g., ramsey@uptrademedia.com)
 */
export async function createGmailClient(impersonateEmail) {
  const credentials = await getGoogleServiceAccountCredentials()
  
  if (!credentials) {
    throw new Error('Google service account credentials not found in Supabase or env')
  }

  const delegatedUser = impersonateEmail || process.env.GMAIL_DELEGATED_USER || 'ramsey@uptrademedia.com'

  // Create JWT auth client with domain-wide delegation
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
    subject: delegatedUser // Impersonate this user
  })

  // Create Gmail client
  const gmail = google.gmail({ version: 'v1', auth })

  return { gmail, auth, delegatedUser }
}

/**
 * Build RFC 2822 formatted email message
 */
export function buildRawEmail({ to, from, subject, body, html, replyTo, inReplyTo, references }) {
  const boundary = `boundary_${Date.now()}`
  
  let headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0'
  ]

  if (replyTo) {
    headers.push(`Reply-To: ${replyTo}`)
  }

  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`)
  }

  if (references) {
    headers.push(`References: ${references}`)
  }

  let message

  if (html) {
    // Multipart message with both plain text and HTML
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
    
    message = [
      ...headers,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      body || stripHtml(html),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      html,
      '',
      `--${boundary}--`
    ].join('\r\n')
  } else {
    // Plain text only
    headers.push('Content-Type: text/plain; charset="UTF-8"')
    message = [...headers, '', body].join('\r\n')
  }

  // Base64url encode the message
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Simple HTML to plain text conversion
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

/**
 * Parse email message from Gmail API response
 */
export function parseGmailMessage(message) {
  const headers = message.payload?.headers || []
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value

  // Extract body
  let body = ''
  let htmlBody = ''
  
  function extractBody(part) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
    if (part.parts) {
      part.parts.forEach(extractBody)
    }
  }
  
  if (message.payload) {
    extractBody(message.payload)
  }

  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds || [],
    snippet: message.snippet,
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    messageId: getHeader('Message-ID'),
    inReplyTo: getHeader('In-Reply-To'),
    references: getHeader('References'),
    body,
    htmlBody,
    internalDate: message.internalDate ? new Date(parseInt(message.internalDate)) : null
  }
}

/**
 * Extract email address from "Name <email>" format
 */
export function extractEmail(fromString) {
  if (!fromString) return null
  const match = fromString.match(/<([^>]+)>/)
  return match ? match[1] : fromString
}

/**
 * Check if email is from our domain
 */
export function isFromOurDomain(email) {
  const address = extractEmail(email)
  return address?.endsWith('@uptrademedia.com') || address?.endsWith('@send.uptrademedia.com')
}
