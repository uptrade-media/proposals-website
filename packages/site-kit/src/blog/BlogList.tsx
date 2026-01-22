/**
 * @uptrade/site-kit/blog - Blog List Component (Placeholder)
 */

import React from 'react'
import type { BlogListProps } from './types'

export async function BlogList({ projectId, options, children }: BlogListProps) {
  // Placeholder - full implementation will:
  // 1. Fetch posts with pagination
  // 2. Apply filters (category, tag, search)
  // 3. Fetch categories and tags for filtering UI
  
  return (
    <div>
      <p>Blog list for project: {projectId}</p>
      <p>Coming soon...</p>
    </div>
  )
}
