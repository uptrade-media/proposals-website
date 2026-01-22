#!/usr/bin/env node
/**
 * Pull Database Schema from Supabase
 * 
 * This script queries the actual PostgreSQL information_schema to get
 * real column definitions, foreign keys, and constraints.
 * 
 * Usage: node scripts/pull-schema.mjs
 * 
 * Outputs: docs/DATABASE-SCHEMA.md
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ path: '.env.local' })
dotenv.config()

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbUrl = process.env.DATABASE_URL

if (!url || !key) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('🔍 Pulling REAL database schema from Supabase...\n')

let schemaData = []
let foreignKeys = []
let tableList = []

// Try to use direct PostgreSQL connection for accurate schema
async function pullSchemaViaPg() {
  if (!dbUrl) {
    console.log('⚠️  No DATABASE_URL found, falling back to Supabase client method\n')
    return false
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  
  try {
    await client.connect()
    console.log('✓ Connected to PostgreSQL directly\n')

    // Get all tables in public schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    tableList = tablesResult.rows.map(r => r.table_name)
    console.log(`Found ${tableList.length} tables\n`)

    // Get all columns with full metadata
    const columnsResult = await client.query(`
      SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.ordinal_position
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `)

    // Group columns by table
    const tableColumns = {}
    for (const col of columnsResult.rows) {
      if (!tableColumns[col.table_name]) {
        tableColumns[col.table_name] = []
      }
      tableColumns[col.table_name].push(col)
    }

    // Get foreign key constraints
    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `)
    foreignKeys = fkResult.rows

    // Build schema data
    for (const tableName of tableList) {
      schemaData.push({
        table_name: tableName,
        columns: tableColumns[tableName] || [],
        sampled: false
      })
      console.log(`  ✓ ${tableName} (${(tableColumns[tableName] || []).length} columns)`)
    }

    await client.end()
    return true
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message)
    console.log('Falling back to Supabase client method\n')
    try { await client.end() } catch {}
    return false
  }
}

// Fallback: Use Supabase RPC to query information_schema
async function pullSchemaViaSupabase() {
  const supabase = createClient(url, key)
  
  // First, try to call an RPC function if it exists
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_schema')
  
  if (!rpcError && rpcData) {
    console.log('✓ Got schema via RPC function\n')
    schemaData = rpcData.tables || []
    foreignKeys = rpcData.foreign_keys || []
    return true
  }

  // Try to get table list dynamically via RPC
  console.log('Discovering tables dynamically...\n')
  
  const { data: tablesData, error: tablesError } = await supabase.rpc('get_public_tables')
  
  let tablesToQuery = []
  
  if (!tablesError && tablesData && tablesData.length > 0) {
    tablesToQuery = tablesData.map(t => t.table_name)
    console.log(`Found ${tablesToQuery.length} tables via RPC\n`)
  } else {
    // Ultimate fallback: hardcoded list (should rarely be needed)
    console.log('RPC not available, using known tables list...\n')
    tablesToQuery = [
      'contacts', 'projects', 'proposals', 'proposal_line_items',
      'audits', 'files', 'messages', 'invoices', 'blog_posts', 'portfolio_items',
      'organizations', 'organization_members', 'organization_secrets', 'org_access_logs',
      'project_activities', 'project_milestones', 'project_checklist_items', 'project_members',
      'call_logs', 'call_tasks', 'call_topics', 'call_follow_ups', 'call_contact_extractions',
      'email_tracking', 'email_templates',
      'known_visitors', 'known_visitor_activity', 'lead_scores', 'lead_assignments',
      'contact_activities', 'activity_log',
      'signal_actions', 'signal_audit_log', 'signal_conversations', 'signal_memory',
      'signal_messages', 'signal_patterns', 'signal_skills', 'signal_knowledge', 'signal_faqs',
      'seo_sites', 'seo_pages', 'seo_queries', 'seo_competitors', 'seo_tasks',
      'seo_crawl_log', 'seo_opportunities', 'seo_page_history',
      'seo_ai_runs', 'seo_ai_recommendations', 'seo_ai_recommendation_outcomes',
      'seo_ai_assistants', 'seo_ai_threads', 'seo_ai_thread_messages',
      'analytics_events', 'analytics_page_views', 'analytics_sessions', 'analytics_scroll_depth',
      'engage_elements', 'engage_element_events', 'engage_element_variants',
      'engage_chat_config', 'engage_chat_sessions', 'engage_chat_messages',
      'smart_notifications', 'team_metrics', 'blog_generation_jobs',
      'shopify_stores', 'shopify_products', 'shopify_variants', 'shopify_orders',
      'commerce_categories', 'commerce_offerings', 'commerce_variants', 'commerce_schedules',
      'commerce_settings', 'commerce_sales', 'customers',
      'managed_forms', 'form_analytics', 'form_submissions',
      'app_secrets', 'super_admins', 'user_organizations', 'campaigns'
    ]
  }

  for (const tableName of tablesToQuery) {
    try {
      // Use limit(0) with head:true to just get column info without data
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (!error) {
        // Get column names from the response structure
        // Even with empty data, Supabase returns the structure
        let columns = []
        if (data && data[0]) {
          columns = Object.keys(data[0]).map(name => ({
            column_name: name,
            data_type: inferType(data[0][name]),
            is_nullable: 'YES',
            column_default: null
          }))
        }
        
        schemaData.push({
          table_name: tableName,
          columns,
          sampled: true
        })
        tableList.push(tableName)
        console.log(`  ✓ ${tableName} (${columns.length} columns)`)
      }
    } catch (e) {
      // Table doesn't exist, skip it
    }
  }
  
  return true
}

function inferType(value) {
  if (value === null || value === undefined) return 'unknown'
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'timestamptz'
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid'
    return 'text'
  }
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'numeric'
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) return 'jsonb'
  if (typeof value === 'object') return 'jsonb'
  return typeof value
}

// Try PostgreSQL first, then fall back to Supabase
const usedPg = await pullSchemaViaPg()
if (!usedPg) {
  await pullSchemaViaSupabase()
}

// Generate markdown documentation
const now = new Date().toISOString().split('T')[0]
let markdown = `# Database Schema Documentation

> **Auto-generated on ${now}** by \`scripts/pull-schema.mjs\`  
> Run \`pnpm pull-schema\` to update this documentation after migrations.

## Overview

This document contains the complete schema for all tables in the Supabase PostgreSQL database used by the Uptrade Portal.

---

## Tables

`

// Group tables by category
const categories = {
  'Core': ['contacts', 'projects', 'proposals', 'proposal_line_items'],
  'Files & Media': ['files', 'audits'],
  'Communication': ['messages', 'notifications', 'email_tracking'],
  'Billing': ['invoices', 'invoice_items'],
  'CRM & Calls': ['call_logs', 'call_tasks', 'call_topics', 'call_follow_ups', 'call_contact_extractions', 'campaigns', 'campaign_leads'],
  'Content': ['blog_posts', 'portfolio_items'],
  'System': ['activities', 'app_secrets']
}

// Organize schema data by table name
const tableMap = {}
for (const item of schemaData) {
  if (item.table_name) {
    if (!tableMap[item.table_name]) {
      tableMap[item.table_name] = { columns: [] }
    }
    if (item.columns) {
      tableMap[item.table_name].columns = item.columns
    } else if (item.column_name) {
      tableMap[item.table_name].columns.push(item)
    }
    if (item.sampled) tableMap[item.table_name].sampled = true
    if (item.row_count) tableMap[item.table_name].row_count = item.row_count
  }
}

// Sort tables alphabetically
const sortedTables = Object.keys(tableMap).sort()

// Generate table of contents
markdown += `### Table of Contents\n\n`
for (const tableName of sortedTables) {
  markdown += `- [\`${tableName}\`](#${tableName})\n`
}
markdown += `\n---\n\n`

// Generate detailed documentation for each table
for (const tableName of sortedTables) {
  const table = tableMap[tableName]
  const columns = table.columns || []
  
  markdown += `### \`${tableName}\`\n\n`
  
  if (table.sampled) {
    markdown += `> ⚠️ Schema inferred from sample data\n\n`
  }
  
  if (columns.length === 0) {
    markdown += `_No columns found or table is empty_\n\n`
  } else {
    markdown += `| Column | Type | Nullable | Default |\n`
    markdown += `|--------|------|----------|--------|\n`
    
    for (const col of columns) {
      const name = col.column_name || col.name
      const type = col.data_type || col.udt_name || 'unknown'
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗'
      const defaultVal = col.column_default 
        ? `\`${col.column_default.substring(0, 30)}${col.column_default.length > 30 ? '...' : ''}\``
        : '-'
      
      markdown += `| \`${name}\` | ${type} | ${nullable} | ${defaultVal} |\n`
    }
  }
  
  markdown += `\n`
}

// Add relationships section with actual FK data
markdown += `---

## Foreign Key Relationships

`

if (foreignKeys.length > 0) {
  // Group FK by table
  const fkByTable = {}
  for (const fk of foreignKeys) {
    if (!fkByTable[fk.table_name]) {
      fkByTable[fk.table_name] = []
    }
    fkByTable[fk.table_name].push(fk)
  }
  
  markdown += `| Table | Column | FK Constraint Name | References |\n`
  markdown += `|-------|--------|-------------------|------------|\n`
  
  for (const tableName of Object.keys(fkByTable).sort()) {
    for (const fk of fkByTable[tableName]) {
      markdown += `| \`${fk.table_name}\` | \`${fk.column_name}\` | \`${fk.constraint_name}\` | \`${fk.foreign_table_name}.${fk.foreign_column_name}\` |\n`
    }
  }
  
  markdown += `\n**Total: ${foreignKeys.length} foreign keys**\n`
} else {
  markdown += `> Foreign key relationships could not be retrieved. Using PostgreSQL direct connection is required for full FK info.\n\n`
  markdown += `Key relationships (inferred):\n\n`
  markdown += `- \`projects.contact_id\` → \`contacts.id\`\n`
  markdown += `- \`proposals.contact_id\` → \`contacts.id\`\n`
  markdown += `- \`proposals.project_id\` → \`projects.id\`\n`
  markdown += `- \`audits.contact_id\` → \`contacts.id\`\n`
  markdown += `- \`invoices.contact_id\` → \`contacts.id\`\n`
  markdown += `- \`messages.sender_id\` → \`contacts.id\`\n`
}

markdown += `\n---

## Notes

- All tables use \`uuid\` primary keys with \`gen_random_uuid()\` default
- Timestamps use \`timestamp with time zone\` (timestamptz)
- JSON data uses \`jsonb\` type for efficient querying
- Row Level Security (RLS) is enabled on sensitive tables

---

## Migration History

Run migrations via Supabase Dashboard SQL Editor. After running migrations, update this doc:

\`\`\`bash
pnpm pull-schema
\`\`\`
`

// Write to docs folder
const outputPath = './docs/DATABASE-SCHEMA.md'
writeFileSync(outputPath, markdown)

console.log(`\n✅ Schema documentation written to ${outputPath}`)
console.log(`   Found ${sortedTables.length} tables`)
