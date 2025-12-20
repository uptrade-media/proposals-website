// netlify/functions/proposals-create-ai.cjs
// Entry point for AI proposal generation - triggers background function
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper to get authenticated user from Authorization header (inline to avoid ES module import)
async function getAuthenticatedUser(event) {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { contact: null, error: 'No authorization header' }
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return { contact: null, error: authError?.message || 'Invalid token' }
    }
    
    // Get the contact record
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, role, org_id')
      .eq('email', user.email)
      .single()
    
    if (contactError || !contact) {
      return { contact: null, error: 'Contact not found for user' }
    }
    
    return { contact, error: null }
  } catch (err) {
    return { contact: null, error: err.message }
  }
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // GET = check status of proposal generation
  if (event.httpMethod === 'GET') {
    const proposalId = event.queryStringParameters?.proposalId
    
    if (!proposalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'proposalId is required' })
      }
    }

    try {
      const { contact, error: authError } = await getAuthenticatedUser(event)
      if (authError || !contact || contact.role !== 'admin') {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Admin access required' })
        }
      }

      const { data: proposal, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single()

      if (error || !proposal) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Proposal not found' })
        }
      }

      // Check if generation is complete (status is 'draft' = AI finished)
      if (proposal.status === 'draft' && proposal.mdx_content && !proposal.mdx_content.startsWith('# Generating')) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'complete',
            proposal: {
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
              createdAt: proposal.created_at,
              updatedAt: proposal.updated_at
            }
          })
        }
      }
      
      // Check for failure
      if (proposal.status === 'failed') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'failed',
            error: proposal.description || 'Generation failed'
          })
        }
      }

      // Still generating
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: proposal.status || 'generating',
          proposalId: proposal.id
        })
      }

    } catch (error) {
      console.error('[proposals-create-ai] Status check error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to check proposal status' })
      }
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Authenticate
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Only admins can create proposals' })
    }
  }

  try {
    const formData = JSON.parse(event.body || '{}')
    const { 
      contactId,
      proposalType,
      pricing,
      clientInfo,
      projectInfo,
      heroImageUrl
    } = formData

    const clientName = clientInfo?.name || formData.clientName
    const brandName = clientInfo?.brandName || clientInfo?.company || formData.brandName
    const projectType = proposalType || formData.projectType

    if (!contactId || !clientName || !projectType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['contactId', 'clientInfo.name', 'proposalType']
        })
      }
    }

    // Verify contact exists
    const { data: targetContact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, company')
      .eq('id', contactId)
      .single()

    if (contactError || !targetContact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Create placeholder proposal record
    const proposalId = crypto.randomUUID()
    const slug = `${projectType}-${Date.now()}`
    
    // Build insert data - hero_image_url and brand_name columns may not exist yet
    const insertData = {
      id: proposalId,
      contact_id: contactId,
      slug,
      title: `${projectType} Proposal for ${clientName}`,
      description: 'Generating...',
      mdx_content: '# Generating proposal...\n\nPlease wait while we create your proposal.',
      status: 'generating',
      total_amount: pricing?.totalPrice || pricing?.basePrice || null,
      valid_until: formData.validUntil || null,
      timeline: projectInfo?.timeline || null,
      payment_terms: pricing?.paymentTerms || null
    }
    
    // Add optional columns if they have values (will fail gracefully if columns don't exist)
    if (heroImageUrl) insertData.hero_image_url = heroImageUrl
    if (brandName) insertData.brand_name = brandName
    
    const { error: insertError } = await supabase
      .from('proposals')
      .insert(insertData)

    if (insertError) {
      console.error('[proposals-create-ai] Insert error:', insertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create proposal record' })
      }
    }

    // Trigger background function
    const baseUrl = process.env.URL || 'https://portal.uptrademedia.com'
    const backgroundUrl = `${baseUrl}/.netlify/functions/proposals-create-ai-background`
    
    console.log(`[proposals-create-ai] Triggering background function for proposal: ${proposalId}`)

    try {
      fetch(backgroundUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          proposalId,
          formData,
          createdBy: contact.id
        })
      }).catch(err => console.error('[proposals-create-ai] Background trigger error:', err))
    } catch (err) {
      console.error('[proposals-create-ai] Failed to trigger background:', err)
    }

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        proposalId,
        status: 'generating',
        message: 'Proposal generation started. Poll for status using GET with proposalId.'
      })
    }

  } catch (error) {
    console.error('[proposals-create-ai] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to start proposal generation', details: error.message })
    }
  }
}
