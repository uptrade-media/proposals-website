import * as React from 'react'
import { getFAQData } from './api'
import type { ManagedFAQProps, FAQItem } from './types'
import { createSchema } from './ManagedSchema'

/**
 * Default FAQ item renderer
 */
function DefaultFAQItem({ item, index }: { item: FAQItem; index: number }) {
  return (
    <div key={item.id} className="uptrade-faq-item">
      <h3 className="uptrade-faq-question">{item.question}</h3>
      <div 
        className="uptrade-faq-answer"
        dangerouslySetInnerHTML={{ __html: item.answer }}
      />
    </div>
  )
}

/**
 * Generate FAQ schema from items
 */
function generateFAQSchema(items: FAQItem[]): Record<string, unknown> {
  return createSchema('FAQPage', {
    mainEntity: items
      .filter(item => item.is_visible)
      .map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
  })
}

/**
 * ManagedFAQ - Server Component that renders FAQ section with schema
 * 
 * Fetches FAQ content from Portal and renders with optional schema injection
 * 
 * @example
 * ```tsx
 * // app/services/plumbing/page.tsx
 * import { ManagedFAQ } from '@uptrade/seo'
 * 
 * export default async function PlumbingPage() {
 *   return (
 *     <main>
 *       <h1>Plumbing Services</h1>
 *       <section>
 *         <ManagedFAQ 
 *           projectId={process.env.UPTRADE_PROJECT_ID!}
 *           path="/services/plumbing"
 *           showTitle
 *           includeSchema
 *         />
 *       </section>
 *     </main>
 *   )
 * }
 * ```
 */
export async function ManagedFAQ({
  projectId,
  path,
  className,
  renderItem,
  includeSchema = true,
  showTitle = true,
}: ManagedFAQProps): Promise<React.ReactElement | null> {
  const faqData = await getFAQData(projectId, path)

  if (!faqData || !faqData.items?.length) {
    return null
  }

  const visibleItems = faqData.items.filter((item: FAQItem) => item.is_visible)
  
  if (visibleItems.length === 0) {
    return null
  }

  // Sort by order
  visibleItems.sort((a: FAQItem, b: FAQItem) => a.order - b.order)

  const shouldIncludeSchema = includeSchema && faqData.include_schema

  return (
    <>
      {shouldIncludeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateFAQSchema(visibleItems), null, 0),
          }}
        />
      )}
      <div className={className || 'uptrade-faq'}>
        {showTitle && faqData.title && (
          <h2 className="uptrade-faq-title">{faqData.title}</h2>
        )}
        {faqData.description && (
          <p className="uptrade-faq-description">{faqData.description}</p>
        )}
        <div className="uptrade-faq-items">
          {visibleItems.map((item: FAQItem, index: number) => 
            renderItem 
              ? renderItem(item, index)
              : <DefaultFAQItem key={item.id} item={item} index={index} />
          )}
        </div>
      </div>
    </>
  )
}

export default ManagedFAQ
