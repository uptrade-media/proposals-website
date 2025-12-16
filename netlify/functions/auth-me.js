// netlify/functions/auth-me.js
// Returns the current user's authentication context including organization info
import { getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
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

  // Get authenticated user with organization context
  const { user, contact, organization, isSuperAdmin, error } = await getAuthenticatedUser(event)
  
  if (error || !user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      user: {
        id: user.id,
        email: user.email
      },
      contact: contact ? {
        id: contact.id,
        email: contact.email,
        name: contact.name,
        role: contact.role,
        company: contact.company,
        isTeamMember: contact.is_team_member,
        teamRole: contact.team_role,
        canViewAllClients: contact.canViewAllClients,
        canManageTeam: contact.canManageTeam
      } : null,
      organization: organization ? {
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
        domain: organization.domain,
        features: organization.features,
        theme: organization.theme,
        plan: organization.plan,
        status: organization.status,
        userRole: organization.userRole
      } : null,
      availableOrgs: organization?.availableOrgs || [],
      isSuperAdmin
    })
  }
}
