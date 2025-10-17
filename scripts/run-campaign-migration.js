// scripts/run-campaign-migration.js
import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

async function main() {
  console.log('🔄 Connecting to database...')
  const sql = neon(DATABASE_URL)

  // Read the campaign migration file
  const migrationPath = path.join(__dirname, '..', 'drizzle', '0004_campaigns_only.sql')
  console.log('📖 Reading migration file:', migrationPath)
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
  
  console.log('🔄 Executing campaign tables migration...')
  
  // Split into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`  Found ${statements.length} statements to execute`)
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    try {
      console.log(`  [${i + 1}/${statements.length}] Executing...`)
      await sql.query(statement + ';')
    } catch (err) {
      if (err.message?.includes('already exists')) {
        console.log(`  ⚠️  Skipped (already exists)`)
      } else {
        console.error(`  ❌ Error:`, err.message)
        throw err
      }
    }
  }
  
  console.log('✅ Campaign tables created successfully!')

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
