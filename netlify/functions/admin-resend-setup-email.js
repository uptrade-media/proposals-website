import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

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

    if (authUser) {
      // User exists - send magic link
      console.log('[admin-resend-setup-email] User exists, generating magic link')
      
      const { data: magicLink, error: magicLinkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: clientContact.email,
        options: {
          redirectTo: AUTH_CALLBACK_URL
        }
      })

      if (magicLinkError) {
        console.error('[admin-resend-setup-email] Magic link error:', magicLinkError)
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to generate magic link',
            details: magicLinkError.message 
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

      console.log('[admin-resend-setup-email] Magic link generated and email sent')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'Access link sent successfully',
          type: 'magic_link'
        })
      }
    } else {
      // User doesn't exist - send invite
      console.log('[admin-resend-setup-email] User not found, sending invite')
      
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        clientContact.email,
        {
          redirectTo: AUTH_CALLBACK_URL,
          data: {
            name: clientContact.name,
            contact_id: clientContact.id
          }
        }
      )

      if (inviteError) {
        console.error('[admin-resend-setup-email] Invite error:', inviteError)
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to send invite email',
            details: inviteError.message 
          })
        }
      }

      // Link contact to new auth user
      if (inviteData?.user?.id) {
        await supabase
          .from('contacts')
          .update({ auth_user_id: inviteData.user.id })
          .eq('id', clientContact.id)
      }

      console.log('[admin-resend-setup-email] Invite sent successfully')
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
