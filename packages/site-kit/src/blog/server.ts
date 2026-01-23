/**
 * @uptrade/site-kit/blog/server
 * 
 * Server-side functions for Next.js blog pages.
 * Includes metadata generation, sitemap, RSS feeds, and static params for SSG.
 */

import type { Metadata } from 'next'
import type { BlogPost, TocItem } from './types'

// ============================================================================
// CONFIGURATION
// ============================================================================

interface BlogServerConfig {
  apiUrl: string
  apiKey: string
}

function getConfig(): BlogServerConfig {
  return {
    apiUrl: process.env.NEXT_PUBLIC_UPTRADE_API_URL || 'https://api.uptrademedia.com',
    apiKey: process.env.NEXT_PUBLIC_UPTRADE_API_KEY || '',
  }
}

// ============================================================================
// SEO VALIDATION UTILITIES
// ============================================================================

export const SEO_LIMITS = {
  title: { min: 30, max: 60, recommended: 55 },
  metaDescription: { min: 120, max: 160, recommended: 155 },
  excerpt: { min: 100, max: 300, recommended: 200 },
  slug: { max: 75 },
  focusKeyphrase: { min: 2, max: 4, words: true }, // 2-4 words
} as const

export interface SeoValidationResult {
  field: string
  value: string
  length: number
  limit: { min?: number; max: number; recommended?: number }
  status: 'good' | 'warning' | 'error'
  message: string
}

/**
 * Validate SEO title (60 chars max, keyword-first recommended)
 */
export function validateSeoTitle(title: string, focusKeyphrase?: string): SeoValidationResult {
  const length = title.length
  let status: SeoValidationResult['status'] = 'good'
  let message = 'Title length is optimal'

  if (length > SEO_LIMITS.title.max) {
    status = 'error'
    message = `Title is ${length - SEO_LIMITS.title.max} characters too long (max ${SEO_LIMITS.title.max})`
  } else if (length < SEO_LIMITS.title.min) {
    status = 'warning'
    message = `Title is short (${length}/${SEO_LIMITS.title.min} min)`
  } else if (focusKeyphrase && !title.toLowerCase().includes(focusKeyphrase.toLowerCase())) {
    status = 'warning'
    message = 'Focus keyphrase not found in title'
  } else if (focusKeyphrase && !title.toLowerCase().startsWith(focusKeyphrase.toLowerCase())) {
    status = 'warning'
    message = 'Title should start with focus keyphrase for best results'
  }

  return { field: 'title', value: title, length, limit: SEO_LIMITS.title, status, message }
}

/**
 * Validate meta description (150-160 chars, benefit-driven)
 */
export function validateMetaDescription(description: string, focusKeyphrase?: string): SeoValidationResult {
  const length = description.length
  let status: SeoValidationResult['status'] = 'good'
  let message = 'Meta description is optimal'

  if (length > SEO_LIMITS.metaDescription.max) {
    status = 'error'
    message = `Description will be truncated (${length}/${SEO_LIMITS.metaDescription.max})`
  } else if (length < SEO_LIMITS.metaDescription.min) {
    status = 'warning'
    message = `Description is short (${length}/${SEO_LIMITS.metaDescription.min} min)`
  } else if (focusKeyphrase && !description.toLowerCase().includes(focusKeyphrase.toLowerCase())) {
    status = 'warning'
    message = 'Focus keyphrase not found in description'
  }

  return { field: 'meta_description', value: description, length, limit: SEO_LIMITS.metaDescription, status, message }
}

/**
 * Full SEO validation for a blog post
 */
export function validateBlogPostSeo(post: Partial<BlogPost>): SeoValidationResult[] {
  const results: SeoValidationResult[] = []
  const focusKeyphrase = post.focus_keyphrase

  if (post.meta_title || post.title) {
    results.push(validateSeoTitle(post.meta_title || post.title || '', focusKeyphrase))
  }

  if (post.meta_description) {
    results.push(validateMetaDescription(post.meta_description, focusKeyphrase))
  }

  // Check H1 alignment (title should match keyword)
  if (post.title && focusKeyphrase) {
    const titleLower = post.title.toLowerCase()
    const keyLower = focusKeyphrase.toLowerCase()
    if (!titleLower.includes(keyLower)) {
      results.push({
        field: 'h1_alignment',
        value: post.title,
        length: post.title.length,
        limit: { max: 100 },
        status: 'warning',
        message: 'H1 (title) should include the focus keyphrase',
      })
    }
  }

  // Check word count (1200-2500 recommended for long-form)
  if (post.word_count !== undefined) {
    let wordStatus: SeoValidationResult['status'] = 'good'
    let wordMessage = 'Content length is optimal for SEO'
    
    if (post.word_count < 600) {
      wordStatus = 'error'
      wordMessage = `Content is thin (${post.word_count} words). Aim for 1200+ words.`
    } else if (post.word_count < 1200) {
      wordStatus = 'warning'
      wordMessage = `Content is short (${post.word_count} words). Long-form (1200-2500) ranks better.`
    } else if (post.word_count > 2500) {
      wordMessage = `Comprehensive content (${post.word_count} words). Consider splitting into a topic cluster.`
    }

    results.push({
      field: 'word_count',
      value: String(post.word_count),
      length: post.word_count,
      limit: { min: 1200, max: 2500, recommended: 1800 },
      status: wordStatus,
      message: wordMessage,
    })
  }

  return results
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch a blog post by slug (server-side)
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const { apiUrl, apiKey } = getConfig()

  if (!apiKey) {
    console.warn('[Blog] No API key configured')
    return null
  }

  try {
    const response = await fetch(`${apiUrl}/public/blog/posts/${slug}`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 60 },
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.post || null
  } catch (error) {
    console.error('[Blog] Error fetching post:', error)
    return null
  }
}

/**
 * Fetch all blog post slugs for static generation
 */
export async function getAllBlogSlugs(): Promise<{ slug: string; last_modified?: string }[]> {
  const { apiUrl, apiKey } = getConfig()

  if (!apiKey) {
    console.warn('[Blog] No API key configured')
    return []
  }

  try {
    const response = await fetch(`${apiUrl}/public/blog/slugs`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.slugs || []
  } catch (error) {
    console.error('[Blog] Error fetching slugs:', error)
    return []
  }
}

/**
 * Fetch blog categories
 */
export async function getBlogCategories(): Promise<{ name: string; slug: string; post_count: number }[]> {
  const { apiUrl, apiKey } = getConfig()

  if (!apiKey) return []

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

// ============================================================================
// METADATA GENERATION
// ============================================================================

interface BlogMetadataOptions {
  /** Site name for og:site_name */
  siteName?: string
  /** Base URL of the site */
  siteUrl?: string
  /** Default OG image */
  defaultImage?: string
  /** Twitter handle */
  twitterHandle?: string
}

/**
 * Generate metadata for a blog post page
 */
export async function generateBlogPostMetadata(
  slug: string,
  options: BlogMetadataOptions = {}
): Promise<Metadata> {
  const post = await getBlogPost(slug)
  const { siteName, siteUrl = '', defaultImage, twitterHandle } = options

  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.',
    }
  }

  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt || ''
  const image = post.og_image || post.featured_image || defaultImage
  const url = `${siteUrl}/blog/${post.slug}`

  return {
    title,
    description,
    openGraph: {
      title: post.og_title || title,
      description: post.og_description || description,
      url,
      siteName,
      type: 'article',
      publishedTime: post.published_at,
      authors: post.author ? [typeof post.author === 'string' ? post.author : post.author.name] : undefined,
      images: image
        ? [
            {
              url: image,
              width: post.featured_image_width || 1200,
              height: post.featured_image_height || 630,
              alt: post.featured_image_alt || post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
      creator: twitterHandle,
    },
    alternates: {
      canonical: post.canonical_url || url,
    },
    other: {
      'article:published_time': post.published_at || '',
      'article:section': typeof post.category === 'string' ? post.category : (post.category?.name || ''),
    },
  }
}

/**
 * Generate metadata for the blog index page
 */
export function generateBlogIndexMetadata(options: BlogMetadataOptions & {
  title?: string
  description?: string
}): Metadata {
  const {
    title = 'Blog',
    description = 'Read our latest articles and insights.',
    siteName,
    siteUrl = '',
    defaultImage,
    twitterHandle,
  } = options

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/blog`,
      siteName,
      type: 'website',
      images: defaultImage ? [{ url: defaultImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: defaultImage ? [defaultImage] : undefined,
      creator: twitterHandle,
    },
  }
}

/**
 * Generate metadata for a category page
 */
export function generateBlogCategoryMetadata(
  categoryName: string,
  options: BlogMetadataOptions = {}
): Metadata {
  const { siteName, siteUrl = '', defaultImage } = options
  const title = `${categoryName} - Blog`
  const description = `Browse all posts in ${categoryName}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/blog/category/${categoryName.toLowerCase()}`,
      siteName,
      type: 'website',
      images: defaultImage ? [{ url: defaultImage }] : undefined,
    },
  }
}

// ============================================================================
// STATIC PARAMS GENERATION
// ============================================================================

/**
 * Generate static params for blog post pages
 * Usage: export const generateStaticParams = generateBlogStaticParams
 */
export async function generateBlogStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllBlogSlugs()
  return slugs.map((s) => ({ slug: s.slug }))
}

/**
 * Generate static params for category pages
 * Usage: export const generateStaticParams = generateCategoryStaticParams
 */
export async function generateCategoryStaticParams(): Promise<{ category: string }[]> {
  const categories = await getBlogCategories()
  return categories.map((c) => ({ category: c.slug }))
}

// ============================================================================
// SITEMAP GENERATION
// ============================================================================

interface SitemapEntry {
  url: string
  lastModified?: Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

/**
 * Generate sitemap entries for blog posts
 */
export async function generateBlogSitemap(
  siteUrl: string
): Promise<SitemapEntry[]> {
  const slugs = await getAllBlogSlugs()
  const categories = await getBlogCategories()

  const entries: SitemapEntry[] = [
    // Blog index
    {
      url: `${siteUrl}/blog`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  // Category pages
  categories.forEach((cat) => {
    entries.push({
      url: `${siteUrl}/blog/category/${cat.slug}`,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  })

  // Individual posts
  slugs.forEach((post) => {
    entries.push({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.last_modified ? new Date(post.last_modified) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  })

  return entries
}

// ============================================================================
// JSON-LD SCHEMA GENERATION
// ============================================================================

/**
 * Generate JSON-LD schema for a blog post
 */
export function generateBlogPostSchema(
  post: BlogPost,
  options: { siteUrl?: string; siteName?: string; logoUrl?: string } = {}
): object {
  const { siteUrl = '', siteName, logoUrl } = options

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.meta_description,
    url: `${siteUrl}/blog/${post.slug}`,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: typeof post.author === 'string' ? post.author : post.author?.name,
    },
  }

  if (post.featured_image) {
    schema.image = {
      '@type': 'ImageObject',
      url: post.featured_image,
      width: post.featured_image_width || 1200,
      height: post.featured_image_height || 630,
    }
  }

  if (siteName || logoUrl) {
    schema.publisher = {
      '@type': 'Organization',
      name: siteName,
      logo: logoUrl
        ? {
            '@type': 'ImageObject',
            url: logoUrl,
          }
        : undefined,
    }
  }

  // Add FAQ schema if present
  if (post.faq_items && Array.isArray(post.faq_items) && post.faq_items.length > 0) {
    schema.mainEntity = {
      '@type': 'FAQPage',
      mainEntity: post.faq_items.map((faq: { question: string; answer: string }) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    }
  }

  return schema
}

/**
 * Generate JSON-LD schema for blog index/listing page
 */
export function generateBlogListSchema(
  options: { siteUrl?: string; siteName?: string; description?: string } = {}
): object {
  const { siteUrl = '', siteName, description } = options

  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: siteName ? `${siteName} Blog` : 'Blog',
    description: description || 'Our latest articles and insights.',
    url: `${siteUrl}/blog`,
  }
}

// ============================================================================
// FAQ SCHEMA (for PAA rankings)
// ============================================================================

/**
 * Generate standalone FAQ schema (great for PAA inclusion)
 */
export function generateFaqSchema(
  faqItems: { question: string; answer: string }[]
): object | null {
  if (!faqItems || faqItems.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

// ============================================================================
// HOWTO SCHEMA (for step-by-step posts)
// ============================================================================

export interface HowToStep {
  name: string
  text: string
  image?: string
  url?: string
}

/**
 * Generate HowTo schema for step-by-step posts
 */
export function generateHowToSchema(
  post: BlogPost,
  steps: HowToStep[],
  options: { siteUrl?: string } = {}
): object {
  const { siteUrl = '' } = options

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: post.title,
    description: post.excerpt || post.meta_description,
    image: post.featured_image,
    totalTime: post.reading_time ? `PT${post.reading_time}M` : undefined,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      image: step.image,
      url: step.url || `${siteUrl}/blog/${post.slug}#step-${index + 1}`,
    })),
  }
}

// ============================================================================
// RSS FEED GENERATION
// ============================================================================

interface RssFeedOptions {
  siteUrl: string
  siteName: string
  description?: string
  language?: string
  copyright?: string
  managingEditor?: string
  webMaster?: string
  ttl?: number // Time to live in minutes
  imageUrl?: string
}

/**
 * Fetch all published blog posts for RSS feed
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const { apiUrl, apiKey } = getConfig()

  if (!apiKey) {
    console.warn('[Blog] No API key configured')
    return []
  }

  try {
    const response = await fetch(`${apiUrl}/public/blog/posts?limit=100`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.posts || []
  } catch (error) {
    console.error('[Blog] Error fetching posts for RSS:', error)
    return []
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Strip HTML tags for RSS descriptions
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * Generate RSS 2.0 feed XML
 */
export async function generateRssFeed(options: RssFeedOptions): Promise<string> {
  const {
    siteUrl,
    siteName,
    description = 'Latest blog posts and insights',
    language = 'en-us',
    copyright,
    managingEditor,
    webMaster,
    ttl = 60,
    imageUrl,
  } = options

  const posts = await getAllBlogPosts()
  const now = new Date().toUTCString()

  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(description)}</description>
    <language>${language}</language>
    <lastBuildDate>${now}</lastBuildDate>
    <pubDate>${now}</pubDate>
    <ttl>${ttl}</ttl>
    <atom:link href="${siteUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
`

  if (copyright) {
    rss += `    <copyright>${escapeXml(copyright)}</copyright>\n`
  }

  if (managingEditor) {
    rss += `    <managingEditor>${escapeXml(managingEditor)}</managingEditor>\n`
  }

  if (webMaster) {
    rss += `    <webMaster>${escapeXml(webMaster)}</webMaster>\n`
  }

  if (imageUrl) {
    rss += `    <image>
      <url>${imageUrl}</url>
      <title>${escapeXml(siteName)}</title>
      <link>${siteUrl}</link>
    </image>\n`
  }

  // Add each post as an item with FULL content (not excerpts)
  for (const post of posts) {
    const postUrl = `${siteUrl}/blog/${post.slug}`
    const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : now
    const author = typeof post.author === 'string' ? post.author : post.author?.name || 'Unknown'
    
    // Use full content_html if available, otherwise content
    const fullContent = post.content_html || post.content || ''
    const description = post.excerpt || stripHtml(fullContent).substring(0, 300) + '...'

    rss += `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapeXml(description)}</description>
      <content:encoded><![CDATA[${fullContent}]]></content:encoded>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(author)}</author>
`

    if (post.category) {
      const categoryName = typeof post.category === 'string' ? post.category : post.category.name
      rss += `      <category>${escapeXml(categoryName)}</category>\n`
    }

    if (post.tags && Array.isArray(post.tags)) {
      for (const tag of post.tags) {
        const tagName = typeof tag === 'string' ? tag : tag.name
        rss += `      <category>${escapeXml(tagName)}</category>\n`
      }
    }

    if (post.featured_image) {
      rss += `      <enclosure url="${post.featured_image}" type="image/jpeg"/>\n`
    }

    rss += `    </item>\n`
  }

  rss += `  </channel>
</rss>`

  return rss
}

/**
 * Generate Atom feed XML
 */
export async function generateAtomFeed(options: RssFeedOptions): Promise<string> {
  const {
    siteUrl,
    siteName,
    description = 'Latest blog posts and insights',
    managingEditor,
  } = options

  const posts = await getAllBlogPosts()
  const now = new Date().toISOString()

  let atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteName)}</title>
  <subtitle>${escapeXml(description)}</subtitle>
  <link href="${siteUrl}/blog/feed.xml" rel="self"/>
  <link href="${siteUrl}"/>
  <id>${siteUrl}/blog</id>
  <updated>${now}</updated>
`

  if (managingEditor) {
    atom += `  <author>
    <name>${escapeXml(managingEditor)}</name>
  </author>\n`
  }

  for (const post of posts) {
    const postUrl = `${siteUrl}/blog/${post.slug}`
    const updated = post.updated_at || post.published_at || now
    const published = post.published_at || now
    const author = typeof post.author === 'string' ? post.author : post.author?.name || 'Unknown'
    const fullContent = post.content_html || post.content || ''

    atom += `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${postUrl}"/>
    <id>${postUrl}</id>
    <updated>${new Date(updated).toISOString()}</updated>
    <published>${new Date(published).toISOString()}</published>
    <author>
      <name>${escapeXml(author)}</name>
    </author>
    <summary>${escapeXml(post.excerpt || stripHtml(fullContent).substring(0, 300))}</summary>
    <content type="html"><![CDATA[${fullContent}]]></content>
  </entry>\n`
  }

  atom += `</feed>`

  return atom
}

// ============================================================================
// TOPIC CLUSTER SUPPORT
// ============================================================================

export interface TopicCluster {
  pillar: BlogPost
  supportingPosts: BlogPost[]
  internalLinks: Array<{
    from: string  // slug
    to: string    // slug
    anchor: string
  }>
}

/**
 * Fetch posts by category for topic cluster organization
 */
export async function getPostsByCategory(categorySlug: string): Promise<BlogPost[]> {
  const { apiUrl, apiKey } = getConfig()

  if (!apiKey) return []

  try {
    const response = await fetch(`${apiUrl}/public/blog/posts?category=${categorySlug}&limit=50`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.posts || []
  } catch (error) {
    console.error('[Blog] Error fetching category posts:', error)
    return []
  }
}

/**
 * Identify topic clusters based on category grouping
 * Assumes the longest/most comprehensive post is the pillar
 */
export async function identifyTopicClusters(categorySlug: string): Promise<TopicCluster | null> {
  const posts = await getPostsByCategory(categorySlug)
  
  if (posts.length < 3) return null // Need at least a pillar + 2 supporting posts

  // Find pillar (longest post in category)
  const sortedByLength = [...posts].sort((a, b) => (b.word_count || 0) - (a.word_count || 0))
  const pillar = sortedByLength[0]
  const supportingPosts = sortedByLength.slice(1)

  // Generate suggested internal links
  const internalLinks: TopicCluster['internalLinks'] = []
  
  // Link from pillar to each supporting post
  for (const support of supportingPosts) {
    internalLinks.push({
      from: pillar.slug,
      to: support.slug,
      anchor: support.title,
    })
  }

  // Link from each supporting post back to pillar
  for (const support of supportingPosts) {
    internalLinks.push({
      from: support.slug,
      to: pillar.slug,
      anchor: pillar.title,
    })
  }

  return {
    pillar,
    supportingPosts,
    internalLinks,
  }
}

/**
 * Generate "Related Insights" section data
 */
export async function getRelatedInsights(
  currentSlug: string,
  options: { limit?: number; category?: string } = {}
): Promise<BlogPost[]> {
  const { apiUrl, apiKey } = getConfig()
  const { limit = 3, category } = options

  if (!apiKey) return []

  try {
    const response = await fetch(`${apiUrl}/public/blog/related`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: currentSlug,
        limit,
        category,
      }),
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
// BREADCRUMB SCHEMA
// ============================================================================

/**
 * Generate BreadcrumbList schema for blog navigation
 */
export function generateBreadcrumbSchema(
  post: BlogPost,
  options: { siteUrl?: string; siteName?: string } = {}
): object {
  const { siteUrl = '', siteName = 'Home' } = options

  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: siteName,
      item: siteUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Blog',
      item: `${siteUrl}/blog`,
    },
  ]

  if (post.category) {
    const categoryName = typeof post.category === 'string' ? post.category : post.category.name
    const categorySlug = typeof post.category === 'string' 
      ? post.category.toLowerCase().replace(/\s+/g, '-')
      : post.category.slug

    items.push({
      '@type': 'ListItem',
      position: 3,
      name: categoryName,
      item: `${siteUrl}/blog/category/${categorySlug}`,
    })

    items.push({
      '@type': 'ListItem',
      position: 4,
      name: post.title,
      item: `${siteUrl}/blog/${post.slug}`,
    })
  } else {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: post.title,
      item: `${siteUrl}/blog/${post.slug}`,
    })
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

// ============================================================================
// COMBINED SCHEMA (Article + FAQ + Breadcrumb)
// ============================================================================

/**
 * Generate all relevant schemas for a blog post in a single array
 * This is the recommended way to include multiple schemas
 */
export function generateAllBlogSchemas(
  post: BlogPost,
  options: { siteUrl?: string; siteName?: string; logoUrl?: string } = {}
): object[] {
  const schemas: object[] = []

  // 1. Article/BlogPosting schema (always)
  schemas.push(generateBlogPostSchema(post, options))

  // 2. Breadcrumb schema (always)
  schemas.push(generateBreadcrumbSchema(post, options))

  // 3. FAQ schema (if FAQs present)
  if (post.faq_items && post.faq_items.length > 0) {
    const faqSchema = generateFaqSchema(post.faq_items)
    if (faqSchema) schemas.push(faqSchema)
  }

  return schemas
}
