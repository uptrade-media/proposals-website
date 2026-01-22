import type { Metadata } from 'next'
import { getSEOPageData, getABTest, recordABImpression } from './api'
import type { 
  GetManagedMetadataOptions, 
  ManagedMetadataResult,
  GetABVariantOptions,
  ABTestResult 
} from './types'

/**
 * Get managed metadata for a page
 * 
 * Use in generateMetadata() to fetch Portal-managed SEO data
 * 
 * @example
 * ```tsx
 * export async function generateMetadata({ params }) {
 *   return getManagedMetadata({
 *     projectId: process.env.UPTRADE_PROJECT_ID!,
 *     path: `/services/${params.slug}`,
 *     fallback: {
 *       title: 'Our Services',
 *       description: 'Learn about our services'
 *     }
 *   })
 * }
 * ```
 */
export async function getManagedMetadata(
  options: GetManagedMetadataOptions
): Promise<ManagedMetadataResult> {
  const { projectId, path, fallback = {}, overrides = {} } = options

  const pageData = await getSEOPageData(projectId, path)

  // If no managed data, return fallback
  if (!pageData) {
    return {
      ...fallback,
      ...overrides,
      _managed: false,
      _source: 'fallback',
    } as ManagedMetadataResult
  }

  // Build metadata from managed values, falling back to provided fallbacks
  const metadata: ManagedMetadataResult = {
    _managed: true,
    _source: 'database',
  }

  // Title
  if (pageData.managed_title) {
    metadata.title = pageData.managed_title
  } else if (fallback.title) {
    metadata.title = fallback.title
  }

  // Description
  if (pageData.managed_description) {
    metadata.description = pageData.managed_description
  } else if (fallback.description) {
    metadata.description = fallback.description
  }

  // Keywords
  if (pageData.managed_keywords?.length) {
    metadata.keywords = pageData.managed_keywords
  } else if (fallback.keywords) {
    metadata.keywords = fallback.keywords
  }

  // Robots
  if (pageData.managed_robots) {
    metadata.robots = pageData.managed_robots
  }

  // Canonical
  if (pageData.managed_canonical) {
    metadata.alternates = {
      ...metadata.alternates,
      canonical: pageData.managed_canonical,
    }
  }

  // Open Graph
  const ogTitle = pageData.managed_og_title || pageData.managed_title
  const ogDescription = pageData.managed_og_description || pageData.managed_description
  const ogImage = pageData.managed_og_image

  if (ogTitle || ogDescription || ogImage) {
    metadata.openGraph = {
      ...(ogTitle && { title: ogTitle }),
      ...(ogDescription && { description: ogDescription }),
      ...(ogImage && { images: [{ url: ogImage }] }),
    }
  }

  // Twitter (use OG values as fallback)
  if (ogTitle || ogDescription || ogImage) {
    metadata.twitter = {
      card: 'summary_large_image',
      ...(ogTitle && { title: ogTitle }),
      ...(ogDescription && { description: ogDescription }),
      ...(ogImage && { images: [ogImage] }),
    }
  }

  // Apply overrides last
  return {
    ...metadata,
    ...overrides,
    _managed: true,
    _source: 'database',
  }
}

/**
 * Get A/B test variant for a field
 * 
 * @example
 * ```tsx
 * const variant = await getABVariant({
 *   projectId: process.env.UPTRADE_PROJECT_ID!,
 *   path: '/pricing',
 *   field: 'title',
 *   sessionId: cookies().get('session_id')?.value
 * })
 * 
 * if (variant) {
 *   // Use variant.value instead of default
 * }
 * ```
 */
export async function getABVariant(
  options: GetABVariantOptions
): Promise<ABTestResult | null> {
  const { projectId, path, field, sessionId } = options

  const test = await getABTest(projectId, path, field)

  if (!test) {
    return null
  }

  // Determine variant based on session ID or random
  let variant: 'a' | 'b'
  
  if (sessionId) {
    // Consistent variant for same session
    const hash = sessionId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0)
    variant = (Math.abs(hash) % 100) < (test.traffic_split * 100) ? 'a' : 'b'
  } else {
    // Random variant
    variant = Math.random() < test.traffic_split ? 'a' : 'b'
  }

  // Record impression (fire and forget)
  recordABImpression(test.id, variant, sessionId).catch(() => {
    // Silently fail - don't block rendering
  })

  return {
    testId: test.id,
    variant,
    value: variant === 'a' ? test.variant_a : test.variant_b,
  }
}

/**
 * Get managed metadata with A/B test support
 * 
 * Automatically applies running A/B test variants to metadata
 */
export async function getManagedMetadataWithAB(
  options: GetManagedMetadataOptions & { sessionId?: string }
): Promise<ManagedMetadataResult> {
  const { sessionId, ...metadataOptions } = options
  
  // Get base metadata
  const metadata = await getManagedMetadata(metadataOptions)

  // Check for title A/B test
  const titleTest = await getABVariant({
    projectId: options.projectId,
    path: options.path,
    field: 'title',
    sessionId,
  })

  if (titleTest) {
    metadata.title = titleTest.value
  }

  // Check for description A/B test
  const descTest = await getABVariant({
    projectId: options.projectId,
    path: options.path,
    field: 'description',
    sessionId,
  })

  if (descTest) {
    metadata.description = descTest.value
  }

  return metadata
}
