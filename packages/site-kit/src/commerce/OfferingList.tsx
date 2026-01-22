/**
 * @uptrade/site-kit/commerce - OfferingList
 * 
 * Displays a grid or list of offerings with optional filtering.
 */

'use client'

import React, { useEffect, useState, useMemo } from 'react'
import type { OfferingListProps } from './types'
import type { CommerceOffering } from './types'
import { OfferingCard } from './OfferingCard'
import { fetchOfferings, fetchProducts, fetchUpcomingEvents } from './api'

export function OfferingList({
  // Data options
  offerings: propOfferings,
  type,
  category,
  limit,
  status = 'active',
  
  // Display options
  layout = 'grid',
  columns = 3,
  cardVariant = 'card',
  showFilters = false,
  emptyMessage = 'No items found.',
  
  // Card options
  showImage = true,
  showPrice = true,
  showDescription = true,
  showCta = true,
  ctaText,
  onCtaClick,
  
  // Styling
  className = '',
  cardClassName = '',
  filterClassName = '',
  
  // Custom render
  renderCard,
  renderEmpty,
}: OfferingListProps) {
  const [offerings, setOfferings] = useState<CommerceOffering[]>(propOfferings || [])
  const [loading, setLoading] = useState(!propOfferings)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  
  // Fetch offerings if not provided
  useEffect(() => {
    if (propOfferings) {
      setOfferings(propOfferings)
      return
    }
    
    async function load() {
      setLoading(true)
      setError(null)
      
      try {
        let data: CommerceOffering[]
        
        if (type === 'product') {
          data = await fetchProducts({ category, limit, status })
        } else if (type === 'event') {
          data = await fetchUpcomingEvents({ category, limit })
        } else {
          data = await fetchOfferings({ type, category, limit, status })
        }
        
        setOfferings(data)
      } catch (e) {
        console.error('Failed to load offerings:', e)
        setError('Failed to load items.')
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [propOfferings, type, category, limit, status])
  
  // Get unique categories for filtering
  const categories = useMemo(() => {
    const cats = offerings
      .filter(o => o.category)
      .map(o => o.category!)
    
    // Unique by ID
    return Array.from(new Map(cats.map(c => [c.id, c])).values())
  }, [offerings])
  
  // Filtered offerings
  const filteredOfferings = useMemo(() => {
    if (!activeFilter) return offerings
    return offerings.filter(o => o.category?.id === activeFilter)
  }, [offerings, activeFilter])
  
  if (loading) {
    return (
      <div className={`site-kit-offerings-loading ${className}`} style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={`site-kit-offerings-error ${className}`} style={{
        textAlign: 'center',
        padding: '2rem',
        color: '#ef4444',
      }}>
        {error}
      </div>
    )
  }
  
  if (filteredOfferings.length === 0) {
    if (renderEmpty) {
      return <>{renderEmpty()}</>
    }
    
    return (
      <div className={`site-kit-offerings-empty ${className}`} style={{
        textAlign: 'center',
        padding: '2rem',
        color: '#666',
      }}>
        {emptyMessage}
      </div>
    )
  }
  
  const gridStyles = layout === 'grid' ? {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: '1.5rem',
  } : {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  }
  
  return (
    <div className={`site-kit-offerings ${className}`}>
      {showFilters && categories.length > 1 && (
        <div 
          className={`site-kit-offerings-filters ${filterClassName}`}
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setActiveFilter(null)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: activeFilter === null ? '#2563eb' : '#e5e7eb',
              background: activeFilter === null ? '#2563eb' : 'white',
              color: activeFilter === null ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: activeFilter === cat.id ? '#2563eb' : '#e5e7eb',
                background: activeFilter === cat.id ? '#2563eb' : 'white',
                color: activeFilter === cat.id ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
      
      <div className="site-kit-offerings-grid" style={gridStyles}>
        {filteredOfferings.map(offering => (
          renderCard ? renderCard(offering) : (
            <OfferingCard
              key={offering.id}
              offering={offering}
              variant={layout === 'list' ? 'horizontal' : cardVariant}
              showImage={showImage}
              showPrice={showPrice}
              showDescription={showDescription}
              showCta={showCta}
              ctaText={ctaText}
              onCtaClick={onCtaClick}
              className={cardClassName}
            />
          )
        ))}
      </div>
    </div>
  )
}

export default OfferingList
