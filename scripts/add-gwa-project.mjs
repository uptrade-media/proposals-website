#!/usr/bin/env node
/**
 * Add GWA Project and Contact to Portal
 * 
 * Run: node scripts/add-gwa-project.mjs
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// GWA Configuration
const GWA_ORG_ID = 'bfa1aa3d-9807-4ba4-baaa-4d7ca04958fb' // From setup-gwa-tenant.mjs run
const GWA_EMAIL = 'info@godsworkoutapparel.com'
const GWA_URL = 'https://godsworkoutapparel.com'

async function addGWAProjectAndContact() {
  console.log('\n🏋️ Adding GWA Project and Contact to Portal...\n')

  try {
    // 1. Check if organization exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', GWA_ORG_ID)
      .single()

    if (orgError || !org) {
      console.error('❌ GWA organization not found. Run setup-gwa-tenant.mjs first.')
      process.exit(1)
    }

    console.log(`✅ Found organization: ${org.name}`)

    // 2. Create or update contact in main public.contacts table
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, email, org_id')
      .eq('email', GWA_EMAIL)
      .single()

    let contact
    if (existingContact) {
      // Update existing contact to associate with GWA org
      const { data: updatedContact, error: updateError } = await supabase
        .from('contacts')
        .update({
          org_id: GWA_ORG_ID,
          name: "God's Workout Apparel",
          company: "God's Workout Apparel",
          role: 'client',
          website: GWA_URL,
          account_setup: 'true',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingContact.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Failed to update contact:', updateError.message)
      } else {
        contact = updatedContact
        console.log(`✅ Updated existing contact: ${contact.email}`)
      }
    } else {
      // Create new contact
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          email: GWA_EMAIL,
          name: "God's Workout Apparel",
          company: "God's Workout Apparel",
          role: 'client',
          org_id: GWA_ORG_ID,
          website: GWA_URL,
          account_setup: 'true',
          source: 'manual',
          pipeline_stage: 'closed_won',  // valid: new_lead, contacted, qualified, proposal_sent, negotiating, closed_won, closed_lost
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Failed to create contact:', createError.message)
        throw createError
      }
      contact = newContact
      console.log(`✅ Created contact: ${contact.email}`)
    }

    // 3. Check if project already exists
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id, title')
      .eq('org_id', GWA_ORG_ID)
      .eq('is_tenant', true)
      .single()

    if (existingProject) {
      console.log(`⚠️  Project already exists: ${existingProject.title}`)
      console.log(`   ID: ${existingProject.id}`)
      
      // Update with live URL
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          tenant_domain: 'godsworkoutapparel.com',
          description: 'Faith-driven fitness apparel e-commerce store. Next.js + Shopify headless commerce.',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProject.id)

      if (!updateError) {
        console.log('✅ Updated project with live URL')
      }
      return
    }

    // 4. Create project as Web App (is_tenant = true)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        title: "God's Workout Apparel",
        description: 'Faith-driven fitness apparel e-commerce store. Next.js + Shopify headless commerce.',
        status: 'in_progress',
        contact_id: contact?.id,
        is_tenant: true,
        tenant_domain: 'godsworkoutapparel.com',
        tenant_features: ['analytics', 'blog'],
        tenant_tracking_id: 'UM-GWA00001',
        budget: 5000,
        start_date: '2024-12-01',
        end_date: '2025-01-15',
      })
      .select()
      .single()

    if (projectError) {
      console.error('❌ Failed to create project:', projectError.message)
      throw projectError
    }

    console.log(`✅ Created project: ${project.title}`)
    console.log(`   ID: ${project.id}`)
    console.log(`   Status: ${project.status}`)
    console.log(`   Domain: ${project.tenant_domain}`)

    // 5. Also add contact to the org_gwa.contacts table for tenant-specific data
    const { error: tenantContactError } = await supabase.rpc('execute_sql', {
      sql: `
        INSERT INTO org_gwa.contacts (email, name, role, account_setup)
        VALUES ('${GWA_EMAIL}', 'God''s Workout Apparel', 'admin', 'true')
        ON CONFLICT (email) DO UPDATE SET 
          role = 'admin',
          account_setup = 'true',
          updated_at = NOW();
      `
    })

    if (tenantContactError) {
      console.warn('⚠️  Could not create tenant contact:', tenantContactError.message)
    } else {
      console.log('✅ Created tenant-schema contact')
    }

    console.log('\n✨ GWA Setup Complete!')
    console.log('   - Contact created/updated')
    console.log('   - Project visible in Web Apps tab')
    console.log('   - Enter Dashboard will work once site is live')

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  }
}

addGWAProjectAndContact()
