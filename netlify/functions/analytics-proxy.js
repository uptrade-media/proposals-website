// netlify/functions/analytics-proxy.js
// Proxy to main site analytics API to avoid CORS issues

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get the endpoint from query params
    const { endpoint, ...queryParams } = event.queryStringParameters || {}
    
    if (!endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing endpoint parameter' })
      }
    }

    // Validate endpoint to prevent arbitrary URL fetching
    const allowedEndpoints = [
      'overview',
      'page-views',
      'sessions',
      'events',
      'web-vitals',
      'scroll-depth',
      'heatmap'
    ]
    if (!allowedEndpoints.includes(endpoint)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid endpoint' })
      }
    }

    // Support custom domain for tenant analytics
    // Default to uptrademedia.com if no domain specified
    const { domain, ...otherParams } = queryParams
    const targetDomain = domain || 'uptrademedia.com'
    
    // Validate domain to prevent arbitrary URL fetching
    const allowedDomains = [
      'uptrademedia.com',
      'godsworkoutapparel.com',
      'localhost:3000' // For development
    ]
    
    // Check if domain is allowed (exact match or subdomain)
    const isDomainAllowed = allowedDomains.some(allowed => 
      targetDomain === allowed || targetDomain.endsWith('.' + allowed)
    )
    
    if (!isDomainAllowed) {
      console.warn('[Analytics Proxy] Blocked domain:', targetDomain)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Domain not allowed' })
      }
    }

    // Build the target URL
    const queryString = new URLSearchParams(otherParams).toString()
    const protocol = targetDomain.includes('localhost') ? 'http' : 'https'
    const targetUrl = `${protocol}://${targetDomain}/api/analytics/${endpoint}${queryString ? '?' + queryString : ''}`

    console.log('[Analytics Proxy] Fetching:', targetUrl)

    // Fetch from main site
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'UptradePortal/1.0'
      }
    })

    if (!response.ok) {
      console.error('[Analytics Proxy] Error:', response.status, response.statusText)
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch analytics',
          status: response.status 
        })
      }
    }

    const data = await response.json()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    }

  } catch (error) {
    console.error('[Analytics Proxy] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Analytics proxy error',
        message: error.message 
      })
    }
  }
}
