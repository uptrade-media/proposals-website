/**
 * UTMCampaigns - Campaign tracking and attribution
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Megaphone, Link2, Target, BarChart3 } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts'
import { useBrandColors } from '@/hooks/useBrandColors'

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  
  return (
    <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{label}</p>
      <p className="text-lg font-bold text-[var(--text-primary)]">
        {payload[0].value?.toLocaleString()} sessions
      </p>
    </div>
  )
}

function CampaignSection({ title, icon: Icon, data = [], color, emptyMessage }) {
  const maxValue = Math.max(...data.map(d => d.count || 0), 1)
  
  if (data.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h4 className="text-sm font-medium text-[var(--text-primary)]">{title}</h4>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">{emptyMessage}</p>
      </div>
    )
  }
  
  return (
    <div className="p-4 rounded-xl bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[var(--text-tertiary)]" />
        <h4 className="text-sm font-medium text-[var(--text-primary)]">{title}</h4>
      </div>
      
      <div className="space-y-3">
        {data.slice(0, 5).map((item, index) => {
          const percentage = (item.count / maxValue) * 100
          
          return (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[var(--text-secondary)] truncate max-w-[70%]">
                  {item.name || item.campaign || item.source || item.medium || 'Unknown'}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                  {item.count?.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--glass-border)] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: color 
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function UTMCampaigns({ sessions = {} }) {
  const { primary, secondary } = useBrandColors()
  
  const sources = sessions?.utmSources || []
  const campaigns = sessions?.utmCampaigns || []
  const mediums = sessions?.utmMediums || []
  
  const hasData = sources.length > 0 || campaigns.length > 0 || mediums.length > 0
  
  // Prepare chart data for top campaigns
  const chartData = campaigns.slice(0, 8).map(c => ({
    name: (c.name || c.campaign || 'Unknown').substring(0, 15),
    count: c.count || 0
  }))

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Campaign Tracking</CardTitle>
          <CardDescription>UTM parameter attribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No campaign data detected</p>
            <p className="text-xs mt-1">Add UTM parameters to your marketing links to track campaigns</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Campaign Tracking</CardTitle>
        <CardDescription>Attribution from UTM parameters</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Campaign Chart */}
        {chartData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--text-tertiary)]" />
              Top Campaigns
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="var(--glass-border)" 
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  type="number" 
                  stroke="var(--text-tertiary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="var(--text-tertiary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={index} 
                      fill={index % 2 === 0 ? primary : secondary} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* UTM Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CampaignSection
            title="Sources"
            icon={Link2}
            data={sources}
            color={primary}
            emptyMessage="No source data"
          />
          <CampaignSection
            title="Mediums"
            icon={Target}
            data={mediums}
            color={secondary}
            emptyMessage="No medium data"
          />
          <CampaignSection
            title="Campaigns"
            icon={Megaphone}
            data={campaigns}
            color="#22c55e"
            emptyMessage="No campaign data"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default UTMCampaigns
