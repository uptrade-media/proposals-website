#!/usr/bin/env node

/**
 * Verify CMC Migration
 * 
 * Checks that all CMC data was properly migrated to Portal.
 * 
 * Usage:
 *   PORTAL_SUPABASE_URL=xxx PORTAL_SUPABASE_SERVICE_KEY=xxx \
 *   CMC_PROJECT_ID=xxx \
 *   node scripts/verify-migration.mjs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const PORTAL_SUPABASE_URL = process.env.PORTAL_SUPABASE_URL
const PORTAL_SUPABASE_SERVICE_KEY = process.env.PORTAL_SUPABASE_SERVICE_KEY
const CMC_PROJECT_ID = process.env.CMC_PROJECT_ID

if (!PORTAL_SUPABASE_URL || !PORTAL_SUPABASE_SERVICE_KEY || !CMC_PROJECT_ID) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(PORTAL_SUPABASE_URL, PORTAL_SUPABASE_SERVICE_KEY)

async function getPortalCounts() {
  const tables = [
    { name: 'analytics_sessions', filter: 'project_id' },
    { name: 'analytics_page_views', filter: 'project_id' },
    { name: 'analytics_events', filter: 'project_id' },
    { name: 'blog_posts', filter: 'project_id' },
    { name: 'prospects', filter: 'project_id' },
    { name: 'contacts', filter: 'org_id', needsOrgId: true },
    { name: 'commerce_offerings', filter: 'project_id' },
    { name: 'commerce_sales', filter: 'project_id' },
  ]
  
  const counts = {}
  
  // Get org_id from project
  const { data: project } = await supabase
    .from('projects')
    .select('org_id')
    .eq('id', CMC_PROJECT_ID)
    .single()
  
  const orgId = project?.org_id
  
  for (const table of tables) {
    const filterId = table.needsOrgId ? orgId : CMC_PROJECT_ID
    
    const { count, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true })
      .eq(table.filter, filterId)
    
    if (error) {
      counts[table.name] = { count: 0, error: error.message }
    } else {
      counts[table.name] = { count }
    }
  }
  
  return counts
}

function getExportCounts() {
  const summaryPath = path.join(process.cwd(), 'exports', 'export-summary.json')
  if (!fs.existsSync(summaryPath)) {
    return null
  }
  
  return JSON.parse(fs.readFileSync(summaryPath, 'utf-8')).tables
}

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('🔍 CMC Migration Verification')
  console.log('═══════════════════════════════════════════')
  console.log(`   Project ID: ${CMC_PROJECT_ID}`)
  console.log('')
  
  // Get export counts (source)
  const exportCounts = getExportCounts()
  
  // Get portal counts (destination)
  console.log('📊 Fetching Portal counts...')
  const portalCounts = await getPortalCounts()
  
  // Compare
  console.log('')
  console.log('┌─────────────────────────┬───────────┬───────────┬─────────┐')
  console.log('│ Table                   │ Exported  │ Imported  │ Status  │')
  console.log('├─────────────────────────┼───────────┼───────────┼─────────┤')
  
  const mappings = [
    { source: 'sessions', dest: 'analytics_sessions' },
    { source: 'page_views', dest: 'analytics_page_views' },
    { source: 'events', dest: 'analytics_events' }, // Partial - analytics events only
    { source: 'blog_posts', dest: 'blog_posts' },
    { source: 'leads', dest: 'prospects' },
    { source: 'recipients', dest: 'contacts' },
    { source: 'events', dest: 'commerce_offerings' }, // Calendar events
    { source: 'event_registrations', dest: 'commerce_sales' },
  ]
  
  let allGood = true
  
  for (const { source, dest } of mappings) {
    const exported = exportCounts?.[source]?.count || 0
    const imported = portalCounts[dest]?.count || 0
    
    // Determine status
    let status = '✅'
    if (imported === 0 && exported > 0) {
      status = '❌'
      allGood = false
    } else if (imported < exported * 0.9 && dest !== 'analytics_events') {
      // Allow some variance for analytics events (they split)
      status = '⚠️ '
    }
    
    console.log(
      `│ ${dest.padEnd(23)} │ ${String(exported).padStart(9)} │ ${String(imported).padStart(9)} │ ${status}      │`
    )
  }
  
  console.log('└─────────────────────────┴───────────┴───────────┴─────────┘')
  
  // Sample data check
  console.log('')
  console.log('📋 Sample Data Check:')
  console.log('')
  
  // Check a blog post
  const { data: blogPost } = await supabase
    .from('blog_posts')
    .select('title, slug, status')
    .eq('project_id', CMC_PROJECT_ID)
    .limit(1)
    .single()
  
  if (blogPost) {
    console.log(`   📝 Blog Post: "${blogPost.title}" (${blogPost.status})`)
  } else {
    console.log('   📝 Blog Post: None found')
  }
  
  // Check an event
  const { data: offering } = await supabase
    .from('commerce_offerings')
    .select('name, type, status')
    .eq('project_id', CMC_PROJECT_ID)
    .eq('type', 'event')
    .limit(1)
    .single()
  
  if (offering) {
    console.log(`   🎉 Event: "${offering.name}" (${offering.status})`)
  } else {
    console.log('   🎉 Event: None found')
  }
  
  // Check a prospect
  const { data: prospect } = await supabase
    .from('prospects')
    .select('name, email, pipeline_stage')
    .eq('project_id', CMC_PROJECT_ID)
    .limit(1)
    .single()
  
  if (prospect) {
    console.log(`   👤 Prospect: ${prospect.name} (${prospect.pipeline_stage})`)
  } else {
    console.log('   👤 Prospect: None found')
  }
  
  console.log('')
  if (allGood) {
    console.log('✅ Migration verification passed!')
  } else {
    console.log('⚠️  Some data may not have migrated correctly. Please review.')
  }
}

main().catch(console.error)
