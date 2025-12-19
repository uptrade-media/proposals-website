// netlify/functions/utils/shopify-client.js
// Shopify Admin API client with rate limiting for Basic plan

const SHOPIFY_API_VERSION = '2024-01'
const RATE_LIMIT_DELAY_MS = 550 // Safe margin for Basic plan (2 req/sec)

export class ShopifyAPIError extends Error {
  constructor(status, body, endpoint) {
    const message = body?.errors 
      ? (typeof body.errors === 'string' ? body.errors : JSON.stringify(body.errors))
      : `Shopify API error: ${status}`
    super(message)
    this.name = 'ShopifyAPIError'
    this.status = status
    this.body = body
    this.endpoint = endpoint
  }
}

export class ShopifyClient {
  constructor(shopDomain, accessToken) {
    // Normalize shop domain
    this.shop = shopDomain.replace('https://', '').replace('http://', '').replace(/\/$/, '')
    if (!this.shop.includes('.myshopify.com')) {
      this.shop = `${this.shop}.myshopify.com`
    }
    
    this.accessToken = accessToken
    this.baseUrl = `https://${this.shop}/admin/api/${SHOPIFY_API_VERSION}`
    this.lastRequestTime = 0
  }

  /**
   * Make a rate-limited request to Shopify API
   */
  async request(endpoint, options = {}) {
    // Rate limiting - ensure minimum delay between requests
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()

    const url = `${this.baseUrl}/${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    // Check for rate limit headers
    const callLimit = response.headers.get('X-Shopify-Shop-Api-Call-Limit')
    if (callLimit) {
      const [used, max] = callLimit.split('/').map(Number)
      if (used >= max * 0.8) {
        console.warn(`[Shopify] Approaching rate limit: ${callLimit}`)
      }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new ShopifyAPIError(response.status, body, endpoint)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null
    }

    return response.json()
  }

  // =========================================================================
  // SHOP
  // =========================================================================

  async getShop() {
    const data = await this.request('shop.json')
    return data.shop
  }

  // =========================================================================
  // LOCATIONS
  // =========================================================================

  async getLocations() {
    const data = await this.request('locations.json')
    return data.locations || []
  }

  async getLocation(locationId) {
    const data = await this.request(`locations/${locationId}.json`)
    return data.location
  }

  // =========================================================================
  // PRODUCTS
  // =========================================================================

  async getProducts(params = {}) {
    const query = new URLSearchParams({
      limit: 250,
      ...params
    }).toString()
    const data = await this.request(`products.json?${query}`)
    return data.products || []
  }

  async getProductsCount(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`products/count.json?${query}`)
    return data.count
  }

  async getProduct(productId) {
    const data = await this.request(`products/${productId}.json`)
    return data.product
  }

  async createProduct(productData) {
    const data = await this.request('products.json', {
      method: 'POST',
      body: JSON.stringify({ product: productData })
    })
    return data.product
  }

  async updateProduct(productId, productData) {
    const data = await this.request(`products/${productId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product: productData })
    })
    return data.product
  }

  async deleteProduct(productId) {
    await this.request(`products/${productId}.json`, {
      method: 'DELETE'
    })
    return true
  }

  // =========================================================================
  // VARIANTS
  // =========================================================================

  async getVariant(variantId) {
    const data = await this.request(`variants/${variantId}.json`)
    return data.variant
  }

  async updateVariant(variantId, variantData) {
    const data = await this.request(`variants/${variantId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ variant: variantData })
    })
    return data.variant
  }

  // =========================================================================
  // INVENTORY
  // =========================================================================

  async getInventoryLevels(params = {}) {
    const query = new URLSearchParams(params).toString()
    const data = await this.request(`inventory_levels.json?${query}`)
    return data.inventory_levels || []
  }

  async getInventoryItem(inventoryItemId) {
    const data = await this.request(`inventory_items/${inventoryItemId}.json`)
    return data.inventory_item
  }

  /**
   * Set inventory level to a specific value
   */
  async setInventoryLevel(inventoryItemId, locationId, available) {
    const data = await this.request('inventory_levels/set.json', {
      method: 'POST',
      body: JSON.stringify({
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available: available
      })
    })
    return data.inventory_level
  }

  /**
   * Adjust inventory by a delta (+/-)
   */
  async adjustInventory(inventoryItemId, locationId, adjustment) {
    const data = await this.request('inventory_levels/adjust.json', {
      method: 'POST',
      body: JSON.stringify({
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available_adjustment: adjustment
      })
    })
    return data.inventory_level
  }

  // =========================================================================
  // ORDERS
  // =========================================================================

  async getOrders(params = {}) {
    const query = new URLSearchParams({
      status: 'any',
      limit: 50,
      ...params
    }).toString()
    const data = await this.request(`orders.json?${query}`)
    return data.orders || []
  }

  async getOrdersCount(params = {}) {
    const query = new URLSearchParams({
      status: 'any',
      ...params
    }).toString()
    const data = await this.request(`orders/count.json?${query}`)
    return data.count
  }

  async getOrder(orderId) {
    const data = await this.request(`orders/${orderId}.json`)
    return data.order
  }

  // =========================================================================
  // COLLECTIONS
  // =========================================================================

  async getCustomCollections(params = {}) {
    const query = new URLSearchParams({ limit: 250, ...params }).toString()
    const data = await this.request(`custom_collections.json?${query}`)
    return data.custom_collections || []
  }

  async getSmartCollections(params = {}) {
    const query = new URLSearchParams({ limit: 250, ...params }).toString()
    const data = await this.request(`smart_collections.json?${query}`)
    return data.smart_collections || []
  }

  // =========================================================================
  // WEBHOOKS
  // =========================================================================

  async getWebhooks() {
    const data = await this.request('webhooks.json')
    return data.webhooks || []
  }

  async createWebhook(topic, address) {
    const data = await this.request('webhooks.json', {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          topic,
          address,
          format: 'json'
        }
      })
    })
    return data.webhook
  }

  async deleteWebhook(webhookId) {
    await this.request(`webhooks/${webhookId}.json`, {
      method: 'DELETE'
    })
    return true
  }

  // =========================================================================
  // PAGINATION HELPER
  // =========================================================================

  /**
   * Fetch all pages of a paginated endpoint
   */
  async getAllPages(endpoint, key, params = {}) {
    const allItems = []
    let pageInfo = null
    let hasNextPage = true

    while (hasNextPage) {
      const queryParams = { limit: 250, ...params }
      if (pageInfo) {
        queryParams.page_info = pageInfo
      }

      const query = new URLSearchParams(queryParams).toString()
      const response = await fetch(`${this.baseUrl}/${endpoint}?${query}`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new ShopifyAPIError(response.status, body, endpoint)
      }

      const data = await response.json()
      const items = data[key] || []
      allItems.push(...items)

      // Check for next page via Link header
      const linkHeader = response.headers.get('Link')
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<[^>]*page_info=([^>&]*)[^>]*>;\s*rel="next"/)
        pageInfo = match ? match[1] : null
        hasNextPage = !!pageInfo
      } else {
        hasNextPage = false
      }

      // Rate limiting between pages
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
    }

    return allItems
  }
}

/**
 * Validate that an access token has required scopes
 */
export async function validateAccessToken(shopDomain, accessToken) {
  const client = new ShopifyClient(shopDomain, accessToken)
  
  try {
    const shop = await client.getShop()
    return {
      valid: true,
      shop: {
        id: shop.id,
        name: shop.name,
        email: shop.email,
        domain: shop.domain,
        myshopifyDomain: shop.myshopify_domain,
        planName: shop.plan_name,
        currency: shop.currency,
        timezone: shop.timezone,
        shopOwner: shop.shop_owner
      }
    }
  } catch (error) {
    console.error('[validateAccessToken] Error validating token:', {
      shopDomain,
      errorName: error.name,
      errorMessage: error.message,
      status: error.status,
      body: error.body,
      endpoint: error.endpoint
    })
    
    if (error instanceof ShopifyAPIError) {
      if (error.status === 401) {
        return { valid: false, error: 'Invalid access token' }
      }
      if (error.status === 402) {
        return { valid: false, error: 'Shop is frozen (payment issue)' }
      }
      if (error.status === 403) {
        return { valid: false, error: 'Access token lacks required permissions' }
      }
      if (error.status === 400) {
        return { valid: false, error: `Bad request: ${error.message}` }
      }
      if (error.status === 404) {
        return { valid: false, error: 'Shop not found - verify store domain is correct' }
      }
    }
    return { valid: false, error: error.message }
  }
}

export default ShopifyClient
