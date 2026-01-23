/**
 * @uptrade/site-kit/blog - Blog Post Component
 * 
 * Fetches and displays a single blog post with full content, table of contents,
 * author info, related posts, and SEO metadata support.
 */

import React from 'react'
import type { BlogPost as BlogPostType, TocItem, BlogAuthor } from './types'

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchBlogPost(
  apiUrl: string,
  apiKey: string,
  slug: string
): Promise<BlogPostType | null> {
  try {
    const response = await fetch(`${apiUrl}/public/blog/posts/${slug}`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      if (response.status === 404) return null
      console.error('[Blog] Failed to fetch post:', response.statusText)
      return null
    }

    const data = await response.json()
    return data.post
  } catch (error) {
    console.error('[Blog] Error fetching post:', error)
    return null
  }
}

async function fetchRelatedPosts(
  apiUrl: string,
  apiKey: string,
  postId: string,
  limit: number = 3
): Promise<BlogPostType[]> {
  try {
    const response = await fetch(`${apiUrl}/public/blog/related`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ current_post_id: postId, limit }),
      next: { revalidate: 300 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.posts || []
  } catch (error) {
    console.error('[Blog] Error fetching related posts:', error)
    return []
  }
}

// ============================================================================
// TOC GENERATION
// ============================================================================

function generateTableOfContents(html: string): TocItem[] {
  const headingRegex = /<h([2-4])[^>]*(?:id="([^"]*)")?[^>]*>(.*?)<\/h[2-4]>/gi
  const items: TocItem[] = []
  let match

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1])
    const existingId = match[2]
    const text = match[3].replace(/<[^>]*>/g, '') // Strip nested HTML
    const id = existingId || slugify(text)

    items.push({ id, text, level })
  }

  return items
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ============================================================================
// BLOG POST COMPONENT
// ============================================================================

export interface BlogPostServerProps {
  /** Portal API URL */
  apiUrl?: string
  /** Project API key */
  apiKey?: string
  /** Blog post slug */
  slug: string
  /** Show table of contents sidebar */
  showToc?: boolean
  /** Show related posts */
  showRelated?: boolean
  /** Number of related posts */
  relatedCount?: number
  /** Show author card */
  showAuthor?: boolean
  /** Base URL for blog links */
  basePath?: string
  /** Custom class name */
  className?: string
  /** Custom render function */
  children?: (props: {
    post: BlogPostType
    tableOfContents: TocItem[]
    relatedPosts: BlogPostType[]
  }) => React.ReactNode
}

export async function BlogPost({
  apiUrl = process.env.NEXT_PUBLIC_UPTRADE_API_URL || 'https://api.uptrademedia.com',
  apiKey = process.env.NEXT_PUBLIC_UPTRADE_API_KEY || '',
  slug,
  showToc = true,
  showRelated = true,
  relatedCount = 3,
  showAuthor = true,
  basePath = '/blog',
  className,
  children,
}: BlogPostServerProps) {
  if (!apiKey) {
    console.warn('[Blog] No API key configured')
    return null
  }

  const post = await fetchBlogPost(apiUrl, apiKey, slug)

  if (!post) {
    return (
      <div className={className} style={{ textAlign: 'center', padding: 60 }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Post Not Found</h1>
        <p style={{ color: '#6b7280' }}>
          The blog post you're looking for doesn't exist or has been removed.
        </p>
        <a
          href={basePath}
          style={{
            display: 'inline-block',
            marginTop: 24,
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          ← Back to Blog
        </a>
      </div>
    )
  }

  const content = post.content_html || post.content || ''
  const tableOfContents = showToc ? generateTableOfContents(content) : []
  const relatedPosts = showRelated
    ? await fetchRelatedPosts(apiUrl, apiKey, post.id, relatedCount)
    : []

  // Custom render
  if (children) {
    return children({ post, tableOfContents, relatedPosts })
  }

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <article className={className}>
      {/* Header */}
      <header style={{ marginBottom: 32 }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: 16, fontSize: 14, color: '#6b7280' }}>
          <a href={basePath} style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Blog
          </a>
          {post.category && (
            <>
              <span style={{ margin: '0 8px' }}>/</span>
              <a
                href={`${basePath}?category=${post.category}`}
                style={{ color: '#3b82f6', textDecoration: 'none' }}
              >
                {typeof post.category === 'string' ? post.category : post.category?.name || 'Uncategorized'}
              </a>
            </>
          )}
        </nav>

        {/* Title */}
        <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
          {post.title}
        </h1>

        {/* Subtitle */}
        {post.subtitle && (
          <p style={{ fontSize: 20, color: '#6b7280', marginBottom: 16 }}>
            {post.subtitle}
          </p>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {post.author && (
            <span style={{ fontSize: 14, color: '#374151' }}>
              By {typeof post.author === 'string' ? post.author : post.author.name}
            </span>
          )}
          {date && (
            <span style={{ fontSize: 14, color: '#6b7280' }}>{date}</span>
          )}
          {post.reading_time_minutes && (
            <span style={{ fontSize: 14, color: '#9ca3af' }}>
              {post.reading_time_minutes} min read
            </span>
          )}
        </div>
      </header>

      {/* Featured Image */}
      {post.featured_image && (
        <figure style={{ margin: '0 0 32px' }}>
          <img
            src={post.featured_image}
            alt={post.featured_image_alt || post.title}
            style={{
              width: '100%',
              maxHeight: 500,
              objectFit: 'cover',
              borderRadius: 12,
            }}
          />
        </figure>
      )}

      {/* Content Layout with TOC */}
      <div
        style={{
          display: showToc && tableOfContents.length > 0 ? 'grid' : 'block',
          gridTemplateColumns: showToc && tableOfContents.length > 0 ? '1fr 250px' : undefined,
          gap: 48,
        }}
      >
        {/* Main Content */}
        <div
          className="blog-content"
          style={{
            fontSize: 17,
            lineHeight: 1.8,
            color: '#374151',
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Table of Contents Sidebar */}
        {showToc && tableOfContents.length > 0 && (
          <aside
            style={{
              position: 'sticky',
              top: 100,
              alignSelf: 'start',
              padding: 20,
              backgroundColor: '#f9fafb',
              borderRadius: 12,
            }}
          >
            <h4
              style={{
                margin: '0 0 12px',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#6b7280',
              }}
            >
              On This Page
            </h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {tableOfContents.map((item) => (
                <li
                  key={item.id}
                  style={{
                    paddingLeft: (item.level - 2) * 12,
                    marginBottom: 8,
                  }}
                >
                  <a
                    href={`#${item.id}`}
                    style={{
                      fontSize: 14,
                      color: '#6b7280',
                      textDecoration: 'none',
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div style={{ marginTop: 32, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {post.tags.map((tag, index) => {
            const tagName = typeof tag === 'string' ? tag : tag?.name || '';
            return (
              <a
                key={`${tagName}-${index}`}
                href={`${basePath}?tag=${tagName}`}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: 9999,
                  fontSize: 13,
                  color: '#374151',
                  textDecoration: 'none',
                }}
              >
                #{tagName}
              </a>
            );
          })}
        </div>
      )}

      {/* FAQ Section */}
      {post.faq_items && Array.isArray(post.faq_items) && post.faq_items.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {post.faq_items.map((faq: { question: string; answer: string }, index: number) => (
              <details
                key={index}
                style={{
                  padding: 16,
                  backgroundColor: '#f9fafb',
                  borderRadius: 8,
                }}
              >
                <summary
                  style={{
                    fontWeight: 500,
                    cursor: 'pointer',
                    listStyle: 'none',
                  }}
                >
                  {faq.question}
                </summary>
                <p style={{ marginTop: 12, color: '#6b7280' }}>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Author Card */}
      {showAuthor && post.author && typeof post.author === 'object' && (
        <AuthorSection author={post.author as BlogAuthor} />
      )}

      {/* Related Posts */}
      {showRelated && relatedPosts.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>
            Related Posts
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {relatedPosts.map((relatedPost) => (
              <article
                key={relatedPost.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                {relatedPost.featured_image && (
                  <a href={`${basePath}/${relatedPost.slug}`}>
                    <img
                      src={relatedPost.featured_image}
                      alt={relatedPost.title}
                      style={{ width: '100%', height: 150, objectFit: 'cover' }}
                    />
                  </a>
                )}
                <div style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                    <a
                      href={`${basePath}/${relatedPost.slug}`}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {relatedPost.title}
                    </a>
                  </h3>
                  {relatedPost.excerpt && (
                    <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                      {relatedPost.excerpt.slice(0, 100)}...
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

// ============================================================================
// AUTHOR SECTION
// ============================================================================

function AuthorSection({ author }: { author: BlogAuthor }) {
  return (
    <section
      style={{
        marginTop: 48,
        padding: 24,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start',
      }}
    >
      {author.avatar_url && (
        <img
          src={author.avatar_url}
          alt={author.name}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      )}
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>
          {author.name}
        </h3>
        {author.bio && (
          <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 14 }}>
            {author.bio}
          </p>
        )}
        {author.social_links && (
          <div style={{ display: 'flex', gap: 16 }}>
            {author.social_links.twitter && (
              <a
                href={`https://twitter.com/${author.social_links.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', fontSize: 14 }}
              >
                Twitter
              </a>
            )}
            {author.social_links.linkedin && (
              <a
                href={author.social_links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', fontSize: 14 }}
              >
                LinkedIn
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}