/**
 * @uptrade/site-kit/blog - Table of Contents Component
 */

'use client'

import React, { useState, useEffect } from 'react'
import type { TableOfContentsProps } from './types'

interface TocItem {
  id: string
  text: string
  level: number
}

function parseHeadings(content: string): TocItem[] {
  // Extract headings from HTML content
  const headingRegex = /<h([2-4])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[2-4]>/gi
  const items: TocItem[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    items.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].replace(/<[^>]*>/g, ''), // Strip any nested HTML
    })
  }

  return items
}

export function TableOfContents({
  content,
  className,
  maxDepth = 3,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const items = parseHeadings(content).filter((item) => item.level <= maxDepth)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0% -35% 0%',
        threshold: 0,
      }
    )

    // Observe all headings
    items.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  const handleClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav className={className} aria-label="Table of contents">
      <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        On This Page
      </h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              paddingLeft: (item.level - 2) * 12,
              marginBottom: 8,
            }}
          >
            <button
              onClick={() => handleClick(item.id)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 14,
                color: activeId === item.id ? '#2563eb' : '#6b7280',
                fontWeight: activeId === item.id ? 500 : 400,
                transition: 'color 0.2s',
              }}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
