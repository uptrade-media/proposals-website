import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { ScrollText, ArrowDown, CheckCircle } from 'lucide-react'
import { useBrandColors } from '@/hooks/useBrandColors'

// Custom tooltip component for dark mode compatibility
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  
  return (
    <div 
      style={{ 
        backgroundColor: 'rgba(24, 24, 27, 0.98)',
        border: '1px solid rgba(63, 63, 70, 0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
      }}
    >
      <div style={{ 
        fontSize: '14px', 
        fontWeight: 500, 
        color: 'rgba(244, 244, 245, 1)',
        marginBottom: '8px',
        padding: 0,
        background: 'none',
        border: 'none'
      }}>
        {label}
      </div>
      {payload.map((entry, index) => (
        <div 
          key={index} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '4px 0',
            background: 'none',
            border: 'none',
            borderRadius: 0,
            margin: 0
          }}
        >
          <span 
            style={{ 
              display: 'inline-block',
              width: '12px', 
              height: '12px', 
              borderRadius: '2px',
              backgroundColor: entry.color,
              flexShrink: 0,
              border: 'none',
              padding: 0,
              margin: 0
            }}
          />
          <span style={{ 
            color: 'rgba(161, 161, 170, 1)', 
            fontSize: '14px',
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0
          }}>
            {entry.name}:
          </span>
          <span style={{ 
            color: 'rgba(244, 244, 245, 1)', 
            fontSize: '14px', 
            fontWeight: 500,
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0
          }}>
            {entry.value}%
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ScrollDepthCard({ scrollDepth, singlePage = false }) {
  const { primary, secondary } = useBrandColors()
  
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

  const { pages = [], summary } = scrollDepth

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
    name: p.pagePath.length > 20 ? p.pagePath.slice(0, 20) + '...' : p.pagePath,
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

  // For single page view, just show the engagement card
  if (singlePage) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-5 h-5" style={{ color: primary }} />
            Scroll Engagement
          </CardTitle>
          <CardDescription>
            How far users scroll on this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Average Scroll Depth */}
          <div className="text-center">
            <div 
              className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4"
              style={{ borderColor: primary, backgroundColor: primary + '15' }}
            >
              <span className="text-2xl font-bold" style={{ color: primary }}>{avgMaxDepth}%</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Average Scroll Depth</p>
          </div>

          {/* Completion Rate */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: secondary }} />
                <span className="text-sm">Page Completion</span>
              </div>
              <span className="text-lg font-semibold" style={{ color: secondary }}>
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
                  className="flex-1 h-2 rounded-full"
                  style={{ 
                    backgroundColor: avgMaxDepth >= m.depth ? primary : 'var(--muted)',
                    opacity: avgMaxDepth >= m.depth ? 1 - (idx * 0.15) : 0.3
                  }}
                  title={m.label + ' - ' + m.description}
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
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-5 h-5" style={{ color: primary }} />
            Scroll Engagement
          </CardTitle>
          <CardDescription>
            How far users scroll
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Average Scroll Depth */}
          <div className="text-center">
            <div 
              className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4"
              style={{ borderColor: primary, backgroundColor: primary + '15' }}
            >
              <span className="text-2xl font-bold" style={{ color: primary }}>{avgMaxDepth}%</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Average Scroll Depth</p>
          </div>

          {/* Completion Rate */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: secondary }} />
                <span className="text-sm">Page Completion</span>
              </div>
              <span className="text-lg font-semibold" style={{ color: secondary }}>
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
                  className="flex-1 h-2 rounded-full"
                  style={{ 
                    backgroundColor: avgMaxDepth >= m.depth ? primary : 'var(--muted)',
                    opacity: avgMaxDepth >= m.depth ? 1 - (idx * 0.15) : 0.3
                  }}
                  title={m.label + ' - ' + m.description}
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

      {/* Page-by-Page Breakdown - Using Recharts */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDown className="w-5 h-5" style={{ color: secondary }} />
            Scroll Depth by Page
          </CardTitle>
          <CardDescription>
            Top pages by scroll engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pages.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart 
                data={pageChartData} 
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(v) => v + '%'}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
                />
                <Bar 
                  dataKey="Avg Scroll" 
                  name="Avg Scroll" 
                  fill={primary}
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="Max Scroll" 
                  name="Max Scroll" 
                  fill={secondary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ScrollText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No scroll data collected yet</p>
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
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[500px]">
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
                  {pages.slice(0, 15).map((page) => (
                    <tr key={page.pagePath} className="border-b border-muted hover:bg-muted/50">
                      <td className="py-2 px-3 font-mono text-xs truncate max-w-[300px]">
                        {page.pagePath}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {page.sampleCount?.toLocaleString() || '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span 
                          className="font-medium"
                          style={{ 
                            color: (page.avgMaxDepth || 0) >= 75 ? secondary : 
                                   (page.avgMaxDepth || 0) >= 50 ? primary : 
                                   'var(--text-secondary)'
                          }}
                        >
                          {page.avgMaxDepth || 0}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {page.maxDepthEver || 0}%
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: (page.completionRate || 0) >= 50 
                              ? secondary + '20' 
                              : 'var(--muted)',
                            color: (page.completionRate || 0) >= 50 
                              ? secondary 
                              : 'var(--text-secondary)'
                          }}
                        >
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
