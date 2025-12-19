// src/components/seo/dashboard/TopPagesCard.jsx
// Card showing top performing pages with click counts and health scores
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2 } from 'lucide-react'

function getHealthBadge(score) {
  if (score === null || score === undefined) return null
  if (score >= 80) return <Badge className="bg-green-500/20 text-green-400">{score}</Badge>
  if (score >= 60) return <Badge className="bg-yellow-500/20 text-yellow-400">{score}</Badge>
  return <Badge className="bg-red-500/20 text-red-400">{score}</Badge>
}

export default function TopPagesCard({ 
  pages = [], 
  loading = false, 
  onSelectPage, 
  onViewAll,
  onCrawl,
  crawling = false,
  maxRows = 5
}) {
  const topPages = pages.slice(0, maxRows)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Top Pages</CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : topPages.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pages crawled yet</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={onCrawl}
              disabled={crawling}
            >
              {crawling ? 'Crawling...' : 'Crawl Sitemap'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {topPages.map((page) => (
              <div 
                key={page.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--surface-elevated)] cursor-pointer transition-colors"
                onClick={() => onSelectPage?.(page.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {page.title || page.path}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">
                    {page.path}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-[var(--text-primary)]">{page.clicks_28d || 0}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">clicks</p>
                  </div>
                  {getHealthBadge(page.seo_health_score)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
