import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MousePointer, MousePointer2, Layers, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Zone position mapping
const zoneLayout = [
  ['top-left', 'top-center', 'top-right'],
  ['middle-left', 'middle-center', 'middle-right'],
  ['bottom-left', 'bottom-center', 'bottom-right']
]

// Zone-friendly names
const zoneNames = {
  'top-left': 'Header Left',
  'top-center': 'Header Center',
  'top-right': 'Header Right',
  'middle-left': 'Content Left',
  'middle-center': 'Main Content',
  'middle-right': 'Content Right',
  'bottom-left': 'Footer Left',
  'bottom-center': 'Footer Center',
  'bottom-right': 'Footer Right'
}

// Get heat color based on intensity (0-100)
const getHeatColor = (intensity) => {
  if (intensity >= 80) return 'bg-red-500'
  if (intensity >= 60) return 'bg-orange-500'
  if (intensity >= 40) return 'bg-yellow-500'
  if (intensity >= 20) return 'bg-lime-500'
  if (intensity > 0) return 'bg-green-500'
  return 'bg-gray-200 dark:bg-gray-700'
}

const getHeatOpacity = (intensity) => {
  return Math.max(0.2, intensity / 100)
}

export default function HeatmapOverview({ heatmap }) {
  if (!heatmap) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="w-5 h-5" />
            Click Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const { zones = [], topElements = [], pages = [], summary, days } = heatmap

  // Build zone intensity map
  const zoneMap = {}
  zones.forEach(z => {
    zoneMap[z.zone] = z
  })

  // Calculate max clicks for intensity scaling
  const maxZoneClicks = Math.max(...zones.map(z => z.clicks || 0), 1)

  // Get top clicked elements
  const topClickedElements = topElements?.slice(0, 10) || []

  // Pages with most clicks
  const topClickedPages = pages?.slice(0, 8) || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Visual Heatmap Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-red-500" />
            Click Zones
          </CardTitle>
          <CardDescription>
            Where users click most often
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted/30 rounded-lg border border-muted p-2">
            <div className="grid grid-rows-3 gap-1 h-full">
              {zoneLayout.map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-3 gap-1">
                  {row.map(zone => {
                    const zoneData = zoneMap[zone] || { clicks: 0 }
                    const intensity = (zoneData.clicks / maxZoneClicks) * 100
                    return (
                      <div
                        key={zone}
                        className={`rounded flex flex-col items-center justify-center text-center transition-all hover:scale-105 cursor-default ${getHeatColor(intensity)}`}
                        style={{ opacity: getHeatOpacity(intensity) }}
                        title={`${zoneNames[zone]}: ${zoneData.clicks?.toLocaleString() || 0} clicks`}
                      >
                        <span className="text-xs font-medium text-white drop-shadow-sm">
                          {zoneData.clicks?.toLocaleString() || 0}
                        </span>
                        <span className="text-[10px] text-white/80 drop-shadow-sm">
                          clicks
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-muted-foreground">Low</span>
            <div className="flex gap-0.5">
              <div className="w-6 h-3 bg-green-500 rounded-l" />
              <div className="w-6 h-3 bg-lime-500" />
              <div className="w-6 h-3 bg-yellow-500" />
              <div className="w-6 h-3 bg-orange-500" />
              <div className="w-6 h-3 bg-red-500 rounded-r" />
            </div>
            <span className="text-xs text-muted-foreground">High</span>
          </div>
        </CardContent>
      </Card>

      {/* Top Clicked Elements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MousePointer2 className="w-5 h-5 text-blue-500" />
            Top Clicked Elements
          </CardTitle>
          <CardDescription>
            Most interacted-with elements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topClickedElements.length > 0 ? (
            <div className="space-y-2">
              {topClickedElements.map((el, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="shrink-0">
                      {el.elementType || 'element'}
                    </Badge>
                    <span className="text-sm truncate font-mono text-muted-foreground">
                      {el.selector || el.text || 'Unknown'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold ml-2">
                    {el.clicks?.toLocaleString() || 0}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MousePointer className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No element click data yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pages by Click Activity */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-500" />
            Click Activity by Page
          </CardTitle>
          <CardDescription>
            Pages with most user interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topClickedPages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {topClickedPages.map((page, idx) => (
                <div 
                  key={page.pagePath}
                  className="p-3 bg-muted/50 rounded-lg border border-muted"
                >
                  <p className="text-lg font-bold text-foreground">
                    {page.totalClicks?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">clicks</p>
                  <p className="text-sm font-mono truncate mt-1" title={page.pagePath}>
                    {page.pagePath}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Layers className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No page click data collected yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click tracking will appear once users interact with the site
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {summary.totalClicks?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {summary.uniquePages?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-muted-foreground">Pages Tracked</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {summary.avgClicksPerPage?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-muted-foreground">Avg Clicks/Page</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {days || 30}
                </p>
                <p className="text-sm text-muted-foreground">Days of Data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
