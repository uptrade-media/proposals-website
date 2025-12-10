// Admin setup function - call via browser or curl
const { neon } = require('@neondatabase/serverless')

exports.handler = async (event, context) => {
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
    const sql = neon(process.env.DATABASE_URL)
    
    // Check if user exists
    const users = await sql`
      SELECT id, email, name, role 
      FROM contacts 
      WHERE email = ${adminEmail}
    `
    
    if (users.length === 0) {
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
    const result = await sql`
      UPDATE contacts 
      SET role = 'admin' 
      WHERE email = ${adminEmail}
      RETURNING id, email, name, role
    `
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        message: '✅ Admin role set successfully!',
        user: {
          name: result[0].name,
          email: result[0].email,
          role: result[0].role,
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
