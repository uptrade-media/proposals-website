/**
 * @uptrade/site-kit/commerce - ProductDetail
 * 
 * Full product detail view with image gallery, variants, pricing, and checkout.
 * Use on product pages for complete product information display.
 */

'use client'

import React, { useState, useEffect } from 'react'
import type { CommerceOffering, CommerceVariant, CheckoutResult } from './types'
import { formatPrice } from './utils'
import { fetchOffering, createCheckoutSession } from './api'

export interface ProductDetailProps {
  /** Pre-loaded product data (for SSR) */
  product?: CommerceOffering
  /** Product slug to fetch (if not pre-loaded) */
  slug?: string
  /** Show add to cart button */
  showAddToCart?: boolean
  /** Show buy now button */
  showBuyNow?: boolean
  /** Show quantity selector */
  showQuantity?: boolean
  /** Show variant selector */
  showVariants?: boolean
  /** Show product gallery */
  showGallery?: boolean
  /** Show product features */
  showFeatures?: boolean
  /** Show specifications table */
  showSpecifications?: boolean
  /** Success URL after checkout */
  successUrl?: string
  /** Cancel URL if checkout cancelled */
  cancelUrl?: string
  /** Callback when added to cart */
  onAddToCart?: (product: CommerceOffering, variant?: CommerceVariant, quantity?: number) => void
  /** Callback when buy now clicked */
  onBuyNow?: (product: CommerceOffering, variant?: CommerceVariant, quantity?: number) => void
  /** Callback on checkout success */
  onCheckoutSuccess?: (result: CheckoutResult) => void
  /** Callback on checkout error */
  onCheckoutError?: (error: string) => void
  /** Additional class names */
  className?: string
  /** Custom styles */
  style?: React.CSSProperties
}

export function ProductDetail({
  product: propProduct,
  slug,
  showAddToCart = true,
  showBuyNow = true,
  showQuantity = true,
  showVariants = true,
  showGallery = true,
  showFeatures = true,
  showSpecifications = true,
  successUrl,
  cancelUrl,
  onAddToCart,
  onBuyNow,
  onCheckoutSuccess,
  onCheckoutError,
  className = '',
  style,
}: ProductDetailProps) {
  const [product, setProduct] = useState<CommerceOffering | null>(propProduct || null)
  const [loading, setLoading] = useState(!propProduct && !!slug)
  const [selectedVariant, setSelectedVariant] = useState<CommerceVariant | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [checkingOut, setCheckingOut] = useState(false)

  // Fetch product if not provided
  useEffect(() => {
    if (propProduct) {
      setProduct(propProduct)
      // Set default variant
      const defaultVariant = propProduct.variants?.find(v => v.is_default) || propProduct.variants?.[0]
      setSelectedVariant(defaultVariant)
      return
    }

    if (!slug) return

    async function load() {
      setLoading(true)
      try {
        const data = await fetchOffering(slug!)
        setProduct(data)
        if (data?.variants?.length) {
          const defaultVariant = data.variants.find(v => v.is_default) || data.variants[0]
          setSelectedVariant(defaultVariant)
        }
      } catch (e) {
        console.error('Failed to load product:', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [propProduct, slug])

  if (loading) {
    return (
      <div className={`site-kit-product-detail site-kit-product-detail--loading ${className}`} style={style}>
        <div className="site-kit-product-detail__loader" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
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
      <div className={`site-kit-product-detail site-kit-product-detail--not-found ${className}`} style={style}>
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#666' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>Product Not Found</h2>
          <p style={{ marginTop: '0.5rem' }}>The product you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  // Get current price (from variant or product)
  const currentPrice = selectedVariant?.price ?? product.price ?? 0
  const compareAtPrice = product.compare_at_price
  const hasDiscount = compareAtPrice && compareAtPrice > currentPrice

  // Get all images
  const allImages = [
    product.featured_image_url,
    ...(product.gallery_images || []),
    ...(product.variants?.map(v => v.image_url).filter(Boolean) || []),
  ].filter(Boolean) as string[]

  // Check inventory
  const inventoryCount = selectedVariant?.inventory_count ?? product.inventory_count
  const isOutOfStock = product.track_inventory && inventoryCount !== undefined && inventoryCount <= 0
  const isLowStock = product.track_inventory && inventoryCount !== undefined && inventoryCount > 0 && inventoryCount <= 5

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, selectedVariant, quantity)
    }
  }

  const handleBuyNow = async () => {
    if (onBuyNow) {
      onBuyNow(product, selectedVariant, quantity)
      return
    }

    // Default: Create checkout session
    setCheckingOut(true)
    try {
      const result = await createCheckoutSession({
        offeringId: product.id,
        variantId: selectedVariant?.id,
        quantity,
        successUrl: successUrl || `${window.location.origin}/checkout/success`,
        cancelUrl: cancelUrl || window.location.href,
      })

      if (result.success && result.checkout_url) {
        onCheckoutSuccess?.(result)
        window.location.href = result.checkout_url
      } else {
        throw new Error(result.error || 'Failed to create checkout')
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      onCheckoutError?.(error.message || 'Checkout failed')
    } finally {
      setCheckingOut(false)
    }
  }

  const handleVariantChange = (variant: CommerceVariant) => {
    setSelectedVariant(variant)
    // If variant has its own image, switch to it
    if (variant.image_url) {
      const imageIndex = allImages.indexOf(variant.image_url)
      if (imageIndex >= 0) setSelectedImage(imageIndex)
    }
  }

  return (
    <div className={`site-kit-product-detail ${className}`} style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '2rem',
      ...style,
    }}>
      {/* Image Gallery */}
      {showGallery && allImages.length > 0 && (
        <div className="site-kit-product-detail__gallery">
          {/* Main Image */}
          <div className="site-kit-product-detail__main-image" style={{
            aspectRatio: '1',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#f9fafb',
          }}>
            <img
              src={allImages[selectedImage]}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="site-kit-product-detail__thumbnails" style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.75rem',
              overflowX: 'auto',
            }}>
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  style={{
                    flex: '0 0 auto',
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: idx === selectedImage ? '2px solid #2563eb' : '2px solid transparent',
                    padding: 0,
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="site-kit-product-detail__info">
        {/* Category */}
        {product.category && (
          <div className="site-kit-product-detail__category" style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {product.category.name}
          </div>
        )}

        {/* Title */}
        <h1 className="site-kit-product-detail__title" style={{
          margin: 0,
          fontSize: '2rem',
          fontWeight: 700,
          color: '#111827',
          lineHeight: 1.2,
        }}>
          {product.name}
        </h1>

        {/* Short Description */}
        {product.short_description && (
          <p className="site-kit-product-detail__short-description" style={{
            marginTop: '0.75rem',
            fontSize: '1rem',
            color: '#4b5563',
            lineHeight: 1.6,
          }}>
            {product.short_description}
          </p>
        )}

        {/* Price */}
        {product.price_is_public && currentPrice !== undefined && (
          <div className="site-kit-product-detail__price" style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.75rem',
          }}>
            <span style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: hasDiscount ? '#dc2626' : '#111827',
            }}>
              {formatPrice(currentPrice, product.currency)}
            </span>
            {hasDiscount && (
              <span style={{
                fontSize: '1.25rem',
                color: '#9ca3af',
                textDecoration: 'line-through',
              }}>
                {formatPrice(compareAtPrice, product.currency)}
              </span>
            )}
          </div>
        )}

        {/* Stock Status */}
        {product.track_inventory && (
          <div className="site-kit-product-detail__stock" style={{
            marginTop: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}>
            {isOutOfStock ? (
              <span style={{ color: '#dc2626' }}>Out of Stock</span>
            ) : isLowStock ? (
              <span style={{ color: '#f59e0b' }}>Only {inventoryCount} left!</span>
            ) : (
              <span style={{ color: '#10b981' }}>In Stock</span>
            )}
          </div>
        )}

        {/* Variants */}
        {showVariants && product.variants && product.variants.length > 1 && (
          <div className="site-kit-product-detail__variants" style={{ marginTop: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '0.5rem',
            }}>
              Options
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {product.variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantChange(variant)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: selectedVariant?.id === variant.id 
                      ? '2px solid #2563eb' 
                      : '1px solid #d1d5db',
                    backgroundColor: selectedVariant?.id === variant.id ? '#eff6ff' : 'white',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity */}
        {showQuantity && !isOutOfStock && (
          <div className="site-kit-product-detail__quantity" style={{ marginTop: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '0.5rem',
            }}>
              Quantity
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  fontSize: '1.25rem',
                  cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                  opacity: quantity <= 1 ? 0.5 : 1,
                }}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max={inventoryCount ?? 99}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '60px',
                  height: '40px',
                  textAlign: 'center',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '1rem',
                }}
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                disabled={product.track_inventory && inventoryCount !== undefined && quantity >= inventoryCount}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="site-kit-product-detail__actions" style={{
          marginTop: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {showBuyNow && (
            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock || checkingOut}
              className="site-kit-product-detail__buy-now"
              style={{
                padding: '1rem 2rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isOutOfStock ? '#d1d5db' : '#2563eb',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {checkingOut ? 'Processing...' : isOutOfStock ? 'Out of Stock' : 'Buy Now'}
            </button>
          )}
          {showAddToCart && onAddToCart && (
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="site-kit-product-detail__add-to-cart"
              style={{
                padding: '1rem 2rem',
                borderRadius: '8px',
                border: '2px solid #2563eb',
                backgroundColor: 'white',
                color: '#2563eb',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Add to Cart
            </button>
          )}
        </div>

        {/* Features */}
        {showFeatures && product.features && product.features.length > 0 && (
          <div className="site-kit-product-detail__features" style={{ marginTop: '2rem' }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '0.75rem',
            }}>
              Features
            </h3>
            <ul style={{
              margin: 0,
              paddingLeft: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {product.features.map((feature, idx) => (
                <li key={idx} style={{ color: '#4b5563', fontSize: '0.9375rem' }}>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Specifications */}
        {showSpecifications && product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="site-kit-product-detail__specifications" style={{ marginTop: '2rem' }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '0.75rem',
            }}>
              Specifications
            </h3>
            <dl style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '0.5rem 1rem',
            }}>
              {Object.entries(product.specifications).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt style={{ color: '#6b7280', fontSize: '0.875rem' }}>{key}</dt>
                  <dd style={{ margin: 0, color: '#111827', fontSize: '0.875rem' }}>{value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        )}
      </div>

      {/* Long Description */}
      {product.long_description && (
        <div 
          className="site-kit-product-detail__description"
          style={{
            gridColumn: '1 / -1',
            marginTop: '2rem',
            padding: '2rem',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
          }}
        >
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '1rem',
          }}>
            About This Product
          </h2>
          <div 
            style={{ color: '#4b5563', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: product.long_description }}
          />
        </div>
      )}
    </div>
  )
}
