#!/usr/bin/env node

/**
 * CMC to Portal Data Import Script
 * 
 * Imports exported CMC data into Uptrade Portal's Supabase database.
 * 
 * Prerequisites:
 *   1. Run export-cmc-data.mjs first to create export files
 *   2. Create the CMC organization and project in Portal (run setup-cmc-org.mjs)
 * 
 * Usage:
 *   PORTAL_SUPABASE_URL=xxx PORTAL_SUPABASE_SERVICE_KEY=xxx \
 *   CMC_PROJECT_ID=xxx CMC_ORG_ID=xxx \
 *   node scripts/import-to-portal.mjs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// Portal Supabase credentials
const PORTAL_SUPABASE_URL = process.env.PORTAL_SUPABASE_URL
const PORTAL_SUPABASE_SERVICE_KEY = process.env.PORTAL_SUPABASE_SERVICE_KEY
const CMC_PROJECT_ID = process.env.CMC_PROJECT_ID
const CMC_ORG_ID = process.env.CMC_ORG_ID

if (!PORTAL_SUPABASE_URL || !PORTAL_SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Portal Supabase credentials')
  process.exit(1)
}

if (!CMC_PROJECT_ID || !CMC_ORG_ID) {
  console.error('❌ Missing CMC_PROJECT_ID or CMC_ORG_ID')
  console.error('   Run setup-cmc-org.mjs first to create the organization and project')
  process.exit(1)
}

const supabase = createClient(PORTAL_SUPABASE_URL, PORTAL_SUPABASE_SERVICE_KEY)

function loadExportData(tableName) {
  const filePath = path.join(process.cwd(), 'exports', `${tableName}.json`)
  if (!fs.existsSync(filePath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

async function batchInsert(tableName, data, options = {}) {
  const { batchSize = 500, onConflict = null } = options
  let inserted = 0
  let errors = []
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    
    let query = supabase.from(tableName).insert(batch)
    if (onConflict) {
      query = supabase.from(tableName).upsert(batch, { onConflict })
    }
    
    const { error } = await query
    
    if (error) {
      errors.push({ batch: i / batchSize, error: error.message })
      console.error(`   ⚠️  Batch ${i / batchSize + 1} error: ${error.message}`)
    } else {
      inserted += batch.length
    }
    
    process.stdout.write(`   📊 Progress: ${Math.min(i + batchSize, data.length)}/${data.length}\r`)
  }
  
  console.log(`   ✅ Inserted ${inserted} rows`)
  return { inserted, errors }
}

// ============================================================================
// Import Functions
// ============================================================================

async function importAnalyticsSessions() {
  console.log('\n📦 Importing analytics_sessions...')
  const sessions = loadExportData('sessions')
  if (!sessions || sessions.length === 0) {
    console.log('   ⚪ No sessions to import')
    return
  }
  
  const mapped = sessions.map(s => ({
    id: s.id || crypto.randomUUID(),
    project_id: CMC_PROJECT_ID,
    session_id: s.session_id,
    visitor_id: s.id || crypto.randomUUID(),
    fingerprint: s.fingerprint,
    ip_address: s.ip_address,
    user_agent: s.user_agent,
    referrer: s.referrer,
    utm_source: s.utm_source,
    utm_medium: s.utm_medium,
    utm_campaign: s.utm_campaign,
    device_type: s.device,
    browser: s.browser,
    os: s.os,
    country: s.country,
    city: s.city,
    first_seen: s.first_seen,
    last_seen: s.last_seen,
  }))
  
  return batchInsert('analytics_sessions', mapped, { onConflict: 'id' })
}

async function importAnalyticsPageViews() {
  console.log('\n📦 Importing analytics_page_views...')
  const pageViews = loadExportData('page_views')
  if (!pageViews || pageViews.length === 0) {
    console.log('   ⚪ No page views to import')
    return
  }
  
  const mapped = pageViews.map(pv => ({
    id: crypto.randomUUID(),
    project_id: CMC_PROJECT_ID,
    session_id: pv.session_id,
    path: pv.path,
    title: pv.title,
    referrer: pv.referrer,
    created_at: pv.created_at,
  }))
  
  return batchInsert('analytics_page_views', mapped)
}

async function importAnalyticsEvents() {
  console.log('\n📦 Importing analytics_events...')
  const events = loadExportData('events')
  if (!events || events.length === 0) {
    console.log('   ⚪ No analytics events to import')
    return
  }
  
  // Filter to only analytics events (not calendar events)
  // CMC uses 'events' table for analytics - calendar events are separate
  const analyticsEvents = events.filter(e => e.event_type && e.session_id)
  
  if (analyticsEvents.length === 0) {
    console.log('   ⚪ No analytics events found (might be calendar events only)')
    return
  }
  
  const mapped = analyticsEvents.map(e => ({
    id: crypto.randomUUID(),
    project_id: CMC_PROJECT_ID,
    session_id: e.session_id,
    event_name: e.event_name,
    event_category: e.event_type,
    event_action: e.event_name,
    properties: e.event_data,
    path: e.page_url,
    created_at: e.created_at,
  }))
  
  return batchInsert('analytics_events', mapped)
}

async function importBlogPosts() {
  console.log('\n📦 Importing blog_posts...')
  const blogPosts = loadExportData('blog_posts')
  if (!blogPosts || blogPosts.length === 0) {
    console.log('   ⚪ No blog posts to import')
    return
  }
  
  const mapped = blogPosts.map(bp => ({
    id: crypto.randomUUID(),
    project_id: CMC_PROJECT_ID,
    org_id: CMC_ORG_ID,
    slug: bp.slug,
    title: bp.title,
    excerpt: bp.excerpt,
    content: bp.content,
    content_html: bp.content, // Assuming content is HTML
    featured_image: bp.featured_image,
    featured_image_alt: bp.featured_image ? `Featured image for ${bp.title}` : null,
    author: 'Cincy Mahjong Club',
    category: 'General', // Could map from blog_categories
    tags: bp.tags,
    status: bp.status === 'published' ? 'published' : 'draft',
    featured: bp.is_featured || false,
    view_count: bp.view_count || 0,
    meta_title: bp.meta_title || bp.title,
    meta_description: bp.meta_description || bp.excerpt,
    published_at: bp.published_at,
    created_at: bp.created_at,
    updated_at: bp.updated_at,
  }))
  
  return batchInsert('blog_posts', mapped, { onConflict: 'project_id,slug' })
}

async function importProspects() {
  console.log('\n📦 Importing leads as prospects...')
  const leads = loadExportData('leads')
  if (!leads || leads.length === 0) {
    console.log('   ⚪ No leads to import')
    return
  }
  
  const mapped = leads.map(l => ({
    id: crypto.randomUUID(),
    org_id: CMC_ORG_ID,
    project_id: CMC_PROJECT_ID,
    name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown',
    email: l.email,
    phone: l.phone,
    source: l.lead_source || 'website',
    pipeline_stage: mapLeadStatus(l.status),
    lead_score: l.quality_score || 0,
    notes: l.notes,
    created_at: l.created_at,
    updated_at: l.updated_at,
  }))
  
  return batchInsert('prospects', mapped, { onConflict: 'email,org_id' })
}

function mapLeadStatus(status) {
  const mapping = {
    'new': 'new',
    'contacted': 'contacted',
    'qualified': 'qualified',
    'closed': 'won',
  }
  return mapping[status] || 'new'
}

async function importContacts() {
  console.log('\n📦 Importing recipients as contacts...')
  const recipients = loadExportData('recipients')
  if (!recipients || recipients.length === 0) {
    console.log('   ⚪ No recipients to import')
    return
  }
  
  const mapped = recipients.map(r => ({
    id: crypto.randomUUID(),
    org_id: CMC_ORG_ID,
    email: r.email,
    name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || null,
    source: 'email_list',
    subscribed: r.status === 'active',
    tags: ['newsletter', 'cmc_migrated'],
    contact_type: 'subscriber',
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))
  
  return batchInsert('contacts', mapped, { onConflict: 'email,org_id' })
}

async function importCommerceOfferings() {
  console.log('\n📦 Importing calendar events as commerce_offerings...')
  
  // CMC might have calendar events in a different structure
  // Let's check what's in the events export
  const events = loadExportData('events')
  if (!events || events.length === 0) {
    console.log('   ⚪ No events to import')
    return
  }
  
  // Filter for calendar events (have event_date, not just analytics events)
  const calendarEvents = events.filter(e => e.event_date || e.title)
  
  if (calendarEvents.length === 0) {
    console.log('   ⚪ No calendar events found in events table')
    console.log('   ℹ️  CMC might store calendar events elsewhere')
    return
  }
  
  const offeringIdMap = {} // Map old event IDs to new offering IDs
  
  const offerings = calendarEvents.map(e => {
    const newId = crypto.randomUUID()
    offeringIdMap[e.id] = newId
    
    return {
      id: newId,
      project_id: CMC_PROJECT_ID,
      type: 'event',
      status: mapEventStatus(e.status),
      name: e.title,
      slug: e.slug || generateSlug(e.title),
      description: e.description || e.content,
      short_description: e.description ? e.description.substring(0, 500) : null,
      
      // Pricing - most mahjong events are free
      price_type: 'free',
      price: 0,
      
      // Event details
      duration_minutes: e.end_date && e.event_date 
        ? Math.round((new Date(e.end_date) - new Date(e.event_date)) / 60000)
        : 120, // Default 2 hours
      capacity: e.max_attendees,
      location: [e.venue, e.address, e.city, e.state].filter(Boolean).join(', '),
      is_virtual: e.is_virtual || false,
      virtual_meeting_url: e.meeting_url,
      
      // SEO
      seo_title: e.meta_title || e.title,
      seo_description: e.meta_description || e.description,
      
      // Metadata
      metadata: {
        cmc_event_id: e.id,
        venue: e.venue,
        address: e.address,
        city: e.city,
        state: e.state,
        zip_code: e.zip_code,
        organizer: e.organizer,
        gallery_images: e.gallery_images,
        is_featured: e.is_featured,
      },
      
      created_at: e.created_at,
      updated_at: e.updated_at,
    }
  })
  
  const result = await batchInsert('commerce_offerings', offerings)
  
  // Also create schedules for each event
  console.log('\n📦 Creating commerce_schedules...')
  const schedules = calendarEvents
    .filter(e => e.event_date)
    .map(e => ({
      id: crypto.randomUUID(),
      offering_id: offeringIdMap[e.id],
      starts_at: e.event_date,
      ends_at: e.end_date || new Date(new Date(e.event_date).getTime() + 2 * 60 * 60 * 1000).toISOString(),
      timezone: 'America/New_York',
      capacity: e.max_attendees,
      spots_remaining: (e.max_attendees || 0) - (e.registration_count || 0),
      status: new Date(e.event_date) < new Date() ? 'completed' : 'scheduled',
      created_at: e.created_at,
    }))
  
  if (schedules.length > 0) {
    await batchInsert('commerce_schedules', schedules)
  }
  
  // Store the mapping for registrations import
  fs.writeFileSync(
    path.join(process.cwd(), 'exports', 'event-offering-map.json'),
    JSON.stringify(offeringIdMap, null, 2)
  )
  
  return result
}

function mapEventStatus(status) {
  const mapping = {
    'published': 'active',
    'draft': 'draft',
    'cancelled': 'archived',
    'completed': 'archived',
  }
  return mapping[status] || 'draft'
}

function generateSlug(title) {
  return (title || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

async function importCommerceSales() {
  console.log('\n📦 Importing event_registrations as commerce_sales...')
  const registrations = loadExportData('event_registrations')
  if (!registrations || registrations.length === 0) {
    console.log('   ⚪ No registrations to import')
    return
  }
  
  // Load the event-offering mapping
  const mapPath = path.join(process.cwd(), 'exports', 'event-offering-map.json')
  let offeringIdMap = {}
  if (fs.existsSync(mapPath)) {
    offeringIdMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'))
  }
  
  const sales = registrations.map(r => ({
    id: crypto.randomUUID(),
    project_id: CMC_PROJECT_ID,
    offering_id: offeringIdMap[r.event_id] || null,
    customer_email: r.email,
    customer_name: r.name,
    quantity: 1,
    unit_price: 0,
    subtotal: 0,
    total: 0,
    currency: 'USD',
    status: mapRegistrationStatus(r.status),
    payment_status: 'free',
    metadata: {
      cmc_registration_id: r.id,
      phone: r.phone,
      notes: r.notes,
      checked_in: r.checked_in,
      checked_in_at: r.checked_in_at,
    },
    created_at: r.registered_at || r.created_at,
  }))
  
  return batchInsert('commerce_sales', sales)
}

function mapRegistrationStatus(status) {
  const mapping = {
    'confirmed': 'confirmed',
    'waitlist': 'pending',
    'cancelled': 'cancelled',
  }
  return mapping[status] || 'confirmed'
}

async function importPaymentTransactions() {
  console.log('\n📦 Importing payment_transactions...')
  const transactions = loadExportData('payment_transactions')
  if (!transactions || transactions.length === 0) {
    console.log('   ⚪ No payment transactions to import')
    return
  }
  
  // Convert payment transactions to commerce_sales
  const sales = transactions.map(t => ({
    id: crypto.randomUUID(),
    project_id: CMC_PROJECT_ID,
    customer_email: t.customer_email,
    customer_name: t.customer_name,
    quantity: 1,
    unit_price: t.amount / 100, // Convert cents to dollars
    subtotal: t.amount / 100,
    total: t.amount / 100,
    currency: t.currency || 'USD',
    status: t.status === 'completed' ? 'confirmed' : 'pending',
    payment_status: t.status,
    payment_provider: t.provider,
    payment_provider_id: t.provider_transaction_id,
    metadata: {
      cmc_transaction_id: t.id,
      transaction_id: t.transaction_id,
      payment_method: t.payment_method,
      last4: t.last4,
      card_brand: t.card_brand,
      description: t.description,
      related_id: t.related_id,
      related_type: t.related_type,
      platform_fee: t.platform_fee,
      processing_fee: t.processing_fee,
      net_amount: t.net_amount,
      receipt_url: t.receipt_url,
      invoice_url: t.invoice_url,
    },
    created_at: t.created_at,
  }))
  
  return batchInsert('commerce_sales', sales)
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('🚀 CMC to Portal Import Starting...')
  console.log('═══════════════════════════════════════════')
  console.log(`   Portal URL: ${PORTAL_SUPABASE_URL}`)
  console.log(`   Project ID: ${CMC_PROJECT_ID}`)
  console.log(`   Org ID: ${CMC_ORG_ID}`)
  
  const results = {}
  
  // Import in order of dependencies
  results.sessions = await importAnalyticsSessions()
  results.pageViews = await importAnalyticsPageViews()
  results.analyticsEvents = await importAnalyticsEvents()
  results.blogPosts = await importBlogPosts()
  results.prospects = await importProspects()
  results.contacts = await importContacts()
  results.offerings = await importCommerceOfferings()
  results.sales = await importCommerceSales()
  results.payments = await importPaymentTransactions()
  
  // Print summary
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('📊 IMPORT SUMMARY')
  console.log('═══════════════════════════════════════════')
  
  let totalInserted = 0
  let totalErrors = 0
  
  for (const [key, result] of Object.entries(results)) {
    if (result) {
      console.log(`   ${key}: ${result.inserted} inserted, ${result.errors?.length || 0} errors`)
      totalInserted += result.inserted || 0
      totalErrors += result.errors?.length || 0
    }
  }
  
  console.log('')
  console.log(`   Total Inserted: ${totalInserted}`)
  console.log(`   Total Errors: ${totalErrors}`)
  console.log('')
  console.log('✅ Import complete!')
}

main().catch(console.error)
