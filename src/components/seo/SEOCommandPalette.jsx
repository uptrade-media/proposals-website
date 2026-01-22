import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  FileText,
  Search,
  Target,
  TrendingUp,
  AlertTriangle,
  Zap,
  Settings,
  RefreshCw,
  Download,
  Sparkles,
  History,
  ListChecks,
  Globe,
  Link2,
  Code,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// SEO navigation items
const SEO_PAGES = [
  { id: 'dashboard', name: 'Dashboard', path: '/seo', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  { id: 'pages', name: 'Pages', path: '/seo/pages', icon: FileText, keywords: ['url', 'content'] },
  { id: 'keywords', name: 'Keywords', path: '/seo/keywords', icon: Search, keywords: ['queries', 'search', 'ranking'] },
  { id: 'opportunities', name: 'Opportunities', path: '/seo/opportunities', icon: Target, keywords: ['fixes', 'improve'] },
  { id: 'competitors', name: 'Competitors', path: '/seo/competitors', icon: Users, keywords: ['competition', 'compare'] },
  { id: 'backlinks', name: 'Backlinks', path: '/seo/backlinks', icon: Link2, keywords: ['links', 'referring'] },
  { id: 'technical', name: 'Technical Audit', path: '/seo/technical', icon: Code, keywords: ['issues', 'errors'] },
  { id: 'analytics', name: 'Analytics', path: '/seo/analytics', icon: BarChart3, keywords: ['traffic', 'metrics'] },
  { id: 'history', name: 'Change History', path: '/seo/history', icon: History, keywords: ['changes', 'log'] },
  { id: 'settings', name: 'SEO Settings', path: '/seo/settings', icon: Settings, keywords: ['config', 'preferences'] },
];

// Quick actions
const QUICK_ACTIONS = [
  { id: 'sync-gsc', name: 'Sync Google Search Console', icon: RefreshCw, action: 'syncGsc', keywords: ['refresh', 'update'] },
  { id: 'export-report', name: 'Export SEO Report', icon: Download, action: 'exportReport', keywords: ['pdf', 'download'] },
  { id: 'quick-wins', name: 'Find Quick Wins', icon: Zap, action: 'quickWins', keywords: ['easy', 'fast', 'improve'] },
  { id: 'ai-analyze', name: 'AI Site Analysis', icon: Sparkles, action: 'aiAnalyze', keywords: ['analyze', 'audit'] },
  { id: 'priority-queue', name: 'Open Priority Queue', icon: ListChecks, action: 'priorityQueue', keywords: ['tasks', 'todo'] },
];

export function SEOCommandPalette({ onAction }) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // j/k navigation when palette is closed (navigate between items on page)
  useEffect(() => {
    if (open) return; // Don't interfere when palette is open

    const handleNavigation = (e) => {
      // Only on SEO pages
      if (!location.pathname.startsWith('/seo')) return;

      // Don't capture if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'j') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('seo:navigate', { detail: { direction: 'next' } }));
      } else if (e.key === 'k') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('seo:navigate', { detail: { direction: 'prev' } }));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('seo:select'));
      }
    };

    document.addEventListener('keydown', handleNavigation);
    return () => document.removeEventListener('keydown', handleNavigation);
  }, [open, location.pathname]);

  const handleSelect = useCallback((item) => {
    setOpen(false);

    if (item.path) {
      // Navigation item
      navigate(item.path);
    } else if (item.action && onAction) {
      // Quick action
      onAction(item.action);
    }
  }, [navigate, onAction]);

  // Get current page for highlighting
  const currentPage = useMemo(() => {
    return SEO_PAGES.find(p => location.pathname === p.path);
  }, [location.pathname]);

  return (
    <>
      {/* Keyboard shortcut hint - floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-background/80 backdrop-blur border rounded-lg shadow-lg hover:bg-accent transition-colors text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search SEO pages, run actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {SEO_PAGES.map((page) => (
              <CommandItem
                key={page.id}
                value={`${page.name} ${page.keywords.join(' ')}`}
                onSelect={() => handleSelect(page)}
                className={currentPage?.id === page.id ? 'bg-accent' : ''}
              >
                <page.icon className="mr-2 h-4 w-4" />
                <span>{page.name}</span>
                {currentPage?.id === page.id && (
                  <span className="ml-auto text-xs text-muted-foreground">Current</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Quick Actions">
            {QUICK_ACTIONS.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.name} ${action.keywords.join(' ')}`}
                onSelect={() => handleSelect(action)}
              >
                <action.icon className="mr-2 h-4 w-4" />
                <span>{action.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Keyboard Shortcuts">
            <div className="px-2 py-3 text-sm text-muted-foreground space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                  or <kbd className="px-1 bg-muted rounded">j</kbd> / <kbd className="px-1 bg-muted rounded">k</kbd>
                </span>
                <span>Navigate items</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd>
                <span>Select item</span>
              </div>
              <div className="flex items-center justify-between">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

// Hook for components to use j/k navigation
export function useSEOKeyboardNavigation(items, onSelect) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleNavigate = (e) => {
      const { direction } = e.detail;
      setSelectedIndex((prev) => {
        if (direction === 'next') {
          return Math.min(prev + 1, items.length - 1);
        } else {
          return Math.max(prev - 1, 0);
        }
      });
    };

    const handleSelect = () => {
      if (items[selectedIndex] && onSelect) {
        onSelect(items[selectedIndex], selectedIndex);
      }
    };

    document.addEventListener('seo:navigate', handleNavigate);
    document.addEventListener('seo:select', handleSelect);

    return () => {
      document.removeEventListener('seo:navigate', handleNavigate);
      document.removeEventListener('seo:select', handleSelect);
    };
  }, [items, selectedIndex, onSelect]);

  // Reset when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  return { selectedIndex, setSelectedIndex };
}

export default SEOCommandPalette;
