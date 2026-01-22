/**
 * @uptrade/site-kit/commerce - ProductEmbed
 * 
 * Embeddable widget for displaying a single product on a homepage or landing page.
 * Supports showing latest product, specific product by slug, or a random featured product.
 */

'use client'

import React, { useEffect, useState } from 'react'
import type { ProductEmbedProps, CommerceOffering } from './types'
import { OfferingCard } from './OfferingCard'
import { fetchOffering, fetchLatestOffering } from './api'

export function ProductEmbed({
  product: propProduct,
  slug,
  mode = 'specific', // 'specific', 'latest', 'featured'
  category,
  variant = 'card',
  showImage = true,
  showPrice = true,
  showDescription = true,
  showCta = true,
  ctaText = 'Shop Now',
  onCtaClick,
  className = '',
}: ProductEmbedProps) {
  const [product, setProduct] = useState<CommerceOffering | null>(propProduct || null)
  const [loading, setLoading] = useState(!propProduct && !!slug)
  
  useEffect(() => {
    if (propProduct) {
      setProduct(propProduct)
      return
    }
    
    async function load() {
      setLoading(true)
      try {
        let data: CommerceOffering | null = null
        
        if (mode === 'specific' && slug) {
          data = await fetchOffering(slug)
        } else if (mode === 'latest' || mode === 'featured') {
          data = await fetchLatestOffering('product', category)
        }
        
        setProduct(data)
      } catch (e) {
        console.error('Failed to load product:', e)
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [propProduct, slug, mode, category])
  
  if (loading) {
    return (
      <div className={`site-kit-product-embed ${className}`} style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#f9fafb',
        borderRadius: '12px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          margin: '0 auto',
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
  
  if (!product) {
    return null // Silent fail - don't show anything if no product
  }
  
  return (
    <div className={`site-kit-product-embed ${className}`}>
      <OfferingCard
        offering={product}
        variant={variant}
        showImage={showImage}
        showPrice={showPrice}
        showDescription={showDescription}
        showCta={showCta}
        ctaText={ctaText}
        onCtaClick={onCtaClick}
      />
    </div>
  )
}

export default ProductEmbed
