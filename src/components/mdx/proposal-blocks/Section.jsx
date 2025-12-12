/**
 * Section wrapper with consistent spacing
 * Theme-compatible: Uses CSS custom properties
 */
export function Section({ children, className = '', bg = 'transparent' }) {
  const bgClasses = {
    default: 'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
    elevated: 'bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)]',
    inset: 'bg-[var(--glass-bg-inset)]',
    transparent: 'bg-transparent'
  }
  
  return (
    <section className={`py-8 sm:py-12 rounded-xl ${bgClasses[bg]} ${className}`}>
      <div className="space-y-6 px-6">
        {children}
      </div>
    </section>
  )
}

export default Section
