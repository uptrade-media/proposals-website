/**
 * Rate Limiter for Netlify Functions
 * 
 * Prevents abuse by limiting requests per IP address.
 * Uses in-memory storage (suitable for serverless with short lifespans).
 * 
 * Usage:
 * ```javascript
 * import { RateLimiter } from './utils/rate-limit.js'
 * 
 * const rateLimiter = new RateLimiter()
 * 
 * export async function handler(event) {
 *   const ip = event.headers['x-forwarded-for'] || 'unknown'
 *   const { allowed, retryAfter, remaining } = rateLimiter.check(ip, 100, 60000)
 *   
 *   if (!allowed) {
 *     return {
 *       statusCode: 429,
 *       headers: { 
 *         'Retry-After': Math.ceil(retryAfter / 1000),
 *         'X-RateLimit-Remaining': 0
 *       },
 *       body: JSON.stringify({ error: 'Too many requests' })
 *     }
 *   }
 *   
 *   // ... rest of function
 * }
 * ```
 */

export class RateLimiter {
  constructor() {
    // Store: Map<identifier, Array<timestamp>>
    this.requests = new Map()
    
    // Clean up old entries periodically
    this.startCleanup()
  }

  /**
   * Check if request should be allowed
   * @param {string} identifier - Unique identifier (usually IP address)
   * @param {number} limit - Maximum requests allowed in window
   * @param {number} windowMs - Time window in milliseconds (default: 60 seconds)
   * @returns {object} { allowed: boolean, retryAfter: number, remaining: number }
   */
  check(identifier, limit = 100, windowMs = 60000) {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []
    
    // Remove requests outside the current window
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs)
    
    // Check if limit exceeded
    if (validRequests.length >= limit) {
      const oldestRequest = Math.min(...validRequests)
      const retryAfter = windowMs - (now - oldestRequest)
      
      return {
        allowed: false,
        retryAfter: Math.max(0, retryAfter),
        remaining: 0,
        limit,
        resetAt: new Date(oldestRequest + windowMs).toISOString()
      }
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return {
      allowed: true,
      retryAfter: 0,
      remaining: limit - validRequests.length,
      limit,
      resetAt: new Date(now + windowMs).toISOString()
    }
  }

  /**
   * Get current usage for an identifier
   * @param {string} identifier - Unique identifier
   * @param {number} windowMs - Time window in milliseconds
   * @returns {object} Usage statistics
   */
  getUsage(identifier, windowMs = 60000) {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs)
    
    return {
      count: validRequests.length,
      oldestRequest: validRequests.length > 0 ? 
        new Date(Math.min(...validRequests)).toISOString() : null,
      newestRequest: validRequests.length > 0 ? 
        new Date(Math.max(...validRequests)).toISOString() : null
    }
  }

  /**
   * Reset rate limit for a specific identifier
   * @param {string} identifier - Unique identifier to reset
   */
  reset(identifier) {
    this.requests.delete(identifier)
  }

  /**
   * Clear all rate limit data
   */
  clear() {
    this.requests.clear()
  }

  /**
   * Start periodic cleanup of old entries
   * @private
   */
  startCleanup() {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const maxAge = 3600000 // 1 hour
      
      for (const [identifier, requests] of this.requests.entries()) {
        const validRequests = requests.filter(timestamp => now - timestamp < maxAge)
        
        if (validRequests.length === 0) {
          this.requests.delete(identifier)
        } else {
          this.requests.set(identifier, validRequests)
        }
      }
    }, 300000) // 5 minutes
    
    // Don't prevent process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

/**
 * Preset rate limiters for different scenarios
 */
export const rateLimiters = {
  // Strict: For sensitive operations like login, password reset
  strict: new RateLimiter(),
  strictCheck: (ip) => rateLimiters.strict.check(ip, 5, 300000), // 5 req per 5 min

  // Standard: For normal authenticated operations
  standard: new RateLimiter(),
  standardCheck: (ip) => rateLimiters.standard.check(ip, 100, 60000), // 100 req per min

  // Relaxed: For read-only operations
  relaxed: new RateLimiter(),
  relaxedCheck: (ip) => rateLimiters.relaxed.check(ip, 300, 60000), // 300 req per min
}

/**
 * Helper function to extract IP from Netlify event
 * @param {object} event - Netlify function event
 * @returns {string} IP address
 */
export function getClientIp(event) {
  return event.headers['x-forwarded-for']?.split(',')[0].trim() ||
         event.headers['x-nf-client-connection-ip'] ||
         event.headers['x-real-ip'] ||
         'unknown'
}

/**
 * Helper function to create rate limit response
 * @param {object} rateLimit - Rate limit check result
 * @returns {object} Netlify function response
 */
export function rateLimitResponse(rateLimit) {
  return {
    statusCode: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': Math.ceil(rateLimit.retryAfter / 1000).toString(),
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': rateLimit.resetAt
    },
    body: JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${Math.ceil(rateLimit.retryAfter / 1000)} seconds.`,
      retryAfter: Math.ceil(rateLimit.retryAfter / 1000),
      resetAt: rateLimit.resetAt
    })
  }
}

/**
 * Helper function to add rate limit headers to successful responses
 * @param {object} response - Original response
 * @param {object} rateLimit - Rate limit check result
 * @returns {object} Response with rate limit headers
 */
export function withRateLimitHeaders(response, rateLimit) {
  return {
    ...response,
    headers: {
      ...response.headers,
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.resetAt
    }
  }
}

/**
 * Wrapper function to automatically apply rate limiting to handlers
 * @param {Function} handler - Original handler function
 * @param {object} options - Rate limit options
 */
export function withRateLimit(handler, options = {}) {
  const {
    limit = 100,
    windowMs = 60000,
    keyGenerator = getClientIp
  } = options

  const limiter = new RateLimiter()

  return async (event, context) => {
    const key = keyGenerator(event)
    const rateLimit = limiter.check(key, limit, windowMs)

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit)
    }

    const response = await handler(event, context)
    return withRateLimitHeaders(response, rateLimit)
  }
}
