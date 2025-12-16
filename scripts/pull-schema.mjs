#!/usr/bin/env node
/**
 * Pull Database Schema from Supabase
 * 
 * This script queries the Supabase database to get all table schemas
 * and generates comprehensive documentation.
 * 
 * Usage: node scripts/pull-schema.mjs
 * 
 * Outputs: docs/DATABASE-SCHEMA.md
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

console.log('🔍 Pulling database schema from Supabase...\n')

// We'll use the sampling approach since information_schema isn't accessible via Supabase client
let schemaData = []

// Sample each known table to infer schema
async function sampleAllTables() {
  const knownTables = [
    'contacts', 'projects', 'proposals', 'proposal_line_items',
    'audits', 'files', 'messages', 'invoices', 'invoice_items',
    'notifications', 'activities', 'blog_posts', 'portfolio_items',
    'campaigns', 'campaign_leads', 'app_secrets', 'email_tracking',
    'call_logs', 'call_tasks', 'call_topics', 'call_follow_ups',
    'call_contact_extractions', 'email_templates', 'crm_activities',
    'known_visitors', 'known_visitor_activity', 'lead_scores', 'smart_notifications'
  ]
  
  for (const tableName of knownTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (!error) {
        const columns = data && data[0] 
          ? Object.entries(data[0]).map(([name, value]) => ({
              column_name: name,
              data_type: inferType(value),
              is_nullable: 'YES', // Can't determine from sample
              column_default: null
            }))
          : []
        
        schemaData.push({
          table_name: tableName,
          columns,
          sampled: true,
          row_count: data && data.length > 0 ? 'has data' : 'empty'
        })
        console.log(`  ✓ ${tableName} (${columns.length} columns)`)
      } else {
        console.log(`  ✗ ${tableName} - ${error.message}`)
      }
    } catch (e) {
      console.log(`  ✗ ${tableName} - ${e.message}`)
    }
  }
}

function inferType(value) {
  if (value === null) return 'unknown (null)'
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'timestamp'
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid'
    return 'text'
  }
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'numeric'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'object') return 'jsonb'
  return typeof value
}

// If we still have no data, do the sampling approach
await sampleAllTables()

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

// Add relationships section placeholder
markdown += `---

## Relationships

Key foreign key relationships:

- \`projects.contact_id\` → \`contacts.id\`
- \`proposals.contact_id\` → \`contacts.id\`
- \`proposals.project_id\` → \`projects.id\`
- \`proposal_line_items.proposal_id\` → \`proposals.id\`
- \`audits.contact_id\` → \`contacts.id\`
- \`files.contact_id\` → \`contacts.id\`
- \`messages.contact_id\` → \`contacts.id\`
- \`invoices.contact_id\` → \`contacts.id\`
- \`invoices.project_id\` → \`projects.id\`
- \`invoice_items.invoice_id\` → \`invoices.id\`
- \`call_logs.contact_id\` → \`contacts.id\`
- \`call_tasks.call_log_id\` → \`call_logs.id\`
- \`call_topics.call_log_id\` → \`call_logs.id\`
- \`call_follow_ups.call_log_id\` → \`call_logs.id\`
- \`email_tracking.contact_id\` → \`contacts.id\`

---

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
