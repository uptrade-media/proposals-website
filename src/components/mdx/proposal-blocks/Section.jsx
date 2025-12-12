import React from 'react'

/**
 * Section wrapper with consistent spacing
 * Auto-grids consecutive MetricHighlight/StatCard components
 * Theme-compatible: Uses CSS custom properties
 */
export function Section({ children, className = '', bg = 'transparent' }) {
  const bgClasses = {
    default: 'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
    elevated: 'bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)]',
    inset: 'bg-[var(--glass-bg-inset)]',
    transparent: 'bg-transparent'
  }
  
  // Process children to auto-grid consecutive MetricHighlight/StatCard components
  const processChildren = () => {
    const childArray = React.Children.toArray(children)
    const result = []
    let currentGridItems = []
    
    const isGridChild = (child) => {
      if (!React.isValidElement(child)) return false
      const displayName = child.type?.displayName
      return displayName === 'MetricHighlight' || displayName === 'StatCard'
    }
    
    const flushGridItems = () => {
      if (currentGridItems.length > 0) {
        result.push(
          <div key={`grid-${result.length}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentGridItems}
          </div>
        )
        currentGridItems = []
      }
    }
    
    childArray.forEach((child, index) => {
      if (isGridChild(child)) {
        currentGridItems.push(React.cloneElement(child, { key: child.key || index }))
      } else {
        flushGridItems()
        result.push(child)
      }
    })
    
    flushGridItems()
    return result
  }
  
  return (
    <section className={`py-8 sm:py-12 rounded-xl ${bgClasses[bg]} ${className}`}>
      <div className="space-y-6 px-6">
        {processChildren()}
      </div>
    </section>
  )
}

export default Section
