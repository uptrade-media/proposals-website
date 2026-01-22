// src/components/affiliates/AffiliatesModule.jsx
// Affiliates Module - Sync-inspired layout with tiles

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  Plus,
  Search,
  RefreshCw,
  Settings,
  Users,
  Play,
  Pause,
  ChevronDown,
  MousePointerClick,
  CheckCircle,
  DollarSign,
  Globe,
  Loader2,
  ExternalLink,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelRightClose,
  TrendingUp,
  LayoutGrid,
  List,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import useAffiliatesStore from '@/lib/affiliates-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { toast } from 'sonner'

// Sub-components
import AffiliateDetailPanel from './AffiliateDetailPanel'
import CreateAffiliateDialog from './CreateAffiliateDialog'
import CreateAffiliateForm from './CreateAffiliateForm'
import CreateOfferDialog from './CreateOfferDialog'

// ============================================================================
// AFFILIATE TILE CARD
// ============================================================================

function AffiliateTile({ affiliate, isSelected, onSelect, offers }) {
  const affiliateOffers = offers?.filter(o => o.affiliate_id === affiliate.id) || []
  
  const formatNumber = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num?.toString() || '0'
  }

  const formatCurrency = (amount) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <motion.button
      onClick={() => onSelect(affiliate.id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-200",
        "bg-card hover:bg-card/80 hover:shadow-md",
        isSelected
          ? "ring-2 ring-primary border-primary shadow-md"
          : "border-border hover:border-primary/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {affiliate.logo_url ? (
            <img 
              src={affiliate.logo_url} 
              alt={affiliate.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ) : (
            <Globe className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{affiliate.name}</span>
          </div>
          {affiliate.website_url && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {affiliate.website_url.replace(/^https?:\/\//, '')}
            </p>
          )}
        </div>

        <Badge 
          variant={affiliate.status === 'active' ? 'default' : 'secondary'}
          className={cn(
            "shrink-0 text-xs",
            affiliate.status === 'active' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          )}
        >
          {affiliate.status === 'active' ? (
            <><Play className="h-3 w-3 mr-1" />Active</>
          ) : (
            <><Pause className="h-3 w-3 mr-1" />Paused</>
          )}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
            <MousePointerClick className="h-3.5 w-3.5" />
          </div>
          <div className="text-sm font-semibold">{formatNumber(affiliate.total_clicks)}</div>
          <div className="text-[10px] text-muted-foreground">Clicks</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-green-500 mb-0.5">
            <CheckCircle className="h-3.5 w-3.5" />
          </div>
          <div className="text-sm font-semibold">{formatNumber(affiliate.total_conversions)}</div>
          <div className="text-[10px] text-muted-foreground">Conversions</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
            <DollarSign className="h-3.5 w-3.5" />
          </div>
          <div className="text-sm font-semibold">{formatCurrency(affiliate.total_payout)}</div>
          <div className="text-[10px] text-muted-foreground">Payout</div>
        </div>
      </div>

      {/* Offers count */}
      {affiliateOffers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" />
          {affiliateOffers.length} active offer{affiliateOffers.length !== 1 ? 's' : ''}
        </div>
      )}
    </motion.button>
  )
}

// ============================================================================
// MAIN MODULE
// ============================================================================

export default function AffiliatesModule({ className }) {
  const { currentProject } = useAuthStore()
  const { primary, primaryLight, toRgba } = useBrandColors()
  const {
    affiliates,
    offers,
    selectedAffiliateId,
    selectedView,
    isLoading,
    setSelectedAffiliateId,
    setSelectedView,
    fetchAffiliates,
    fetchOffers,
    getFilteredAffiliates,
  } = useAffiliatesStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Initial fetch
  useEffect(() => {
    if (currentProject?.id) {
      fetchAffiliates(currentProject.id)
      fetchOffers(currentProject.id)
    }
  }, [currentProject?.id, fetchAffiliates, fetchOffers])

  const filteredAffiliates = getFilteredAffiliates().filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.website_url && a.website_url.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const selectedAffiliate = affiliates.find(a => a.id === selectedAffiliateId)
  
  const handleRefresh = () => {
    if (currentProject?.id) {
      fetchAffiliates(currentProject.id)
      fetchOffers(currentProject.id)
    }
  }

  // Stats for header
  const stats = {
    total: affiliates.length,
    active: affiliates.filter(a => a.status === 'active').length,
    totalClicks: affiliates.reduce((sum, a) => sum + (a.total_clicks || 0), 0),
    totalConversions: affiliates.reduce((sum, a) => sum + (a.total_conversions || 0), 0),
  }

  return (
    <TooltipProvider>
      <div className={cn("h-[calc(100vh-120px)] flex flex-col bg-background overflow-hidden", className)}>
        {/* ===== TOP HEADER BAR ===== */}
        <div className="flex-shrink-0 h-14 border-b flex items-center justify-between px-4 bg-card/50">
          {/* Left: Branding + Stats */}
          <div className="flex items-center gap-4">
            {/* Toggle Left Sidebar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                >
                  <PanelLeftClose className={cn("h-4 w-4 transition-transform", !showLeftSidebar && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showLeftSidebar ? 'Hide sidebar' : 'Show sidebar'}</TooltipContent>
            </Tooltip>
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: `linear-gradient(135deg, ${primary}, ${toRgba(primary, 0.8)})` }}
              >
                <Link2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg hidden lg:inline">Affiliates</span>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-4 ml-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {stats.total} partners
              </span>
              <span className="flex items-center gap-1.5">
                <MousePointerClick className="h-4 w-4" />
                {stats.totalClicks.toLocaleString()} clicks
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                {stats.totalConversions.toLocaleString()} conversions
              </span>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Create Affiliate */}
            <Button 
              size="sm" 
              className="gap-1.5"
              style={{ backgroundColor: primary }}
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Affiliate</span>
            </Button>
            
            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            
            {/* View Mode Toggle */}
            <div className="flex border rounded-md overflow-hidden">
              {[
                { id: 'grid', icon: LayoutGrid },
                { id: 'list', icon: List },
              ].map((mode) => (
                <Tooltip key={mode.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode(mode.id)}
                      className={cn(
                        "h-8 px-2.5 transition-colors flex items-center",
                        viewMode === mode.id 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <mode.icon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{mode.id === 'grid' ? 'Grid view' : 'List view'}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            
            {/* Toggle Right Sidebar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                >
                  <PanelRightClose className={cn("h-4 w-4 transition-transform", !showRightSidebar && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showRightSidebar ? 'Hide details' : 'Show details'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* ===== MAIN CONTENT AREA ===== */}
        <div className="flex-1 flex overflow-hidden">
          {/* ===== LEFT SIDEBAR ===== */}
          <AnimatePresence>
            {showLeftSidebar && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex-shrink-0 border-r overflow-hidden bg-muted/30"
              >
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-6">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search affiliates..." 
                        className="pl-8 h-9 text-sm bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {/* Navigation */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Views</p>
                      {[
                        { id: 'all', icon: Users, label: 'All Affiliates', count: stats.total },
                        { id: 'active', icon: Play, label: 'Active', count: stats.active },
                        { id: 'paused', icon: Pause, label: 'Paused', count: stats.total - stats.active },
                      ].map((view) => (
                        <button
                          key={view.id}
                          onClick={() => setSelectedView(view.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                            selectedView === view.id
                              ? "font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          style={selectedView === view.id ? {
                            backgroundColor: toRgba(primary, 0.1),
                            color: primary,
                          } : undefined}
                        >
                          <view.icon className="h-4 w-4" />
                          <span className="flex-1 text-left">{view.label}</span>
                          <Badge variant="secondary" className="text-xs h-5 px-1.5">
                            {view.count}
                          </Badge>
                        </button>
                      ))}
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Performance</p>
                      <div className="bg-background rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <MousePointerClick className="h-3.5 w-3.5" />
                            Total Clicks
                          </span>
                          <span className="font-medium">{stats.totalClicks.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Conversions
                          </span>
                          <span className="font-medium">{stats.totalConversions.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Conv. Rate
                          </span>
                          <span className="font-medium">
                            {stats.totalClicks > 0 
                              ? `${((stats.totalConversions / stats.totalClicks) * 100).toFixed(1)}%`
                              : '0%'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* ===== CENTER CONTENT (TILES) ===== */}
          <div className="flex-1 overflow-hidden bg-muted/20">
            {showCreateForm ? (
              <CreateAffiliateForm
                onCancel={() => setShowCreateForm(false)}
                onSuccess={() => setShowCreateForm(false)}
              />
            ) : (
            <ScrollArea className="h-full">
              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAffiliates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <Users className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-lg font-medium">No affiliates found</p>
                    <p className="text-sm mt-1">
                      {affiliates.length === 0 
                        ? 'Create your first affiliate partner to get started'
                        : 'Try adjusting your search or filter'
                      }
                    </p>
                    {affiliates.length === 0 && (
                      <Button 
                        className="mt-4 gap-2"
                        onClick={() => setShowCreateForm(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Add First Affiliate
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className={cn(
                    viewMode === 'grid' 
                      ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                      : "flex flex-col gap-3"
                  )}>
                    {filteredAffiliates.map(affiliate => (
                      <AffiliateTile
                        key={affiliate.id}
                        affiliate={affiliate}
                        isSelected={selectedAffiliateId === affiliate.id}
                        onSelect={setSelectedAffiliateId}
                        offers={offers}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
            )}
          </div>
          
          {/* ===== RIGHT SIDEBAR (DETAIL PANEL) ===== */}
          <AnimatePresence>
            {showRightSidebar && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 400, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex-shrink-0 border-l overflow-hidden bg-card"
              >
                {selectedAffiliate ? (
                  <AffiliateDetailPanel 
                    affiliate={selectedAffiliate}
                    offers={offers}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center p-6">
                      <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Select an affiliate</p>
                      <p className="text-sm mt-1">Click on a tile to view details</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  )
}
