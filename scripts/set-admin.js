// Admin Setup Script
// Run with: node scripts/set-admin.js

import { neon } from '@neondatabase/serverless'
import 'dotenv/config'

const sql = neon(process.env.DATABASE_URL)

async function setAdmin() {
  const adminEmail = 'ramsey@uptrademedia.com'
  
  console.log(`Setting admin role for: ${adminEmail}`)
  
  try {
    // Check if user exists
    const users = await sql`
      SELECT id, email, name, role 
      FROM contacts 
      WHERE email = ${adminEmail}
    `
    
    if (users.length === 0) {
      console.log('❌ User not found. Please sign in with Google first.')
      console.log('   1. Go to the login page')
      console.log('   2. Click "Sign in with Google"')
      console.log('   3. Authenticate with ramsey@uptrademedia.com')
      console.log('   4. Run this script again')
      process.exit(1)
    }
    
    console.log(`✓ Found user: ${users[0].name} (${users[0].email})`)
    console.log(`  Current role: ${users[0].role || 'none'}`)
    
    // Set admin role
    const result = await sql`
      UPDATE contacts 
      SET role = 'admin' 
      WHERE email = ${adminEmail}
      RETURNING id, email, name, role
    `
    
    console.log(`✅ Admin role set successfully!`)
    console.log(`   Name: ${result[0].name}`)
    console.log(`   Email: ${result[0].email}`)
    console.log(`   Role: ${result[0].role}`)
    console.log('')
    console.log('Next steps:')
    console.log('1. Logout if currently logged in')
    console.log('2. Login with Google')
    console.log('3. Access admin dashboard at /admin')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

setAdmin()
