// src/components/seo/dashboard/TopQueriesTable.jsx
// Table showing top search queries from Google Search Console
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function getPositionColor(position) {
  if (position <= 10) return 'text-green-400'
  if (position <= 20) return 'text-yellow-400'
  return 'text-[var(--text-tertiary)]'
}

export default function TopQueriesTable({ queries = [], maxRows = 10 }) {
  if (!queries || queries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Top Search Queries
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            From Google Search Console
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-tertiary)] border-b border-[var(--glass-border)]">
                <th className="pb-2 font-medium">Query</th>
                <th className="pb-2 font-medium text-right">Clicks</th>
                <th className="pb-2 font-medium text-right">Impressions</th>
                <th className="pb-2 font-medium text-right">Position</th>
                <th className="pb-2 font-medium text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {queries.slice(0, maxRows).map((query, i) => (
                <tr 
                  key={query.query || i} 
                  className="border-b border-[var(--glass-border)]/50 hover:bg-[var(--glass-bg)]"
                >
                  <td className="py-2 text-[var(--text-primary)]">{query.query}</td>
                  <td className="py-2 text-right text-[var(--text-secondary)]">{query.clicks}</td>
                  <td className="py-2 text-right text-[var(--text-secondary)]">{formatNumber(query.impressions)}</td>
                  <td className="py-2 text-right">
                    <span className={getPositionColor(query.position)}>
                      {query.position?.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2 text-right text-[var(--text-secondary)]">
                    {(query.ctr * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
