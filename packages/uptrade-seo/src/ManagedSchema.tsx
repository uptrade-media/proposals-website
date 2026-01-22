import * as React from 'react'
import { getSchemaMarkups } from './supabase'
import type { ManagedSchemaProps } from './types'

/**
 * ManagedSchema - Server Component that injects JSON-LD schema
 * 
 * Fetches schema markup from Portal and renders as script tags
 * 
 * @example
 * ```tsx
 * // app/services/[slug]/page.tsx
 * import { ManagedSchema } from '@uptrade/seo'
 * 
 * export default async function ServicePage({ params }) {
 *   return (
 *     <>
 *       <ManagedSchema 
 *         projectId={process.env.UPTRADE_PROJECT_ID!}
 *         path={`/services/${params.slug}`}
 *       />
 *       <main>...</main>
 *     </>
 *   )
 * }
 * ```
 */
export async function ManagedSchema({
  projectId,
  path,
  additionalSchemas = [],
  includeTypes,
  excludeTypes,
}: ManagedSchemaProps): Promise<React.ReactElement | null> {
  const schemas = await getSchemaMarkups(projectId, path, {
    includeTypes,
    excludeTypes,
  })

  // Combine managed schemas with additional ones
  const allSchemas = [
    ...schemas.map(s => s.schema_json),
    ...additionalSchemas,
  ]

  if (allSchemas.length === 0) {
    return null
  }

  // If multiple schemas, wrap in @graph
  const schemaContent = allSchemas.length === 1
    ? allSchemas[0]
    : {
        '@context': 'https://schema.org',
        '@graph': allSchemas.map(s => {
          // Remove @context from individual schemas when in graph
          const { '@context': _, ...rest } = s as Record<string, unknown>
          return rest
        }),
      }

  // Add @context if not in graph mode
  const finalSchema = allSchemas.length === 1
    ? { '@context': 'https://schema.org', ...schemaContent as Record<string, unknown> }
    : schemaContent

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(finalSchema, null, 0),
      }}
    />
  )
}

/**
 * Generate schema for a specific type with managed data
 * 
 * Helper to create common schema types
 */
export function createSchema(
  type: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  }
}

/**
 * Create BreadcrumbList schema from path
 */
export function createBreadcrumbSchema(
  baseUrl: string,
  path: string,
  labels?: Record<string, string>
): Record<string, unknown> {
  const segments = path.split('/').filter(Boolean)
  
  const items = segments.map((segment, index) => {
    const itemPath = '/' + segments.slice(0, index + 1).join('/')
    const label = labels?.[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    return {
      '@type': 'ListItem',
      position: index + 1,
      name: label,
      item: `${baseUrl}${itemPath}`,
    }
  })

  // Add home as first item
  items.unshift({
    '@type': 'ListItem',
    position: 0,
    name: 'Home',
    item: baseUrl,
  })

  // Re-number positions
  items.forEach((item, index) => {
    item.position = index + 1
  })

  return createSchema('BreadcrumbList', {
    itemListElement: items,
  })
}

export default ManagedSchema
