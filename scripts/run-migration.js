// scripts/run-migration.js
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import * as schema from '../src/db/schema.js'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

async function main() {
  console.log('🔄 Connecting to database...')
  const sql = neon(DATABASE_URL)
  const db = drizzle(sql, { schema })

  console.log('🔄 Running migrations...')
  await migrate(db, { migrationsFolder: './drizzle' })

  console.log('✅ Migrations completed successfully!')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
