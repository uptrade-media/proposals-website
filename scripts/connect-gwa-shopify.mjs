// scripts/connect-gwa-shopify.mjs
// One-time script to connect GWA Shopify store

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GWA_ORG_ID = 'bfa1aa3d-9807-4ba4-baaa-4d7ca04958fb'
const SHOP_DOMAIN = 'gods-workout-apparel.myshopify.com'

// Get token from command line arg
const accessToken = process.argv[2]

if (!accessToken || !accessToken.startsWith('shpat_')) {
  console.error('Usage: node scripts/connect-gwa-shopify.mjs shpat_xxxxx')
  console.error('Token must start with shpat_')
  process.exit(1)
}

async function connectStore() {
  console.log('Connecting GWA Shopify store...')
  
  // Validate token by fetching shop info
  const shopRes = await fetch(`https://${SHOP_DOMAIN}/admin/api/2024-01/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  })
  
  if (!shopRes.ok) {
    console.error('Invalid token or shop domain. Status:', shopRes.status)
    const text = await shopRes.text()
    console.error(text)
    process.exit(1)
  }
  
  const { shop } = await shopRes.json()
  console.log('✓ Token validated. Shop:', shop.name)
  
  // Insert into database
  const { data, error } = await supabase
    .from('shopify_stores')
    .upsert({
      org_id: GWA_ORG_ID,
      shop_domain: SHOP_DOMAIN,
      store_name: shop.name,
      access_token: accessToken,
      shop_id: shop.id,
      currency: shop.currency,
      timezone: shop.timezone,
      plan_name: shop.plan_name,
      shop_owner: shop.shop_owner,
      email: shop.email,
      scopes: ['read_products', 'write_products', 'read_inventory', 'write_inventory', 'read_orders', 'read_locations'],
      connected_at: new Date().toISOString(),
      is_active: true
    }, {
      onConflict: 'org_id,shop_domain'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Database error:', error.message)
    process.exit(1)
  }
  
  console.log('✓ Store connected!')
  console.log('  Store ID:', data.id)
  console.log('  Shop:', data.store_name)
  console.log('  Domain:', data.shop_domain)
}

connectStore()
