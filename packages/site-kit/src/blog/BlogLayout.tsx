/**
 * @uptrade/site-kit/blog - Blog Layout Component
 * 
 * A complete blog layout with sidebar, responsive design, and optional hero.
 * Use this to wrap your blog pages for consistent styling.
 */

import React from 'react'
import { BlogSidebar, BlogSidebarProps } from './BlogSidebar'

// ============================================================================
// BLOG LAYOUT COMPONENT
// ============================================================================

export interface BlogLayoutProps {
  /** Portal API URL */
  apiUrl?: string
  /** Project API key */
  apiKey?: string
  /** Layout style: 'sidebar-right', 'sidebar-left', 'full-width' */
  layout?: 'sidebar-right' | 'sidebar-left' | 'full-width'
  /** Show sidebar */
  showSidebar?: boolean
  /** Sidebar props */
  sidebarProps?: Partial<BlogSidebarProps>
  /** Hero section config */
  hero?: {
    title?: string
    subtitle?: string
    backgroundImage?: string
    backgroundColor?: string
  }
  /** Max width for content */
  maxWidth?: number
  /** Base URL for blog links */
  basePath?: string
  /** Custom class name */
  className?: string
  /** Current category (for sidebar highlighting) */
  currentCategory?: string
  /** Main content */
  children: React.ReactNode
}

export async function BlogLayout({
  apiUrl = process.env.NEXT_PUBLIC_UPTRADE_API_URL || 'https://api.uptrademedia.com',
  apiKey = process.env.NEXT_PUBLIC_UPTRADE_API_KEY || '',
  layout = 'sidebar-right',
  showSidebar = true,
  sidebarProps = {},
  hero,
  maxWidth = 1280,
  basePath = '/blog',
  className,
  currentCategory,
  children,
}: BlogLayoutProps) {
  const hasSidebar = showSidebar && layout !== 'full-width'

  return (
    <div className={className}>
      {/* Hero Section */}
      {hero && (
        <section
          style={{
            padding: '60px 20px',
            backgroundColor: hero.backgroundColor || '#1e3a5f',
            backgroundImage: hero.backgroundImage ? `url(${hero.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth, margin: '0 auto' }}>
            {hero.title && (
              <h1
                style={{
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                {hero.title}
              </h1>
            )}
            {hero.subtitle && (
              <p
                style={{
                  fontSize: 'clamp(16px, 2vw, 20px)',
                  opacity: 0.9,
                  maxWidth: 600,
                  margin: '0 auto',
                }}
              >
                {hero.subtitle}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <div
        style={{
          maxWidth,
          margin: '0 auto',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            display: hasSidebar ? 'grid' : 'block',
            gridTemplateColumns: hasSidebar
              ? layout === 'sidebar-left'
                ? '300px 1fr'
                : '1fr 300px'
              : undefined,
            gap: 48,
          }}
        >
          {/* Sidebar (Left Position) */}
          {hasSidebar && layout === 'sidebar-left' && (
            <BlogSidebar
              apiUrl={apiUrl}
              apiKey={apiKey}
              basePath={basePath}
              currentCategory={currentCategory}
              {...sidebarProps}
            />
          )}

          {/* Main Content */}
          <main style={{ minWidth: 0 }}>{children}</main>

          {/* Sidebar (Right Position) */}
          {hasSidebar && layout === 'sidebar-right' && (
            <BlogSidebar
              apiUrl={apiUrl}
              apiKey={apiKey}
              basePath={basePath}
              currentCategory={currentCategory}
              {...sidebarProps}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// BLOG PAGE WRAPPER
// ============================================================================

/**
 * Convenience wrapper for a complete blog index page
 */
export interface BlogPageProps extends Omit<BlogLayoutProps, 'children'> {
  /** List component to render */
  listComponent: React.ReactNode
}

export async function BlogPage({ listComponent, ...layoutProps }: BlogPageProps) {
  return <BlogLayout {...layoutProps}>{listComponent}</BlogLayout>
}

/**
 * Convenience wrapper for a single blog post page
 */
export interface BlogPostPageProps extends Omit<BlogLayoutProps, 'children'> {
  /** Post component to render */
  postComponent: React.ReactNode
}

export async function BlogPostPage({ postComponent, ...layoutProps }: BlogPostPageProps) {
  return (
    <BlogLayout {...layoutProps} showSidebar={false} layout="full-width">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>{postComponent}</div>
    </BlogLayout>
  )
}

// ============================================================================
// CATEGORY PAGE WRAPPER
// ============================================================================

export interface CategoryPageProps extends BlogLayoutProps {
  /** Category slug being viewed */
  category: string
  /** Category display name */
  categoryName?: string
  /** List component */
  listComponent: React.ReactNode
}

export async function CategoryPage({
  category,
  categoryName,
  listComponent,
  hero,
  ...layoutProps
}: CategoryPageProps) {
  const categoryHero = hero || {
    title: categoryName || category,
    subtitle: `Browse all posts in ${categoryName || category}`,
    backgroundColor: '#1e3a5f',
  }

  return (
    <BlogLayout {...layoutProps} hero={categoryHero} currentCategory={category}>
      {listComponent}
    </BlogLayout>
  )
}
