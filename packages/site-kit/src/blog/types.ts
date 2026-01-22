/**
 * @uptrade/site-kit/blog - Type definitions
 */

// ============================================
// Blog Post Types
// ============================================

export interface BlogPost {
  id: string
  project_id: string
  
  /** URL slug */
  slug: string
  
  /** Content */
  title: string
  excerpt?: string
  content: string
  content_html?: string
  
  /** Featured image */
  featured_image?: string
  featured_image_alt?: string
  
  /** Author */
  author_id?: string
  author?: BlogAuthor
  
  /** Categorization */
  category_id?: string
  category?: BlogCategory
  tags?: BlogTag[]
  
  /** SEO */
  meta_title?: string
  meta_description?: string
  og_image?: string
  canonical_url?: string
  
  /** Publishing */
  status: 'draft' | 'published' | 'scheduled' | 'archived'
  published_at?: string
  scheduled_at?: string
  
  /** Settings */
  allow_comments: boolean
  is_featured: boolean
  
  /** Computed */
  reading_time_minutes?: number
  view_count?: number
  
  /** Timestamps */
  created_at: string
  updated_at: string
}

export interface BlogAuthor {
  id: string
  project_id: string
  name: string
  slug: string
  bio?: string
  avatar_url?: string
  email?: string
  website?: string
  social_links?: {
    twitter?: string
    linkedin?: string
    github?: string
  }
  is_active: boolean
}

export interface BlogCategory {
  id: string
  project_id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  post_count?: number
}

export interface BlogTag {
  id: string
  project_id: string
  name: string
  slug: string
  post_count?: number
}

// ============================================
// Query Types
// ============================================

export interface BlogListOptions {
  projectId: string
  
  /** Pagination */
  page?: number
  perPage?: number
  
  /** Filters */
  category?: string
  tag?: string
  author?: string
  search?: string
  featured?: boolean
  
  /** Sorting */
  orderBy?: 'published_at' | 'title' | 'view_count'
  order?: 'asc' | 'desc'
}

export interface BlogListResult {
  posts: BlogPost[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ============================================
// Component Props
// ============================================

export interface BlogPostProps {
  projectId: string
  slug: string
  children?: (props: BlogPostRenderProps) => React.ReactNode
}

export interface BlogPostRenderProps {
  post: BlogPost
  content: string
  relatedPosts?: BlogPost[]
  tableOfContents?: TocItem[]
}

export interface BlogListProps {
  projectId: string
  options?: Omit<BlogListOptions, 'projectId'>
  children?: (props: BlogListRenderProps) => React.ReactNode
}

export interface BlogListRenderProps {
  posts: BlogPost[]
  pagination: BlogListResult['pagination']
  categories: BlogCategory[]
  tags: BlogTag[]
}

export interface AuthorCardProps {
  author: BlogAuthor
  showBio?: boolean
  showSocial?: boolean
  className?: string
}

export interface RelatedPostsProps {
  projectId: string
  postId: string
  limit?: number
  className?: string
}

export interface TableOfContentsProps {
  content: string
  maxDepth?: number
  className?: string
}

export interface TocItem {
  id: string
  text: string
  level: number
  children?: TocItem[]
}

// ============================================
// Analytics Types
// ============================================

export interface BlogAnalytics {
  post_id: string
  session_id: string
  event_type: 'view' | 'scroll' | 'share' | 'comment'
  scroll_depth?: number
  share_platform?: string
  time_on_page?: number
  created_at: string
}
