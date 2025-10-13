/**
 * Pagination Utility for Netlify Functions
 * 
 * Provides consistent pagination across all list endpoints.
 * 
 * Usage:
 * ```javascript
 * import { parsePagination, paginationResponse } from './utils/pagination.js'
 * import { desc } from 'drizzle-orm'
 * 
 * export async function handler(event) {
 *   const params = new URLSearchParams(event.rawQuery || '')
 *   const { page, limit, offset } = parsePagination(params)
 *   
 *   // Query with pagination
 *   const projects = await db.query.projects.findMany({
 *     limit,
 *     offset,
 *     orderBy: desc(schema.projects.createdAt)
 *   })
 *   
 *   // Get total count
 *   const [{ count }] = await db.select({ count: sql\`COUNT(*)\` })
 *     .from(schema.projects)
 *   
 *   return {
 *     statusCode: 200,
 *     body: JSON.stringify(
 *       paginationResponse(projects, count, page, limit)
 *     )
 *   }
 * }
 * ```
 */

import { sql } from 'drizzle-orm'

/**
 * Parse pagination parameters from query string
 * @param {URLSearchParams} params - URL search params
 * @param {object} options - Pagination options
 * @returns {object} { page, limit, offset }
 */
export function parsePagination(params, options = {}) {
  const {
    defaultLimit = 50,
    maxLimit = 100
  } = options

  // Parse page number (default: 1)
  let page = parseInt(params.get('page') || '1')
  if (isNaN(page) || page < 1) {
    page = 1
  }

  // Parse limit (default: 50, max: 100)
  let limit = parseInt(params.get('limit') || defaultLimit.toString())
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit
  }
  if (limit > maxLimit) {
    limit = maxLimit
  }

  // Calculate offset
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Create a paginated response object
 * @param {array} items - Array of items for current page
 * @param {number} total - Total count of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {object} meta - Additional metadata
 * @returns {object} Paginated response
 */
export function paginationResponse(items, total, page, limit, meta = {}) {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null,
      startIndex: (page - 1) * limit + 1,
      endIndex: Math.min(page * limit, total)
    },
    ...meta
  }
}

/**
 * Get pagination headers for response
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total count
 * @param {string} baseUrl - Base URL for link generation
 * @returns {object} Headers object
 */
export function getPaginationHeaders(page, limit, total, baseUrl) {
  const totalPages = Math.ceil(total / limit)
  const links = []

  // First page
  if (page > 1) {
    links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`)
  }

  // Previous page
  if (page > 1) {
    links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`)
  }

  // Next page
  if (page < totalPages) {
    links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`)
  }

  // Last page
  if (page < totalPages) {
    links.push(`<${baseUrl}?page=${totalPages}&limit=${limit}>; rel="last"`)
  }

  return {
    'X-Total-Count': total.toString(),
    'X-Page': page.toString(),
    'X-Per-Page': limit.toString(),
    'X-Total-Pages': totalPages.toString(),
    ...(links.length > 0 && { 'Link': links.join(', ') })
  }
}

/**
 * Cursor-based pagination parser (for infinite scroll)
 * @param {URLSearchParams} params - URL search params
 * @param {object} options - Options
 * @returns {object} { cursor, limit }
 */
export function parseCursorPagination(params, options = {}) {
  const {
    defaultLimit = 50,
    maxLimit = 100
  } = options

  const cursor = params.get('cursor') || null
  
  let limit = parseInt(params.get('limit') || defaultLimit.toString())
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit
  }
  if (limit > maxLimit) {
    limit = maxLimit
  }

  return { cursor, limit }
}

/**
 * Create cursor-based pagination response
 * @param {array} items - Array of items
 * @param {Function} getCursor - Function to get cursor from item
 * @param {number} limit - Requested limit
 * @returns {object} Cursor pagination response
 */
export function cursorPaginationResponse(items, getCursor, limit) {
  const hasMore = items.length > limit
  const resultItems = hasMore ? items.slice(0, limit) : items
  
  const nextCursor = hasMore ? getCursor(items[limit - 1]) : null

  return {
    items: resultItems,
    pagination: {
      nextCursor,
      hasMore,
      count: resultItems.length
    }
  }
}

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @throws {Error} If parameters are invalid
 */
export function validatePagination(page, limit) {
  if (page < 1) {
    throw new Error('Page number must be greater than 0')
  }
  if (limit < 1) {
    throw new Error('Limit must be greater than 0')
  }
  if (limit > 100) {
    throw new Error('Limit cannot exceed 100')
  }
}

/**
 * Calculate pagination bounds
 * @param {number} page - Current page
 * @param {number} totalPages - Total pages
 * @param {number} delta - Number of pages to show on each side
 * @returns {array} Array of page numbers to display
 */
export function getPaginationBounds(page, totalPages, delta = 2) {
  const range = []
  const rangeWithDots = []
  let l

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      range.push(i)
    }
  }

  range.forEach(i => {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  })

  return rangeWithDots
}

/**
 * Helper to count total records with filters
 * @param {object} db - Drizzle database instance
 * @param {object} table - Drizzle table
 * @param {object} where - Where conditions
 * @returns {Promise<number>} Total count
 */
export async function countRecords(db, table, where = null) {
  const query = db.select({ count: sql`COUNT(*)::int` }).from(table)
  
  if (where) {
    query.where(where)
  }

  const [{ count }] = await query
  return count
}

/**
 * Wrapper function to add pagination to handlers
 * @param {Function} handler - Handler that receives pagination params
 */
export function withPagination(handler) {
  return async (event, context) => {
    const params = new URLSearchParams(event.rawQuery || '')
    const pagination = parsePagination(params)

    try {
      validatePagination(pagination.page, pagination.limit)
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message })
      }
    }

    return handler(event, context, pagination)
  }
}
