// netlify/functions/shopify-orders.js
// Fetch orders from Shopify with filtering and pagination

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { ShopifyClient } from './utils/shopify-client.js'

export async function handler(event) {
  const method = event.httpMethod.toUpperCase()
  
  // Auth check
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  
  // Get org from header (current dashboard org) or fall back to contact's org
  const orgIdHeader = event.headers['x-organization-id'] || event.headers['X-Organization-Id']
  const orgId = orgIdHeader || contact.org_id
  
  console.log('[shopify-orders] Org resolution:', {
    orgIdHeader,
    contactOrgId: contact.org_id,
    resolvedOrgId: orgId
  })
  
  if (!orgId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No organization associated with user' }) }
  }
  
  const supabase = createSupabaseAdmin()
  
  // Resolve project tenant ID to organization ID if needed
  let resolvedOrgId = orgId
  if (orgId) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('org_id')
      .eq('id', orgId)
      .maybeSingle()
    
    if (projectError) {
      console.error('[shopify-orders] Error looking up project:', projectError)
    } else if (project?.org_id) {
      console.log('[shopify-orders] Resolved project tenant to org:', project.org_id)
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
    console.error('[shopify-orders] Store lookup failed:', {
      resolvedOrgId,
      storeError: storeError?.message
    })
    return { statusCode: 404, body: JSON.stringify({ error: 'No connected store found' }) }
  }
  
  console.log('[shopify-orders] Found store:', store.shop_domain)
  
  const client = new ShopifyClient(store.shop_domain, store.access_token)

  // =========================================================================
  // GET - List orders or get single order
  // =========================================================================
  if (method === 'GET') {
    const params = event.queryStringParameters || {}
    
    // Single order
    if (params.id) {
      try {
        const order = await client.getOrder(params.id)
        
        if (!order) {
          return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) }
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({ order: formatOrder(order) })
        }
      } catch (error) {
        console.error('[shopify-orders] GET single error:', error)
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
      }
    }
    
    // List orders
    try {
      const {
        status = 'any',
        financial_status,
        fulfillment_status,
        limit = '50',
        page_info,
        created_at_min,
        created_at_max
      } = params
      
      const shopifyParams = {
        status,
        limit: parseInt(limit)
      }
      
      if (financial_status) shopifyParams.financial_status = financial_status
      if (fulfillment_status) shopifyParams.fulfillment_status = fulfillment_status
      if (page_info) shopifyParams.page_info = page_info
      if (created_at_min) shopifyParams.created_at_min = created_at_min
      if (created_at_max) shopifyParams.created_at_max = created_at_max
      
      // Get orders from Shopify
      const orders = await client.getOrders(shopifyParams)
      const count = await client.getOrdersCount({ status })
      
      // Format orders for frontend
      const formattedOrders = orders.map(formatOrder)
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          orders: formattedOrders,
          total: count,
          limit: parseInt(limit)
        })
      }
    } catch (error) {
      console.error('[shopify-orders] GET list error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  }
}

// Format Shopify order for frontend consumption
function formatOrder(order) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    name: order.name,
    email: order.email,
    phone: order.phone,
    
    // Status
    financialStatus: order.financial_status,
    fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
    cancelledAt: order.cancelled_at,
    cancelReason: order.cancel_reason,
    
    // Amounts
    subtotalPrice: order.subtotal_price,
    totalPrice: order.total_price,
    totalTax: order.total_tax,
    totalDiscounts: order.total_discounts,
    totalShipping: order.total_shipping_price_set?.shop_money?.amount || '0.00',
    currency: order.currency,
    
    // Customer
    customer: order.customer ? {
      id: order.customer.id,
      firstName: order.customer.first_name,
      lastName: order.customer.last_name,
      email: order.customer.email,
      phone: order.customer.phone,
      ordersCount: order.customer.orders_count
    } : null,
    
    // Addresses
    shippingAddress: order.shipping_address ? {
      name: order.shipping_address.name,
      address1: order.shipping_address.address1,
      address2: order.shipping_address.address2,
      city: order.shipping_address.city,
      province: order.shipping_address.province,
      country: order.shipping_address.country,
      zip: order.shipping_address.zip,
      phone: order.shipping_address.phone
    } : null,
    
    billingAddress: order.billing_address ? {
      name: order.billing_address.name,
      address1: order.billing_address.address1,
      address2: order.billing_address.address2,
      city: order.billing_address.city,
      province: order.billing_address.province,
      country: order.billing_address.country,
      zip: order.billing_address.zip
    } : null,
    
    // Line items
    lineItems: (order.line_items || []).map(item => ({
      id: item.id,
      title: item.title,
      variantTitle: item.variant_title,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      totalDiscount: item.total_discount,
      fulfillmentStatus: item.fulfillment_status,
      productId: item.product_id,
      variantId: item.variant_id,
      image: item.image?.src || null
    })),
    
    // Fulfillments
    fulfillments: (order.fulfillments || []).map(f => ({
      id: f.id,
      status: f.status,
      trackingNumber: f.tracking_number,
      trackingUrl: f.tracking_url,
      trackingCompany: f.tracking_company,
      createdAt: f.created_at
    })),
    
    // Dates
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    processedAt: order.processed_at,
    closedAt: order.closed_at,
    
    // Notes
    note: order.note,
    noteAttributes: order.note_attributes,
    
    // Tags and source
    tags: order.tags,
    sourceName: order.source_name,
    
    // Payment
    paymentGatewayNames: order.payment_gateway_names,
    
    // Items count
    itemsCount: (order.line_items || []).reduce((sum, item) => sum + item.quantity, 0)
  }
}
