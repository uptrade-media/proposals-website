#!/usr/bin/env node

/**
 * Setup CMC Organization and Project in Portal
 * 
 * Creates the organization, project, and admin user for Cincy Mahjong Club
 * in the Uptrade Portal database.
 * 
 * Usage:
 *   PORTAL_SUPABASE_URL=xxx PORTAL_SUPABASE_SERVICE_KEY=xxx \
 *   node scripts/setup-cmc-org.mjs
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const PORTAL_SUPABASE_URL = process.env.PORTAL_SUPABASE_URL
const PORTAL_SUPABASE_SERVICE_KEY = process.env.PORTAL_SUPABASE_SERVICE_KEY

if (!PORTAL_SUPABASE_URL || !PORTAL_SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('   PORTAL_SUPABASE_URL and PORTAL_SUPABASE_SERVICE_KEY are required')
  process.exit(1)
}

const supabase = createClient(PORTAL_SUPABASE_URL, PORTAL_SUPABASE_SERVICE_KEY)

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('🚀 Setting up CMC in Uptrade Portal...')
  console.log('═══════════════════════════════════════════')
  
  // ============================================================================
  // 1. Check if organization already exists
  // ============================================================================
  console.log('\n📦 Checking for existing organization...')
  
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', 'cincy-mahjong-club')
    .single()
  
  let orgId
  
  if (existingOrg) {
    console.log(`   ✅ Organization already exists: ${existingOrg.name} (${existingOrg.id})`)
    orgId = existingOrg.id
  } else {
    // Create organization
    console.log('\n📦 Creating organization...')
    
    orgId = crypto.randomUUID()
    
    const { error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: orgId,
        slug: 'cincy-mahjong-club',
        name: 'Cincy Mahjong Club',
        domain: 'cincymahjongclub.com',
        org_type: 'client',
        status: 'active',
        features: {
          analytics: true,
          seo: true,
          engage: true,
          commerce: true,
          blog: true,
          email: true,
          signal: true,
        },
        theme: {
          primary_color: '#dc2626', // Red for mahjong tiles
          secondary_color: '#fef3c7',
        },
      })
    
    if (orgError) {
      console.error('   ❌ Failed to create organization:', orgError.message)
      process.exit(1)
    }
    
    console.log(`   ✅ Organization created: ${orgId}`)
  }
  
  // ============================================================================
  // 2. Check if project already exists
  // ============================================================================
  console.log('\n📦 Checking for existing project...')
  
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id, title')
    .eq('org_id', orgId)
    .eq('domain', 'cincymahjongclub.com')
    .single()
  
  let projectId
  
  if (existingProject) {
    console.log(`   ✅ Project already exists: ${existingProject.title} (${existingProject.id})`)
    projectId = existingProject.id
  } else {
    // Create project
    console.log('\n📦 Creating project...')
    
    projectId = crypto.randomUUID()
    
    const { error: projectError } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        org_id: orgId,
        title: 'Cincy Mahjong Club Website',
        description: 'Community mahjong club website with events, blog, and member management',
        domain: 'cincymahjongclub.com',
        status: 'active',
        features: {
          analytics: true,
          seo: true,
          engage: true,
          commerce: { enabled_types: ['event'] },
          blog: true,
          email: true,
        },
        settings: {
          timezone: 'America/New_York',
          currency: 'USD',
          commerce: {
            enabled_types: ['event'],
            payment_providers: [],
          },
        },
        brand_primary: '#dc2626',
      })
    
    if (projectError) {
      console.error('   ❌ Failed to create project:', projectError.message)
      process.exit(1)
    }
    
    console.log(`   ✅ Project created: ${projectId}`)
  }
  
  // ============================================================================
  // 3. Check if admin contact exists
  // ============================================================================
  console.log('\n📦 Checking for admin contact...')
  
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id, name, email')
    .eq('org_id', orgId)
    .eq('email', 'cincymahjongclub@gmail.com')
    .single()
  
  let contactId
  
  if (existingContact) {
    console.log(`   ✅ Contact already exists: ${existingContact.name} (${existingContact.id})`)
    contactId = existingContact.id
  } else {
    // Create admin contact
    console.log('\n📦 Creating admin contact...')
    
    contactId = crypto.randomUUID()
    
    const { error: contactError } = await supabase
      .from('contacts')
      .insert({
        id: contactId,
        org_id: orgId,
        email: 'cincymahjongclub@gmail.com',
        name: 'Christi Nogueira',
        role: 'admin',
        contact_type: 'client',
        is_team_member: false,
        source: 'migration',
      })
    
    if (contactError) {
      console.error('   ❌ Failed to create contact:', contactError.message)
      // Don't exit - contact might already exist with different query
    } else {
      console.log(`   ✅ Contact created: ${contactId}`)
    }
  }
  
  // ============================================================================
  // 4. Add to organization_members
  // ============================================================================
  console.log('\n📦 Checking organization membership...')
  
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('contact_id', contactId)
    .single()
  
  if (existingMember) {
    console.log('   ✅ Organization membership already exists')
  } else if (contactId) {
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        contact_id: contactId,
        role: 'admin',
        access_level: 'admin',
      })
    
    if (memberError) {
      console.error('   ⚠️  Failed to add organization membership:', memberError.message)
    } else {
      console.log('   ✅ Organization membership created')
    }
  }
  
  // ============================================================================
  // Summary
  // ============================================================================
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('✅ CMC SETUP COMPLETE')
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('📋 Environment variables for import script:')
  console.log('')
  console.log(`   CMC_ORG_ID=${orgId}`)
  console.log(`   CMC_PROJECT_ID=${projectId}`)
  console.log('')
  console.log('📋 Environment variables for Site-Kit:')
  console.log('')
  console.log(`   UPTRADE_PROJECT_ID=${projectId}`)
  console.log(`   NEXT_PUBLIC_SUPABASE_URL=${PORTAL_SUPABASE_URL}`)
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>')
  console.log('')
  console.log('Next steps:')
  console.log('   1. Run export-cmc-data.mjs to export CMC data')
  console.log('   2. Run import-to-portal.mjs with the above env vars')
  console.log('   3. Install @uptrade/site-kit in CMC project')
  console.log('')
}

main().catch(console.error)
