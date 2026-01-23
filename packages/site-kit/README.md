# @uptrade/site-kit

Complete client-side integration kit for Uptrade Portal. One package for SEO, Analytics, Engage widgets, Forms, and Blog - all managed from your Uptrade Portal dashboard.

## Installation

```bash
npm install @uptrade/site-kit
# or
pnpm add @uptrade/site-kit
```

## Quick Start

Wrap your app with `SiteKitProvider` in your root layout:

```tsx
// app/layout.tsx
import { SiteKitProvider } from '@uptrade/site-kit'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SiteKitProvider
          projectId={process.env.UPTRADE_PROJECT_ID!}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
          analytics={{ enabled: true }}
          engage={{ enabled: true }}
        >
          {children}
        </SiteKitProvider>
      </body>
    </html>
  )
}
```

## Modules

### SEO (`@uptrade/site-kit/seo`)

Managed SEO components that automatically inject structured data, FAQs, internal links, and more based on your Portal configuration.

```tsx
import { ManagedSchema, ManagedFAQ, ManagedInternalLinks } from '@uptrade/site-kit/seo'
import { getManagedMetadata, generateSitemap, generateRobots } from '@uptrade/site-kit/seo/server'

// In a page component
export async function generateMetadata({ params }) {
  return getManagedMetadata('your-project-id', `/blog/${params.slug}`)
}

export default async function BlogPost({ params }) {
  return (
    <article>
      <h1>My Blog Post</h1>
      <p>Content...</p>
      
      {/* Managed structured data */}
      <ManagedSchema projectId="..." path="/blog/my-post" />
      
      {/* Managed FAQ section */}
      <ManagedFAQ projectId="..." path="/blog/my-post" />
      
      {/* Managed internal links */}
      <ManagedInternalLinks projectId="..." path="/blog/my-post" />
    </article>
  )
}
```

### Analytics (`@uptrade/site-kit/analytics`)

Automatic page view tracking, custom events, and Core Web Vitals reporting.

```tsx
import { useAnalytics, WebVitals } from '@uptrade/site-kit/analytics'

export default function MyComponent() {
  const { trackEvent, trackConversion } = useAnalytics()
  
  const handleClick = () => {
    trackEvent('button_click', { button: 'cta' })
  }
  
  const handlePurchase = () => {
    trackConversion('purchase', 99.99)
  }
  
  return (
    <>
      <button onClick={handleClick}>CTA Button</button>
      <WebVitals /> {/* Reports LCP, CLS, FID, etc. */}
    </>
  )
}
```

### Engage (`@uptrade/site-kit/engage`)

Popups, nudges, banners, and chat widgets configured from Portal.

```tsx
import { EngageWidget, ChatWidget } from '@uptrade/site-kit/engage'

// Automatically included when engage.enabled = true in SiteKitProvider
// Or add manually:

export default function Layout({ children }) {
  return (
    <>
      {children}
      <EngageWidget projectId="..." />
      <ChatWidget projectId="..." />
    </>
  )
}
```

### Forms (`@uptrade/site-kit/forms`)

Managed forms with automatic routing to CRM, Support, or other destinations.

```tsx
import { ManagedForm } from '@uptrade/site-kit/forms'

// Basic usage - fetches form config from Portal
export default function ContactPage() {
  return (
    <ManagedForm 
      projectId="..."
      formSlug="contact-form"
      onSuccess={(data) => console.log('Submitted:', data)}
    />
  )
}

// Custom rendering
export default function CustomContactPage() {
  return (
    <ManagedForm 
      projectId="..."
      formSlug="contact-form"
      render={({ fields, step, totalSteps, values, errors, handleSubmit, isSubmitting }) => (
        <form onSubmit={handleSubmit}>
          {fields.map(field => (
            <CustomField key={field.slug} {...field} />
          ))}
          <button disabled={isSubmitting}>Submit</button>
        </form>
      )}
    />
  )
}
```

### Blog (`@uptrade/site-kit/blog`)

Complete Portal-managed blog system with beautiful layouts, dynamic routing, categories, and SEO.

**Create posts in Portal → Automatically appear on your site.**

```tsx
// app/blog/page.tsx - Blog Index
import { BlogList, BlogLayout } from '@uptrade/site-kit/blog'
import { generateBlogIndexMetadata } from '@uptrade/site-kit/blog/server'

export const metadata = generateBlogIndexMetadata({
  title: 'Blog',
  siteName: 'My Company',
  siteUrl: 'https://example.com',
})

export default function BlogPage({ searchParams }) {
  return (
    <BlogLayout
      hero={{ title: 'Blog', subtitle: 'Latest insights and articles' }}
      layout="sidebar-right"
    >
      <BlogList
        category={searchParams.category}
        page={parseInt(searchParams.page || '1')}
        showCategoryFilter
        showPagination
      />
    </BlogLayout>
  )
}
```

```tsx
// app/blog/[slug]/page.tsx - Individual Post
import { BlogPost } from '@uptrade/site-kit/blog'
import { 
  generateBlogPostMetadata, 
  generateBlogStaticParams,
  getBlogPost,
  generateBlogPostSchema 
} from '@uptrade/site-kit/blog/server'

// Pre-generate all post pages at build time
export const generateStaticParams = generateBlogStaticParams

// Dynamic metadata for SEO
export async function generateMetadata({ params }) {
  return generateBlogPostMetadata(params.slug, {
    siteName: 'My Company',
    siteUrl: 'https://example.com',
  })
}

export default async function PostPage({ params }) {
  const post = await getBlogPost(params.slug)
  
  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBlogPostSchema(post, {
            siteUrl: 'https://example.com',
            siteName: 'My Company',
          })),
        }}
      />
      
      {/* Blog Post with TOC and Related Posts */}
      <BlogPost 
        slug={params.slug} 
        showToc 
        showRelated 
        showAuthor 
      />
    </>
  )
}
```

#### Available Components

| Component | Purpose |
|-----------|---------|
| `BlogList` | Grid of posts with pagination & category filter |
| `BlogPost` | Full post with TOC, author, related posts |
| `BlogLayout` | Complete layout with sidebar |
| `BlogSidebar` | Categories, recent posts, tags, search |
| `TableOfContents` | Sticky TOC from headings |
| `AuthorCard` | Author info with social links |
| `RelatedPosts` | Related posts by category |

#### Server Functions

```tsx
import {
  getBlogPost,           // Fetch single post
  getAllBlogSlugs,       // For generateStaticParams
  getBlogCategories,     // All categories
  generateBlogPostMetadata,    // Post page metadata
  generateBlogIndexMetadata,   // Index page metadata
  generateBlogStaticParams,    // SSG params
  generateBlogSitemap,         // Sitemap entries
  generateBlogPostSchema,      // JSON-LD
} from '@uptrade/site-kit/blog/server'
```

## Configuration

### Full Provider Options

```tsx
<SiteKitProvider
  // Required
  projectId="your-project-id"
  supabaseUrl="https://xxx.supabase.co"
  supabaseAnonKey="your-anon-key"
  
  // Analytics options
  analytics={{
    enabled: true,
    trackPageViews: true,      // Auto-track route changes
    trackWebVitals: true,      // Report Core Web Vitals
    trackScrollDepth: false,   // Track scroll milestones
    sessionDuration: 30,       // Session timeout in minutes
    excludePaths: ['/admin']   // Don't track these paths
  }}
  
  // Engage widget options
  engage={{
    enabled: true,
    position: 'bottom-right',  // Widget position
    zIndex: 9999,
    chatEnabled: true          // Enable AI/live chat
  }}
  
  // Forms options
  forms={{
    enabled: true,
    honeypotField: '_hp'       // Spam protection field name
  }}
  
  // Debug mode - logs to console
  debug={false}
>
```

## Environment Variables

```bash
# Required
UPTRADE_PROJECT_ID=your-project-id
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Server-Side Utilities

```tsx
// app/sitemap.ts
import { generateSitemap } from '@uptrade/site-kit/seo/server'

export default async function sitemap() {
  return generateSitemap('your-project-id', 'https://yoursite.com')
}

// app/robots.ts
import { generateRobots } from '@uptrade/site-kit/seo/server'

export default async function robots() {
  return generateRobots('your-project-id', 'https://yoursite.com')
}

// Redirect handling in middleware
import { handleRedirect } from '@uptrade/site-kit/seo/server'

export async function middleware(request) {
  const redirect = await handleRedirect('your-project-id', request.nextUrl.pathname)
  if (redirect) {
    return NextResponse.redirect(new URL(redirect.to, request.url), redirect.statusCode)
  }
}
```

## Form Routing

Forms automatically route submissions based on their type:

| Form Type | Routes To | Use Case |
|-----------|-----------|----------|
| `prospect` | CRM Leads | Sales inquiries, quote requests |
| `support` | Support Tickets | Help requests, bug reports |
| `feedback` | Feedback Entries | User feedback, suggestions |
| `newsletter` | Email Subscribers | Newsletter signups |
| `contact` | Form Submissions | General contact (no routing) |
| `custom` | Form Submissions | Custom handling |

## TypeScript

All modules are fully typed:

```tsx
import type { 
  SiteKitConfig,
  ManagedMetadata,
  AnalyticsEvent,
  EngageElement,
  ManagedFormConfig,
  BlogPostType 
} from '@uptrade/site-kit'
```

## License

MIT
