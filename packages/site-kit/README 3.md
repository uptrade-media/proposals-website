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

Blog components with built-in SEO and related post suggestions.

```tsx
import { BlogPost, BlogList, RelatedPosts, TableOfContents, AuthorCard } from '@uptrade/site-kit/blog'

// Blog listing page
export default function BlogPage() {
  return (
    <BlogList 
      projectId="..."
      options={{ 
        limit: 10, 
        category: 'news',
        orderBy: 'published_at',
        order: 'desc'
      }}
    />
  )
}

// Blog post page
export default function BlogPostPage({ params }) {
  return (
    <div className="flex">
      <aside className="w-64">
        <TableOfContents content={post.content_html} />
      </aside>
      <main>
        <BlogPost projectId="..." slug={params.slug} />
        <AuthorCard author={post.author} />
        <RelatedPosts projectId="..." currentPostId={post.id} limit={3} />
      </main>
    </div>
  )
}
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
