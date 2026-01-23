/**
 * @uptrade/site-kit/blog - Related Posts Component
 * 
 * Fetches and displays related blog posts via Portal API
 */

import React from 'react'
import type { RelatedPostsProps, BlogPost } from './types'

async function fetchRelatedPosts(
  apiUrl: string,
  apiKey: string,
  currentPostId: string,
  limit: number
): Promise<BlogPost[]> {
  try {
    const response = await fetch(`${apiUrl}/api/public/blog/related`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        currentPostId,
        limit,
      }),
    })
    
    if (!response.ok) {
      console.error('Failed to fetch related posts:', response.statusText)
      return []
    }
    
    const data = await response.json()
    return data.posts || []
  } catch (error) {
    console.error('Failed to fetch related posts:', error)
    return []
  }
}

interface RelatedPostsServerProps {
  apiUrl?: string
  apiKey?: string
  currentPostId: string
  limit?: number
  className?: string
  renderItem?: (post: BlogPost) => React.ReactNode
}

export async function RelatedPosts({
  apiUrl = process.env.NEXT_PUBLIC_UPTRADE_API_URL || 'https://api.uptrademedia.com',
  apiKey = process.env.NEXT_PUBLIC_UPTRADE_API_KEY || '',
  currentPostId,
  limit = 3,
  className,
  renderItem,
}: RelatedPostsServerProps) {
  if (!apiKey) {
    console.warn('[Blog] No API key configured for RelatedPosts')
    return null
  }
  
  const posts = await fetchRelatedPosts(apiUrl, apiKey, currentPostId, limit)

  if (posts.length === 0) return null

  return (
    <section className={className}>
      <h3 style={{ marginBottom: 16 }}>Related Posts</h3>
      <div style={{ display: 'grid', gap: 16 }}>
        {posts.map((post) =>
          renderItem ? (
            renderItem(post)
          ) : (
            <article key={post.id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}>
              {post.featured_image && (
                <img
                  src={post.featured_image}
                  alt={post.title}
                  style={{
                    width: '100%',
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                />
              )}
              <a href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <h4 style={{ margin: 0, color: 'inherit' }}>{post.title}</h4>
              </a>
              {post.excerpt && (
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
                  {post.excerpt}
                </p>
              )}
            </article>
          )
        )}
      </div>
    </section>
  )
}
