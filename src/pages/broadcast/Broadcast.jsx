// src/pages/broadcast/Broadcast.jsx
// World-class social media management interface - inspired by Meta Business Suite
// Full-screen experience with dark theme support and brand colors
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Calendar, 
  FileText, 
  Palette, 
  Settings, 
  RefreshCw, 
  Filter, 
  Search, 
  LayoutGrid, 
  List, 
  BarChart3, 
  MessageSquare,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  Heart,
  Radio,
  TrendingUp,
  Eye,
  Upload,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bell,
  Image,
  Video,
  Library,
  PenSquare,
  Music,
  Keyboard,
  Film,
  CircleDot,
  Shield,
  Users,
  Target,
  Zap,
  Globe,
  Lock,
  Award,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';
import { BroadcastCalendar } from './components/BroadcastCalendar';
import { PostComposerPage } from './components/PostComposerPage';
import { ReelComposer } from './components/ReelComposer';
import { StoryComposer } from './components/StoryComposer';
import { PostsList } from './components/PostsList';
import { TemplatesGrid } from './components/TemplatesGrid';
import { BroadcastSettings } from './components/BroadcastSettings';
import { UnifiedInbox } from './components/UnifiedInbox';
import { BroadcastAnalytics } from './components/BroadcastAnalytics';
import { BulkSchedule } from './components/BulkSchedule';
import { HashtagSets } from './components/HashtagSets';
import { TrendingSounds } from './components/TrendingSounds';
import { MediaLibrary } from './components/MediaLibrary';
import { PlatformIcon } from './components/PlatformIcon';
import { toast } from 'sonner';

// =============================================================================
// CONSTANTS
// =============================================================================

const TABS = [
  { id: 'post', label: 'Post', icon: PenSquare, description: 'Text & images', accent: true, group: 'create' },
  { id: 'reel', label: 'Reel', icon: Film, description: 'Short video', accent: true, group: 'create' },
  { id: 'story', label: 'Story', icon: CircleDot, description: 'Ephemeral', accent: true, group: 'create' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Visual schedule', group: 'manage' },
  { id: 'posts', label: 'Posts', icon: FileText, description: 'All content', group: 'manage' },
  { id: 'inbox', label: 'Inbox', icon: MessageSquare, description: 'Engagement', group: 'manage' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Performance', group: 'manage' },
  { id: 'library', label: 'Library', icon: Library, description: 'Templates & Media', group: 'manage' },
];

// Keyboard shortcuts
const SHORTCUTS = {
  'n': 'post',
  'r': 'reel',
  't': 'story',
  'c': 'calendar',
  'p': 'posts',
  'i': 'inbox',
  'a': 'analytics',
  'l': 'library',
  's': 'settings',
};

// =============================================================================
// STATS CARD COMPONENT
// =============================================================================

function StatCard({ icon: Icon, label, value, trend, trendUp, subtitle, onClick, highlight }) {
  return (
    <Card 
      className={cn(
        'group relative overflow-hidden border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl transition-all duration-200',
        onClick && 'cursor-pointer hover:border-[var(--brand-primary)]/30 hover:shadow-lg',
        highlight && 'ring-2 ring-[var(--brand-primary)]/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{value}</span>
              {trend && (
                <span className={cn(
                  'flex items-center gap-0.5 text-xs font-semibold',
                  trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                )}>
                  <TrendingUp className={cn('h-3 w-3', !trendUp && 'rotate-180')} />
                  {trend}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            'bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-secondary)]/10',
            'text-[var(--brand-primary)]'
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {onClick && (
          <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
            <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// QUICK ACTIONS BAR
// =============================================================================

function QuickActionsBar({ onCreatePost, onAIGenerate, onBulkSchedule, onFromTemplate }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <Button 
        onClick={onCreatePost}
        className="h-9 gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white shadow-lg hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        New Post
      </Button>
      <Button variant="outline" className="h-9 gap-2 border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]" onClick={onAIGenerate}>
        <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
        AI Generate
      </Button>
      <Button variant="outline" className="h-9 gap-2 border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]" onClick={onFromTemplate}>
        <Palette className="h-4 w-4" />
        From Template
      </Button>
      <Button variant="outline" className="h-9 gap-2 border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]" onClick={onBulkSchedule}>
        <Upload className="h-4 w-4" />
        Bulk Schedule
      </Button>
    </div>
  );
}

// =============================================================================
// ENTERPRISE FEATURES PANEL - Fortune 500 capabilities
// =============================================================================

const ENTERPRISE_FEATURES = [
  { 
    icon: Shield, 
    label: 'Approval Workflows', 
    description: 'Multi-level approval chains',
    status: 'active',
    color: 'text-blue-500'
  },
  { 
    icon: Users, 
    label: 'Team Roles', 
    description: 'Writer, Editor, Publisher',
    status: 'active',
    color: 'text-purple-500'
  },
  { 
    icon: Building2, 
    label: 'Brand Guidelines', 
    description: 'Enforce brand voice & visuals',
    status: 'coming',
    color: 'text-amber-500'
  },
  { 
    icon: Lock, 
    label: 'Compliance Check', 
    description: 'Legal & regulatory review',
    status: 'coming',
    color: 'text-red-500'
  },
  { 
    icon: Globe, 
    label: 'Global Campaigns', 
    description: 'Multi-region scheduling',
    status: 'coming',
    color: 'text-emerald-500'
  },
  { 
    icon: Target, 
    label: 'Competitor Intel', 
    description: 'Track competitor content',
    status: 'coming',
    color: 'text-pink-500'
  },
  { 
    icon: Award, 
    label: 'Campaign Attribution', 
    description: 'ROI tracking per campaign',
    status: 'coming',
    color: 'text-orange-500'
  },
  { 
    icon: Zap, 
    label: 'Crisis Management', 
    description: 'Pause all posts instantly',
    status: 'active',
    color: 'text-yellow-500'
  },
];

function EnterpriseFeaturesBadge() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="h-9 gap-2 border-purple-500/30 bg-purple-500/5 text-purple-600 hover:bg-purple-500/10 dark:text-purple-400"
        >
          <Building2 className="h-4 w-4" />
          Enterprise
          <Badge className="ml-1 h-4 bg-purple-500 px-1.5 text-[9px] text-white">PRO</Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-[var(--glass-border)] bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 py-3">
          <h3 className="font-semibold text-[var(--text-primary)]">Enterprise Features</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Fortune 500 social media capabilities</p>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {ENTERPRISE_FEATURES.map((feature) => (
            <div 
              key={feature.label}
              className="flex items-start gap-3 rounded-lg p-2 hover:bg-[var(--glass-bg)]"
            >
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--glass-bg)]', feature.color)}>
                <feature.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{feature.label}</span>
                  {feature.status === 'coming' && (
                    <Badge variant="outline" className="h-4 text-[9px] border-amber-500/50 text-amber-600 dark:text-amber-400">Soon</Badge>
                  )}
                  {feature.status === 'active' && (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--glass-border)] p-3">
          <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            Upgrade to Enterprise
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// PENDING APPROVAL CARD
// =============================================================================

function PendingApprovalCard({ post, onApprove, onReject, onView }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-amber-300/50 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex -space-x-1.5">
        {post.platforms?.slice(0, 3).map((platform) => (
          <div 
            key={platform} 
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-50 bg-white shadow-sm dark:border-amber-900/50 dark:bg-[var(--surface-page-secondary)]"
          >
            <PlatformIcon platform={platform} size={16} />
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {post.content?.slice(0, 60)}...
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          {post.scheduledFor ? new Date(post.scheduledFor).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Draft'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="h-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => onView?.(post)}>
          View
        </Button>
        <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => onReject?.(post)}>
          Reject
        </Button>
        <Button size="sm" className="h-8 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600" onClick={() => onApprove?.(post)}>
          Approve
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// CONNECTED PLATFORMS BAR
// =============================================================================

function ConnectedPlatformsBar({ connections, onSettings }) {
  const activeConnections = connections.filter(c => c.status === 'active');
  const expiredConnections = connections.filter(c => c.status === 'expired' || c.status === 'error');

  if (connections.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--glass-border-strong)] bg-[var(--glass-bg-inset)] p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--glass-bg)]">
          <AlertCircle className="h-5 w-5 text-[var(--text-tertiary)]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">No platforms connected</p>
          <p className="text-xs text-[var(--text-secondary)]">Connect your social accounts to start posting</p>
        </div>
        <Button size="sm" onClick={onSettings} className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white">
          <Plus className="mr-2 h-4 w-4" />
          Connect Platform
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Connected</span>
      <div className="flex items-center gap-1.5">
        {activeConnections.map((conn) => (
          <TooltipProvider key={conn.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--glass-bg-hover)]"
                >
                  <PlatformIcon platform={conn.platform} size={14} />
                  <span className="hidden capitalize text-[var(--text-primary)] sm:inline">
                    {conn.platformAccountName || conn.platform}
                  </span>
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{conn.platform === 'gbp' ? 'Google Business' : conn.platform} - Connected</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {expiredConnections.length > 0 && (
        <Badge variant="destructive" className="animate-pulse gap-1">
          <AlertCircle className="h-3 w-3" />
          {expiredConnections.length} needs attention
        </Badge>
      )}
    </div>
  );
}

// =============================================================================
// MAIN BROADCAST COMPONENT
// =============================================================================

export function Broadcast({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [editingPost, setEditingPost] = useState(null);
  const [composerDefaults, setComposerDefaults] = useState({});
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const { currentProject } = useAuthStore();
  const selectedProjectId = currentProject?.id;
  const {
    posts,
    connections,
    templates,
    isLoading,
    error,
    inboxUnreadCount,
    fetchPosts,
    fetchConnections,
    fetchTemplates,
    fetchInbox,
  } = useBroadcastStore();
  
  // Computed stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = posts.filter(p => {
      const date = new Date(p.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    
    const published = posts.filter(p => p.status === 'published');
    const scheduled = posts.filter(p => p.status === 'scheduled');
    const pending = posts.filter(p => p.approvalStatus === 'pending');
    
    const totalEngagement = published.reduce((sum, p) => {
      const metrics = p.metrics || {};
      return sum + (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
    }, 0);

    const totalReach = published.reduce((sum, p) => {
      const metrics = p.metrics || {};
      return sum + (metrics.reach || 0) + (metrics.impressions || 0);
    }, 0);
    
    return {
      postsThisMonth: thisMonth.length,
      scheduledCount: scheduled.length,
      pendingCount: pending.length,
      totalEngagement,
      totalReach,
      pendingPosts: pending,
      publishedCount: published.length,
    };
  }, [posts]);

  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [showTrendingSounds, setShowTrendingSounds] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [statusFilter, setStatusFilter] = useState([]);
  const [platformFilter, setPlatformFilter] = useState([]);

  // Load data on mount
  useEffect(() => {
    if (selectedProjectId) {
      fetchConnections(selectedProjectId);
      fetchPosts(selectedProjectId);
      fetchTemplates(selectedProjectId);
      fetchInbox(selectedProjectId);
    }
  }, [selectedProjectId, fetchConnections, fetchPosts, fetchTemplates, fetchInbox]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if not in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Navigation shortcuts (Cmd/Ctrl + key)
      if (e.metaKey || e.ctrlKey) {
        const action = SHORTCUTS[e.key.toLowerCase()];
        if (action) {
          e.preventDefault();
          setActiveTab(action);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRefresh = async () => {
    if (!selectedProjectId) return;
    await Promise.all([
      fetchConnections(selectedProjectId),
      fetchPosts(selectedProjectId),
      fetchTemplates(selectedProjectId),
    ]);
    toast.success('Data refreshed');
  };

  // Filter posts
  const filteredPosts = useMemo(() => posts.filter((post) => {
    const matchesSearch = !searchQuery || 
      post.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(post.status);
    const matchesPlatform = platformFilter.length === 0 || 
      post.platforms?.some((p) => platformFilter.includes(p));
    return matchesSearch && matchesStatus && matchesPlatform;
  }), [posts, searchQuery, statusFilter, platformFilter]);

  // Navigation handlers
  const handleCreatePost = useCallback((defaults = {}) => {
    setComposerDefaults(defaults);
    setEditingPost(null);
    // Route to appropriate composer based on post type
    if (defaults.postType === 'reel') {
      setActiveTab('reel');
    } else if (defaults.postType === 'story') {
      setActiveTab('story');
    } else {
      setActiveTab('post');
    }
  }, []);

  const handleEditPost = useCallback((post) => {
    setEditingPost(post);
    setComposerDefaults({});
    // Route to appropriate composer based on post type
    if (post.postType === 'reel') {
      setActiveTab('reel');
    } else if (post.postType === 'story') {
      setActiveTab('story');
    } else {
      setActiveTab('post');
    }
  }, []);

  const handleComposerComplete = useCallback(() => {
    setEditingPost(null);
    setComposerDefaults({});
    setActiveTab('calendar');
    fetchPosts(selectedProjectId);
  }, [fetchPosts, selectedProjectId]);

  const handleComposerCancel = useCallback(() => {
    setEditingPost(null);
    setComposerDefaults({});
    setActiveTab('calendar');
  }, []);

  return (
    <div className="h-full overflow-hidden bg-[var(--surface-page)]">
      <div className="flex h-full min-h-0 flex-col p-4">
      {/* ================================================================== */}
      {/* HERO HEADER - Brand gradient tile with rounded corners - COLLAPSIBLE */}
      {/* ================================================================== */}
      <div className={cn(
        "shrink-0 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] shadow-lg transition-all duration-300",
        isHeaderCollapsed ? "py-0" : ""
      )}>
        {/* Background pattern */}
        {!isHeaderCollapsed && (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/30 blur-3xl" />
            <div className="absolute -bottom-10 right-1/4 h-60 w-60 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
          </div>
        )}
        
        <div className={cn(
          "relative px-6 transition-all duration-300",
          isHeaderCollapsed ? "py-3" : "py-5"
        )}>
          {/* Top row: Title and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm transition-all duration-300",
                isHeaderCollapsed ? "h-8 w-8" : "h-12 w-12"
              )}>
                <Radio className={cn(
                  "text-white transition-all duration-300",
                  isHeaderCollapsed ? "h-4 w-4" : "h-6 w-6"
                )} />
              </div>
              <div>
                <h1 className={cn(
                  "font-bold text-white transition-all duration-300",
                  isHeaderCollapsed ? "text-lg" : "text-2xl"
                )}>Broadcast</h1>
                {!isHeaderCollapsed && (
                  <p className="text-sm text-white/70">
                    Social media command center
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Collapse/Expand button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                      className="text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      {isHeaderCollapsed ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronUp className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isHeaderCollapsed ? 'Expand header' : 'Collapse header'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh data</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(true)}
                      className="text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings & Connections</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className={cn(
                    "bg-white/95 text-[var(--brand-primary)] shadow-lg hover:bg-white dark:bg-white/90",
                    isHeaderCollapsed && "h-8 px-3 text-sm"
                  )}>
                    <Plus className={cn("mr-2", isHeaderCollapsed ? "h-3 w-3" : "h-4 w-4")} />
                    Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleCreatePost({})}>
                    <PenSquare className="mr-2 h-4 w-4" />
                    New Post
                    <kbd className="ml-auto text-xs text-[var(--text-tertiary)]">⌘N</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCreatePost({ aiMode: true })}>
                    <Sparkles className="mr-2 h-4 w-4 text-[var(--brand-primary)]" />
                    Post with AI
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleCreatePost({ postType: 'reel' })}>
                    <Film className="mr-2 h-4 w-4 text-pink-500" />
                    New Reel / Short
                    <kbd className="ml-auto text-xs text-[var(--text-tertiary)]">⌘R</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCreatePost({ postType: 'story' })}>
                    <CircleDot className="mr-2 h-4 w-4 text-orange-500" />
                    New Story
                    <kbd className="ml-auto text-xs text-[var(--text-tertiary)]">⌘T</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowTrendingSounds(true)}>
                    <Music className="mr-2 h-4 w-4" />
                    Browse Trending Sounds
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowBulkSchedule(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Schedule
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Stats row - Hidden when collapsed */}
          {!isHeaderCollapsed && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <StatCard 
              icon={FileText} 
              label="Posts This Month" 
              value={stats.postsThisMonth}
              trend="+12%"
              trendUp
              subtitle={`${stats.publishedCount} published`}
            />
            <StatCard 
              icon={Clock} 
              label="Scheduled" 
              value={stats.scheduledCount}
              subtitle="Next in 2 hours"
              onClick={() => setActiveTab('calendar')}
            />
            <StatCard 
              icon={Heart} 
              label="Engagement" 
              value={stats.totalEngagement > 1000 ? `${(stats.totalEngagement/1000).toFixed(1)}k` : stats.totalEngagement}
              trend="+18%"
              trendUp
              onClick={() => setActiveTab('analytics')}
            />
            <StatCard 
              icon={Eye} 
              label="Total Reach" 
              value={stats.totalReach > 1000 ? `${(stats.totalReach/1000).toFixed(1)}k` : stats.totalReach}
              trend="+23%"
              trendUp
              onClick={() => setActiveTab('analytics')}
            />
            <StatCard 
              icon={MessageSquare} 
              label="Inbox" 
              value={inboxUnreadCount}
              subtitle={inboxUnreadCount > 0 ? 'unread messages' : 'all caught up'}
              onClick={() => setActiveTab('inbox')}
              highlight={inboxUnreadCount > 0}
            />
          </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* SUB-HEADER: Connected Platforms & Quick Actions - Also collapsible */}
      {/* ================================================================== */}
      {!isHeaderCollapsed && (
        <div className="shrink-0 mt-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-6 py-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ConnectedPlatformsBar 
            connections={connections} 
            onSettings={() => setShowSettings(true)}
          />
          
          <QuickActionsBar 
            onCreatePost={() => handleCreatePost({})}
            onAIGenerate={() => handleCreatePost({ aiMode: true })}
            onBulkSchedule={() => setShowBulkSchedule(true)}
            onFromTemplate={() => setActiveTab('library')}
          />
        </div>
        
        {/* Pending approvals section */}
        {stats.pendingPosts.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Pending Approvals ({stats.pendingCount})</h3>
            </div>
            <div className="space-y-2">
              {stats.pendingPosts.slice(0, 2).map((post) => (
                <PendingApprovalCard 
                  key={post.id} 
                  post={post}
                  onApprove={() => toast.success('Post approved')}
                  onReject={() => toast.info('Post rejected')}
                  onView={() => handleEditPost(post)}
                />
              ))}
              {stats.pendingPosts.length > 2 && (
                <Button variant="ghost" size="sm" className="w-full text-[var(--text-secondary)]">
                  View all {stats.pendingPosts.length} pending posts
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* ================================================================== */}
      {/* TAB NAVIGATION */}
      {/* ================================================================== */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--surface-page-secondary)]">
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--glass-border)] px-6">
          <TabsList className="h-12 gap-1 bg-transparent p-0">
            {/* Create Group */}
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 p-0.5">
              {TABS.filter(t => t.group === 'create').map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    'relative h-10 gap-2 rounded-md px-3 font-medium transition-all',
                    'data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--brand-primary)] data-[state=active]:to-[var(--brand-secondary)] data-[state=active]:text-white data-[state=active]:shadow-md',
                    'text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </div>
            
            {/* Separator */}
            <div className="mx-2 h-6 w-px bg-[var(--glass-border)]" />
            
            {/* Manage Group - Pill Style */}
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-0.5">
              {TABS.filter(t => t.group === 'manage').map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    'relative h-10 gap-2 rounded-md px-3 font-medium transition-all',
                    'data-[state=active]:bg-[var(--surface-page)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-sm',
                    'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === 'inbox' && inboxUnreadCount > 0 && (
                    <Badge className="ml-1 h-5 min-w-5 bg-[var(--brand-primary)] px-1.5 text-xs text-white">
                      {inboxUnreadCount}
                    </Badge>
                  )}
                  {tab.id === 'posts' && stats.pendingCount > 0 && (
                    <Badge variant="outline" className="ml-1 h-5 min-w-5 border-amber-400/50 bg-amber-50 px-1.5 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                      {stats.pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>

          {/* Contextual Filters */}
          {(activeTab === 'posts' || activeTab === 'library') && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-9 w-48 border-[var(--glass-border)] bg-[var(--glass-bg)] pl-9 placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand-primary)] lg:w-64"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 border-[var(--glass-border)] bg-[var(--glass-bg)]">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {(statusFilter.length > 0 || platformFilter.length > 0) && (
                      <Badge className="ml-2 h-5 bg-[var(--brand-primary)] text-white">
                        {statusFilter.length + platformFilter.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Status
                  </div>
                  {['draft', 'scheduled', 'published', 'failed'].map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={(checked) => {
                        setStatusFilter(checked ? [...statusFilter, status] : statusFilter.filter(s => s !== status));
                      }}
                    >
                      <span className="capitalize">{status}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Platform
                  </div>
                  {['facebook', 'instagram', 'linkedin', 'tiktok', 'gbp'].map((platform) => (
                    <DropdownMenuCheckboxItem
                      key={platform}
                      checked={platformFilter.includes(platform)}
                      onCheckedChange={(checked) => {
                        setPlatformFilter(checked ? [...platformFilter, platform] : platformFilter.filter(p => p !== platform));
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={platform} size={14} />
                        <span className="capitalize">{platform === 'gbp' ? 'Google Business' : platform}</span>
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setStatusFilter([]); setPlatformFilter([]); }}>
                    Clear all filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* TAB CONTENT - Full height */}
        {/* ================================================================ */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-[var(--surface-page)]">
          {/* POST TAB - Full Page Post Creator */}
          <TabsContent value="post" className="m-0 h-full data-[state=inactive]:hidden">
            <PostComposerPage
              editPost={editingPost}
              defaults={composerDefaults}
              onComplete={handleComposerComplete}
              onCancel={handleComposerCancel}
              connections={connections}
            />
          </TabsContent>

          {/* REEL TAB - Video-first Composer */}
          <TabsContent value="reel" className="m-0 h-full data-[state=inactive]:hidden">
            <ReelComposer
              editPost={editingPost}
              defaults={composerDefaults}
              onComplete={handleComposerComplete}
              onCancel={handleComposerCancel}
              connections={connections}
            />
          </TabsContent>

          {/* STORY TAB - Ephemeral Content Composer */}
          <TabsContent value="story" className="m-0 h-full data-[state=inactive]:hidden">
            <StoryComposer
              editPost={editingPost}
              defaults={composerDefaults}
              onComplete={handleComposerComplete}
              onCancel={handleComposerCancel}
              connections={connections}
            />
          </TabsContent>

          <TabsContent value="calendar" className="m-0 h-full data-[state=inactive]:hidden">
            <BroadcastCalendar 
              onCreatePost={(date) => handleCreatePost({ scheduledAt: date })}
              onEditPost={handleEditPost}
            />
          </TabsContent>

          <TabsContent value="posts" className="m-0 h-full overflow-auto p-6 data-[state=inactive]:hidden">
            <PostsList 
              posts={filteredPosts}
              viewMode={viewMode}
              onEdit={handleEditPost}
              onCreatePost={handleCreatePost}
            />
          </TabsContent>

          <TabsContent value="inbox" className="m-0 h-full data-[state=inactive]:hidden">
            <UnifiedInbox />
          </TabsContent>

          <TabsContent value="analytics" className="m-0 h-full overflow-auto p-6 data-[state=inactive]:hidden">
            <BroadcastAnalytics />
          </TabsContent>

          <TabsContent value="library" className="m-0 h-full overflow-auto p-6 data-[state=inactive]:hidden">
            <MediaLibrary 
              searchQuery={searchQuery}
              onUseTemplate={(template) => handleCreatePost({ template })}
              onSelectMedia={(media) => handleCreatePost({ media: [media] })}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Settings Modal */}
      <BroadcastSettings 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />

      {/* Bulk Schedule Wizard */}
      <BulkSchedule
        open={showBulkSchedule}
        onClose={() => setShowBulkSchedule(false)}
        onComplete={() => {
          setShowBulkSchedule(false);
          fetchPosts(selectedProjectId);
          toast.success('Bulk schedule created');
        }}
      />

      {/* Trending Sounds Browser */}
      <TrendingSounds
        open={showTrendingSounds}
        onClose={() => setShowTrendingSounds(false)}
        onSelect={(sound) => {
          setShowTrendingSounds(false);
          handleCreatePost({ postType: 'reel', sound });
        }}
      />
      </div>
    </div>
  );
}

export default Broadcast;
