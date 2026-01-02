/**
 * TenantDashboard - Dashboard for project-based tenants (web apps like GWA)
 * 
 * Shows:
 * - Quick overview of tenant's business
 * - Module shortcuts for their enabled features
 * - Recent activity from their modules
 * - Uptrade services section (proposals, invoices, messages from Uptrade)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2,
  ArrowLeft,
  Users,
  ShoppingCart,
  BarChart3,
  Search,
  BookOpen,
  Mail,
  ClipboardList,
  FileText,
  MessageSquare,
  DollarSign,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  MousePointer,
  Package,
  Loader2,
  Send,
  ArrowUpRight,
  Globe
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// Module card configuration
const TENANT_MODULES = {
  'tenant-clients': {
    key: 'tenant-clients',
    feature: 'clients',
    label: 'Clients',
    description: 'Manage leads and customers',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500'
  },
  seo: {
    key: 'seo',
    feature: 'seo',
    label: 'SEO',
    description: 'Search rankings & optimization',
    icon: Search,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500'
  },
  ecommerce: {
    key: 'ecommerce',
    feature: 'ecommerce',
    label: 'Ecommerce',
    description: 'Products & orders',
    icon: ShoppingCart,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500'
  },
  blog: {
    key: 'blog',
    feature: 'blog',
    label: 'Blog',
    description: 'Content management',
    icon: BookOpen,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-500'
  },
  email: {
    key: 'email',
    feature: 'email',
    label: 'Outreach',
    description: 'Email & SMS campaigns',
    icon: Mail,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-500'
  },
  forms: {
    key: 'forms',
    feature: 'forms',
    label: 'Forms',
    description: 'Form submissions',
    icon: ClipboardList,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-500'
  },
  analytics: {
    key: 'analytics',
    feature: 'analytics',
    label: 'Analytics',
    description: 'Traffic & performance',
    icon: BarChart3,
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-500'
  }
}

// Uptrade services shown to tenants
const UPTRADE_SERVICES = [
  { key: 'proposals', label: 'Proposals', icon: Send, description: 'View proposals from Uptrade' },
  { key: 'messages', label: 'Messages', icon: MessageSquare, description: 'Chat with your Uptrade team' },
  { key: 'billing', label: 'Billing', icon: DollarSign, description: 'Invoices and payments' },
  { key: 'files', label: 'Files', icon: FileText, description: 'Shared project files' }
]

export default function TenantDashboard({ onNavigate }) {
  const { currentOrg, currentProject, exitProjectView } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [exitingTenant, setExitingTenant] = useState(false)
  const [stats, setStats] = useState({
    visitors: 0,
    pageviews: 0,
    orders: 0,
    revenue: 0,
    clients: 0,
    blogPosts: 0
  })
  
  // Two-tier: Check if we're in a specific project or just the organization
  const isInProject = !!currentProject
  const tenantName = isInProject ? currentProject.name : (currentOrg?.name || 'Your Organization')
  const tenantDomain = isInProject ? currentProject.domain : currentOrg?.domain
  
  // Get enabled features - handle both array format (projects) and object format (orgs)
  const rawFeatures = isInProject ? (currentProject.features || []) : (currentOrg?.features || [])
  const enabledFeatures = Array.isArray(rawFeatures) 
    ? rawFeatures 
    : Object.entries(rawFeatures).filter(([_, v]) => v).map(([k]) => k)
  
  // Filter to only enabled modules
  const enabledModules = Object.values(TENANT_MODULES).filter(m => 
    enabledFeatures.includes(m.feature) || m.feature === 'clients' // Always show clients
  )
  
  // Exit tenant/project context
  const exitTenantDashboard = async () => {
    setExitingTenant(true)
    if (isInProject && exitProjectView) {
      await exitProjectView()
    } else {
      localStorage.removeItem('currentTenantProject')
      window.location.reload()
    }
  }
  
  // Load tenant stats
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true)
      try {
        // In the future, fetch actual stats from backend
        // For now, show placeholder
        setStats({
          visitors: 0,
          pageviews: 0,
          orders: 0,
          revenue: 0,
          clients: 0,
          blogPosts: 0
        })
      } catch (err) {
        console.error('Failed to load tenant stats:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadStats()
  }, [currentProject?.id, currentOrg?.id])

  return (
    <div className="space-y-6">
      {/* Tenant Header with Exit Button */}
      <div className="bg-gradient-to-br from-[var(--glass-bg)] to-[var(--surface-secondary)] backdrop-blur-xl rounded-2xl p-6 border border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={exitTenantDashboard}
            disabled={exitingTenant}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {exitingTenant ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowLeft className="w-4 h-4 mr-2" />
            )}
            {isInProject ? `Back to ${currentOrg?.name || 'Organization'}` : 'Back to Uptrade Media'}
          </Button>
          
          {tenantDomain && (
            <a 
              href={`https://${tenantDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[var(--accent-primary)] hover:underline"
            >
              <Globe className="w-4 h-4" />
              {tenantDomain}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{tenantName}</h1>
            <p className="text-[var(--text-secondary)]">
              Manage your website, content, and business tools
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Visitors</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.visitors.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-green-500">--</span> this month
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Page Views</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pageviews.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-2 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>--</span> avg/day
            </p>
          </CardContent>
        </Card>
        
        {enabledFeatures.includes('ecommerce') && (
          <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Orders</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.orders}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                ${stats.revenue.toLocaleString()} revenue
              </p>
            </CardContent>
          </Card>
        )}
        
        <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Leads</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.clients}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-500" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              From forms & signups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Your Modules */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {enabledModules.map(module => {
            const Icon = module.icon
            return (
              <Card 
                key={module.key}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
                  "bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]",
                  "group"
                )}
                onClick={() => onNavigate?.(module.key)}
              >
                <CardContent className="p-5">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                    "bg-gradient-to-br",
                    module.color
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {module.label}
                  </h3>
                  <p className="text-sm text-[var(--text-tertiary)] mt-1">
                    {module.description}
                  </p>
                  <div className="mt-3 flex items-center text-xs text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowUpRight className="w-3 h-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Uptrade Media Services */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-[var(--brand-primary)]/20 flex items-center justify-center">
            <img src="/favicon.svg" alt="Uptrade" className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Uptrade Media Services</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Your projects, proposals, and communications with Uptrade Media
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {UPTRADE_SERVICES.map(service => {
            const Icon = service.icon
            return (
              <button
                key={service.key}
                onClick={() => onNavigate?.(service.key)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl text-left transition-all",
                  "bg-[var(--surface-secondary)] border border-[var(--glass-border)]",
                  "hover:bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/30"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">{service.label}</p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{service.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent Activity - placeholder for now */}
      <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest updates from your website and modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Activity feed coming soon</p>
            <p className="text-sm mt-1">We're building this feature to show you real-time updates</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
