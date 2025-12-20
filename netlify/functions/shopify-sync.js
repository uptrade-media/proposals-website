// netlify/functions/shopify-sync.js
// Sync products from Shopify to local cache

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { ShopifyClient } from './utils/shopify-client.js'

export async function handler(event) {
  const method = event.httpMethod.toUpperCase()
  
  // Auth check
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  
  // Get project_id from header (project-level filtering for Ecommerce)
  // Falls back to org_id for backwards compatibility
  const projectId = event.headers['x-project-id'] || event.headers['X-Project-Id']
  const orgIdHeader = event.headers['x-organization-id'] || event.headers['X-Organization-Id']
  const orgId = orgIdHeader || contact.org_id
  
  console.log('[shopify-sync] Context resolution:', {
    projectId,
    orgIdHeader,
    contactOrgId: contact.org_id,
    resolvedOrgId: orgId
  })
  
  if (!orgId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No organization associated with user' }) }
  }
  
  const supabase = createSupabaseAdmin()

  // Project-level filtering (preferred) - resolve project to org
  let resolvedOrgId = orgId
  if (projectId) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle()
    
    if (projectError) {
      console.error('[shopify-sync] Error looking up project:', projectError)
    } else if (project?.organization_id) {
      console.log('[shopify-sync] Resolved project to org:', project.organization_id)
      resolvedOrgId = project.organization_id
    }
  } else if (orgId) {
    // Legacy: check if orgId is actually a project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('org_id')
      .eq('id', orgId)
      .maybeSingle()
    
    if (!projectError && project?.org_id) {
      console.log('[shopify-sync] Resolved project tenant to org:', project.org_id)
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
    console.error('[shopify-sync] Store lookup failed:', {
      resolvedOrgId,
      storeError: storeError?.message,
      storeErrorCode: storeError?.code
    })
    return { statusCode: 404, body: JSON.stringify({ error: 'No connected store found' }) }
  }
  
  console.log('[shopify-sync] Found store:', store.shop_domain)

  // =========================================================================
  // GET - Get sync status
  // =========================================================================
  if (method === 'GET') {
    try {
      const { data: lastSync } = await supabase
        .from('shopify_sync_log')
        .select('*')
        .eq('store_id', store.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: store.last_sync_status || 'never',
          lastSyncAt: store.last_sync_at,
          lastSyncError: store.last_sync_error,
          productsCount: store.products_count,
          variantsCount: store.variants_count,
          lastSync
        })
      }
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  // =========================================================================
  // POST - Trigger sync
  // =========================================================================
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}')
    const syncType = body.syncType || 'products' // 'products', 'orders', 'full'
    
    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('shopify_sync_log')
      .insert({
        store_id: store.id,
        sync_type: syncType,
        status: 'started',
        triggered_by: contact.id,
        trigger_type: 'manual'
      })
      .select()
      .single()
    
    if (logError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create sync log' }) }
    }
    
    // Update store status
    await supabase
      .from('shopify_stores')
      .update({ last_sync_status: 'in_progress' })
      .eq('id', store.id)
    
    try {
      const client = new ShopifyClient(store.shop_domain, store.access_token)
      let stats = { processed: 0, created: 0, updated: 0, deleted: 0 }
      
      // ===== SYNC PRODUCTS =====
      if (syncType === 'products' || syncType === 'full') {
        console.log(`[shopify-sync] Starting product sync for ${store.shop_domain}`)
        
        // Fetch all products from Shopify
        const products = await client.getAllPages('products.json', 'products')
        console.log(`[shopify-sync] Fetched ${products.length} products from Shopify`)
        
        // Get existing product IDs
        const { data: existingProducts } = await supabase
          .from('shopify_products')
          .select('id, shopify_id')
          .eq('store_id', store.id)
        
        const existingMap = new Map(existingProducts?.map(p => [String(p.shopify_id), p.id]) || [])
        const shopifyIds = new Set(products.map(p => String(p.id)))
        
        // Process each product
        for (const product of products) {
          const existingId = existingMap.get(String(product.id))
          
          const productData = {
            store_id: store.id,
            shopify_id: product.id,
            shopify_handle: product.handle,
            title: product.title,
            body_html: product.body_html,
            vendor: product.vendor,
            product_type: product.product_type,
            tags: product.tags ? product.tags.split(', ').filter(Boolean) : [],
            status: product.status,
            published_at: product.published_at,
            published_scope: product.published_scope,
            price: product.variants?.[0]?.price || null,
            compare_at_price: product.variants?.[0]?.compare_at_price || null,
            total_inventory: product.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0,
            inventory_tracked: product.variants?.some(v => v.inventory_management === 'shopify') || false,
            featured_image_url: product.image?.src || null,
            featured_image_alt: product.image?.alt || null,
            images: product.images?.map(img => ({
              id: img.id,
              src: img.src,
              alt: img.alt,
              position: img.position,
              width: img.width,
              height: img.height
            })) || [],
            variants_count: product.variants?.length || 1,
            has_variants: (product.variants?.length || 1) > 1,
            options: product.options?.map(opt => ({
              name: opt.name,
              position: opt.position,
              values: opt.values
            })) || [],
            shopify_created_at: product.created_at,
            shopify_updated_at: product.updated_at,
            last_synced_at: new Date().toISOString()
          }
          
          if (existingId) {
            // Update
            await supabase
              .from('shopify_products')
              .update(productData)
              .eq('id', existingId)
            stats.updated++
          } else {
            // Insert
            const { data: newProduct } = await supabase
              .from('shopify_products')
              .insert(productData)
              .select('id')
              .single()
            stats.created++
            
            if (newProduct) {
              existingMap.set(String(product.id), newProduct.id)
            }
          }
          
          // Sync variants for this product
          const productDbId = existingId || existingMap.get(String(product.id))
          if (productDbId && product.variants) {
            for (const variant of product.variants) {
              const variantData = {
                product_id: productDbId,
                store_id: store.id,
                shopify_id: variant.id,
                shopify_product_id: product.id,
                title: variant.title,
                sku: variant.sku,
                barcode: variant.barcode,
                option1: variant.option1,
                option2: variant.option2,
                option3: variant.option3,
                price: variant.price,
                compare_at_price: variant.compare_at_price,
                inventory_item_id: variant.inventory_item_id,
                inventory_quantity: variant.inventory_quantity || 0,
                inventory_policy: variant.inventory_policy,
                inventory_management: variant.inventory_management,
                fulfillment_service: variant.fulfillment_service,
                requires_shipping: variant.requires_shipping,
                weight: variant.weight,
                weight_unit: variant.weight_unit,
                image_id: variant.image_id,
                position: variant.position,
                taxable: variant.taxable,
                shopify_created_at: variant.created_at,
                shopify_updated_at: variant.updated_at,
                last_synced_at: new Date().toISOString()
              }
              
              await supabase
                .from('shopify_variants')
                .upsert(variantData, { 
                  onConflict: 'store_id,shopify_id',
                  ignoreDuplicates: false 
                })
            }
          }
          
          stats.processed++
        }
        
        // Delete products no longer in Shopify
        for (const [shopifyId, dbId] of existingMap) {
          if (!shopifyIds.has(shopifyId)) {
            await supabase.from('shopify_products').delete().eq('id', dbId)
            stats.deleted++
          }
        }
      }
      
      // ===== SYNC ORDERS (last 30 days) =====
      if (syncType === 'orders' || syncType === 'full') {
        console.log(`[shopify-sync] Starting order sync for ${store.shop_domain}`)
        
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const orders = await client.getOrders({
          created_at_min: thirtyDaysAgo.toISOString(),
          status: 'any'
        })
        
        for (const order of orders) {
          const orderData = {
            store_id: store.id,
            shopify_id: order.id,
            order_number: order.order_number,
            name: order.name,
            financial_status: order.financial_status,
            fulfillment_status: order.fulfillment_status,
            customer_email: order.email,
            customer_name: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : null,
            customer_shopify_id: order.customer?.id,
            subtotal_price: order.subtotal_price,
            total_tax: order.total_tax,
            total_shipping: order.shipping_lines?.reduce((sum, l) => sum + parseFloat(l.price || 0), 0) || 0,
            total_discounts: order.total_discounts,
            total_price: order.total_price,
            currency: order.currency,
            line_items_count: order.line_items?.length || 0,
            line_items: order.line_items?.map(li => ({
              id: li.id,
              title: li.title,
              quantity: li.quantity,
              price: li.price,
              sku: li.sku,
              variant_id: li.variant_id,
              product_id: li.product_id
            })) || [],
            shipping_address: order.shipping_address,
            billing_address: order.billing_address,
            shipping_lines: order.shipping_lines,
            processed_at: order.processed_at,
            cancelled_at: order.cancelled_at,
            closed_at: order.closed_at,
            note: order.note,
            tags: order.tags ? order.tags.split(', ').filter(Boolean) : [],
            fulfillments: order.fulfillments,
            shopify_created_at: order.created_at,
            shopify_updated_at: order.updated_at,
            last_synced_at: new Date().toISOString()
          }
          
          await supabase
            .from('shopify_orders')
            .upsert(orderData, {
              onConflict: 'store_id,shopify_id',
              ignoreDuplicates: false
            })
        }
      }
      
      // Get final counts
      const { count: productsCount } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id)
      
      const { count: variantsCount } = await supabase
        .from('shopify_variants')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id)
      
      const { count: ordersCount } = await supabase
        .from('shopify_orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id)
      
      // Update store and sync log
      const now = new Date()
      const duration = now.getTime() - new Date(syncLog.started_at).getTime()
      
      await supabase
        .from('shopify_stores')
        .update({
          last_sync_at: now.toISOString(),
          last_sync_status: 'success',
          last_sync_error: null,
          products_count: productsCount || 0,
          variants_count: variantsCount || 0,
          orders_count_30d: ordersCount || 0
        })
        .eq('id', store.id)
      
      await supabase
        .from('shopify_sync_log')
        .update({
          status: 'completed',
          records_processed: stats.processed,
          records_created: stats.created,
          records_updated: stats.updated,
          records_deleted: stats.deleted,
          completed_at: now.toISOString(),
          duration_ms: duration
        })
        .eq('id', syncLog.id)
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Sync completed',
          stats,
          productsCount,
          variantsCount,
          ordersCount,
          duration
        })
      }
    } catch (error) {
      console.error('[shopify-sync] Error:', error)
      
      // Update store and sync log with error
      await supabase
        .from('shopify_stores')
        .update({
          last_sync_status: 'error',
          last_sync_error: error.message
        })
        .eq('id', store.id)
      
      await supabase
        .from('shopify_sync_log')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)
      
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  }
}
