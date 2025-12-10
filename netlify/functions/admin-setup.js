// Admin setup function - call via browser or curl
import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event, context) {
  const adminEmail = 'ramsey@uptrademedia.com'
  
  // Security: Only allow in development or with secret key
  const isLocal = event.headers?.host?.includes('localhost')
  const secretKey = event.queryStringParameters?.secret
  const expectedSecret = process.env.ADMIN_SETUP_SECRET || 'dev-secret-key'
  
  if (!isLocal && secretKey !== expectedSecret) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    
    // Check if user exists
    const { data: users, error: fetchError } = await supabase
      .from('contacts')
      .select('id, email, name, role')
      .eq('email', adminEmail)
      .limit(1)
    
    if (fetchError) throw fetchError
    
    if (!users || users.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'User not found',
          message: 'Please sign in with Google first at the login page',
          next: 'Then call this function again'
        })
      }
    }
    
    const user = users[0]
    
    // Set admin role
    const { data: result, error: updateError } = await supabase
      .from('contacts')
      .update({ role: 'admin' })
      .eq('email', adminEmail)
      .select('id, email, name, role')
      .single()
    
    if (updateError) throw updateError
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        message: '✅ Admin role set successfully!',
        user: {
          name: result.name,
          email: result.email,
          role: result.role,
          previousRole: user.role
        },
        nextSteps: [
          'Logout if currently logged in',
          'Login with Google',
          'Access admin dashboard at /admin'
        ]
      })
    }
    
  } catch (error) {
    console.error('Admin setup error:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to set admin role',
        message: error.message 
      })
    }
  }
}
