// ========================================
// ONE-TIME SETUP: Create all database tables
// Run via: curl http://localhost:8888/.netlify/functions/supabase-setup-schema
// ========================================

import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function handler(event) {
  try {
    // Connect directly to Supabase Postgres using connection string
    const sql = neon(process.env.SUPABASE_DATABASE_URL)

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '..', '..', 'supabase-schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')

    console.log('Executing schema SQL...')
    console.log('Schema length:', schemaSql.length, 'characters')
    
    // Execute the entire schema
    await sql(schemaSql)

    console.log('✅ Schema created successfully')

    // Now read and execute RLS policies
    const rlsPath = path.join(__dirname, '..', '..', 'supabase-rls-policies.sql')
    const rlsSql = fs.readFileSync(rlsPath, 'utf8')

    console.log('Executing RLS policies...')
    console.log('RLS SQL length:', rlsSql.length, 'characters')

    await sql(rlsSql)

    console.log('✅ RLS policies applied successfully')

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Database schema and RLS policies created successfully',
        tables: 18
      })
    }

  } catch (error) {
    console.error('Setup error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        detail: error.detail || 'No additional details',
        hint: error.hint || 'Check the SQL files for syntax errors'
      })
    }
  }
}
