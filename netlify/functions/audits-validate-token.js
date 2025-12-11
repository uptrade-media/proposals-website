// netlify/functions/audits-validate-token.js
// Proxy function to validate audit magic tokens against main site
// This avoids CORS issues by making the request server-to-server

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const { auditId, token } = JSON.parse(event.body || '{}')

    if (!auditId || !token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ valid: false, error: 'Missing auditId or token' })
      }
    }

    // Call main site API server-to-server (no CORS issues)
    const mainSiteUrl = 'https://www.uptrademedia.com/api/audit-validate-token'
    
    const response = await fetch(mainSiteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditId, token })
    })

    const data = await response.json()

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data)
    }

  } catch (error) {
    console.error('Error validating token:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ valid: false, error: 'Failed to validate token' })
    }
  }
}
