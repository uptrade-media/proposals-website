// src/components/seo/SEOPagesList.jsx
// List of all pages for a site with filtering and actions
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  RefreshCw,
  Filter,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wand2
} from 'lucide-react'
import { useSeoStore } from '@/lib/seo-store'
import SEOBulkEditModal from './SEOBulkEditModal'

export default function SEOPagesList({ site, projectId }) {
  const navigate = useNavigate()
  const { 
    pages,
    pagesLoading,
    pagesPagination,
    fetchPages,
    crawlSitemap,
    crawlPage
  } = useSeoStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [healthFilter, setHealthFilter] = useState('all')
  const [sortBy, setSortBy] = useState('clicks')
  const [crawlingPages, setCrawlingPages] = useState(new Set())
  const [crawlingSitemap, setCrawlingSitemap] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)

  // Use projectId directly (new architecture) or fallback to site.id (legacy)
  const siteId = projectId || site?.id

  // Fetch pages on mount and when filters change
  useEffect(() => {
    if (siteId) {
      console.log('[SEOPagesList] Fetching pages for siteId:', siteId)
      fetchPages(siteId, { 
        search: searchQuery,
        indexStatus: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy,
        limit: 50
      })
    }
  }, [siteId, searchQuery, statusFilter, sortBy])

  const handleCrawlSitemap = async () => {
    setCrawlingSitemap(true)
    try {
      await crawlSitemap(siteId)
    } finally {
      setCrawlingSitemap(false)
    }
  }

  const handleCrawlPage = async (pageId) => {
    setCrawlingPages(prev => new Set([...prev, pageId]))
    try {
      await crawlPage(pageId)
    } finally {
      setCrawlingPages(prev => {
        const next = new Set(prev)
        next.delete(pageId)
        return next
      })
    }
  }

  const getHealthBadge = (score) => {
    if (score === null || score === undefined) {
      return <Badge variant="outline" className="text-xs">-</Badge>
    }
    if (score >= 80) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">{score}</Badge>
    }
    if (score >= 60) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">{score}</Badge>
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{score}</Badge>
  }

  const getIndexStatusBadge = (page) => {
    const status = page.index_status
    const hasNoindex = page.has_noindex
    const isBlocked = page.robots_blocked
    
    if (isBlocked) {
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs gap-1">
          <AlertTriangle className="h-3 w-3" />
          Blocked
        </Badge>
      )
    }
    if (hasNoindex) {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs gap-1">
          <XCircle className="h-3 w-3" />
          Noindex
        </Badge>
      )
    }
    if (status === 'indexed') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1">
          <CheckCircle className="h-3 w-3" />
          Indexed
        </Badge>
      )
    }
    if (status === 'not_indexed' || status === 'not-indexed') {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs gap-1">
          <AlertTriangle className="h-3 w-3" />
          Not Indexed
        </Badge>
      )
    }
    if (status === 'removal_requested') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs gap-1">
          <XCircle className="h-3 w-3" />
          Removal
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Unknown
      </Badge>
    )
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-'
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Filter pages based on health filter
  const filteredPages = pages.filter(page => {
    if (healthFilter === 'all') return true
    if (healthFilter === 'good') return page.seo_health_score >= 80
    if (healthFilter === 'needs-work') return page.seo_health_score >= 60 && page.seo_health_score < 80
    if (healthFilter === 'poor') return page.seo_health_score < 60
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Index Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="indexed">Indexed</SelectItem>
              <SelectItem value="not-indexed">Not Indexed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health</SelectItem>
              <SelectItem value="good">Good (80+)</SelectItem>
              <SelectItem value="needs-work">Needs Work (60-79)</SelectItem>
              <SelectItem value="poor">Poor (&lt;60)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clicks">Most Clicks</SelectItem>
              <SelectItem value="impressions">Most Impressions</SelectItem>
              <SelectItem value="position">Best Position</SelectItem>
              <SelectItem value="health">Health Score</SelectItem>
              <SelectItem value="opportunities">Most Issues</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline"
            onClick={handleCrawlSitemap}
            disabled={crawlingSitemap}
            title="Manually sync pages from sitemap.xml (auto-syncs at build time)"
          >
            {crawlingSitemap ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Pages
          </Button>
          
          <Button 
            onClick={() => setBulkEditOpen(true)}
            disabled={pages.length === 0}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Bulk AI Edit
          </Button>
        </div>
      </div>

      {/* Bulk Edit Modal */}
      <SEOBulkEditModal
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        projectId={site?.id}
        pages={filteredPages}
        field="both"
        onComplete={() => {
          // Refresh pages after bulk edit
          fetchPages(siteId, { 
            search: searchQuery,
            indexStatus: statusFilter !== 'all' ? statusFilter : undefined,
            sortBy,
            limit: 50
          })
        }}
      />

      {/* Pages Table */}
      <Card>
        <CardContent className="p-0">
          {pagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No pages found</p>
              {pages.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm max-w-md mx-auto">
                    Pages are automatically synced from your site's <code className="bg-muted px-1 py-0.5 rounded text-xs">sitemap.xml</code> at build time 
                    when Site-Kit is installed.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleCrawlSitemap} 
                      disabled={crawlingSitemap}
                    >
                      {crawlingSitemap ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground/60">
                    Or wait for the next build to sync automatically
                  </p>
                </div>
              ) : (
                <p className="text-sm">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border/50">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Page</th>
                    <th className="px-4 py-3 font-medium text-center">Index</th>
                    <th className="px-4 py-3 font-medium text-right">Clicks</th>
                    <th className="px-4 py-3 font-medium text-right">Impr.</th>
                    <th className="px-4 py-3 font-medium text-right">Position</th>
                    <th className="px-4 py-3 font-medium text-center">Health</th>
                    <th className="px-4 py-3 font-medium text-center">Issues</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredPages.map((page) => (
                    <tr 
                      key={page.id}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/seo/pages/${page.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-foreground truncate">
                            {page.title || page.path}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {(() => {
                              try {
                                const url = new URL(page.path)
                                const path = url.pathname + url.search + url.hash
                                // Show full path for special routes (audit, proposal, invoice)
                                if (path.includes('/audit') || path.includes('/proposal') || path.includes('/invoice')) {
                                  return path
                                }
                                // For regular pages, just show domain
                                return url.hostname
                              } catch {
                                return page.path
                              }
                            })()}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getIndexStatusBadge(page)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        {formatNumber(page.clicks_28d)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        {formatNumber(page.impressions_28d)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        {page.avg_position_28d?.toFixed(1) || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getHealthBadge(page.seo_health_score)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {page.opportunities_count > 0 ? (
                          <Badge variant="outline" className="text-orange-400 border-orange-500/30">
                            {page.opportunities_count}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCrawlPage(page.id)
                            }}
                            disabled={crawlingPages.has(page.id)}
                          >
                            {crawlingPages.has(page.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(page.url, '_blank')
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagesPagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {filteredPages.length} of {pagesPagination.total} pages
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagesPagination.page <= 1}
              onClick={() => fetchPages(siteId, { page: pagesPagination.page - 1, limit: 50 })}
            >
              Previous
            </Button>
            <span>
              Page {pagesPagination.page} of {pagesPagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagesPagination.page >= pagesPagination.totalPages}
              onClick={() => fetchPages(siteId, { page: pagesPagination.page + 1, limit: 50 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
