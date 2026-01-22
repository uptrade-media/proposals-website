#!/usr/bin/env node

/**
 * CMC Data Export Script
 * 
 * Exports all data from Cincy Mahjong Club's database
 * to JSON files for migration to Uptrade Portal.
 * 
 * Supports both Supabase and direct Postgres connections.
 * 
 * Usage (Supabase):
 *   CMC_SUPABASE_URL=xxx CMC_SUPABASE_SERVICE_KEY=xxx node scripts/export-cmc-data.mjs
 * 
 * Usage (Direct Postgres/Neon):
 *   CMC_DATABASE_URL=postgresql://user:pass@host/db node scripts/export-cmc-data.mjs
 */

import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

// Database credentials - supports Supabase or direct Postgres
const CMC_SUPABASE_URL = process.env.CMC_SUPABASE_URL
const CMC_SUPABASE_SERVICE_KEY = process.env.CMC_SUPABASE_SERVICE_KEY
const CMC_DATABASE_URL = process.env.CMC_DATABASE_URL

let dbClient = null
let useSupabase = false

if (CMC_SUPABASE_URL && CMC_SUPABASE_SERVICE_KEY) {
  console.log('📡 Using Supabase connection')
  dbClient = createClient(CMC_SUPABASE_URL, CMC_SUPABASE_SERVICE_KEY)
  useSupabase = true
} else if (CMC_DATABASE_URL) {
  console.log('📡 Using direct Postgres connection')
  dbClient = postgres(CMC_DATABASE_URL)
  useSupabase = false
} else {
  console.error('❌ Missing environment variables:')
  console.error('   Either CMC_SUPABASE_URL + CMC_SUPABASE_SERVICE_KEY')
  console.error('   Or CMC_DATABASE_URL is required')
  process.exit(1)
}

// Supabase client reference for compatibility
const supabase = useSupabase ? dbClient : null

// Tables to export
const TABLES = [
  // Admin/Auth
  'admin_users',
  
  // Analytics
  'sessions',
  'page_views',
  'events',
  'active_sessions',
  'form_abandonment',
  'frustration_events',
  'video_engagement',
  'user_journeys',
  'ai_insights',
  
  // Content
  'blog_categories',
  'blog_posts',
  
  // Calendar Events (CMC uses events_management table)
  'events_management',
  
  // Registrations
  'event_registrations',
  
  // Leads/CRM
  'leads',
  'valuations',
  
  // Email
  'email_templates',
  'recipients',
  'recipient_lists',
  'recipient_list_members',
  'email_campaigns',
  'email_send_history',
  
  // Payments
  'payment_transactions',
  'payment_refunds',
  
  // Settings
  'settings',
  
  // Media
  'media',
]

async function checkTableExistsSupabase(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    return !error
  } catch {
    return false
  }
}

async function checkTableExistsPostgres(tableName) {
  try {
    const result = await dbClient`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists
    `
    return result[0]?.exists || false
  } catch {
    return false
  }
}

async function checkTableExists(tableName) {
  return useSupabase 
    ? checkTableExistsSupabase(tableName) 
    : checkTableExistsPostgres(tableName)
}

async function exportTableSupabase(tableName) {
  // Get total count first
  const { count: totalCount, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    return { error: countError.message, data: [] }
  }
  
  // Fetch all data (paginated if necessary)
  const allData = []
  const pageSize = 1000
  let offset = 0
  
  while (offset < totalCount) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + pageSize - 1)
    
    if (error) {
      return { error: error.message, data: allData }
    }
    
    allData.push(...data)
    offset += pageSize
    
    if (totalCount > pageSize) {
      process.stdout.write(`   📊 Fetched ${allData.length}/${totalCount}\r`)
    }
  }
  
  return { data: allData }
}

async function exportTablePostgres(tableName) {
  try {
    // Use unsafe for table name since postgres lib doesn't allow dynamic table names in template
    const data = await dbClient.unsafe(`SELECT * FROM "${tableName}"`)
    return { data }
  } catch (error) {
    return { error: error.message, data: [] }
  }
}

async function exportTable(tableName) {
  console.log(`📦 Exporting ${tableName}...`)
  
  const exists = await checkTableExists(tableName)
  if (!exists) {
    console.log(`   ⚠️  Table ${tableName} does not exist, skipping`)
    return { table: tableName, exists: false, data: [], count: 0 }
  }
  
  // Export based on connection type
  const result = useSupabase 
    ? await exportTableSupabase(tableName)
    : await exportTablePostgres(tableName)
  
  if (result.error) {
    console.error(`   ❌ Error exporting ${tableName}:`, result.error)
    return { table: tableName, exists: true, data: [], count: 0, error: result.error }
  }
  
  console.log(`   ✅ Exported ${result.data.length} rows`)
  return { table: tableName, exists: true, data: result.data, count: result.data.length }
}

async function main() {
  console.log('🚀 CMC Data Export Starting...')
  console.log(`   Connection: ${useSupabase ? 'Supabase' : 'Postgres'}`)
  console.log('')
  
  // Create exports directory
  const exportDir = path.join(process.cwd(), 'exports')
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }
  
  const results = {}
  const summary = {
    timestamp: new Date().toISOString(),
    tables: {},
    totalRows: 0,
    errors: [],
  }
  
  // Export each table
  for (const table of TABLES) {
    const result = await exportTable(table)
    results[table] = result.data
    summary.tables[table] = {
      exists: result.exists,
      count: result.count,
      error: result.error,
    }
    summary.totalRows += result.count
    
    if (result.error) {
      summary.errors.push({ table, error: result.error })
    }
  }
  
  // Write individual table exports
  for (const [table, data] of Object.entries(results)) {
    if (data && data.length > 0) {
      const filePath = path.join(exportDir, `${table}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log(`   📁 Saved ${filePath}`)
    }
  }
  
  // Write combined export
  const combinedPath = path.join(exportDir, 'cmc-complete-export.json')
  fs.writeFileSync(combinedPath, JSON.stringify(results, null, 2))
  console.log(`   📁 Saved ${combinedPath}`)
  
  // Write summary
  const summaryPath = path.join(exportDir, 'export-summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
  console.log(`   📁 Saved ${summaryPath}`)
  
  // Print summary
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('📊 EXPORT SUMMARY')
  console.log('═══════════════════════════════════════════')
  console.log(`   Timestamp: ${summary.timestamp}`)
  console.log(`   Total Rows: ${summary.totalRows}`)
  console.log('')
  console.log('   Tables:')
  for (const [table, info] of Object.entries(summary.tables)) {
    if (!info.exists) {
      console.log(`      ⚪ ${table}: does not exist`)
    } else if (info.error) {
      console.log(`      ❌ ${table}: error - ${info.error}`)
    } else {
      console.log(`      ✅ ${table}: ${info.count} rows`)
    }
  }
  
  if (summary.errors.length > 0) {
    console.log('')
    console.log('   ⚠️  Errors:')
    for (const { table, error } of summary.errors) {
      console.log(`      - ${table}: ${error}`)
    }
  }
  
  console.log('')
  console.log('✅ Export complete!')
  console.log(`   Files saved to: ${exportDir}`)
  
  // Cleanup postgres connection
  if (!useSupabase && dbClient) {
    await dbClient.end()
  }
}

main().catch(console.error)
