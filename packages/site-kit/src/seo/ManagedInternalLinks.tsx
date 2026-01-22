import * as React from 'react'
import { getInternalLinks } from './api'
import type { ManagedInternalLinksProps, ManagedLink } from './types'

/**
 * Default link renderer
 */
function DefaultLinkRenderer({ link }: { link: ManagedLink }) {
  const href = link.target_url || link.target_path
  
  return (
    <a 
      key={link.id}
      href={href}
      className="uptrade-internal-link"
    >
      {link.anchor_text}
    </a>
  )
}

/**
 * ManagedInternalLinks - Server Component for AI-suggested internal links
 * 
 * Fetches internal link suggestions from Portal and renders them
 * 
 * @example
 * ```tsx
 * // In your article component
 * import { ManagedInternalLinks } from '@uptrade/seo'
 * 
 * export default async function BlogPost({ params }) {
 *   return (
 *     <article>
 *       <p>Your content here...</p>
 *       
 *       <ManagedInternalLinks 
 *         projectId={process.env.UPTRADE_PROJECT_ID!}
 *         path={`/blog/${params.slug}`}
 *         position="bottom"
 *         limit={5}
 *       />
 *     </article>
 *   )
 * }
 * ```
 */
export async function ManagedInternalLinks({
  projectId,
  path,
  position = 'bottom',
  limit = 5,
  className,
  renderLink,
}: ManagedInternalLinksProps): Promise<React.ReactElement | null> {
  const links = await getInternalLinks(projectId, path, { position, limit })

  if (!links.length) {
    return null
  }

  const containerClass = className || `uptrade-internal-links uptrade-internal-links--${position}`

  // Different layouts based on position
  if (position === 'inline') {
    // Inline links are meant to be inserted into content
    return (
      <span className={containerClass}>
        {links.map((link: ManagedLink) => 
          renderLink ? renderLink(link) : <DefaultLinkRenderer key={link.id} link={link} />
        )}
      </span>
    )
  }

  if (position === 'sidebar') {
    return (
      <aside className={containerClass}>
        <h4 className="uptrade-internal-links-title">Related Pages</h4>
        <ul className="uptrade-internal-links-list">
          {links.map((link: ManagedLink) => (
            <li key={link.id}>
              {renderLink ? renderLink(link) : <DefaultLinkRenderer link={link} />}
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  if (position === 'related') {
    return (
      <nav className={containerClass} aria-label="Related content">
        <h3 className="uptrade-internal-links-title">You May Also Like</h3>
        <div className="uptrade-internal-links-grid">
          {links.map((link: ManagedLink) => (
            <div key={link.id} className="uptrade-internal-link-card">
              {renderLink ? renderLink(link) : <DefaultLinkRenderer link={link} />}
              {link.context && (
                <p className="uptrade-internal-link-context">{link.context}</p>
              )}
            </div>
          ))}
        </div>
      </nav>
    )
  }

  // Default: bottom position
  return (
    <div className={containerClass}>
      <h4 className="uptrade-internal-links-title">Related Articles</h4>
      <ul className="uptrade-internal-links-list">
        {links.map((link: ManagedLink) => (
          <li key={link.id}>
            {renderLink ? renderLink(link) : <DefaultLinkRenderer link={link} />}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ManagedInternalLinks
