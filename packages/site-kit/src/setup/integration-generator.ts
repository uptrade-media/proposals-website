/**
 * Integration Code Generator
 * 
 * Generates site-kit integration code snippets based on enabled modules.
 * Used by SetupWizard and can be called standalone.
 */

export interface IntegrationSnippet {
  module: string
  snippetType: 'install' | 'layout' | 'component' | 'page' | 'api-route' | 'env'
  title: string
  description?: string
  filePath?: string
  code: string
  language: 'typescript' | 'tsx' | 'bash' | 'env'
  order: number
  required: boolean
}

export interface GeneratorContext {
  projectId: string
  projectName?: string
  apiUrl?: string
  enabledModules: string[]
  brand?: {
    primaryColor?: string
    secondaryColor?: string
    businessName?: string
  }
}

/**
 * Generate all integration code snippets for enabled modules
 */
export function generateIntegrationCode(context: GeneratorContext): IntegrationSnippet[] {
  const snippets: IntegrationSnippet[] = []
  const apiUrl = context.apiUrl || 'https://api.uptrademedia.com'
  let order = 0

  // Always add provider setup first
  snippets.push(...generateProviderSnippets(context, apiUrl, order))
  order += 10

  // Add module-specific snippets
  for (const module of context.enabledModules) {
    switch (module) {
      case 'analytics':
        snippets.push(...generateAnalyticsSnippets(context, order))
        order += 10
        break
      case 'engage':
        snippets.push(...generateEngageSnippets(context, order))
        order += 10
        break
      case 'forms':
        snippets.push(...generateFormsSnippets(context, order))
        order += 10
        break
      case 'commerce':
        snippets.push(...generateCommerceSnippets(context, order))
        order += 10
        break
      case 'seo':
        snippets.push(...generateSEOSnippets(context, order))
        order += 10
        break
      case 'blog':
        snippets.push(...generateBlogSnippets(context, order))
        order += 10
        break
    }
  }

  return snippets
}

/**
 * Get snippets grouped by module
 */
export function getSnippetsByModule(snippets: IntegrationSnippet[]): Record<string, IntegrationSnippet[]> {
  return snippets.reduce((acc, snippet) => {
    if (!acc[snippet.module]) {
      acc[snippet.module] = []
    }
    acc[snippet.module].push(snippet)
    return acc
  }, {} as Record<string, IntegrationSnippet[]>)
}

// ============================================
// Provider Snippets (always required)
// ============================================

function generateProviderSnippets(ctx: GeneratorContext, apiUrl: string, startOrder: number): IntegrationSnippet[] {
  const enabledModulesConfig = ctx.enabledModules
    .map(m => {
      if (m === 'analytics') return '          analytics={{ enabled: true }}'
      if (m === 'engage') return '          engage={{ enabled: true }}'
      return null
    })
    .filter(Boolean)
    .join('\n')

  return [
    {
      module: 'provider',
      snippetType: 'install',
      title: 'Install @uptrade/site-kit',
      description: 'Install the Uptrade Site Kit package',
      code: `pnpm add @uptrade/site-kit`,
      language: 'bash',
      order: startOrder,
      required: true,
    },
    {
      module: 'provider',
      snippetType: 'env',
      title: 'Environment Variables',
      description: 'Add these to your .env.local file',
      filePath: '.env.local',
      code: `# Uptrade Integration
NEXT_PUBLIC_UPTRADE_API_URL=${apiUrl}
NEXT_PUBLIC_UPTRADE_PROJECT_ID=${ctx.projectId}
UPTRADE_API_KEY=your-api-key-here`,
      language: 'env',
      order: startOrder + 1,
      required: true,
    },
    {
      module: 'provider',
      snippetType: 'layout',
      title: 'Root Layout Provider',
      description: 'Wrap your app with SiteKitProvider in app/layout.tsx',
      filePath: 'app/layout.tsx',
      code: `import { SiteKitProvider } from '@uptrade/site-kit'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SiteKitProvider
          apiUrl={process.env.NEXT_PUBLIC_UPTRADE_API_URL!}
          projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
${enabledModulesConfig}
        >
          {children}
        </SiteKitProvider>
      </body>
    </html>
  )
}`,
      language: 'tsx',
      order: startOrder + 2,
      required: true,
    },
  ]
}

// ============================================
// Analytics Snippets
// ============================================

function generateAnalyticsSnippets(ctx: GeneratorContext, startOrder: number): IntegrationSnippet[] {
  return [
    {
      module: 'analytics',
      snippetType: 'component',
      title: 'Custom Event Tracking',
      description: 'Track custom events throughout your app',
      filePath: 'components/TrackableButton.tsx',
      code: `'use client'

import { useSiteKit } from '@uptrade/site-kit'

interface TrackableButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  eventName: string
  eventData?: Record<string, unknown>
  children: React.ReactNode
}

export function TrackableButton({ 
  children, 
  eventName,
  eventData,
  ...props 
}: TrackableButtonProps) {
  const { analytics } = useSiteKit()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    analytics?.trackEvent(eventName, eventData)
    props.onClick?.(e)
  }

  return (
    <button {...props} onClick={handleClick}>
      {children}
    </button>
  )
}`,
      language: 'tsx',
      order: startOrder,
      required: false,
    },
  ]
}

// ============================================
// Engage Snippets (Chat Widget)
// ============================================

function generateEngageSnippets(ctx: GeneratorContext, startOrder: number): IntegrationSnippet[] {
  const primaryColor = ctx.brand?.primaryColor || '#0066cc'
  
  return [
    {
      module: 'engage',
      snippetType: 'component',
      title: 'Chat Widget',
      description: 'Add the AI chat widget to your site. This is unstyled - customize to match your brand.',
      filePath: 'components/ChatWidget.tsx',
      code: `'use client'

import { ChatWidget } from '@uptrade/site-kit/engage'

export function SiteChat() {
  return (
    <ChatWidget
      projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
      config={{
        position: 'bottom-right',
        buttonColor: '${primaryColor}',
        greeting: 'Hi! How can I help you today?',
        placeholder: 'Type your message...',
      }}
    />
  )
}`,
      language: 'tsx',
      order: startOrder,
      required: true,
    },
    {
      module: 'engage',
      snippetType: 'layout',
      title: 'Add Chat to Layout',
      description: 'Add the ChatWidget component to your root layout',
      filePath: 'app/layout.tsx',
      code: `// Add import at top:
import { SiteChat } from '@/components/ChatWidget'

// Add inside your layout body, after SiteKitProvider children:
<SiteChat />`,
      language: 'tsx',
      order: startOrder + 1,
      required: true,
    },
  ]
}

// ============================================
// Forms Snippets
// ============================================

function generateFormsSnippets(ctx: GeneratorContext, startOrder: number): IntegrationSnippet[] {
  return [
    {
      module: 'forms',
      snippetType: 'component',
      title: 'Managed Form Component',
      description: 'Embed a managed form from the Portal. Form slug must match one created in Forms module.',
      filePath: 'components/ContactForm.tsx',
      code: `import { ManagedForm } from '@uptrade/site-kit/forms'

interface ContactFormProps {
  formSlug?: string
  className?: string
}

export async function ContactForm({ 
  formSlug = 'contact',
  className 
}: ContactFormProps) {
  return (
    <ManagedForm
      projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
      formSlug={formSlug}
      className={className}
    />
  )
}`,
      language: 'tsx',
      order: startOrder,
      required: false,
    },
    {
      module: 'forms',
      snippetType: 'api-route',
      title: 'Form Submission Handler',
      description: 'API route to proxy form submissions to Portal API',
      filePath: 'app/api/forms/[formId]/submit/route.ts',
      code: `import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  const body = await request.json()

  const response = await fetch(
    \`\${process.env.NEXT_PUBLIC_UPTRADE_API_URL}/forms/\${params.formId}/submit\`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.UPTRADE_API_KEY!,
      },
      body: JSON.stringify(body),
    }
  )

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}`,
      language: 'typescript',
      order: startOrder + 1,
      required: true,
    },
  ]
}

// ============================================
// Commerce Snippets
// ============================================

function generateCommerceSnippets(ctx: GeneratorContext, startOrder: number): IntegrationSnippet[] {
  return [
    {
      module: 'commerce',
      snippetType: 'component',
      title: 'Product Grid',
      description: 'Display products from your commerce catalog',
      filePath: 'components/Products.tsx',
      code: `import { ProductGrid } from '@uptrade/site-kit/commerce'

interface ProductsSectionProps {
  category?: string
  limit?: number
}

export async function ProductsSection({ 
  category = 'featured',
  limit = 8 
}: ProductsSectionProps) {
  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">Our Products</h2>
      <ProductGrid
        projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
        category={category}
        limit={limit}
      />
    </section>
  )
}`,
      language: 'tsx',
      order: startOrder,
      required: false,
    },
    {
      module: 'commerce',
      snippetType: 'component',
      title: 'Upcoming Events',
      description: 'Display upcoming events and classes',
      filePath: 'components/Events.tsx',
      code: `import { UpcomingEvents, EventCalendar } from '@uptrade/site-kit/commerce'

export async function EventsSection({ limit = 6 }: { limit?: number }) {
  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
      <UpcomingEvents
        projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
        limit={limit}
      />
    </section>
  )
}

export async function FullCalendar() {
  return (
    <EventCalendar
      projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
    />
  )
}`,
      language: 'tsx',
      order: startOrder + 1,
      required: false,
    },
  ]
}

// ============================================
// SEO Snippets (Managed FAQs, Schema)
// ============================================

function generateSEOSnippets(ctx: GeneratorContext, startOrder: number): IntegrationSnippet[] {
  return [
    {
      module: 'seo',
      snippetType: 'component',
      title: 'Managed FAQ Section',
      description: 'Render FAQs with automatic JSON-LD schema markup. FAQs are managed in Portal SEO module.',
      filePath: 'components/FAQSection.tsx',
      code: `import { ManagedFAQ } from '@uptrade/site-kit/seo'

interface FAQSectionProps {
  path: string  // Page path to fetch FAQs for (e.g., '/services/plumbing')
  className?: string
}

export async function FAQSection({ path, className }: FAQSectionProps) {
  return (
    <section className={className}>
      <ManagedFAQ
        projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
        path={path}
        showTitle
        includeSchema
      />
    </section>
  )
}`,
      language: 'tsx',
      order: startOrder,
      required: true,
    },
    {
      module: 'seo',
      snippetType: 'page',
      title: 'Page with Managed Metadata + FAQs',
      description: 'Example dynamic page using managed metadata and FAQ sections',
      filePath: 'app/services/[slug]/page.tsx',
      code: `import { getManagedMetadata, ManagedFAQ } from '@uptrade/site-kit/seo'
import type { Metadata } from 'next'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = \`/services/\${params.slug}\`
  return getManagedMetadata({
    projectId: process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!,
    path,
  })
}

export default async function ServicePage({ params }: Props) {
  const path = \`/services/\${params.slug}\`

  return (
    <main>
      <h1 className="text-3xl font-bold">Service: {params.slug}</h1>
      
      {/* Your page content here */}
      
      {/* FAQs section with JSON-LD schema */}
      <section className="mt-12">
        <ManagedFAQ
          projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
          path={path}
          showTitle
          includeSchema
        />
      </section>
    </main>
  )
}`,
      language: 'tsx',
      order: startOrder + 1,
      required: false,
    },
  ]
}

// ============================================
// Blog Snippets
// ============================================

function generateBlogSnippets(ctx: GeneratorContext, startOrder: number): IntegrationSnippet[] {
  return [
    {
      module: 'blog',
      snippetType: 'page',
      title: 'Blog List Page',
      description: 'Display all blog posts from Portal',
      filePath: 'app/blog/page.tsx',
      code: `import { getBlogPosts } from '@uptrade/site-kit/blog'
import Link from 'next/link'

export default async function BlogPage() {
  const posts = await getBlogPosts({
    projectId: process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!,
    limit: 10,
  })

  return (
    <main className="py-12">
      <h1 className="text-3xl font-bold mb-8">Blog</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article key={post.id} className="border rounded-lg p-4">
            {post.featured_image && (
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-48 object-cover rounded mb-4"
              />
            )}
            <h2 className="text-xl font-semibold mb-2">
              <Link href={\`/blog/\${post.slug}\`}>{post.title}</Link>
            </h2>
            <p className="text-gray-600">{post.excerpt}</p>
          </article>
        ))}
      </div>
    </main>
  )
}`,
      language: 'tsx',
      order: startOrder,
      required: false,
    },
    {
      module: 'blog',
      snippetType: 'page',
      title: 'Blog Post Page',
      description: 'Individual blog post page with SEO metadata',
      filePath: 'app/blog/[slug]/page.tsx',
      code: `import { getBlogPost, getBlogPosts } from '@uptrade/site-kit/blog'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  const posts = await getBlogPosts({
    projectId: process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!,
  })
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost({
    projectId: process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!,
    slug: params.slug,
  })
  
  if (!post) return {}
  
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : [],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getBlogPost({
    projectId: process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!,
    slug: params.slug,
  })

  if (!post) notFound()

  return (
    <article className="py-12 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      {post.featured_image && (
        <img
          src={post.featured_image}
          alt={post.title}
          className="w-full rounded-lg mb-8"
        />
      )}
      <div 
        className="prose prose-lg"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  )
}`,
      language: 'tsx',
      order: startOrder + 1,
      required: false,
    },
  ]
}
