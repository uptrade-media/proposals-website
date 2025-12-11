// Pull actual schema from Supabase database
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

// Load .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : 'MISSING')
console.log('Key:', supabaseKey ? 'present (' + supabaseKey.length + ' chars)' : 'MISSING')

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const tables = [
  'contacts',
  'projects', 
  'proposals',
  'files',
  'messages',
  'invoices',
  'audits',
  'campaigns',
  'blog_posts',
  'portfolio_items'
]

async function getSchema() {
  console.log('Pulling actual schema from Supabase...\n')
  
  for (const table of tables) {
    try {
      const { data: rows, error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        console.log(`\n=== ${table.toUpperCase()} ===`)
        console.log(`ERROR: ${error.message}`)
        continue
      }
      
      console.log(`\n=== ${table.toUpperCase()} ===`)
      
      if (rows && rows.length > 0) {
        const columns = Object.keys(rows[0])
        columns.forEach(col => {
          const val = rows[0][col]
          const type = val === null ? 'null' : typeof val
          console.log(`  ${col}: ${type}`)
        })
      } else {
        // Empty table - try to infer from error or just note it
        console.log('  (no rows - cannot infer columns)')
      }
    } catch (err) {
      console.log(`\n=== ${table.toUpperCase()} ===`)
      console.log(`  Exception: ${err.message}`)
    }
  }
}

getSchema()
