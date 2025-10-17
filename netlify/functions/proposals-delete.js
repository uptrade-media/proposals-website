const { neon } = require('@neondatabase/serverless')
const jwt = require('jsonwebtoken')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    
    // Only admins can delete proposals
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden - Admin access required' })
      }
    }

    // Get proposal ID from query parameter
    const proposalId = event.queryStringParameters?.id
    if (!proposalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Proposal ID is required' })
      }
    }

    // Connect to database
    const sql = neon(process.env.DATABASE_URL)

    // Check if proposal exists
    const existingProposal = await sql`
      SELECT id, title, status 
      FROM proposals 
      WHERE id = ${proposalId}
    `

    if (existingProposal.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Check if proposal is already signed (prevent deletion of signed proposals)
    if (existingProposal[0].status === 'signed' || existingProposal[0].status === 'fully_executed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Cannot delete signed or executed proposals',
          suggestion: 'Archive or mark as cancelled instead'
        })
      }
    }

    // Delete the proposal
    await sql`
      DELETE FROM proposals 
      WHERE id = ${proposalId}
    `

    console.log(`Proposal deleted: ${proposalId} (${existingProposal[0].title})`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Proposal deleted successfully'
      })
    }
  } catch (error) {
    console.error('Error deleting proposal:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete proposal',
        details: error.message 
      })
    }
  }
}
