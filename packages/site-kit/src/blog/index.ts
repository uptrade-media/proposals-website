/**
 * @uptrade/site-kit/blog
 * 
 * Complete blog integration for Portal-managed content.
 * Create posts in the Portal, automatically embedded in your site.
 * 
 * @example
 * ```tsx
 * // Blog index page
 * import { BlogList, BlogLayout } from '@uptrade/site-kit/blog'
 * 
 * export default function BlogPage() {
 *   return (
 *     <BlogLayout hero={{ title: 'Blog', subtitle: 'Latest articles' }}>
 *       <BlogList showCategoryFilter showPagination />
 *     </BlogLayout>
 *   )
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Single post page
 * import { BlogPost } from '@uptrade/site-kit/blog'
 * import { generateBlogPostMetadata, generateBlogStaticParams } from '@uptrade/site-kit/blog/server'
 * 
 * export const generateStaticParams = generateBlogStaticParams
 * export async function generateMetadata({ params }) {
 *   return generateBlogPostMetadata(params.slug, { siteName: 'My Site' })
 * }
 * 
 * export default function Post({ params }) {
 *   return <BlogPost slug={params.slug} showRelated showToc />
 * }
 * ```
 */

// Components
export { BlogPost } from './BlogPost'
export type { BlogPostServerProps } from './BlogPost'

export { BlogList } from './BlogList'
export type { BlogListServerProps } from './BlogList'

export { BlogSidebar, NewsletterWidget } from './BlogSidebar'
export type { BlogSidebarProps, NewsletterWidgetProps } from './BlogSidebar'

export { BlogLayout, BlogPage, BlogPostPage, CategoryPage } from './BlogLayout'
export type { BlogLayoutProps, BlogPageProps, BlogPostPageProps, CategoryPageProps } from './BlogLayout'

export { AuthorCard } from './AuthorCard'
export { RelatedPosts } from './RelatedPosts'
export { TableOfContents } from './TableOfContents'

// Types
export * from './types'
