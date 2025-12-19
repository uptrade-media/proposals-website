// src/components/seo/dashboard/ClickTrendChart.jsx
// Sparkline chart showing click trend over the last 28 days
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClickTrendChart({ trend = [] }) {
  if (!trend || trend.length === 0) return null

  const maxClicks = Math.max(...trend.map(d => d.clicks), 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Click Trend (Last 28 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-16 flex items-end gap-[2px]">
          {trend.map((day, i) => {
            const height = maxClicks > 0 ? (day.clicks / maxClicks) * 100 : 0
            return (
              <div 
                key={day.date || i}
                className="flex-1 bg-[var(--accent-primary)] rounded-t opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${day.date}: ${day.clicks} clicks`}
              />
            )
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--text-tertiary)]">
          <span>{trend[0]?.date}</span>
          <span>{trend[trend.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  )
}
