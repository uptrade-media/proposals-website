import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', url ? url.substring(0, 30) + '...' : 'MISSING')
console.log('Key exists:', !!key)

if (!url || !key) {
  console.log('Cannot connect - missing credentials')
  process.exit(1)
}

const supabase = createClient(url, key)

// Query to get table columns from a sample row
const { data, error } = await supabase
  .from('audits')
  .select('*')
  .limit(1)

if (error) {
  console.log('Error:', error.message)
  process.exit(1)
}

if (data && data[0]) {
  console.log('\nAudits table columns:')
  const columns = Object.keys(data[0]).sort()
  columns.forEach(col => {
    const value = data[0][col]
    const type = value === null ? 'null' : typeof value
    console.log(`  ${col}: ${type}`)
  })
} else {
  console.log('No data found in audits table')
}
