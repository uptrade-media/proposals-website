/**
 * ProspectingDashboard - Automated Signal AI prospecting via Places API
 * Distinct from SalesDashboard which handles manual Chrome extension prospects
 * Features: Scan Now, location-based discovery, AI scoring, auto-generation
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { 
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  Target,
  Flame,
  MapPin,
  Radar,
  User,
  X,
  ChevronDown,
  Download,
  Sparkles,
  Building2,
  Globe,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import useCrmStore from '@/lib/crm-store'
import useAuthStore from '@/lib/auth-store'
import TargetCompanyCard from './TargetCompanyCard'
import TargetCompanyDetail from './TargetCompanyDetail'
import { toast } from 'sonner'
import { signalApi } from '@/lib/signal-api'

// Score filter presets
const SCORE_FILTERS = [
  { id: 'all', label: 'All Scores', min: 0, max: 100 },
  { id: 'hot', label: 'Hot Leads (80+)', min: 80, max: 100 },
  { id: 'warm', label: 'Warm (60+)', min: 60, max: 100 },
  { id: 'potential', label: 'Potential (40+)', min: 40, max: 100 },
]

// Sort options
const SORT_OPTIONS = [
  { id: 'score_desc', label: 'Highest Score', field: 'score', direction: 'desc' },
  { id: 'score_asc', label: 'Lowest Score', field: 'score', direction: 'asc' },
  { id: 'recent', label: 'Most Recent', field: 'analyzed_at', direction: 'desc' },
  { id: 'oldest', label: 'Oldest', field: 'analyzed_at', direction: 'asc' },
]

// Status filter options
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'claimed', label: 'Claimed' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'not_qualified', label: 'Not Qualified' },
]

// Default scan parameters
const DEFAULT_SCAN_PARAMS = {
  location: '',
  radius: 25,
  businessType: 'local_business',
  limit: 20
}

export default function ProspectingDashboard() {
  const { user } = useAuthStore()
  const { 
    targetCompanies, 
    targetCompaniesLoading, 
    targetCompaniesError,
    selectedTargetCompany,
    fetchTargetCompanies, 
    claimTargetCompany, 
    getCallPrep,
    setSelectedTargetCompany 
  } = useCrmStore()

  // Filter only prospecting-sourced companies
  const prospectingCompanies = useMemo(() => 
    targetCompanies.filter(c => c.source === 'radar' || c.source === 'prospecting'),
    [targetCompanies]
  )

  // Filters & sorting state
  const [searchQuery, setSearchQuery] = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('score_desc')
  const [showOnlyMine, setShowOnlyMine] = useState(false)

  // Scan dialog state
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false)
  const [scanParams, setScanParams] = useState(DEFAULT_SCAN_PARAMS)
  const [isScanning, setIsScanning] = useState(false)
  const [lastScanAt, setLastScanAt] = useState(null)

  // Load prospecting companies on mount
  useEffect(() => {
    fetchTargetCompanies({ source: 'radar' })
  }, [fetchTargetCompanies])

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let result = [...prospectingCompanies]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c => 
        c.domain?.toLowerCase().includes(query) ||
        c.company_name?.toLowerCase().includes(query) ||
        c.ai_summary?.toLowerCase().includes(query) ||
        c.location?.toLowerCase().includes(query)
      )
    }

    // Score filter
    const scorePreset = SCORE_FILTERS.find(f => f.id === scoreFilter)
    if (scorePreset && scoreFilter !== 'all') {
      result = result.filter(c => 
        (c.score || 0) >= scorePreset.min && (c.score || 0) <= scorePreset.max
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    // Show only mine
    if (showOnlyMine && user?.id) {
      result = result.filter(c => c.claimed_by === user.id)
    }

    // Sort
    const sortOption = SORT_OPTIONS.find(s => s.id === sortBy) || SORT_OPTIONS[0]
    result.sort((a, b) => {
      const aVal = a[sortOption.field] ?? 0
      const bVal = b[sortOption.field] ?? 0
      
      if (sortOption.direction === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    })

    return result
  }, [prospectingCompanies, searchQuery, scoreFilter, statusFilter, sortBy, showOnlyMine, user?.id])

  // Stats for header
  const stats = useMemo(() => {
    const total = prospectingCompanies.length
    const hot = prospectingCompanies.filter(c => (c.score || 0) >= 80).length
    const claimed = prospectingCompanies.filter(c => c.claimed_by).length
    const mine = prospectingCompanies.filter(c => c.claimed_by === user?.id).length
    return { total, hot, claimed, mine }
  }, [prospectingCompanies, user?.id])

  const handleClaim = async (companyId) => {
    try {
      await claimTargetCompany(companyId)
      toast.success('Company claimed!')
    } catch (err) {
      toast.error('Failed to claim company')
    }
  }

  const handleCallPrep = async (companyId) => {
    try {
      await getCallPrep(companyId)
      toast.success('Call prep generated!')
    } catch (err) {
      toast.error('Failed to generate call prep')
    }
  }

  const handleRefresh = useCallback(() => {
    fetchTargetCompanies({ source: 'radar' })
  }, [fetchTargetCompanies])

  const clearFilters = () => {
    setSearchQuery('')
    setScoreFilter('all')
    setStatusFilter('all')
    setShowOnlyMine(false)
  }

  const hasActiveFilters = searchQuery || scoreFilter !== 'all' || statusFilter !== 'all' || showOnlyMine

  // Handle scan submission
  const handleScan = async () => {
    if (!scanParams.location.trim()) {
      toast.error('Please enter a location')
      return
    }

    setIsScanning(true)
    try {
      const response = await signalApi.post('/skills/prospecting/scan', {
        location: scanParams.location,
        radius: scanParams.radius,
        businessType: scanParams.businessType,
        limit: scanParams.limit
      })
      
      const { discovered = 0, scored = 0 } = response.data || {}
      toast.success(`Discovered ${discovered} businesses, ${scored} scored as prospects`)
      setLastScanAt(new Date())
      setIsScanDialogOpen(false)
      
      // Refresh the list
      handleRefresh()
    } catch (err) {
      console.error('Scan error:', err)
      toast.error(err.response?.data?.message || 'Failed to scan area')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Scan CTA */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--glass-border)]">
        {/* Top row: Title + Scan button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#44c168]/20 to-[#16b3a3]/20 border border-[#44c168]/30">
              <Radar className="w-5 h-5 text-[#23b27a]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                Signal Radar
                <Badge variant="outline" className="text-[10px] text-[#23b27a] border-[#23b27a]/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI-Powered
                </Badge>
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Automated lead discovery via Places API
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setIsScanDialogOpen(true)}
            className="bg-gradient-to-r from-[#44c168] to-[#16b3a3] hover:from-[#3fb05f] hover:to-[#129e91]"
          >
            <Radar className="w-4 h-4 mr-2" />
            Scan Now
          </Button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">{stats.total}</span>
              <span className="text-xs text-[var(--text-muted)]">Discovered</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <Flame className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">{stats.hot}</span>
              <span className="text-xs text-red-400/70">Hot</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <User className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">{stats.mine}</span>
              <span className="text-xs text-[var(--text-muted)]">Mine</span>
            </div>
            {lastScanAt && (
              <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Zap className="w-3 h-3" />
                Last scan: {lastScanAt.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={targetCompaniesLoading}>
              <RefreshCw className={cn('w-4 h-4', targetCompaniesLoading && 'animate-spin')} />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Search businesses, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[var(--glass-bg)]"
            />
          </div>

          {/* Score Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {SCORE_FILTERS.find(f => f.id === scoreFilter)?.label || 'All Scores'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {SCORE_FILTERS.map(filter => (
                <DropdownMenuItem 
                  key={filter.id}
                  onClick={() => setScoreFilter(filter.id)}
                >
                  {filter.label}
                  {scoreFilter === filter.id && <Badge variant="secondary" className="ml-2 text-[10px]">Active</Badge>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Status: {STATUS_FILTERS.find(f => f.id === statusFilter)?.label}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {STATUS_FILTERS.map(filter => (
                <DropdownMenuItem 
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                >
                  {filter.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {SORT_OPTIONS.map(option => (
                <DropdownMenuItem 
                  key={option.id}
                  onClick={() => setSortBy(option.id)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Show Only Mine */}
          <Button
            variant={showOnlyMine ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowOnlyMine(!showOnlyMine)}
          >
            <User className="w-4 h-4 mr-2" />
            My Claims
          </Button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Companies Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {targetCompaniesLoading && prospectingCompanies.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : targetCompaniesError ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-muted)]">Failed to load prospects</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Retry
              </Button>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-16">
              {hasActiveFilters ? (
                <>
                  <p className="text-[var(--text-muted)]">No prospects match your filters</p>
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                    Clear Filters
                  </Button>
                </>
              ) : (
                <div className="max-w-md mx-auto">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#44c168]/10 to-[#16b3a3]/10 border border-[#44c168]/20 w-fit mx-auto mb-4">
                        <Radar className="w-12 h-12 text-[#23b27a]" />
                  </div>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                        No radar hits yet
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                        Use Signal Radar to automatically discover and score local businesses in your target market.
                  </p>
                  <Button 
                    onClick={() => setIsScanDialogOpen(true)}
                        className="bg-gradient-to-r from-[#44c168] to-[#16b3a3] hover:from-[#3fb05f] hover:to-[#129e91]"
                  >
                    <Radar className="w-4 h-4 mr-2" />
                    Start Your First Scan
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCompanies.map(company => (
                <TargetCompanyCard
                  key={company.id}
                  company={company}
                  onClick={(c) => setSelectedTargetCompany(c)}
                  onClaim={handleClaim}
                  onCallPrep={handleCallPrep}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Detail Panel (slide-in) */}
      {selectedTargetCompany && (
        <div className="fixed inset-y-0 right-0 w-full max-w-[400px] bg-[var(--surface-primary)] border-l border-[var(--glass-border)] shadow-[var(--shadow-xl)] z-50">
          <TargetCompanyDetail
            company={selectedTargetCompany}
            onClose={() => setSelectedTargetCompany(null)}
          />
        </div>
      )}

      {/* Scan Dialog */}
      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radar className="w-5 h-5 text-[#23b27a]" />
              Signal Radar Scan
            </DialogTitle>
            <DialogDescription>
              Discover local businesses using Google Places API and score them with AI.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  placeholder="e.g., Denver, CO or 80202"
                  value={scanParams.location}
                  onChange={(e) => setScanParams(p => ({ ...p, location: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Radius */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Radius (miles)
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={scanParams.radius}
                onChange={(e) => setScanParams(p => ({ ...p, radius: parseInt(e.target.value) || 25 }))}
              />
            </div>

            {/* Business Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Business Type
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {scanParams.businessType === 'local_business' ? 'All Local Businesses' :
                     scanParams.businessType === 'restaurant' ? 'Restaurants' :
                     scanParams.businessType === 'contractor' ? 'Contractors / Home Services' :
                     scanParams.businessType === 'retail' ? 'Retail Stores' :
                     scanParams.businessType === 'healthcare' ? 'Healthcare / Medical' :
                     'All Local Businesses'}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  <DropdownMenuItem onClick={() => setScanParams(p => ({ ...p, businessType: 'local_business' }))}>
                    All Local Businesses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScanParams(p => ({ ...p, businessType: 'restaurant' }))}>
                    Restaurants
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScanParams(p => ({ ...p, businessType: 'contractor' }))}>
                    Contractors / Home Services
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScanParams(p => ({ ...p, businessType: 'retail' }))}>
                    Retail Stores
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScanParams(p => ({ ...p, businessType: 'healthcare' }))}>
                    Healthcare / Medical
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Limit */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Max Results
              </label>
              <Input
                type="number"
                min={5}
                max={100}
                value={scanParams.limit}
                onChange={(e) => setScanParams(p => ({ ...p, limit: parseInt(e.target.value) || 20 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScanDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleScan} 
              disabled={isScanning || !scanParams.location.trim()}
              className="bg-gradient-to-r from-[#44c168] to-[#16b3a3] hover:from-[#3fb05f] hover:to-[#129e91]"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Radar className="w-4 h-4 mr-2" />
                  Start Scan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
