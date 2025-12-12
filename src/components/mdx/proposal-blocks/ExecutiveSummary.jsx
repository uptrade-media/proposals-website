import { Children, isValidElement } from 'react'
import Section from './Section'

/**
 * Executive Summary Block
 * Theme-compatible: Uses CSS custom properties
 */
export function ExecutiveSummary({ children }) {
  const childArray = Children.toArray(children)

  // Group consecutive StatCards so they can render side-by-side
  const blocks = []
  let pendingStatCards = []

  const flushStatCards = () => {
    if (pendingStatCards.length === 0) return
    blocks.push({ type: 'stat-grid', items: pendingStatCards })
    pendingStatCards = []
  }

  for (const child of childArray) {
    // Detect stat-like components by displayName or type name
    const typeName = isValidElement(child) && (
      child.type?.displayName || child.type?.name || ''
    )
    const isStatLike = typeName === 'MetricHighlight' || typeName === 'StatCard'

    if (isStatLike) {
      pendingStatCards.push(child)
    } else {
      flushStatCards()
      blocks.push({ type: 'content', item: child })
    }
  }
  flushStatCards()

  return (
    <Section bg="transparent">
      <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6 sm:mb-8">
        Executive Summary
      </h2>
      <div className="bg-[var(--brand-primary)]/10 border-l-4 border-[var(--brand-primary)] rounded-xl p-6 sm:p-8">
        <div className="text-[var(--text-secondary)] leading-relaxed space-y-4">
          {blocks.map((block, idx) => {
            if (block.type === 'stat-grid') {
              const count = block.items.length
              const colsLg = count >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'

              return (
                <div
                  key={`stat-grid-${idx}`}
                  className={`grid grid-cols-1 sm:grid-cols-2 ${colsLg} gap-4 sm:gap-6`}
                >
                  {block.items.map((node, j) => (
                    <div key={`stat-${idx}-${j}`} className="h-full">
                      {node}
                    </div>
                  ))}
                </div>
              )
            }

            return <div key={`content-${idx}`}>{block.item}</div>
          })}
        </div>
      </div>
    </Section>
  )
}

export default ExecutiveSummary
