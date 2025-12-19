// src/components/seo/dashboard/OpportunitiesCard.jsx
// Card showing recent SEO opportunities with priority badges
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, Loader2 } from 'lucide-react'

function getPriorityColor(priority) {
  switch (priority) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }
}

export default function OpportunitiesCard({ 
  opportunities = [], 
  loading = false, 
  onSelectPage, 
  onViewAll,
  onDetect,
  detecting = false,
  maxRows = 5
}) {
  const openOpportunities = opportunities
    .filter(o => o.status === 'open')
    .slice(0, maxRows)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Opportunities</CardTitle>
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
        ) : openOpportunities.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No opportunities detected</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={onDetect}
              disabled={detecting}
            >
              {detecting ? 'Detecting...' : 'Detect Opportunities'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {openOpportunities.map((opp) => (
              <div 
                key={opp.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--surface-elevated)] cursor-pointer transition-colors"
                onClick={() => opp.page_id && onSelectPage?.(opp.page_id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {opp.title}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">
                    {opp.description}
                  </p>
                </div>
                <Badge className={getPriorityColor(opp.priority)}>
                  {opp.priority}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
