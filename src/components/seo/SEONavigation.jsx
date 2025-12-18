// src/components/seo/SEONavigation.jsx
// Simplified tab navigation for SEO module
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  FileText,
  Target,
  Code,
  Shield,
  BarChart3,
  Brain,
  Settings,
  Bell,
  TrendingUp
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'keywords', label: 'Keywords', icon: Target },
  { id: 'content', label: 'Content', icon: Brain },
  { id: 'technical', label: 'Technical', icon: Shield },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
]

export default function SEONavigation({ 
  activeView, 
  onViewChange,
  alerts = 0,
  opportunities = 0 
}) {
  return (
    <nav className="flex items-center gap-1 p-1 bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)]">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeView === item.id
        const badge = item.id === 'technical' && alerts > 0 ? alerts : 
                      item.id === 'content' && opportunities > 0 ? opportunities : 0
        
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              'hover:bg-[var(--surface-elevated)]',
              isActive 
                ? 'bg-[var(--accent-primary)] text-white shadow-sm' 
                : 'text-[var(--text-secondary)]'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden md:inline">{item.label}</span>
            {badge > 0 && (
              <Badge 
                variant="secondary" 
                className={cn(
                  'h-5 min-w-[20px] px-1.5 text-xs',
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-red-500/20 text-red-400'
                )}
              >
                {badge > 99 ? '99+' : badge}
              </Badge>
            )}
          </button>
        )
      })}
    </nav>
  )
}

// Minimal navigation for mobile
export function SEOMobileNav({ activeView, onViewChange, alerts = 0 }) {
  return (
    <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeView === item.id
        
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all',
              isActive 
                ? 'bg-[var(--accent-primary)] text-white' 
                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
