import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, BarList } from '@tremor/react'
import { ScrollText, TrendingUp, ArrowDown, CheckCircle } from 'lucide-react'

// Scroll depth milestone colors
const milestoneColors = {
  25: 'bg-blue-500',
  50: 'bg-cyan-500',
  75: 'bg-emerald-500',
  100: 'bg-green-600'
}

export default function ScrollDepthCard({ scrollDepth }) {
  if (!scrollDepth) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            Scroll Depth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const { pages = [], summary, days } = scrollDepth

  // Calculate overall scroll metrics from summary or pages
  const avgMaxDepth = summary?.avgMaxDepth || 
    (pages.length > 0 
      ? Math.round(pages.reduce((sum, p) => sum + (p.avgMaxDepth || 0), 0) / pages.length) 
      : 0)

  const avgCompletionRate = summary?.avgCompletionRate ||
    (pages.length > 0
      ? Math.round(pages.reduce((sum, p) => sum + (p.completionRate || 0), 0) / pages.length)
      : 0)

  // Format pages for chart - top 10 by engagement
  const topPages = [...pages]
    .sort((a, b) => (b.avgMaxDepth || 0) - (a.avgMaxDepth || 0))
    .slice(0, 10)

  const pageChartData = topPages.map(p => ({
    name: p.pagePath.length > 30 ? p.pagePath.slice(0, 30) + '...' : p.pagePath,
    'Avg Scroll': p.avgMaxDepth || 0,
    'Max Scroll': p.maxDepthEver || 0
  }))

  // Milestone funnel data
  const milestones = [
    { depth: 25, label: '25%', description: 'Top fold' },
    { depth: 50, label: '50%', description: 'Half page' },
    { depth: 75, label: '75%', description: 'Most content' },
    { depth: 100, label: '100%', description: 'Full page' }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-cyan-500" />
            Scroll Engagement
          </CardTitle>
          <CardDescription>
            How far users scroll
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Average Scroll Depth */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-cyan-500 bg-cyan-500/10">
              <div>
                <span className="text-2xl font-bold text-cyan-600">{avgMaxDepth}%</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Average Scroll Depth</p>
          </div>

          {/* Completion Rate */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">Page Completion</span>
              </div>
              <span className="text-lg font-semibold text-emerald-600">
                {avgCompletionRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Users who scroll to the bottom
            </p>
          </div>

          {/* Scroll Milestones */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Scroll Milestones
            </p>
            <div className="flex gap-1">
              {milestones.map((m, idx) => (
                <div 
                  key={m.depth}
                  className={`flex-1 h-2 rounded-full ${
                    avgMaxDepth >= m.depth ? milestoneColors[m.depth] : 'bg-muted'
                  }`}
                  title={`${m.label} - ${m.description}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page-by-Page Breakdown */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-blue-500" />
            Scroll Depth by Page
          </CardTitle>
          <CardDescription>
            Top pages by scroll engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pages.length > 0 ? (
            <BarChart
              data={pageChartData}
              index="name"
              categories={['Avg Scroll', 'Max Scroll']}
              colors={['cyan', 'blue']}
              valueFormatter={(v) => `${v}%`}
              showLegend={true}
              showAnimation
              className="h-64"
              yAxisWidth={48}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ScrollText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No scroll data collected yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Scroll tracking will appear once users interact with pages
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Page List */}
      {pages.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">All Tracked Pages</CardTitle>
            <CardDescription>
              Showing {pages.length} pages with scroll data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Page</th>
                    <th className="text-right py-2 px-3 font-medium">Samples</th>
                    <th className="text-right py-2 px-3 font-medium">Avg Depth</th>
                    <th className="text-right py-2 px-3 font-medium">Max Ever</th>
                    <th className="text-right py-2 px-3 font-medium">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.slice(0, 15).map((page, idx) => (
                    <tr key={page.pagePath} className="border-b border-muted hover:bg-muted/50">
                      <td className="py-2 px-3 font-mono text-xs truncate max-w-[300px]">
                        {page.pagePath}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {page.sampleCount?.toLocaleString() || '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-medium ${
                          (page.avgMaxDepth || 0) >= 75 ? 'text-emerald-600' :
                          (page.avgMaxDepth || 0) >= 50 ? 'text-cyan-600' :
                          'text-amber-600'
                        }`}>
                          {page.avgMaxDepth || 0}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {page.maxDepthEver || 0}%
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          (page.completionRate || 0) >= 50 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                        }`}>
                          {page.completionRate || 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
