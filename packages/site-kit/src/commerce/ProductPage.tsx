/**
 * @uptrade/site-kit/commerce - ProductPage
 * 
 * Complete product page component with SEO metadata, breadcrumbs, and related products.
 * Use this as a drop-in for dynamic [slug] routes.
 */

'use client'

import React, { useEffect, useState } from 'react'
import type { CommerceOffering, CommerceVariant, CheckoutResult } from './types'
import { ProductDetail } from './ProductDetail'
import { ProductGrid } from './ProductGrid'
import { fetchOffering, fetchOfferings } from './api'

export interface ProductPageProps {
  /** Pre-loaded product data (for SSR) */
  product?: CommerceOffering
  /** Product slug to fetch (if not pre-loaded) */
  slug?: string
  /** Show breadcrumbs navigation */
  showBreadcrumbs?: boolean
  /** Show related products section */
  showRelatedProducts?: boolean
  /** Number of related products to show */
  relatedProductsLimit?: number
  /** Show back to shop link */
  showBackLink?: boolean
  /** Base path for shop */
  shopBasePath?: string
  /** Success URL after checkout */
  successUrl?: string
  /** Cancel URL if checkout cancelled */
  cancelUrl?: string
  /** Callback when added to cart */
  onAddToCart?: (product: CommerceOffering, variant?: CommerceVariant, quantity?: number) => void
  /** Custom breadcrumb renderer */
  renderBreadcrumbs?: (product: CommerceOffering) => React.ReactNode
  /** Custom SEO head renderer (for Next.js Head or similar) */
  renderHead?: (product: CommerceOffering) => React.ReactNode
  /** Additional class names */
  className?: string
  /** Custom styles */
  style?: React.CSSProperties
}

export function ProductPage({
  product: propProduct,
  slug,
  showBreadcrumbs = true,
  showRelatedProducts = true,
  relatedProductsLimit = 4,
  showBackLink = true,
  shopBasePath = '/shop',
  successUrl,
  cancelUrl,
  onAddToCart,
  renderBreadcrumbs,
  renderHead,
  className = '',
  style,
}: ProductPageProps) {
  const [product, setProduct] = useState<CommerceOffering | null>(propProduct || null)
  const [relatedProducts, setRelatedProducts] = useState<CommerceOffering[]>([])
  const [loading, setLoading] = useState(!propProduct && !!slug)

  // Fetch product if not provided
  useEffect(() => {
    if (propProduct) {
      setProduct(propProduct)
      return
    }

    if (!slug) return

    async function load() {
      setLoading(true)
      try {
        const data = await fetchOffering(slug!)
        setProduct(data)
      } catch (e) {
        console.error('Failed to load product:', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [propProduct, slug])

  // Fetch related products
  useEffect(() => {
    if (!product || !showRelatedProducts) return

    async function loadRelated() {
      try {
        const data = await fetchOfferings({
          type: 'product',
          category: product?.category_id,
          limit: relatedProductsLimit + 1, // Fetch one extra to exclude current
        })
        // Exclude current product
        const filtered = data.filter(p => p.id !== product?.id).slice(0, relatedProductsLimit)
        setRelatedProducts(filtered)
      } catch (e) {
        console.error('Failed to load related products:', e)
      }
    }

    loadRelated()
  }, [product, showRelatedProducts, relatedProductsLimit])

  // Update document title for SEO
  useEffect(() => {
    if (product && typeof document !== 'undefined') {
      document.title = product.seo_title || `${product.name} | Shop`
      
      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc && (product.seo_description || product.short_description)) {
        metaDesc.setAttribute('content', product.seo_description || product.short_description || '')
      }
    }
  }, [product])

  if (loading) {
    return (
      <div className={`site-kit-product-page site-kit-product-page--loading ${className}`} style={style}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!product) {
    return (
      <div className={`site-kit-product-page site-kit-product-page--not-found ${className}`} style={style}>
        <div style={{
          textAlign: 'center',
          padding: '6rem 2rem',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#111827' }}>Product Not Found</h1>
          <p style={{ marginTop: '0.75rem', color: '#6b7280' }}>
            The product you're looking for doesn't exist or has been removed.
          </p>
          <a
            href={shopBasePath}
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Back to Shop
          </a>
        </div>
      </div>
    )
  }

  // Default breadcrumbs
  const defaultBreadcrumbs = (
    <nav className="site-kit-product-page__breadcrumbs" aria-label="Breadcrumb" style={{
      marginBottom: '1.5rem',
      fontSize: '0.875rem',
    }}>
      <ol style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem',
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}>
        <li>
          <a href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>Home</a>
        </li>
        <li style={{ color: '#9ca3af' }}>/</li>
        <li>
          <a href={shopBasePath} style={{ color: '#6b7280', textDecoration: 'none' }}>Shop</a>
        </li>
        {product.category && (
          <>
            <li style={{ color: '#9ca3af' }}>/</li>
            <li>
              <a 
                href={`${shopBasePath}?category=${product.category.id}`} 
                style={{ color: '#6b7280', textDecoration: 'none' }}
              >
                {product.category.name}
              </a>
            </li>
          </>
        )}
        <li style={{ color: '#9ca3af' }}>/</li>
        <li style={{ color: '#111827', fontWeight: 500 }}>{product.name}</li>
      </ol>
    </nav>
  )

  return (
    <div className={`site-kit-product-page ${className}`} style={style}>
      {/* Custom head for SEO */}
      {renderHead?.(product)}

      {/* Back Link */}
      {showBackLink && (
        <div className="site-kit-product-page__back" style={{ marginBottom: '1rem' }}>
          <a
            href={shopBasePath}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            <span>←</span>
            <span>Back to Shop</span>
          </a>
        </div>
      )}

      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        renderBreadcrumbs ? renderBreadcrumbs(product) : defaultBreadcrumbs
      )}

      {/* Product Detail */}
      <ProductDetail
        product={product}
        showAddToCart={!!onAddToCart}
        showBuyNow
        showQuantity
        showVariants
        showGallery
        showFeatures
        showSpecifications
        successUrl={successUrl}
        cancelUrl={cancelUrl}
        onAddToCart={onAddToCart}
      />

      {/* Related Products */}
      {showRelatedProducts && relatedProducts.length > 0 && (
        <section className="site-kit-product-page__related" style={{ marginTop: '4rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '1.5rem',
          }}>
            {product.category ? `More ${product.category.name}` : 'Related Products'}
          </h2>
          <ProductGrid
            products={relatedProducts}
            showSearch={false}
            showSort={false}
            showCategoryFilter={false}
            columns={4}
            productBasePath={shopBasePath}
          />
        </section>
      )}
    </div>
  )
}
