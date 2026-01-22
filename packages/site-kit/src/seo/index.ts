// @uptrade/seo - Main entry point
// React Server Components and utilities for managed SEO

// ============================================
// Types
// ============================================
export type {
  UptradeSEOConfig,
  SEOPageData,
  GetManagedMetadataOptions,
  ManagedMetadataResult,
  SchemaMarkup,
  ManagedSchemaProps,
  FAQItem,
  ManagedFAQData,
  ManagedFAQProps,
  ManagedLink,
  ManagedInternalLinksProps,
  ManagedContentBlock,
  ManagedContentProps,
  ABTest,
  ABTestResult,
  GetABVariantOptions,
  ManagedRedirect,
  GetRedirectOptions,
  RedirectResult,
  ManagedScript,
  ManagedScriptsProps,
  RobotsDirective,
  GetRobotsOptions,
  SitemapEntry,
  GetSitemapEntriesOptions,
} from './types'

// ============================================
// Metadata Functions
// ============================================
export { 
  getManagedMetadata,
  getManagedMetadataWithAB,
  getABVariant,
} from './getManagedMetadata'

// ============================================
// Routing Functions
// ============================================
export {
  getRedirect,
  getRobotsDirective,
  generateSitemap,
  isIndexable,
} from './routing'

// ============================================
// React Server Components
// ============================================
export { ManagedSchema, createSchema, createBreadcrumbSchema } from './ManagedSchema'
export { ManagedFAQ } from './ManagedFAQ'
export { ManagedInternalLinks } from './ManagedInternalLinks'
export { ManagedContent, getManagedContentData } from './ManagedContent'
export { ManagedScripts, ManagedNoScripts } from './ManagedScripts'

// ============================================
// Client Components
// ============================================
export { SitemapSync } from './SitemapSync'

// ============================================
// Default exports for convenience
// ============================================
export { ManagedSchema as default } from './ManagedSchema'
