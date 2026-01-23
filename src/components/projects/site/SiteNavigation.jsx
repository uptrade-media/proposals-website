/**
 * SiteNavigation - Left sidebar navigation for Website tab
 * 
 * Replaces TaskNavigation when the Website tab is active.
 * Provides navigation to all site management views:
 * - Pages, Images, Redirects, FAQs, Content, Links, Scripts, Schema
 */
import { 
  FileText, Image, ArrowRightLeft, HelpCircle, 
  FileEdit, Link2, Code, Braces, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { SITE_VIEWS } from '@/lib/site-management-store'

// Navigation items configuration
const SITE_NAV_ITEMS = [
  { 
    id: SITE_VIEWS.PAGES, 
    label: 'Pages', 
    icon: FileText,
    description: 'Site pages & metadata',
    statsKey: 'pagesCount',
    pendingKey: 'pendingPages',
  },
  { 
    id: SITE_VIEWS.IMAGES, 
    label: 'Images', 
    icon: Image,
    description: 'Managed image slots',
    statsKey: 'imagesCount',
    pendingKey: 'unassignedImages',
  },
  { 
    id: SITE_VIEWS.REDIRECTS, 
    label: 'Redirects', 
    icon: ArrowRightLeft,
    description: 'URL redirects',
    statsKey: 'redirectsCount',
  },
  { 
    id: SITE_VIEWS.FAQS, 
    label: 'FAQs', 
    icon: HelpCircle,
    description: 'FAQ sections',
    statsKey: 'faqsCount',
  },
  { 
    id: SITE_VIEWS.CONTENT, 
    label: 'Content', 
    icon: FileEdit,
    description: 'Managed content blocks',
    statsKey: 'contentCount',
    pendingKey: 'unpublishedContent',
  },
  { 
    id: SITE_VIEWS.LINKS, 
    label: 'Links', 
    icon: Link2,
    description: 'Internal linking',
    statsKey: 'linksCount',
    pendingKey: 'pendingLinks',
  },
  { 
    id: SITE_VIEWS.SCRIPTS, 
    label: 'Scripts', 
    icon: Code,
    description: 'Tracking scripts',
    statsKey: 'scriptsCount',
  },
  { 
    id: SITE_VIEWS.SCHEMA, 
    label: 'Schema', 
    icon: Braces,
    description: 'JSON-LD structured data',
    statsKey: 'schemaCount',
  },
]

export default function SiteNavigation({ 
  activeView, 
  stats = {}, 
  onViewChange,
  onRefresh,
  isRefreshing = false,
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Site Management
        </p>
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
        )}
      </div>
      
      {/* Navigation Items */}
      <div className="space-y-1">
        {SITE_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const count = stats[item.statsKey] || 0
          const pending = item.pendingKey ? (stats[item.pendingKey] || 0) : 0
          const isActive = activeView === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                "hover:bg-accent/50",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              
              {/* Count badge */}
              {count > 0 && (
                <Badge 
                  variant={pending > 0 ? "destructive" : "secondary"} 
                  className="h-5 text-[10px] px-1.5"
                >
                  {pending > 0 ? pending : count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>
      
      <Separator />
      
      {/* Quick Stats */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Stats
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-md bg-background border">
            <p className="text-xs text-muted-foreground">Pages</p>
            <p className="text-lg font-semibold">
              {stats.pagesCount || 0}
            </p>
          </div>
          <div className="p-2 rounded-md bg-background border">
            <p className="text-xs text-muted-foreground">Images</p>
            <p className="text-lg font-semibold">
              {stats.imagesCount || 0}
            </p>
          </div>
          <div className="p-2 rounded-md bg-background border">
            <p className="text-xs text-muted-foreground">Redirects</p>
            <p className="text-lg font-semibold">
              {stats.redirectsCount || 0}
            </p>
          </div>
          <div className="p-2 rounded-md bg-background border">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-lg font-semibold text-amber-500">
              {(stats.pendingPages || 0) + (stats.unassignedImages || 0) + (stats.pendingLinks || 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
