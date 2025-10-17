// netlify/functions/proposals-update.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Get proposal ID from path
  const proposalId = event.path.split('/').pop()
  if (!proposalId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Proposal ID required' })
    }
  }

  // Verify authentication
  if (!JWT_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server not configured' })
    }
  }

  const rawCookie = event.headers.cookie || ''
  const token = rawCookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))?.split('=')[1]
  
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    
    // Only admins can update proposals
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can update proposals' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      title,
      mdxContent,
      status,
      totalAmount,
      validUntil,
      projectId
    } = body

    // Connect to database
    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      }
    }

    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    // Check if proposal exists
    const existingProposal = await db.query.proposals.findFirst({
      where: eq(schema.proposals.id, proposalId)
    })

    if (!existingProposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Build update object (only include fields that were provided)
    const updates = {
      updatedAt: new Date()
    }

    if (title !== undefined) updates.title = title
    if (mdxContent !== undefined) updates.mdxContent = mdxContent
    if (status !== undefined) updates.status = status
    if (totalAmount !== undefined) updates.totalAmount = totalAmount ? String(totalAmount) : null
    if (validUntil !== undefined) updates.validUntil = validUntil ? new Date(validUntil) : null
    if (projectId !== undefined) updates.projectId = projectId || null

    // Update proposal
    const [updatedProposal] = await db
      .update(schema.proposals)
      .set(updates)
      .where(eq(schema.proposals.id, proposalId))
      .returning()

    // Format response
    const formattedProposal = {
      id: updatedProposal.id,
      contactId: updatedProposal.contactId,
      projectId: updatedProposal.projectId,
      slug: updatedProposal.slug,
      title: updatedProposal.title,
      mdxContent: updatedProposal.mdxContent,
      status: updatedProposal.status,
      totalAmount: updatedProposal.totalAmount ? parseFloat(updatedProposal.totalAmount) : null,
      validUntil: updatedProposal.validUntil,
      signedAt: updatedProposal.signedAt,
      adminSignedAt: updatedProposal.adminSignedAt,
      fullyExecutedAt: updatedProposal.fullyExecutedAt,
      createdAt: updatedProposal.createdAt,
      updatedAt: updatedProposal.updatedAt
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        proposal: formattedProposal,
        message: 'Proposal updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating proposal:', error)
    
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
        error: 'Failed to update proposal',
        message: error.message 
      })
    }
  }
}
