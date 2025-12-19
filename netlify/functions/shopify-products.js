// netlify/functions/shopify-products.js
// Product management - list, get, update products with images

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
  
  console.log('[shopify-products] Org resolution:', {
    orgIdHeader,
    contactOrgId: contact.org_id,
    resolvedOrgId: orgId
  })
  
  if (!orgId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No organization associated with user' }) }
  }
  
  const supabase = createSupabaseAdmin()
  
  // Resolve project tenant ID to organization ID if needed
  // If orgId is a project tenant, look up its parent organization
  let resolvedOrgId = orgId
  if (orgId) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('org_id')
      .eq('id', orgId)
      .maybeSingle()
    
    if (projectError) {
      console.error('[shopify-products] Error looking up project:', projectError)
    } else if (project?.org_id) {
      console.log('[shopify-products] Resolved project tenant to org:', project.org_id)
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
    console.error('[shopify-products] Store lookup failed:', {
      resolvedOrgId,
      storeError: storeError?.message,
      storeErrorCode: storeError?.code
    })
    return { statusCode: 404, body: JSON.stringify({ error: 'No connected store found' }) }
  }
  
  console.log('[shopify-products] Found store:', store.shop_domain)

  // =========================================================================
  // GET - List products or get single product
  // =========================================================================
  if (method === 'GET') {
    const params = event.queryStringParameters || {}
    
    // Single product
    if (params.id) {
      try {
        const { data: product, error } = await supabase
          .from('shopify_products')
          .select(`
            *,
            variants:shopify_variants(*)
          `)
          .eq('store_id', store.id)
          .eq('id', params.id)
          .single()
        
        if (error || !product) {
          return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) }
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({ product })
        }
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
      }
    }
    
    // List products
    try {
      const page = parseInt(params.page) || 1
      const limit = parseInt(params.limit) || 50
      const offset = (page - 1) * limit
      const status = params.status || null
      const search = params.search || null
      const sortBy = params.sortBy || 'title'
      const sortDir = params.sortDir === 'desc' ? false : true
      
      let query = supabase
        .from('shopify_products')
        .select('*', { count: 'exact' })
        .eq('store_id', store.id)
      
      if (status) {
        query = query.eq('status', status)
      }
      
      if (search) {
        query = query.or(`title.ilike.%${search}%,vendor.ilike.%${search}%,product_type.ilike.%${search}%`)
      }
      
      query = query
        .order(sortBy, { ascending: sortDir })
        .range(offset, offset + limit - 1)
      
      const { data: products, count, error } = await query
      
      if (error) throw error
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          products,
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        })
      }
    } catch (error) {
      console.error('[shopify-products] GET error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  // =========================================================================
  // PUT - Update product (title, description, images, SEO, etc.)
  // =========================================================================
  if (method === 'PUT') {
    try {
      const body = JSON.parse(event.body || '{}')
      const { productId, ...updates } = body
      
      if (!productId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'productId is required' }) }
      }
      
      // Get product from our cache
      const { data: product, error: fetchError } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('store_id', store.id)
        .eq('id', productId)
        .single()
      
      if (fetchError || !product) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) }
      }
      
      // Build Shopify update payload
      const shopifyUpdate = {}
      
      if (updates.title !== undefined) shopifyUpdate.title = updates.title
      if (updates.body_html !== undefined) shopifyUpdate.body_html = updates.body_html
      if (updates.vendor !== undefined) shopifyUpdate.vendor = updates.vendor
      if (updates.product_type !== undefined) shopifyUpdate.product_type = updates.product_type
      if (updates.tags !== undefined) shopifyUpdate.tags = Array.isArray(updates.tags) ? updates.tags.join(', ') : updates.tags
      if (updates.status !== undefined) shopifyUpdate.status = updates.status
      
      // SEO fields via metafields
      if (updates.seo_title !== undefined || updates.seo_description !== undefined) {
        shopifyUpdate.metafields_global_title_tag = updates.seo_title || product.seo_title
        shopifyUpdate.metafields_global_description_tag = updates.seo_description || product.seo_description
      }
      
      // Handle image updates
      if (updates.images !== undefined) {
        // Images array with { src, alt, position } or { id, alt, position } for existing
        shopifyUpdate.images = updates.images.map((img, idx) => {
          const imgData = { position: img.position || idx + 1 }
          if (img.id) imgData.id = img.id
          if (img.src) imgData.src = img.src
          if (img.alt !== undefined) imgData.alt = img.alt
          return imgData
        })
      }
      
      // Update on Shopify
      const client = new ShopifyClient(store.shop_domain, store.access_token)
      const updatedProduct = await client.updateProduct(product.shopify_id, shopifyUpdate)
      
      // Update our cache
      const cacheUpdate = {
        title: updatedProduct.title,
        body_html: updatedProduct.body_html,
        vendor: updatedProduct.vendor,
        product_type: updatedProduct.product_type,
        tags: updatedProduct.tags ? updatedProduct.tags.split(', ').filter(Boolean) : [],
        status: updatedProduct.status,
        featured_image_url: updatedProduct.image?.src || null,
        featured_image_alt: updatedProduct.image?.alt || null,
        images: updatedProduct.images?.map(img => ({
          id: img.id,
          src: img.src,
          alt: img.alt,
          position: img.position,
          width: img.width,
          height: img.height
        })) || [],
        shopify_updated_at: updatedProduct.updated_at,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Handle SEO if present
      if (updates.seo_title !== undefined) cacheUpdate.seo_title = updates.seo_title
      if (updates.seo_description !== undefined) cacheUpdate.seo_description = updates.seo_description
      
      const { data: updated, error: updateError } = await supabase
        .from('shopify_products')
        .update(cacheUpdate)
        .eq('id', productId)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Product updated',
          product: updated 
        })
      }
    } catch (error) {
      console.error('[shopify-products] PUT error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  // =========================================================================
  // POST - Upload new image to product
  // =========================================================================
  if (method === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}')
      const { productId, image } = body
      
      if (!productId || !image) {
        return { statusCode: 400, body: JSON.stringify({ error: 'productId and image are required' }) }
      }
      
      // Get product
      const { data: product, error: fetchError } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('store_id', store.id)
        .eq('id', productId)
        .single()
      
      if (fetchError || !product) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) }
      }
      
      // Upload to Shopify
      // Image can be { src: 'url' } or { attachment: 'base64data' }
      const client = new ShopifyClient(store.shop_domain, store.access_token)
      
      const imagePayload = {
        product_id: product.shopify_id,
        ...image
      }
      
      const response = await client.request(`products/${product.shopify_id}/images.json`, {
        method: 'POST',
        body: JSON.stringify({ image: imagePayload })
      })
      
      // Refresh product images
      const updatedProduct = await client.getProduct(product.shopify_id)
      
      // Update cache
      await supabase
        .from('shopify_products')
        .update({
          featured_image_url: updatedProduct.image?.src || null,
          featured_image_alt: updatedProduct.image?.alt || null,
          images: updatedProduct.images?.map(img => ({
            id: img.id,
            src: img.src,
            alt: img.alt,
            position: img.position,
            width: img.width,
            height: img.height
          })) || [],
          last_synced_at: new Date().toISOString()
        })
        .eq('id', productId)
      
      return {
        statusCode: 201,
        body: JSON.stringify({
          message: 'Image uploaded',
          image: response.image,
          images: updatedProduct.images
        })
      }
    } catch (error) {
      console.error('[shopify-products] POST error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  // =========================================================================
  // DELETE - Remove image from product
  // =========================================================================
  if (method === 'DELETE') {
    try {
      const body = JSON.parse(event.body || '{}')
      const { productId, imageId } = body
      
      if (!productId || !imageId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'productId and imageId are required' }) }
      }
      
      // Get product
      const { data: product, error: fetchError } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('store_id', store.id)
        .eq('id', productId)
        .single()
      
      if (fetchError || !product) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) }
      }
      
      // Delete from Shopify
      const client = new ShopifyClient(store.shop_domain, store.access_token)
      await client.request(`products/${product.shopify_id}/images/${imageId}.json`, {
        method: 'DELETE'
      })
      
      // Refresh product images
      const updatedProduct = await client.getProduct(product.shopify_id)
      
      // Update cache
      await supabase
        .from('shopify_products')
        .update({
          featured_image_url: updatedProduct.image?.src || null,
          featured_image_alt: updatedProduct.image?.alt || null,
          images: updatedProduct.images?.map(img => ({
            id: img.id,
            src: img.src,
            alt: img.alt,
            position: img.position,
            width: img.width,
            height: img.height
          })) || [],
          last_synced_at: new Date().toISOString()
        })
        .eq('id', productId)
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Image deleted',
          images: updatedProduct.images
        })
      }
    } catch (error) {
      console.error('[shopify-products] DELETE error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  }
}
