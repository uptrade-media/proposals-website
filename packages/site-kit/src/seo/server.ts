// @uptrade/seo/server - Server-only utilities
// All data fetching goes through Portal API with API key auth

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
  registerSitemap,
} from './api'

// ============================================
// Build-Time Utilities
// ============================================
export {
  generateSitemap,
  registerLocalSitemap,
} from './routing'

// ============================================
// Re-export types
// ============================================
export type * from './types'
