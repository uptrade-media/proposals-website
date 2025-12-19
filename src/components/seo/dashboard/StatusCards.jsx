// src/components/seo/dashboard/StatusCards.jsx
// Status cards showing pages tracked, opportunities, and GSC connection status
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Target, 
  Link2, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react'

function PagesCard({ pages = [], site = {}, onViewAll }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Pages Tracked
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-[var(--text-primary)]">
          {pages.length || 0}
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span className="text-green-400">{site?.pages_indexed || 0} indexed</span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span className="text-red-400">{site?.pages_not_indexed || 0} not indexed</span>
        </div>
        <Button 
          variant="link" 
          size="sm" 
          className="px-0 mt-2"
          onClick={onViewAll}
        >
          View All Pages →
        </Button>
      </CardContent>
    </Card>
  )
}

function OpportunitiesCard({ opportunities = [], onViewAll }) {
  const openOpportunities = opportunities.filter(o => o.status === 'open')
  const critical = opportunities.filter(o => o.priority === 'critical').length
  const high = opportunities.filter(o => o.priority === 'high').length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Open Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-[var(--text-primary)]">
          {openOpportunities.length}
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span className="text-red-400">{critical} critical</span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span className="text-orange-400">{high} high</span>
        </div>
        <Button 
          variant="link" 
          size="sm" 
          className="px-0 mt-2"
          onClick={onViewAll}
        >
          View All Opportunities →
        </Button>
      </CardContent>
    </Card>
  )
}

function GSCConnectionCard({ site = {} }) {
  const isConnected = !!site?.gsc_connected_at

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Google Search Console
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Last sync: {site.gsc_last_sync_at 
                ? new Date(site.gsc_last_sync_at).toLocaleDateString()
                : 'Never'}
            </p>
          </>
        ) : (
          <>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Not Connected
            </Badge>
            <Button variant="link" size="sm" className="px-0 mt-2">
              Connect GSC →
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function StatusCards({ pages, opportunities, site, onViewPages, onViewOpportunities }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <PagesCard pages={pages} site={site} onViewAll={onViewPages} />
      <OpportunitiesCard opportunities={opportunities} onViewAll={onViewOpportunities} />
      <GSCConnectionCard site={site} />
    </div>
  )
}

export { PagesCard, OpportunitiesCard, GSCConnectionCard }
