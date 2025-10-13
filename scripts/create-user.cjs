// Quick script to create user in database
const { neon } = require('@neondatabase/serverless')

async function createUser() {
  const sql = neon(process.env.DATABASE_URL)
  
  try {
    const result = await sql`
      INSERT INTO contacts (email, name, role, account_setup, created_at)
      VALUES ('ramsey@uptrademedia.com', 'Ramsey', 'client', 'true', NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        name = 'Ramsey',
        account_setup = 'true'
      RETURNING id, email, name, role
    `
    
    console.log('✅ User created/updated:', result[0])
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createUser()
