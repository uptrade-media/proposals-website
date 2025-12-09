/**
 * Deliverables - Detailed breakdown of what client receives
 * 
 * Each deliverable explained with:
 * - What it is
 * - Why it matters
 * - What's included specifically
 */

import { cn } from '@/lib/utils'
import { 
  CheckCircle2, 
  Package,
  FileText,
  Globe,
  Palette,
  Code,
  Search,
  Image,
  Video,
  BarChart3,
  Smartphone,
  Shield,
  Zap,
  Users,
  MessageSquare,
  Calendar,
  Settings
} from 'lucide-react'

// Icon mapping for deliverable types
const iconMap = {
  website: Globe,
  design: Palette,
  code: Code,
  seo: Search,
  content: FileText,
  photo: Image,
  video: Video,
  analytics: BarChart3,
  mobile: Smartphone,
  security: Shield,
  performance: Zap,
  users: Users,
  support: MessageSquare,
  training: Calendar,
  settings: Settings,
  package: Package
}

// Single deliverable card with full explanation
export function DeliverableCard({
  title,
  description,
  whyItMatters,
  includes = [],
  icon = 'package',
  className = ''
}) {
  const Icon = iconMap[icon] || Package
  
  return (
    <div className={cn(
      'p-6 sm:p-8 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-sm',
      'border border-[var(--glass-border)] hover:border-[var(--brand-green)]/30',
      'transition-all duration-300',
      className
    )}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-teal)] flex-shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            {title}
          </h3>
          {description && (
            <p className="text-[var(--text-secondary)] mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* Why it matters */}
      {whyItMatters && (
        <div className="mb-5 p-4 rounded-xl bg-[var(--brand-green)]/5 border border-[var(--brand-green)]/10">
          <p className="text-sm">
            <span className="font-semibold text-[var(--brand-green)]">Why it matters: </span>
            <span className="text-[var(--text-secondary)]">{whyItMatters}</span>
          </p>
        </div>
      )}
      
      {/* What's included */}
      {includes.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
            Includes
          </p>
          <ul className="space-y-2">
            {includes.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-[var(--text-primary)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Grid wrapper for multiple deliverables
export function DeliverablesGrid({ 
  children, 
  columns = 1,
  className = '' 
}) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2'
  }
  
  return (
    <div className={cn('grid gap-6', colClasses[columns], className)}>
      {children}
    </div>
  )
}

// Compact deliverable list item
export function DeliverableItem({
  title,
  description,
  icon = 'package'
}) {
  const Icon = iconMap[icon] || Package
  
  return (
    <div className="flex items-start gap-3 py-4 border-b border-[var(--glass-border)] last:border-0">
      <div className="p-2 rounded-lg bg-[var(--brand-green)]/10 flex-shrink-0">
        <Icon className="w-4 h-4 text-[var(--brand-green)]" />
      </div>
      <div>
        <h4 className="font-medium text-[var(--text-primary)]">{title}</h4>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}

// Deliverables checklist (simple list format)
export function DeliverablesList({
  title,
  items = [],
  className = ''
}) {
  return (
    <div className={cn('', className)}>
      {title && (
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
      )}
      <div className="space-y-0">
        {items.map((item, i) => (
          <DeliverableItem 
            key={i} 
            title={typeof item === 'string' ? item : item.title}
            description={typeof item === 'string' ? undefined : item.description}
            icon={typeof item === 'string' ? 'package' : item.icon}
          />
        ))}
      </div>
    </div>
  )
}
