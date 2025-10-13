/**
 * Database Connection Utility with Caching
 * 
 * Provides a single, reusable database connection for all Netlify functions.
 * Implements connection caching to improve performance and reduce overhead.
 * 
 * Usage:
 * ```javascript
 * import { getDb, sql } from './utils/db.js'
 * 
 * export async function handler(event) {
 *   const db = getDb()
 *   
 *   // Use Drizzle ORM
 *   const projects = await db.query.projects.findMany()
 *   
 *   // Or use raw SQL
 *   const result = await sql`SELECT * FROM projects`
 *   
 *   return { statusCode: 200, body: JSON.stringify({ projects }) }
 * }
 * ```
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../../../src/db/schema.ts'

// Cache the database connection
let cachedDb = null
let cachedSql = null

/**
 * Get or create cached database connection
 * @param {boolean} enableLogging - Enable SQL query logging (default: false)
 * @returns {object} Drizzle database instance
 */
export function getDb(enableLogging = false) {
  if (!cachedDb) {
    // Validate DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    // Create Neon SQL connection with caching enabled
    const sql = neon(process.env.DATABASE_URL, {
      fetchConnectionCache: true,
      fullResults: false,
    })

    // Create Drizzle instance
    cachedDb = drizzle(sql, { 
      schema,
      logger: enableLogging
    })

    cachedSql = sql

    // Log connection creation in development
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log('✓ Database connection created and cached')
    }
  }

  return cachedDb
}

/**
 * Get the raw SQL client (for queries not using Drizzle ORM)
 * @returns {Function} Neon SQL client
 */
export function getSql() {
  if (!cachedSql) {
    // Create connection if not exists
    getDb()
  }
  return cachedSql
}

/**
 * Reset cached connections (useful for testing)
 */
export function resetCache() {
  cachedDb = null
  cachedSql = null
}

/**
 * Execute a raw SQL query with proper error handling
 * @param {string} query - SQL query string
 * @param {array} params - Query parameters
 * @returns {Promise<array>} Query results
 */
export async function executeQuery(query, params = []) {
  const sql = getSql()
  
  try {
    const result = await sql(query, params)
    return result
  } catch (error) {
    console.error('Database query error:', {
      query: query.substring(0, 200),
      error: error.message
    })
    throw error
  }
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Callback function that receives transaction object
 * @returns {Promise<any>} Transaction result
 */
export async function withTransaction(callback) {
  const db = getDb()
  
  try {
    return await db.transaction(async (tx) => {
      return await callback(tx)
    })
  } catch (error) {
    console.error('Transaction error:', error.message)
    throw error
  }
}

/**
 * Utility: Check database connection health
 * @returns {Promise<boolean>} True if connection is healthy
 */
export async function checkConnection() {
  try {
    const sql = getSql()
    await sql`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection check failed:', error.message)
    return false
  }
}

/**
 * Utility: Get database connection stats
 * @returns {object} Connection statistics
 */
export function getConnectionStats() {
  return {
    cached: cachedDb !== null,
    sqlCached: cachedSql !== null,
    databaseUrl: process.env.DATABASE_URL ? 'set' : 'not set',
    environment: process.env.NODE_ENV || 'production'
  }
}

// Re-export schema for convenience
export { schema }

// Export a default instance
export default getDb
