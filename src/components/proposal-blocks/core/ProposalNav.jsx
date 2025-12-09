/**
 * ProposalNav - Sticky navigation for long proposals
 * 
 * Allows quick jumping between sections and shows
 * current reading progress.
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export function ProposalNav({ 
  sections = [],
  className = '' 
}) {
  const [activeSection, setActiveSection] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150
      
      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const top = element.offsetTop - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setIsOpen(false)
  }

  if (sections.length === 0) return null

  const currentSection = sections.find(s => s.id === activeSection)

  return (
    <nav className={cn(
      'sticky top-0 z-40 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--glass-border)]',
      className
    )}>
      <div className="max-w-4xl mx-auto px-6 sm:px-8">
        {/* Mobile dropdown */}
        <div className="sm:hidden py-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full px-4 py-2 rounded-lg
              bg-[var(--surface-secondary)] text-[var(--text-primary)]"
          >
            <span className="font-medium">{currentSection?.label || 'Sections'}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
          </button>
          
          {isOpen && (
            <div className="absolute left-0 right-0 mt-2 mx-4 py-2 rounded-lg shadow-lg
              bg-[var(--surface-primary)] border border-[var(--glass-border)]">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm transition-colors',
                    activeSection === section.id
                      ? 'text-[var(--brand-green)] bg-[var(--brand-green)]/5'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Desktop horizontal nav */}
        <div className="hidden sm:flex items-center gap-1 py-3 overflow-x-auto scrollbar-hide">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                activeSection === section.id
                  ? 'text-[var(--brand-green)] bg-[var(--brand-green)]/10'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
