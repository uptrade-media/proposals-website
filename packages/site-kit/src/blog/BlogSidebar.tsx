/**
 * @uptrade/site-kit/blog - Blog Sidebar Component
 * 
 * A reusable sidebar for blog pages with categories, recent posts,
 * tags, newsletter signup, and custom widgets.
 */

import React from 'react'
import type { BlogPost, BlogCategory, BlogTag } from './types'

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchRecentPosts(
  apiUrl: string,
  apiKey: string,
  limit: number = 5
): Promise<BlogPost[]> {
  try {
    const response = await fetch(`${apiUrl}/public/blog/recent?limit=${limit}`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.posts || []
  } catch (error) {
    console.error('[Blog] Error fetching recent posts:', error)
    return []
  }
}

async function fetchCategories(apiUrl: string, apiKey: string): Promise<BlogCategory[]> {
  try {
    const response = await fetch(`${apiUrl}/public/blog/categories`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.categories || []
  } catch (error) {
    console.error('[Blog] Error fetching categories:', error)
    return []
  }
}

async function fetchTags(apiUrl: string, apiKey: string): Promise<BlogTag[]> {
  try {
    const response = await fetch(`${apiUrl}/public/blog/tags`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.tags || []
  } catch (error) {
    console.error('[Blog] Error fetching tags:', error)
    return []
  }
}

// ============================================================================
// BLOG SIDEBAR COMPONENT
// ============================================================================

export interface BlogSidebarProps {
  /** Portal API URL */
  apiUrl?: string
  /** Project API key */
  apiKey?: string
  /** Show categories widget */
  showCategories?: boolean
  /** Show recent posts widget */
  showRecentPosts?: boolean
  /** Number of recent posts to show */
  recentPostsCount?: number
  /** Show tags widget */
  showTags?: boolean
  /** Show search widget */
  showSearch?: boolean
  /** Base URL for blog links */
  basePath?: string
  /** Custom class name */
  className?: string
  /** Current category filter (for highlighting) */
  currentCategory?: string
  /** Additional widgets to render */
  children?: React.ReactNode
}

export async function BlogSidebar({
  apiUrl = process.env.NEXT_PUBLIC_UPTRADE_API_URL || 'https://api.uptrademedia.com',
  apiKey = process.env.NEXT_PUBLIC_UPTRADE_API_KEY || '',
  showCategories = true,
  showRecentPosts = true,
  recentPostsCount = 5,
  showTags = true,
  showSearch = true,
  basePath = '/blog',
  className,
  currentCategory,
  children,
}: BlogSidebarProps) {
  if (!apiKey) {
    console.warn('[Blog] No API key configured for sidebar')
    return null
  }

  // Fetch data in parallel
  const [categories, recentPosts, tags] = await Promise.all([
    showCategories ? fetchCategories(apiUrl, apiKey) : Promise.resolve([]),
    showRecentPosts ? fetchRecentPosts(apiUrl, apiKey, recentPostsCount) : Promise.resolve([]),
    showTags ? fetchTags(apiUrl, apiKey) : Promise.resolve([]),
  ])

  return (
    <aside className={className} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Search Widget */}
      {showSearch && <SearchWidget basePath={basePath} />}

      {/* Categories Widget */}
      {showCategories && categories.length > 0 && (
        <CategoriesWidget
          categories={categories}
          basePath={basePath}
          currentCategory={currentCategory}
        />
      )}

      {/* Recent Posts Widget */}
      {showRecentPosts && recentPosts.length > 0 && (
        <RecentPostsWidget posts={recentPosts} basePath={basePath} />
      )}

      {/* Tags Widget */}
      {showTags && tags.length > 0 && (
        <TagsWidget tags={tags} basePath={basePath} />
      )}

      {/* Custom Widgets */}
      {children}
    </aside>
  )
}

// ============================================================================
// WIDGET COMPONENTS
// ============================================================================

function SearchWidget({ basePath }: { basePath: string }) {
  return (
    <div style={widgetStyle}>
      <h4 style={widgetTitleStyle}>Search</h4>
      <form action={basePath} method="get">
        <input
          type="search"
          name="search"
          placeholder="Search posts..."
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
          }}
        />
      </form>
    </div>
  )
}

function CategoriesWidget({
  categories,
  basePath,
  currentCategory,
}: {
  categories: BlogCategory[]
  basePath: string
  currentCategory?: string
}) {
  return (
    <div style={widgetStyle}>
      <h4 style={widgetTitleStyle}>Categories</h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        <li style={{ marginBottom: 8 }}>
          <a
            href={basePath}
            style={{
              ...categoryLinkStyle,
              fontWeight: !currentCategory ? 600 : 400,
              color: !currentCategory ? '#3b82f6' : '#374151',
            }}
          >
            All Posts
          </a>
        </li>
        {categories.map((cat) => (
          <li key={cat.slug} style={{ marginBottom: 8 }}>
            <a
              href={`${basePath}?category=${cat.slug}`}
              style={{
                ...categoryLinkStyle,
                fontWeight: currentCategory === cat.slug ? 600 : 400,
                color: currentCategory === cat.slug ? '#3b82f6' : '#374151',
              }}
            >
              {cat.name}
              <span style={{ color: '#9ca3af', marginLeft: 8 }}>({cat.post_count})</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RecentPostsWidget({
  posts,
  basePath,
}: {
  posts: BlogPost[]
  basePath: string
}) {
  return (
    <div style={widgetStyle}>
      <h4 style={widgetTitleStyle}>Recent Posts</h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {posts.map((post) => {
          const date = post.published_at
            ? new Date(post.published_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : null

          return (
            <li
              key={post.id}
              style={{
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                {post.featured_image && (
                  <a href={`${basePath}/${post.slug}`}>
                    <img
                      src={post.featured_image}
                      alt=""
                      style={{
                        width: 64,
                        height: 48,
                        objectFit: 'cover',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    />
                  </a>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a
                    href={`${basePath}/${post.slug}`}
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#374151',
                      textDecoration: 'none',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {post.title}
                  </a>
                  {date && (
                    <span style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginTop: 4 }}>
                      {date}
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TagsWidget({
  tags,
  basePath,
}: {
  tags: BlogTag[]
  basePath: string
}) {
  return (
    <div style={widgetStyle}>
      <h4 style={widgetTitleStyle}>Popular Tags</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.slice(0, 15).map((tag) => (
          <a
            key={tag.slug}
            href={`${basePath}?tag=${tag.slug}`}
            style={{
              padding: '4px 10px',
              backgroundColor: '#f3f4f6',
              borderRadius: 9999,
              fontSize: 12,
              color: '#374151',
              textDecoration: 'none',
              transition: 'background-color 0.2s',
            }}
          >
            {tag.name}
          </a>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// NEWSLETTER WIDGET (Client Component for forms)
// ============================================================================

export interface NewsletterWidgetProps {
  title?: string
  description?: string
  buttonText?: string
  onSubmit?: (email: string) => Promise<void>
}

export function NewsletterWidget({
  title = 'Subscribe to Our Newsletter',
  description = 'Get the latest posts delivered straight to your inbox.',
  buttonText = 'Subscribe',
}: NewsletterWidgetProps) {
  return (
    <div style={{ ...widgetStyle, backgroundColor: '#eff6ff' }}>
      <h4 style={{ ...widgetTitleStyle, color: '#1e40af' }}>{title}</h4>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>{description}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          // Handle form submission via parent onSubmit or inline
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          required
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {buttonText}
        </button>
      </form>
    </div>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const widgetStyle: React.CSSProperties = {
  padding: 20,
  backgroundColor: '#f9fafb',
  borderRadius: 12,
}

const widgetTitleStyle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 16,
  fontWeight: 600,
  color: '#111827',
}

const categoryLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: 14,
  textDecoration: 'none',
}
