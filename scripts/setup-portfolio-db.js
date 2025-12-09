#!/usr/bin/env node

/**
 * Setup Portfolio Database Schema in Supabase
 * 
 * This script creates the portfolio_items table and related indexes/policies
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗')
  process.exit(1)
}

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runSetup() {
  try {
    console.log('🚀 Starting portfolio database setup...\n')
    
    // Read SQL file
    const sqlPath = join(__dirname, '..', 'supabase-portfolio-schema.sql')
    console.log(`📄 Reading SQL from: ${sqlPath}`)
    const sql = readFileSync(sqlPath, 'utf-8')
    
    // Split SQL into individual statements (basic split on semicolons)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))
    
    console.log(`📝 Found ${statements.length} SQL statements\n`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) continue
      
      // Log what we're doing
      const firstLine = statement.split('\n')[0].substring(0, 60)
      console.log(`   [${i + 1}/${statements.length}] ${firstLine}...`)
      
      try {
        // Execute SQL using Supabase RPC
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })
        
        if (error) {
          // If exec_sql doesn't exist, try direct query
          if (error.message.includes('function') && error.message.includes('does not exist')) {
            console.log('   ⚠️  Using alternative method...')
            
            // For Supabase, we need to use the REST API or direct connection
            // Let's try using a SQL editor approach
            const { error: queryError } = await supabase
              .from('_tmp')
              .select('*')
              .limit(1)
            
            // This won't work directly, so let's output instructions instead
            throw new Error('Direct SQL execution requires Supabase CLI or Dashboard')
          }
          throw error
        }
        
        console.log('   ✓')
      } catch (err) {
        console.error(`   ✗ Error: ${err.message}`)
        if (err.message.includes('already exists')) {
          console.log('   ℹ️  (already exists, skipping)')
        } else {
          throw err
        }
      }
    }
    
    console.log('\n✅ Portfolio database setup completed!\n')
    console.log('Next steps:')
    console.log('1. Create storage bucket "portfolio-images" in Supabase Dashboard')
    console.log('2. Test the portfolio creation in admin panel')
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    console.log('\n📋 Manual Setup Instructions:')
    console.log('1. Open Supabase Dashboard: https://app.supabase.com')
    console.log('2. Go to SQL Editor')
    console.log('3. Copy contents of supabase-portfolio-schema.sql')
    console.log('4. Paste and run the SQL\n')
    process.exit(1)
  }
}

runSetup()
