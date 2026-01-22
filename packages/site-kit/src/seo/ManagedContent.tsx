import * as React from 'react'
import { getContentBlock } from './api'
import type { ManagedContentProps, ManagedContentBlock } from './types'

/**
 * Parse and render markdown content (basic support)
 * For full markdown, use a proper parser in your custom renderer
 */
function renderMarkdown(content: string): string {
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
    // Paragraphs
    .replace(/\n\n/gim, '</p><p>')
    .replace(/^(.+)$/gim, '<p>$1</p>')
}

/**
 * ManagedContent - Server Component for CMS-controlled content blocks
 * 
 * Fetches content sections from Portal and renders them
 * Supports HTML, Markdown, JSON, and React component references
 * 
 * @example
 * ```tsx
 * // Hero section managed by Portal
 * import { ManagedContent } from '@uptrade/seo'
 * 
 * export default async function ServicePage({ params }) {
 *   return (
 *     <main>
 *       <ManagedContent 
 *         projectId={process.env.UPTRADE_PROJECT_ID!}
 *         path={`/services/${params.slug}`}
 *         section="hero"
 *         fallback={<DefaultHero />}
 *       />
 *       
 *       <ManagedContent 
 *         projectId={process.env.UPTRADE_PROJECT_ID!}
 *         path={`/services/${params.slug}`}
 *         section="features"
 *       />
 *       
 *       <ManagedContent 
 *         projectId={process.env.UPTRADE_PROJECT_ID!}
 *         path={`/services/${params.slug}`}
 *         section="cta"
 *       />
 *     </main>
 *   )
 * }
 * ```
 */
export async function ManagedContent({
  projectId,
  path,
  section,
  fallback,
  className,
  components = {},
}: ManagedContentProps): Promise<React.ReactElement | null> {
  const block = await getContentBlock(projectId, path, section)

  if (!block) {
    if (fallback) {
      return <>{fallback}</>
    }
    return null
  }

  const containerClass = className || `uptrade-content uptrade-content--${section}`

  // Handle different content types
  switch (block.content_type) {
    case 'html':
      return (
        <div 
          className={containerClass}
          dangerouslySetInnerHTML={{ __html: block.content as string }}
        />
      )

    case 'markdown':
      const htmlContent = renderMarkdown(block.content as string)
      return (
        <div 
          className={containerClass}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      )

    case 'json':
      // JSON content for structured data - render as data attributes or custom handling
      const jsonData = typeof block.content === 'string' 
        ? JSON.parse(block.content)
        : block.content

      return (
        <div 
          className={containerClass}
          data-content={JSON.stringify(jsonData)}
        >
          {/* Render JSON structure - customize based on your needs */}
          {jsonData.title && <h2>{jsonData.title}</h2>}
          {jsonData.subtitle && <p className="subtitle">{jsonData.subtitle}</p>}
          {jsonData.content && <div dangerouslySetInnerHTML={{ __html: jsonData.content }} />}
          {jsonData.items && (
            <ul>
              {jsonData.items.map((item: { text: string } | string, index: number) => (
                <li key={index}>{typeof item === 'string' ? item : item.text}</li>
              ))}
            </ul>
          )}
        </div>
      )

    case 'react':
      // React component reference - lookup from provided components map
      const componentData = typeof block.content === 'string'
        ? JSON.parse(block.content)
        : block.content as Record<string, unknown>

      const componentName = componentData.component as string
      const componentProps = componentData.props as Record<string, unknown> || {}

      const Component = components[componentName]
      
      if (!Component) {
        console.warn(`@uptrade/seo: Component "${componentName}" not found in components map`)
        return fallback ? <>{fallback}</> : null
      }

      return (
        <div className={containerClass}>
          <Component {...componentProps} />
        </div>
      )

    default:
      console.warn(`@uptrade/seo: Unknown content type "${block.content_type}"`)
      return fallback ? <>{fallback}</> : null
  }
}

/**
 * Get content block data without rendering
 * 
 * Useful when you need to access the raw data
 */
export async function getManagedContentData(
  projectId: string,
  path: string,
  section: string
): Promise<ManagedContentBlock | null> {
  return getContentBlock(projectId, path, section)
}

export default ManagedContent
