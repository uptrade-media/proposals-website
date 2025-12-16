// netlify/functions/admin-tenants-get.js
// Get a single organization with full details - super admin only
import { createSupabasePublic, getAuthenticatedUser } from './utils/supabase.js'

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

  // Verify authentication
  const { user, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  if (!isSuperAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Super admin access required' })
    }
  }

  try {
    const params = new URLSearchParams(event.queryStringParameters || {})
    const orgId = params.get('id')
    const orgSlug = params.get('slug')

    if (!orgId && !orgSlug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Organization id or slug required' })
      }
    }

    const supabase = createSupabasePublic()

    // Get organization
    let query = supabase
      .from('organizations')
      .select('*')
    
    if (orgId) {
      query = query.eq('id', orgId)
    } else {
      query = query.eq('slug', orgSlug)
    }

    const { data: organization, error: orgError } = await query.single()

    if (orgError || !organization) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Organization not found' })
      }
    }

    // Get users for this organization
    const { data: users } = await supabase
      .from('user_organizations')
      .select('user_email, role, is_primary, created_at')
      .eq('organization_id', organization.id)

    // Get secrets (masked)
    const { data: secrets } = await supabase
      .from('organization_secrets')
      .select('*')
      .eq('organization_id', organization.id)
      .single()

    // Mask sensitive values
    const maskedSecrets = secrets ? {
      hasResendKey: !!secrets.resend_api_key,
      resendFromEmail: secrets.resend_from_email,
      hasGmailCredentials: !!secrets.gmail_client_id,
      hasSquareCredentials: !!secrets.square_access_token,
      squareEnvironment: secrets.square_environment,
      hasGSCCredentials: !!secrets.gsc_client_id,
      hasGACredentials: !!secrets.ga_property_id,
      hasOpenPhoneKey: !!secrets.openphone_api_key,
      customSecretsKeys: Object.keys(secrets.custom_secrets || {})
    } : null

    // Generate tracking script
    const trackingScript = generateTrackingScript(organization)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        organization,
        users: users || [],
        secrets: maskedSecrets,
        trackingScript
      })
    }
  } catch (error) {
    console.error('[AdminTenants] Exception:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * Generate the tracking script snippet for a client's website
 */
function generateTrackingScript(organization) {
  const baseUrl = process.env.URL || 'https://portal.uptrademedia.com'
  
  return `<!-- Uptrade Portal Analytics -->
<script>
  window.UPTRADE_CONFIG = {
    orgId: '${organization.id}',
    orgSlug: '${organization.slug}',
    apiEndpoint: '${baseUrl}/.netlify/functions'
  };
</script>
<script src="${baseUrl}/tracking.js" defer></script>
<!-- End Uptrade Portal Analytics -->`
}
