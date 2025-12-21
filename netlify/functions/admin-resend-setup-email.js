import { createSupabaseAdmin, getAuthenticatedUser, getOrgFromRequest } from './utils/supabase.js'
import { sendAuthEmail } from './utils/system-email-sender.js'

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify admin authentication using Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    // Parse request - support both clientId and contactId for backwards compatibility
    const body = JSON.parse(event.body || '{}')
    const clientId = body.clientId || body.contactId
    if (!clientId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Client ID is required' }) }
    }

    // Get org context for multi-tenant email templates
    const orgId = getOrgFromRequest(event) || contact.organization_id

    // Get client from database
    const supabase = createSupabaseAdmin()
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('id, email, name, account_setup, auth_user_id')
      .eq('id', clientId)
      .limit(1)

    if (fetchError) throw fetchError

    if (!contacts || contacts.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Client not found' }) }
    }

    const clientContact = contacts[0]

    // Check if account is already set up
    const isSetup = clientContact.account_setup === 'true' || clientContact.account_setup === true

    const PORTAL_URL = process.env.PORTAL_BASE_URL || process.env.URL || 'https://portal.uptrademedia.com'
    const AUTH_CALLBACK_URL = `${PORTAL_URL}/auth/callback`

    console.log('[admin-resend-setup-email] Processing for:', clientContact.email, 'Setup:', isSetup)

    // Check if user already exists in Supabase Auth
    let authUser = null
    if (clientContact.auth_user_id) {
      const { data: existingUser } = await supabase.auth.admin.getUserById(clientContact.auth_user_id)
      authUser = existingUser?.user
    }

    if (!authUser) {
      // Try to find by email
      const { data: userList } = await supabase.auth.admin.listUsers()
      authUser = userList?.users?.find(u => u.email?.toLowerCase() === clientContact.email.toLowerCase())
    }

    // Get first name for email personalization
    const firstName = clientContact.name?.split(' ')[0] || clientContact.email.split('@')[0]

    if (authUser) {
      // User exists - send magic link using our multi-tenant template system
      console.log('[admin-resend-setup-email] User exists, generating magic link')
      
      const result = await sendAuthEmail({
        type: 'magiclink',
        email: clientContact.email,
        redirectTo: AUTH_CALLBACK_URL,
        orgId,
        userData: {
          first_name: firstName,
          name: clientContact.name,
          contact_id: clientContact.id
        }
      })

      if (!result.success) {
        console.error('[admin-resend-setup-email] Magic link error:', result.error)
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to generate magic link',
            details: result.error 
          })
        }
      }

      // Link contact to auth user if not already
      if (!clientContact.auth_user_id && authUser.id) {
        await supabase
          .from('contacts')
          .update({ auth_user_id: authUser.id })
          .eq('id', clientContact.id)
      }

      console.log('[admin-resend-setup-email] Magic link generated and email sent via custom template')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'Access link sent successfully',
          type: 'magic_link'
        })
      }
    } else {
      // User doesn't exist - send invite using our multi-tenant template system
      console.log('[admin-resend-setup-email] User not found, sending invite')
      
      const result = await sendAuthEmail({
        type: 'invite',
        email: clientContact.email,
        redirectTo: AUTH_CALLBACK_URL,
        orgId,
        userData: {
          first_name: firstName,
          name: clientContact.name,
          contact_id: clientContact.id
        }
      })

      if (!result.success) {
        console.error('[admin-resend-setup-email] Invite error:', result.error)
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to send invite email',
            details: result.error 
          })
        }
      }

      // Get the newly created auth user and link to contact
      const { data: userList } = await supabase.auth.admin.listUsers()
      const newAuthUser = userList?.users?.find(u => u.email?.toLowerCase() === clientContact.email.toLowerCase())
      
      if (newAuthUser?.id) {
        await supabase
          .from('contacts')
          .update({ auth_user_id: newAuthUser.id })
          .eq('id', clientContact.id)
      }

      console.log('[admin-resend-setup-email] Invite sent successfully via custom template')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'Invite email sent successfully',
          type: 'invite'
        })
      }
    }
  } catch (error) {
    console.error('[admin-resend-setup-email] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send setup email',
        details: error.message 
      })
    }
  }
}
