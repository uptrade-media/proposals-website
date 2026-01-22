import { useState, useEffect, useCallback } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Home,
  FileText,
  MessageSquare,
  DollarSign,
  BarChart3,
  Users,
  FolderOpen,
  Mail,
  Search,
  Zap,
  Calendar,
  Box,
  Send,
  ShoppingCart,
  Brain,
  Radio,
  Star,
  Sparkles,
  Settings,
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'

// Detect if user is on Windows
const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform)
const modKey = isWindows ? 'Ctrl' : '⌘'

// All available sections/pages in the portal
const NAVIGATION_ITEMS = [
  { id: 'dashboard', name: 'Dashboard', icon: Home, keywords: ['home', 'overview', 'main'] },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, keywords: ['stats', 'metrics', 'data', 'traffic'] },
  { id: 'seo', name: 'SEO', icon: Search, keywords: ['search', 'google', 'ranking', 'keywords'] },
  { id: 'engage', name: 'Engage', icon: Zap, keywords: ['popups', 'banners', 'nudges', 'widgets'] },
  { id: 'outreach', name: 'Outreach', icon: Mail, keywords: ['email', 'campaigns', 'newsletter'] },
  { id: 'crm', name: 'CRM', icon: Users, keywords: ['contacts', 'leads', 'clients', 'prospects'] },
  { id: 'messages', name: 'Messages', icon: MessageSquare, keywords: ['chat', 'inbox', 'conversation'] },
  { id: 'files', name: 'Files', icon: FolderOpen, keywords: ['drive', 'documents', 'uploads'] },
  { id: 'sync', name: 'Sync', icon: Calendar, keywords: ['calendar', 'scheduling', 'booking'] },
  { id: 'commerce', name: 'Commerce', icon: Box, keywords: ['products', 'services', 'sales', 'shop'] },
  { id: 'proposals', name: 'Proposals', icon: Send, keywords: ['contracts', 'quotes'] },
  { id: 'billing', name: 'Billing', icon: DollarSign, keywords: ['invoices', 'payments'] },
  { id: 'forms', name: 'Forms', icon: FileText, keywords: ['intake', 'surveys'] },
  { id: 'broadcast', name: 'Broadcast', icon: Radio, keywords: ['announcements'] },
  { id: 'reputation', name: 'Reputation', icon: Star, keywords: ['reviews', 'ratings'] },
  { id: 'signal', name: 'Signal AI', icon: Sparkles, keywords: ['ai', 'echo', 'assistant', 'chat'] },
  { id: 'projects', name: 'Projects', icon: FolderOpen, keywords: ['clients', 'tenants'] },
  { id: 'team', name: 'Team', icon: Users, keywords: ['users', 'members', 'staff'] },
  { id: 'settings', name: 'Settings', icon: Settings, keywords: ['preferences', 'config'] },
]

export default function GlobalCommandPalette({ open, onOpenChange, onNavigate }) {
  const [search, setSearch] = useState('')
  const currentOrg = useAuthStore((state) => state.currentOrg)
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin)
  
  const hasFeature = (featureKey) => {
    if (isSuperAdmin) return true
    return currentOrg?.features?.[featureKey] === true
  }

  // Filter items based on search and feature access
  const filteredItems = NAVIGATION_ITEMS.filter(item => {
    // Check if user has access to this feature
    const hasAccess = !['seo', 'engage', 'signal'].includes(item.id) || hasFeature(item.id)
    if (!hasAccess) return false

    // Filter by search term
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.keywords.some(k => k.includes(searchLower))
    )
  })

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const handleSelect = useCallback((itemId) => {
    onNavigate(itemId)
    onOpenChange(false)
    setSearch('')
  }, [onNavigate, onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder={`Search portal... (${modKey}+K)`}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {filteredItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => handleSelect(item.id)}
                className="flex items-center gap-2 px-4 py-2.5"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.name}</span>
                {item.keywords.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.keywords[0]}
                  </span>
                )}
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
