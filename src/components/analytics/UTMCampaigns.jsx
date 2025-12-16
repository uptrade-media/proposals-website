import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, BarList } from '@tremor/react'
import { Target, Megaphone, Link, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// UTM source colors
const sourceColors = {
  google: 'text-blue-500 bg-blue-500/10',
  facebook: 'text-blue-600 bg-blue-600/10',
  instagram: 'text-pink-500 bg-pink-500/10',
  twitter: 'text-sky-500 bg-sky-500/10',
  linkedin: 'text-blue-700 bg-blue-700/10',
  email: 'text-amber-500 bg-amber-500/10',
  newsletter: 'text-amber-500 bg-amber-500/10',
  direct: 'text-gray-500 bg-gray-500/10',
  organic: 'text-emerald-500 bg-emerald-500/10',
  referral: 'text-purple-500 bg-purple-500/10'
}

const getSourceStyle = (source) => {
  const lower = (source || '').toLowerCase()
  for (const [key, style] of Object.entries(sourceColors)) {
    if (lower.includes(key)) return style
  }
  return 'text-gray-500 bg-gray-500/10'
}

export default function UTMCampaigns({ sessions }) {
  if (!sessions) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Campaign Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const { utmSources = [], utmCampaigns = [], summary } = sessions

  // Format for BarChart
  const sourceChartData = utmSources.map(s => ({
    name: s.name,
    Sessions: s.count
  }))

  // Calculate organic vs paid traffic
  const paidSources = ['google', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'bing']
  const paidSessions = utmSources
    .filter(s => paidSources.some(p => s.name.toLowerCase().includes(p)))
    .reduce((sum, s) => sum + s.count, 0)
  const organicSessions = (summary?.totalSessions || 0) - paidSessions
  
  const trafficMix = [
    { name: 'Organic', value: organicSessions },
    { name: 'Paid', value: paidSessions }
  ].filter(t => t.value > 0)

  const hasNoUTMData = utmSources.length === 0 && utmCampaigns.length === 0

  if (hasNoUTMData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Campaign Tracking
          </CardTitle>
          <CardDescription>
            UTM parameter tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Link className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              No UTM parameters detected
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add UTM parameters to your campaign links to track traffic sources.
              Example: <code className="text-xs bg-muted px-1 py-0.5 rounded">?utm_source=google&utm_medium=cpc</code>
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* UTM Sources */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-purple-500" />
            Traffic Sources
          </CardTitle>
          <CardDescription>
            Sessions by UTM source
          </CardDescription>
        </CardHeader>
        <CardContent>
          {utmSources.length > 0 ? (
            <div className="space-y-3">
              {utmSources.slice(0, 8).map((source, idx) => (
                <div key={source.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getSourceStyle(source.name)}>
                      {source.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${source.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {source.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {source.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No UTM sources tracked
            </p>
          )}
        </CardContent>
      </Card>

      {/* UTM Campaigns */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            Active Campaigns
          </CardTitle>
          <CardDescription>
            Top performing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {utmCampaigns.length > 0 ? (
            <div className="space-y-2">
              {utmCampaigns.slice(0, 8).map((campaign, idx) => {
                const [source, name] = campaign.name.includes('/') 
                  ? campaign.name.split('/') 
                  : ['direct', campaign.name]
                return (
                  <div 
                    key={campaign.name} 
                    className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        via {source}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {campaign.count.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">sessions</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No campaigns tracked yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Traffic Mix Summary */}
      {trafficMix.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Traffic Mix</CardTitle>
            <CardDescription>Organic vs Paid traffic breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {trafficMix.map(type => (
                <div 
                  key={type.name}
                  className={`flex-1 p-4 rounded-lg border ${
                    type.name === 'Organic' 
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950' 
                      : 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950'
                  }`}
                >
                  <p className={`text-2xl font-bold ${
                    type.name === 'Organic' ? 'text-emerald-600' : 'text-purple-600'
                  }`}>
                    {type.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{type.name} Sessions</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.totalSessions 
                      ? Math.round((type.value / summary.totalSessions) * 100) 
                      : 0}% of total
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
