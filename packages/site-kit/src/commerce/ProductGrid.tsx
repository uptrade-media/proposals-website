/**
 * @uptrade/site-kit/commerce - ProductGrid
 * 
 * Grid layout for displaying multiple products with filtering and sorting.
 * Ideal for shop pages, category pages, and product listings.
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type { CommerceOffering, CommerceCategory } from './types'
import { OfferingCard } from './OfferingCard'
import { fetchOfferings } from './api'

export interface ProductGridProps {
  /** Pre-loaded products (for SSR) */
  products?: CommerceOffering[]
  /** Limit number of products */
  limit?: number
  /** Category to filter by */
  category?: string
  /** Show category filter */
  showCategoryFilter?: boolean
  /** Show sort dropdown */
  showSort?: boolean
  /** Show search input */
  showSearch?: boolean
  /** Number of columns (responsive) */
  columns?: 2 | 3 | 4
  /** Loading skeleton count */
  skeletonCount?: number
  /** Custom empty state message */
  emptyMessage?: string
  /** Callback when product is clicked */
  onProductClick?: (product: CommerceOffering) => void
  /** Navigate to product page on click */
  linkToProduct?: boolean
  /** Base path for product links */
  productBasePath?: string
  /** Additional class names */
  className?: string
  /** Card variant style */
  cardVariant?: 'card' | 'minimal' | 'horizontal'
  /** Custom styles */
  style?: React.CSSProperties
}

type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name-az' | 'name-za'

export function ProductGrid({
  products: propProducts,
  limit,
  category: propCategory,
  showCategoryFilter = false,
  showSort = true,
  showSearch = true,
  columns = 3,
  skeletonCount = 6,
  emptyMessage = 'No products found',
  onProductClick,
  linkToProduct = true,
  productBasePath = '/shop',
  className = '',
  cardVariant = 'card',
  style,
}: ProductGridProps) {
  const [products, setProducts] = useState<CommerceOffering[]>(propProducts || [])
  const [loading, setLoading] = useState(!propProducts)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(propCategory)
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  // Extract unique categories from products
  const categories = useMemo(() => {
    const categoryMap = new Map<string, CommerceCategory>()
    products.forEach(p => {
      if (p.category) {
        categoryMap.set(p.category.id, p.category)
      }
    })
    return Array.from(categoryMap.values())
  }, [products])

  // Fetch products
  useEffect(() => {
    if (propProducts) {
      setProducts(propProducts)
      return
    }

    async function load() {
      setLoading(true)
      try {
        const data = await fetchOfferings({
          type: 'product',
          category: selectedCategory,
          limit,
          orderBy: 'created_at',
          order: 'desc',
        })
        setProducts(data)
      } catch (e) {
        console.error('Failed to load products:', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [propProducts, selectedCategory, limit])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.short_description?.toLowerCase().includes(query) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Category filter (if not already filtered by fetch)
    if (selectedCategory && !propCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory)
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'price-low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0))
        break
      case 'price-high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0))
        break
      case 'name-az':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-za':
        filtered.sort((a, b) => b.name.localeCompare(a.name))
        break
    }

    return filtered
  }, [products, searchQuery, selectedCategory, sortBy, propCategory])

  const handleProductClick = (product: CommerceOffering) => {
    if (onProductClick) {
      onProductClick(product)
    } else if (linkToProduct && typeof window !== 'undefined') {
      window.location.href = `${productBasePath}/${product.slug}`
    }
  }

  // Grid column styles
  const gridColumns = {
    2: 'repeat(auto-fill, minmax(280px, 1fr))',
    3: 'repeat(auto-fill, minmax(240px, 1fr))',
    4: 'repeat(auto-fill, minmax(200px, 1fr))',
  }

  return (
    <div className={`site-kit-product-grid ${className}`} style={style}>
      {/* Filters & Controls */}
      {(showSearch || showSort || showCategoryFilter) && (
        <div className="site-kit-product-grid__controls" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          alignItems: 'center',
        }}>
          {/* Search */}
          {showSearch && (
            <div className="site-kit-product-grid__search" style={{ flex: '1 1 200px' }}>
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9375rem',
                }}
              />
            </div>
          )}

          {/* Category Filter */}
          {showCategoryFilter && categories.length > 0 && (
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || undefined)}
              className="site-kit-product-grid__category-filter"
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.9375rem',
                backgroundColor: 'white',
                minWidth: '150px',
              }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}

          {/* Sort */}
          {showSort && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="site-kit-product-grid__sort"
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.9375rem',
                backgroundColor: 'white',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-az">Name: A-Z</option>
              <option value="name-za">Name: Z-A</option>
            </select>
          )}

          {/* Results count */}
          <div className="site-kit-product-grid__count" style={{
            marginLeft: 'auto',
            fontSize: '0.875rem',
            color: '#6b7280',
          }}>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="site-kit-product-grid__grid" style={{
          display: 'grid',
          gridTemplateColumns: gridColumns[columns],
          gap: '1.5rem',
        }}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} className="site-kit-product-grid__skeleton" style={{
              aspectRatio: '1',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              animation: 'pulse 2s infinite',
            }} />
          ))}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
      )}

      {/* Products Grid */}
      {!loading && filteredProducts.length > 0 && (
        <div className="site-kit-product-grid__grid" style={{
          display: 'grid',
          gridTemplateColumns: gridColumns[columns],
          gap: '1.5rem',
        }}>
          {filteredProducts.map(product => (
            <OfferingCard
              key={product.id}
              offering={product}
              variant={cardVariant}
              showImage
              showPrice
              showDescription
              showCta
              ctaText="View Product"
              onCtaClick={() => handleProductClick(product)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && (
        <div className="site-kit-product-grid__empty" style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛍️</div>
          <p style={{ 
            margin: 0, 
            color: '#6b7280',
            fontSize: '1rem',
          }}>
            {searchQuery ? `No products match "${searchQuery}"` : emptyMessage}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  )
}
