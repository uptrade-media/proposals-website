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
    // Core CRM tables
    'contacts', 'projects', 'proposals', 'proposal_line_items',
    'audits', 'files', 'messages', 'invoices', 'blog_posts', 'portfolio_items',
    'campaigns', 'app_secrets',
    
    // Organization hierarchy
    'organizations', 'organization_members', 'user_organizations', 'super_admins',
    'organization_secrets', 'org_access_logs', 'project_members',
    
    // Project management
    'project_activities', 'project_milestones', 'project_checklist_items',
    
    // Call tracking
    'call_logs', 'call_tasks', 'call_topics', 'call_follow_ups', 'call_contact_extractions',
    
    // Email marketing
    'email_tracking', 'email_templates', 'email_campaigns', 'email_campaign_sends',
    'email_campaign_lists', 'email_lists', 'email_list_subscribers', 'email_subscribers',
    'email_automations', 'email_automation_steps', 'email_automation_enrollments',
    'email_forms', 'email_unsubscribes', 'tenant_email_settings',
    
    // Lead management
    'known_visitors', 'known_visitor_activity', 'lead_scores', 'lead_assignments',
    'contact_activities', 'scheduled_followups',
    
    // Signal AI
    'signal_actions', 'signal_audit_log', 'signal_conversations', 'signal_memory',
    'signal_messages', 'signal_patterns', 'signal_skills',
    
    // SEO module - core
    'seo_sites', 'seo_pages', 'seo_queries', 'seo_competitors', 'seo_tasks',
    'seo_crawl_log', 'seo_opportunities', 'seo_page_history',
    
    // SEO module - AI
    'seo_ai_runs', 'seo_ai_recommendations', 'seo_ai_recommendation_outcomes',
    'seo_ai_assistants', 'seo_ai_threads', 'seo_ai_thread_messages',
    'seo_ai_analysis_runs', 'seo_ai_learning_patterns', 'seo_ai_wins_knowledge',
    
    // SEO module - features
    'seo_keyword_universe', 'seo_topic_clusters', 'seo_content_briefs',
    'seo_content_gaps', 'seo_content_decay', 'seo_cannibalization',
    'seo_backlink_opportunities', 'seo_competitor_analysis', 'seo_internal_links',
    'seo_local_analysis', 'seo_schema_markup', 'seo_serp_features',
    'seo_technical_audits', 'seo_title_tests', 'seo_pagespeed_impact',
    'seo_predictive_scores', 'seo_not_indexed_urls', 'seo_alerts',
    'seo_knowledge_base', 'seo_schedules', 'seo_scheduled_runs', 'seo_background_jobs',
    
    // Shopify / Ecommerce
    'shopify_stores', 'shopify_products', 'shopify_variants', 'shopify_orders',
    'shopify_locations', 'shopify_inventory_levels', 'shopify_sync_log',
    
    // Analytics
    'analytics_events', 'analytics_page_views', 'analytics_sessions', 'analytics_scroll_depth',
    
    // Misc
    'smart_notifications', 'team_metrics', 'blog_generation_jobs'
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
