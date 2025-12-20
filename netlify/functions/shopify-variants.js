// netlify/functions/shopify-variants.js
// Update variant data (price, compare_at_price, sku, weight, etc.)

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { ShopifyClient } from './utils/shopify-client.js'

export async function handler(event) {
  const method = event.httpMethod.toUpperCase()
  
  // Only support PUT for updates
  if (method !== 'PUT') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  
  // Auth check
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  
  // Get org from header (current dashboard org) or fall back to contact's org
  const orgIdHeader = event.headers['x-organization-id'] || event.headers['X-Organization-Id']
  const orgId = orgIdHeader || contact.org_id
  
  if (!orgId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No organization associated with user' }) }
  }
  
  const supabase = createSupabaseAdmin()
  
  // Resolve project tenant ID to organization ID if needed
  let resolvedOrgId = orgId
  if (orgId) {
    const { data: project } = await supabase
      .from('projects')
      .select('org_id')
      .eq('id', orgId)
      .maybeSingle()
    
    if (project?.org_id) {
      resolvedOrgId = project.org_id
    }
  }

  // Get store for this org
  const { data: store, error: storeError } = await supabase
    .from('shopify_stores')
    .select('*')
    .eq('org_id', resolvedOrgId)
    .eq('is_active', true)
    .single()
  
  if (storeError || !store) {
    return { statusCode: 404, body: JSON.stringify({ error: 'No connected store found' }) }
  }
  
  const client = new ShopifyClient(store.shop_domain, store.access_token)
  
  // Parse request body
  const body = JSON.parse(event.body || '{}')
  const { variantId, price, compare_at_price, sku, weight, weight_unit, barcode, inventory_policy, taxable } = body
  
  if (!variantId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'variantId is required' }) }
  }
  
  // Build update payload - only include fields that were provided
  const variantData = {}
  
  if (price !== undefined) variantData.price = price
  if (compare_at_price !== undefined) variantData.compare_at_price = compare_at_price || null
  if (sku !== undefined) variantData.sku = sku
  if (weight !== undefined) variantData.weight = weight
  if (weight_unit !== undefined) variantData.weight_unit = weight_unit
  if (barcode !== undefined) variantData.barcode = barcode
  if (inventory_policy !== undefined) variantData.inventory_policy = inventory_policy
  if (taxable !== undefined) variantData.taxable = taxable
  
  if (Object.keys(variantData).length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No fields to update' }) }
  }
  
  console.log('[shopify-variants] Updating variant:', variantId, variantData)
  
  try {
    const variant = await client.updateVariant(variantId, variantData)
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        variant: {
          id: variant.id,
          price: variant.price,
          compare_at_price: variant.compare_at_price,
          sku: variant.sku,
          weight: variant.weight,
          weight_unit: variant.weight_unit,
          barcode: variant.barcode,
          inventory_policy: variant.inventory_policy,
          taxable: variant.taxable
        }
      })
    }
  } catch (error) {
    console.error('[shopify-variants] Update error:', error)
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    }
  }
}
