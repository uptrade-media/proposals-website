/**
 * @uptrade/site-kit/blog - Blog Post Component (Placeholder)
 */

import React from 'react'
import type { BlogPostProps } from './types'

export async function BlogPost({ projectId, slug, children }: BlogPostProps) {
  // Placeholder - full implementation will:
  // 1. Fetch post from Supabase
  // 2. Parse content (markdown to HTML if needed)
  // 3. Generate table of contents
  // 4. Fetch related posts
  // 5. Track view analytics
  
  return (
    <div>
      <p>Blog post: {slug}</p>
      <p>Coming soon...</p>
    </div>
  )
}
