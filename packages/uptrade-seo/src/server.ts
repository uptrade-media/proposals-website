// @uptrade/seo/server - Server-only utilities
// Direct database access functions for advanced use cases

// ============================================
// Supabase Client
// ============================================
export { 
  getSupabaseClient,
  resetSupabaseClient,
} from './supabase'

// ============================================
// Raw Data Fetchers (cached per request)
// ============================================
export {
  getSEOPageData,
  getSchemaMarkups,
  getFAQData,
  getInternalLinks,
  getContentBlock,
  getABTest,
  recordABImpression,
  getRedirectData,
  getManagedScripts,
  getRobotsData,
  getSitemapEntries,
} from './supabase'

// ============================================
// Re-export types
// ============================================
export type * from './types'
