/**
 * @uptrade/site-kit/blog - Blog List Component
 * 
 * Fetches and displays a list of blog posts with pagination, filtering, and sorting.
 * Supports both server-side and client-side rendering.
 */

import React from 'react'
import type { BlogListResult, BlogPost, BlogCategory } from './types'

// ============================================================================
// DATA FETCHING
// ============================================================================

interface FetchBlogListParams {
  apiUrl: string
  apiKey: string
  category?: string
  tag?: string
  author?: string
  featured?: boolean
  search?: string
  page?: number
  perPage?: number
  orderBy?: 'published_at' | 'title' | 'view_count'
  order?: 'asc' | 'desc'
}

async function fetchBlogList(params: FetchBlogListParams): Promise<BlogListResult> {
  const {
    apiUrl,
    apiKey,
    category,
    tag,
    author,
    featured,
    search,
    page = 1,
    perPage = 12,
    orderBy = 'published_at',
    order = 'desc',
  } = params

  const queryParams = new URLSearchParams()
  if (category) queryParams.set('category', category)
  if (tag) queryParams.set('tag', tag)
  if (author) queryParams.set('author', author)
  if (featured) queryParams.set('featured', 'true')
  if (search) queryParams.set('search', search)
  queryParams.set('page', String(page))
  queryParams.set('per_page', String(perPage))
  queryParams.set('order_by', orderBy)
  queryParams.set('order', order)

  try {
    const response = await fetch(`${apiUrl}/public/blog/posts?${queryParams}`, {
      headers: {
        'x-api-key': apiKey,
      },
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    })

    if (!response.ok) {
      console.error('[Blog] Failed to fetch posts:', response.statusText)
      return {
        posts: [],
        pagination: {
          page: 1,
          perPage: 12,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }
    }

    const data = await response.json()
    
    return {
      posts: data.posts || [],
      pagination: {
        page: data.pagination?.page || 1,
        perPage: data.pagination?.per_page || 12,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.total_pages || 0,
        hasNext: data.pagination?.has_next || false,
        hasPrev: data.pagination?.has_prev || false,
      },
    }
  } catch (error) {
    console.error('[Blog] Error fetching posts:', error)
    return {
      posts: [],
      pagination: {
        page: 1,
        perPage: 12,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    }
  }
}

async function fetchCategories(apiUrl: string, apiKey: string): Promise<BlogCategory[]> {
  try {
    const response = await fetch(`${apiUrl}/public/blog/categories`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.categories || []
  } catch (error) {
    console.error('[Blog] Error fetching categories:', error)
    return []
  }
}

// ============================================================================
// BLOG LIST COMPONENT
// ============================================================================

export interface BlogListServerProps {
  /** Portal API URL */
  apiUrl?: string
  /** Project API key */
  apiKey?: string
  /** Filter by category slug */
  category?: string
  /** Filter by tag */
  tag?: string
  /** Filter by author */
  author?: string
  /** Only featured posts */
  featured?: boolean
  /** Search query */
  search?: string
  /** Page number (1-indexed) */
  page?: number
  /** Items per page */
  perPage?: number
  /** Sort field */
  orderBy?: 'published_at' | 'title' | 'view_count'
  /** Sort direction */
  order?: 'asc' | 'desc'
  /** Show category filter UI */
  showCategoryFilter?: boolean
  /** Show pagination */
  showPagination?: boolean
  /** Custom class name */
  className?: string
  /** Base URL for post links */
  basePath?: string
  /** Custom render function for post card */
  renderPost?: (post: BlogPost) => React.ReactNode
  /** Custom render function for entire grid */
  children?: (props: {
    posts: BlogPost[]
    pagination: BlogListResult['pagination']
    categories: BlogCategory[]
  }) => React.ReactNode
}

export async function BlogList({
  apiUrl = process.env.NEXT_PUBLIC_UPTRADE_API_URL || 'https://api.uptrademedia.com',
  apiKey = process.env.NEXT_PUBLIC_UPTRADE_API_KEY || '',
  category,
  tag,
  author,
  featured,
  search,
  page = 1,
  perPage = 12,
  orderBy = 'published_at',
  order = 'desc',
  showCategoryFilter = false,
  showPagination = true,
  className,
  basePath = '/blog',
  renderPost,
  children,
}: BlogListServerProps) {
  if (!apiKey) {
    console.warn('[Blog] No API key configured')
    return null
  }

  // Fetch data in parallel
  const [blogData, categories] = await Promise.all([
    fetchBlogList({
      apiUrl,
      apiKey,
      category,
      tag,
      author,
      featured,
      search,
      page,
      perPage,
      orderBy,
      order,
    }),
    showCategoryFilter ? fetchCategories(apiUrl, apiKey) : Promise.resolve([]),
  ])

  // Use custom render function if provided
  if (children) {
    return children({ posts: blogData.posts, pagination: blogData.pagination, categories })
  }

  const { posts, pagination } = blogData

  if (posts.length === 0) {
    return (
      <div className={className} style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#6b7280' }}>No posts found.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Category Filter */}
      {showCategoryFilter && categories.length > 0 && (
        <nav style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            href={basePath}
            style={{
              padding: '6px 12px',
              borderRadius: 9999,
              fontSize: 14,
              textDecoration: 'none',
              backgroundColor: !category ? '#3b82f6' : '#f3f4f6',
              color: !category ? '#fff' : '#374151',
            }}
          >
            All
          </a>
          {categories.map((cat) => (
            <a
              key={cat.slug}
              href={`${basePath}?category=${cat.slug}`}
              style={{
                padding: '6px 12px',
                borderRadius: 9999,
                fontSize: 14,
                textDecoration: 'none',
                backgroundColor: category === cat.slug ? '#3b82f6' : '#f3f4f6',
                color: category === cat.slug ? '#fff' : '#374151',
              }}
            >
              {cat.name} ({cat.post_count})
            </a>
          ))}
        </nav>
      )}

      {/* Blog Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {posts.map((post) =>
          renderPost ? (
            <React.Fragment key={post.id}>{renderPost(post)}</React.Fragment>
          ) : (
            <BlogPostCard key={post.id} post={post} basePath={basePath} />
          )
        )}
      </div>

      {/* Pagination */}
      {showPagination && pagination.totalPages > 1 && (
        <nav
          style={{
            marginTop: 40,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {pagination.hasPrev && (
            <a
              href={buildPaginationUrl(basePath, page - 1, category)}
              style={paginationLinkStyle}
            >
              ← Previous
            </a>
          )}
          
          <span style={{ padding: '8px 16px', color: '#6b7280' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          {pagination.hasNext && (
            <a
              href={buildPaginationUrl(basePath, page + 1, category)}
              style={paginationLinkStyle}
            >
              Next →
            </a>
          )}
        </nav>
      )}
    </div>
  )
}

// ============================================================================
// BLOG POST CARD (Default rendering)
// ============================================================================

interface BlogPostCardProps {
  post: BlogPost
  basePath: string
}

function BlogPostCard({ post, basePath }: BlogPostCardProps) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <article
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
    >
      {post.featured_image && (
        <a href={`${basePath}/${post.slug}`}>
          <img
            src={post.featured_image}
            alt={post.featured_image_alt || post.title}
            style={{
              width: '100%',
              height: 200,
              objectFit: 'cover',
            }}
          />
        </a>
      )}
      
      <div style={{ padding: 20 }}>
        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {post.category && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                textTransform: 'uppercase',
              }}
            >
              {typeof post.category === 'string' ? post.category : post.category?.name || 'Uncategorized'}
            </span>
          )}
          {date && (
            <span style={{ fontSize: 13, color: '#6b7280' }}>{date}</span>
          )}
        </div>

        {/* Title */}
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>
          <a
            href={`${basePath}/${post.slug}`}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            {post.title}
          </a>
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 14,
              color: '#6b7280',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.excerpt}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {post.author && (
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              By {typeof post.author === 'string' ? post.author : post.author.name}
            </span>
          )}
          {post.reading_time_minutes && (
            <span style={{ fontSize: 13, color: '#9ca3af' }}>
              {post.reading_time_minutes} min read
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function buildPaginationUrl(basePath: string, page: number, category?: string): string {
  const params = new URLSearchParams()
  params.set('page', String(page))
  if (category) params.set('category', category)
  return `${basePath}?${params}`
}

const paginationLinkStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  backgroundColor: '#3b82f6',
  color: '#fff',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
}