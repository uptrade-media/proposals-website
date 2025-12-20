// netlify/functions/shopify-stores.js
// Store connection management - connect, disconnect, list stores

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { validateAccessToken, ShopifyClient } from './utils/shopify-client.js'

export async function handler(event) {
  const method = event.httpMethod.toUpperCase()
  
  // Debug logging
  console.log('[shopify-stores] Request received:', {
    method,
    hasAuthHeader: !!(event.headers.authorization || event.headers.Authorization),
    hasOrgHeader: !!(event.headers['x-organization-id'] || event.headers['X-Organization-Id'])
  })
  
  // Auth check
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    console.log('[shopify-stores] Auth failed:', authError?.message || 'No contact')
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  
  console.log('[shopify-stores] Auth success:', { email: contact.email })
  
  // Get project_id from header (project-level filtering for Ecommerce)
  // Falls back to org_id for backwards compatibility
  const projectId = event.headers['x-project-id'] || event.headers['X-Project-Id']
  const orgIdHeader = event.headers['x-organization-id'] || event.headers['X-Organization-Id']
  
  if (!projectId && !orgIdHeader) {
    console.log('[shopify-stores] No project or org ID in header')
    return { statusCode: 400, body: JSON.stringify({ error: 'No organization or project ID provided' }) }
  }
  
  console.log('[shopify-stores] Using context:', { projectId, orgIdHeader })
  
  const supabase = createSupabaseAdmin()
  
  // Project-level filtering (preferred) or resolve org from project
  let resolvedOrgId = orgIdHeader
  
  if (projectId) {
    // Get org from project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle()
    
    if (projectError) {
      console.error('[shopify-stores] Error looking up project:', projectError)
    } else if (project?.organization_id) {
      console.log('[shopify-stores] Resolved project to org:', project.organization_id)
      resolvedOrgId = project.organization_id
    }
  } else if (orgIdHeader) {
    // Legacy: resolve if orgIdHeader is actually a project ID
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('org_id')
      .eq('id', orgIdHeader)
      .maybeSingle()
    
    if (!projectError && project) {
      console.log('[shopify-stores] Resolved legacy project tenant to org:', project.org_id)
      resolvedOrgId = project.org_id
    }
  }
  
  if (!resolvedOrgId) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Could not resolve organization ID' }) 
    }
  }

  // =========================================================================
  // GET - List stores for org (typically just one)
  // =========================================================================
  if (method === 'GET') {
    try {
      const { data: stores, error } = await supabase
        .from('shopify_stores')
        .select('*')
        .eq('org_id', resolvedOrgId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Don't expose access tokens to frontend
      const sanitized = stores.map(store => ({
        id: store.id,
        shopDomain: store.shop_domain,
        shopName: store.store_name,
        shopOwner: store.shop_owner,
        email: store.email,
        planName: store.plan_name,
        currency: store.currency,
        timezone: store.timezone,
        lastSyncAt: store.last_sync_at,
        createdAt: store.created_at,
        syncStatus: store.last_sync_status,
        productsCount: store.products_count,
        variantsCount: store.variants_count,
        ordersCount30d: store.orders_count_30d
      }))
      
      return {
        statusCode: 200,
        body: JSON.stringify({ stores: sanitized })
      }
    } catch (error) {
      console.error('[shopify-stores] GET error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  // =========================================================================
  // POST - Connect a new store
  // =========================================================================
  if (method === 'POST') {
    try {
      const { shopDomain, accessToken } = JSON.parse(event.body || '{}')
      
      console.log('[shopify-stores] POST received:', {
        shopDomain,
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length
      })
      
      if (!shopDomain || !accessToken) {
        return { 
          statusCode: 400, 
          body: JSON.stringify({ error: 'shopDomain and accessToken are required' }) 
        }
      }
      
      // Normalize domain
      let normalizedDomain = shopDomain.toLowerCase().trim()
        .replace('https://', '')
        .replace('http://', '')
        .replace(/\/$/, '')
      if (!normalizedDomain.includes('.myshopify.com')) {
        normalizedDomain = `${normalizedDomain}.myshopify.com`
      }
      
      console.log('[shopify-stores] Domain normalization:', {
        inputDomain: shopDomain,
        normalizedDomain
      })
      
      // Check if store already connected for this org
      const { data: existing } = await supabase
        .from('shopify_stores')
        .select('id')
        .eq('org_id', resolvedOrgId)
        .eq('shop_domain', normalizedDomain)
        .single()
      
      if (existing) {
        return { 
          statusCode: 409, 
          body: JSON.stringify({ error: 'Store is already connected to this organization' }) 
        }
      }
      
      // Validate the access token
      console.log(`[shopify-stores] Validating token for ${normalizedDomain}`)
      const validation = await validateAccessToken(normalizedDomain, accessToken)
      
      if (!validation.valid) {
        console.error('[shopify-stores] Token validation failed:', validation.error)
        return { 
          statusCode: 400, 
          body: JSON.stringify({ error: validation.error }) 
        }
      }
      
      const shop = validation.shop
      
      // Get locations
      const client = new ShopifyClient(normalizedDomain, accessToken)
      let locations = []
      try {
        locations = await client.getLocations()
      } catch (e) {
        console.warn('[shopify-stores] Could not fetch locations:', e.message)
      }
      
      // Insert store
      const { data: store, error: insertError } = await supabase
        .from('shopify_stores')
        .insert({
          org_id: resolvedOrgId,
          shop_domain: normalizedDomain,
          access_token: accessToken,
          shop_id: shop.id,
          store_name: shop.name,
          shop_owner: shop.shopOwner,
          email: shop.email,
          plan_name: shop.planName,
          currency: shop.currency,
          timezone: shop.timezone,
          last_sync_status: 'idle'
        })
        .select()
        .single()
      
      if (insertError) throw insertError
      
      // Insert locations
      if (locations.length > 0) {
        const locationRows = locations.map(loc => ({
          store_id: store.id,
          shopify_id: loc.id,
          name: loc.name,
          address1: loc.address1 || '',
          city: loc.city || '',
          province: loc.province || '',
          province_code: loc.province_code || '',
          country: loc.country || '',
          country_code: loc.country_code || '',
          zip: loc.zip || '',
          phone: loc.phone || '',
          is_active: loc.active,
          is_primary: loc.legacy,
          fulfills_online_orders: loc.fulfills_online_orders ?? true
        }))
        
        const { error: locError } = await supabase
          .from('shopify_locations')
          .insert(locationRows)
        
        if (locError) {
          console.error('[shopify-stores] Error inserting locations:', locError)
        }
      }
      
      // Log sync
      await supabase.from('shopify_sync_log').insert({
        store_id: store.id,
        sync_type: 'connection',
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        triggered_by: contact.id
      })
      
      return {
        statusCode: 201,
        body: JSON.stringify({
          message: 'Store connected successfully',
          store: {
            id: store.id,
            shopDomain: store.shop_domain,
            shopName: store.store_name,
            shopOwner: store.shop_owner,
            email: store.email,
            planName: store.plan_name,
            currency: store.currency,
            timezone: store.timezone,
            locationsCount: locations.length
          }
        })
      }
    } catch (error) {
      console.error('[shopify-stores] POST error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  // =========================================================================
  // DELETE - Disconnect a store
  // =========================================================================
  if (method === 'DELETE') {
    try {
      const { storeId } = JSON.parse(event.body || '{}')
      
      if (!storeId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'storeId is required' }) }
      }
      
      // Verify ownership
      const { data: store, error: fetchError } = await supabase
        .from('shopify_stores')
        .select('id, store_name')
        .eq('id', storeId)
        .eq('org_id', resolvedOrgId)
        .single()
      
      if (fetchError || !store) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Store not found' }) }
      }
      
      // Delete related data in order (cascade should handle, but being explicit)
      // 1. Sync logs
      await supabase.from('shopify_sync_log').delete().eq('store_id', storeId)
      
      // 2. Inventory levels (cascade from variants)
      // 3. Variants (cascade from products)
      // 4. Products
      await supabase.from('shopify_products').delete().eq('store_id', storeId)
      
      // 5. Orders
      await supabase.from('shopify_orders').delete().eq('store_id', storeId)
      
      // 6. Locations
      await supabase.from('shopify_locations').delete().eq('store_id', storeId)
      
      // 7. Store itself (cascades should have handled the above, but being safe)
      const { error: deleteError } = await supabase
        .from('shopify_stores')
        .delete()
        .eq('id', storeId)
      
      if (deleteError) throw deleteError
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Store disconnected successfully',
          shopName: store.store_name
        })
      }
    } catch (error) {
      console.error('[shopify-stores] DELETE error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  }
}
