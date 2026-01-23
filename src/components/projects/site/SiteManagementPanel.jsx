/**
 * SiteManagementPanel - Main content panel for Website tab
 * 
 * Routes to the appropriate view based on activeView from site management store.
 * Each view manages a different type of site asset.
 */
import { 
  FileText, Image, ArrowRightLeft, HelpCircle, 
  FileEdit, Link2, Code, Braces, Loader2, Globe2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SITE_VIEWS } from '@/lib/site-management-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

// Import view panels (to be created)
import SitePagesPanel from './SitePagesPanel'
import SiteImagesPanel from './SiteImagesPanel'
import SiteRedirectsPanel from './SiteRedirectsPanel'
import SiteFAQsPanel from './SiteFAQsPanel'
import SiteContentPanel from './SiteContentPanel'
import SiteLinksPanel from './SiteLinksPanel'
import SiteScriptsPanel from './SiteScriptsPanel'
import SiteSchemaPanel from './SiteSchemaPanel'

export default function SiteManagementPanel({
  project,
  activeView,
  data,
  isLoading,
  onRefresh,
}) {
  // View configuration for headers
  const viewConfig = {
    [SITE_VIEWS.PAGES]: {
      icon: FileText,
      title: 'Site Pages',
      description: 'Manage page metadata, sitemap settings, and SEO configuration',
    },
    [SITE_VIEWS.IMAGES]: {
      icon: Image,
      title: 'Managed Images',
      description: 'Image slots for site-kit components with AI categorization',
    },
    [SITE_VIEWS.REDIRECTS]: {
      icon: ArrowRightLeft,
      title: 'Redirects',
      description: 'URL redirects with hit tracking and analytics',
    },
    [SITE_VIEWS.FAQS]: {
      icon: HelpCircle,
      title: 'FAQ Sections',
      description: 'FAQ content with automatic JSON-LD schema generation',
    },
    [SITE_VIEWS.CONTENT]: {
      icon: FileEdit,
      title: 'Content Blocks',
      description: 'Managed content sections for dynamic page updates',
    },
    [SITE_VIEWS.LINKS]: {
      icon: Link2,
      title: 'Internal Links',
      description: 'AI-suggested internal linking opportunities',
    },
    [SITE_VIEWS.SCRIPTS]: {
      icon: Code,
      title: 'Tracking Scripts',
      description: 'Analytics, tracking, and third-party scripts',
    },
    [SITE_VIEWS.SCHEMA]: {
      icon: Braces,
      title: 'Structured Data',
      description: 'JSON-LD schema markup for rich search results',
    },
  }
  
  const config = viewConfig[activeView] || viewConfig[SITE_VIEWS.PAGES]
  const Icon = config.icon
  
  // Loading state
  if (isLoading) {
    return (
      <div className="h-full p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }
  
  // Render the appropriate view panel
  const renderViewPanel = () => {
    switch (activeView) {
      case SITE_VIEWS.PAGES:
        return <SitePagesPanel project={project} pages={data.pages} />
      case SITE_VIEWS.IMAGES:
        return <SiteImagesPanel project={project} images={data.images} />
      case SITE_VIEWS.REDIRECTS:
        return <SiteRedirectsPanel project={project} redirects={data.redirects} />
      case SITE_VIEWS.FAQS:
        return <SiteFAQsPanel project={project} faqs={data.faqs} />
      case SITE_VIEWS.CONTENT:
        return <SiteContentPanel project={project} content={data.content} />
      case SITE_VIEWS.LINKS:
        return <SiteLinksPanel project={project} links={data.links} />
      case SITE_VIEWS.SCRIPTS:
        return <SiteScriptsPanel project={project} scripts={data.scripts} />
      case SITE_VIEWS.SCHEMA:
        return <SiteSchemaPanel project={project} schema={data.schema} />
      default:
        return <SitePagesPanel project={project} pages={data.pages} />
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {renderViewPanel()}
        </div>
      </ScrollArea>
    </div>
  )
}
