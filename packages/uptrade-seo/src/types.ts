import type { Metadata } from 'next'

// ============================================
// Core Types
// ============================================

export interface UptradeSEOConfig {
  projectId: string
  supabaseUrl?: string
  supabaseKey?: string
}

export interface SEOPageData {
  id: string
  project_id: string
  path: string
  url?: string
  managed_title?: string
  managed_description?: string
  managed_og_title?: string
  managed_og_description?: string
  managed_og_image?: string
  managed_canonical?: string
  managed_robots?: string
  managed_keywords?: string[]
  updated_at: string
}

// ============================================
// Metadata Types
// ============================================

export interface GetManagedMetadataOptions {
  projectId: string
  path: string
  fallback?: Metadata
  /** Override specific fields even if managed values exist */
  overrides?: Partial<Metadata>
}

export interface ManagedMetadataResult extends Metadata {
  _managed: boolean
  _source: 'database' | 'fallback'
}

// ============================================
// Schema Types
// ============================================

export interface SchemaMarkup {
  id: string
  project_id: string
  page_id?: string
  page_path?: string
  schema_type: string
  schema_json: Record<string, unknown>
  is_implemented: boolean
  validation_status: 'valid' | 'warning' | 'error'
}

export interface ManagedSchemaProps {
  projectId: string
  path: string
  /** Additional schemas to merge */
  additionalSchemas?: Record<string, unknown>[]
  /** Schema types to include (default: all) */
  includeTypes?: string[]
  /** Schema types to exclude */
  excludeTypes?: string[]
}

// ============================================
// FAQ Types
// ============================================

export interface FAQItem {
  id: string
  question: string
  answer: string
  order: number
  is_visible: boolean
}

export interface ManagedFAQData {
  id: string
  project_id: string
  path: string
  title?: string
  description?: string
  items: FAQItem[]
  include_schema: boolean
  updated_at: string
}

export interface ManagedFAQProps {
  projectId: string
  path: string
  /** Custom wrapper className */
  className?: string
  /** Render FAQ item (custom rendering) */
  renderItem?: (item: FAQItem, index: number) => React.ReactNode
  /** Include FAQ schema in page */
  includeSchema?: boolean
  /** Show section title */
  showTitle?: boolean
}

// ============================================
// Internal Links Types
// ============================================

export interface ManagedLink {
  id: string
  project_id: string
  source_path: string
  target_path: string
  target_url?: string
  anchor_text: string
  position: 'inline' | 'sidebar' | 'bottom' | 'related'
  context?: string
  is_active: boolean
  priority: number
}

export interface ManagedInternalLinksProps {
  projectId: string
  path: string
  position?: 'inline' | 'sidebar' | 'bottom' | 'related'
  /** Maximum links to show */
  limit?: number
  className?: string
  /** Custom link renderer */
  renderLink?: (link: ManagedLink) => React.ReactNode
}

// ============================================
// Content Block Types
// ============================================

export interface ManagedContentBlock {
  id: string
  project_id: string
  path: string
  section: string
  content_type: 'html' | 'markdown' | 'json' | 'react'
  content: string | Record<string, unknown>
  is_published: boolean
  published_at?: string
  updated_at: string
}

export interface ManagedContentProps {
  projectId: string
  path: string
  section: string
  /** Fallback content if none found */
  fallback?: React.ReactNode
  className?: string
  /** For 'react' type, map of component names to components */
  components?: Record<string, React.ComponentType<unknown>>
}

// ============================================
// A/B Test Types
// ============================================

export interface ABTest {
  id: string
  project_id: string
  path: string
  field: 'title' | 'description' | 'content'
  variant_a: string
  variant_b: string
  traffic_split: number
  status: 'draft' | 'running' | 'paused' | 'completed'
  winner?: 'a' | 'b'
  started_at?: string
  ended_at?: string
}

export interface ABTestResult {
  testId: string
  variant: 'a' | 'b'
  value: string
}

export interface GetABVariantOptions {
  projectId: string
  path: string
  field: 'title' | 'description' | 'content'
  /** Session/visitor ID for consistent variant assignment */
  sessionId?: string
}

// ============================================
// Redirect Types
// ============================================

export interface ManagedRedirect {
  id: string
  project_id: string
  source_path: string
  destination_path: string
  destination_url?: string
  status_code: 301 | 302 | 307 | 308
  is_active: boolean
  is_regex: boolean
  priority: number
  expires_at?: string
}

export interface GetRedirectOptions {
  projectId: string
  path: string
}

export interface RedirectResult {
  destination: string
  statusCode: 301 | 302 | 307 | 308
  isExternal: boolean
}

// ============================================
// Scripts Types
// ============================================

export interface ManagedScript {
  id: string
  project_id: string
  name: string
  script_type: 'inline' | 'external'
  position: 'head' | 'body-start' | 'body-end'
  content?: string
  src?: string
  async?: boolean
  defer?: boolean
  attributes?: Record<string, string>
  is_active: boolean
  load_on?: 'all' | 'specific'
  paths?: string[]
  priority: number
}

export interface ManagedScriptsProps {
  projectId: string
  position: 'head' | 'body-start' | 'body-end'
  /** Current path for path-specific scripts */
  path?: string
}

// ============================================
// Robots Types
// ============================================

export interface RobotsDirective {
  index: boolean
  follow: boolean
  noarchive?: boolean
  nosnippet?: boolean
  noimageindex?: boolean
  max_snippet?: number
  max_image_preview?: 'none' | 'standard' | 'large'
  max_video_preview?: number
}

export interface GetRobotsOptions {
  projectId: string
  path: string
}

// ============================================
// Sitemap Types
// ============================================

export interface SitemapEntry {
  path: string
  url: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  images?: Array<{ url: string; title?: string; caption?: string }>
}

export interface GetSitemapEntriesOptions {
  projectId: string
  baseUrl: string
  /** Include only published/indexed pages */
  publishedOnly?: boolean
}
