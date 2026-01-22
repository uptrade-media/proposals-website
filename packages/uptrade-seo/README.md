# @uptrade/seo

SEO management package for Uptrade client sites. Provides instant SEO updates from Portal through a shared Supabase database.

## Installation

```bash
# From the uptrade-portal monorepo
pnpm add @uptrade/seo

# Or reference directly
"@uptrade/seo": "file:../uptrade-portal/packages/uptrade-seo"
```

## Environment Variables

```env
# Required - Same Supabase as Portal
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Your project ID from Portal
UPTRADE_PROJECT_ID=abc123-def456-...
```

## Quick Start

### 1. Managed Metadata

Use `getManagedMetadata` in your `generateMetadata` function:

```tsx
// app/services/[slug]/page.tsx
import { getManagedMetadata, ManagedSchema } from '@uptrade/seo'

const PROJECT_ID = process.env.UPTRADE_PROJECT_ID!

export async function generateMetadata({ params }) {
  return getManagedMetadata({
    projectId: PROJECT_ID,
    path: `/services/${params.slug}`,
    fallback: {
      title: 'Our Services',
      description: 'Learn about our professional services'
    }
  })
}

export default async function ServicePage({ params }) {
  return (
    <>
      <ManagedSchema 
        projectId={PROJECT_ID} 
        path={`/services/${params.slug}`} 
      />
      <main>
        {/* Your page content */}
      </main>
    </>
  )
}
```

### 2. Managed Redirects

Handle redirects in Next.js middleware:

```tsx
// middleware.ts
import { NextResponse } from 'next/server'
import { getRedirect } from '@uptrade/seo'

const PROJECT_ID = process.env.UPTRADE_PROJECT_ID!

export async function middleware(request) {
  const redirect = await getRedirect({
    projectId: PROJECT_ID,
    path: request.nextUrl.pathname
  })
  
  if (redirect) {
    const url = redirect.isExternal 
      ? redirect.destination 
      : new URL(redirect.destination, request.url)
    
    return NextResponse.redirect(url, redirect.statusCode)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### 3. Managed FAQ Sections

```tsx
import { ManagedFAQ } from '@uptrade/seo'

export default async function ServicePage() {
  return (
    <main>
      <h1>Our Services</h1>
      
      <ManagedFAQ 
        projectId={process.env.UPTRADE_PROJECT_ID!}
        path="/services"
        showTitle
        includeSchema // Automatically adds FAQ schema
      />
    </main>
  )
}
```

### 4. Managed Internal Links

```tsx
import { ManagedInternalLinks } from '@uptrade/seo'

export default async function BlogPost({ params }) {
  return (
    <article>
      <h1>Blog Title</h1>
      <p>Your content...</p>
      
      <ManagedInternalLinks 
        projectId={process.env.UPTRADE_PROJECT_ID!}
        path={`/blog/${params.slug}`}
        position="bottom"
        limit={5}
      />
    </article>
  )
}
```

### 5. Managed Content Blocks

```tsx
import { ManagedContent } from '@uptrade/seo'

export default async function LandingPage() {
  return (
    <main>
      <ManagedContent 
        projectId={process.env.UPTRADE_PROJECT_ID!}
        path="/landing"
        section="hero"
        fallback={<DefaultHero />}
      />
      
      <ManagedContent 
        projectId={process.env.UPTRADE_PROJECT_ID!}
        path="/landing"
        section="features"
      />
      
      <ManagedContent 
        projectId={process.env.UPTRADE_PROJECT_ID!}
        path="/landing"
        section="cta"
      />
    </main>
  )
}
```

### 6. Analytics Scripts

```tsx
// app/layout.tsx
import { ManagedScripts } from '@uptrade/seo'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <ManagedScripts 
          projectId={process.env.UPTRADE_PROJECT_ID!}
          position="head"
        />
      </head>
      <body>
        <ManagedScripts 
          projectId={process.env.UPTRADE_PROJECT_ID!}
          position="body-start"
        />
        {children}
        <ManagedScripts 
          projectId={process.env.UPTRADE_PROJECT_ID!}
          position="body-end"
        />
      </body>
    </html>
  )
}
```

### 7. Dynamic Sitemap

```tsx
// app/sitemap.ts
import { generateSitemap } from '@uptrade/seo'

export default async function sitemap() {
  return generateSitemap({
    projectId: process.env.UPTRADE_PROJECT_ID!,
    baseUrl: 'https://example.com',
    publishedOnly: true
  })
}
```

### 8. A/B Testing

```tsx
import { getManagedMetadataWithAB } from '@uptrade/seo'
import { cookies } from 'next/headers'

export async function generateMetadata({ params }) {
  const cookieStore = cookies()
  const sessionId = cookieStore.get('session_id')?.value
  
  return getManagedMetadataWithAB({
    projectId: process.env.UPTRADE_PROJECT_ID!,
    path: `/pricing`,
    sessionId, // Consistent variant per session
    fallback: {
      title: 'Pricing',
    }
  })
}
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `getManagedMetadata(options)` | Get managed metadata for `generateMetadata()` |
| `getManagedMetadataWithAB(options)` | Get metadata with A/B test variant selection |
| `getABVariant(options)` | Get A/B test variant for a specific field |
| `getRedirect(options)` | Check for redirect on a path |
| `getRobotsDirective(options)` | Get robots meta directive for a page |
| `generateSitemap(options)` | Generate sitemap entries |
| `isIndexable(projectId, path)` | Quick check if page should be indexed |
| `getManagedContentData(projectId, path, section)` | Get raw content block data |

### Components

| Component | Description |
|-----------|-------------|
| `<ManagedSchema>` | Inject JSON-LD schema |
| `<ManagedFAQ>` | Render FAQ section with schema |
| `<ManagedInternalLinks>` | Render AI-suggested internal links |
| `<ManagedContent>` | Render CMS-controlled content blocks |
| `<ManagedScripts>` | Inject tracking/analytics scripts |
| `<ManagedNoScripts>` | Render noscript fallbacks |

### Server Utilities

Import from `@uptrade/seo/server` for direct database access:

```tsx
import { getSEOPageData, getSchemaMarkups } from '@uptrade/seo/server'

const pageData = await getSEOPageData(projectId, path)
const schemas = await getSchemaMarkups(projectId, path)
```

## How It Works

1. **Portal** manages SEO data and writes to shared Supabase database
2. **Client site** reads from the same database using this package
3. **Changes are instant** - no API calls, no caching, no sync delays

```
Portal clicks "Apply"
        │
        ▼
┌─────────────────────────────────────┐
│         SUPABASE DATABASE           │
│                                     │
│  seo_pages.managed_title = "New"    │
│                                     │
└─────────────────────────────────────┘
        │
        ▼
Client site renders "New" on next request
```

## License

MIT
