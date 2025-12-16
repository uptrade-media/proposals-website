/**
 * CampaignAnalytics - Real-time analytics with charts and insights
 * Liquid glass design with premium data visualization
 */
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  Mail,
  AlertTriangle,
  Users,
  Clock,
  Globe,
  ExternalLink,
  RefreshCw,
  Download,
  Sparkles,
  Target,
  Zap,
  ChevronRight,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import './styles/liquid-glass.css'

// Simple sparkline component
function Sparkline({ data, color = '#6366f1', height = 40 }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Donut chart component
function DonutChart({ value, max, color, size = 120, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = (value / max) * 100
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{percentage.toFixed(1)}%</span>
      </div>
    </div>
  )
}

// Heatmap for link clicks
function LinkClickHeatmap({ links }) {
  const maxClicks = Math.max(...links.map(l => l.clicks))
  
  return (
    <div className="space-y-2">
      {links.map((link, i) => {
        const intensity = link.clicks / maxClicks
        const hue = 240 - (intensity * 120) // Blue to red
        
        return (
          <div key={i} className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{link.text}</p>
              <p className="text-xs text-muted-foreground truncate">{link.url}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{link.clicks}</p>
              <p className="text-xs text-muted-foreground">clicks</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function CampaignAnalytics({ campaign, onBack }) {
  const [timeRange, setTimeRange] = useState('7d')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Mock data - would come from API
  const analytics = {
    sent: campaign?.emails_sent || 1250,
    delivered: campaign?.emails_sent ? campaign.emails_sent - 12 : 1238,
    opened: campaign?.unique_opens || 523,
    clicked: campaign?.unique_clicks || 187,
    bounced: 12,
    unsubscribed: 3,
    spam: 1,
    openRate: campaign?.emails_sent ? (campaign.unique_opens / campaign.emails_sent * 100) : 41.8,
    clickRate: campaign?.emails_sent ? (campaign.unique_clicks / campaign.emails_sent * 100) : 15.0,
    bounceRate: 0.96,
    industryOpenRate: 21.5,
    industryClickRate: 2.6,
    // Time series data
    opensOverTime: [12, 45, 89, 134, 178, 210, 267, 312, 378, 423, 467, 502, 523],
    clicksOverTime: [3, 12, 28, 45, 67, 89, 112, 134, 156, 167, 178, 184, 187],
    // Best times
    bestHours: [
      { hour: 9, opens: 89 },
      { hour: 10, opens: 134 },
      { hour: 11, opens: 67 },
      { hour: 14, opens: 78 },
      { hour: 15, opens: 56 },
    ],
    // Top links
    topLinks: [
      { text: 'Shop Now', url: 'https://example.com/shop', clicks: 67 },
      { text: 'Learn More', url: 'https://example.com/about', clicks: 45 },
      { text: 'View Details', url: 'https://example.com/product', clicks: 34 },
      { text: 'Contact Us', url: 'https://example.com/contact', clicks: 23 },
      { text: 'Unsubscribe', url: 'https://example.com/unsub', clicks: 3 },
    ],
    // Devices
    devices: [
      { name: 'Mobile', percentage: 62 },
      { name: 'Desktop', percentage: 31 },
      { name: 'Tablet', percentage: 7 },
    ],
    // Locations
    topLocations: [
      { country: 'United States', opens: 312 },
      { country: 'Canada', opens: 67 },
      { country: 'United Kingdom', opens: 45 },
      { country: 'Australia', opens: 34 },
      { country: 'Germany', opens: 23 },
    ],
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise(r => setTimeout(r, 1000))
    setIsRefreshing(false)
  }

  const MetricCard = ({ title, value, subtitle, change, changeType, icon: Icon, color, sparkData }) => (
    <div className={`glass-metric glass-${color} p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br from-${color}-400/20 to-${color}-600/20`}>
          <Icon className={`h-5 w-5 text-${color}-600`} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm ${changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {changeType === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {change}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {sparkData && (
        <div className="mt-4 h-10">
          <Sparkline data={sparkData} color={`var(--${color}-500, #6366f1)`} />
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Decorative orbs */}
      <div className="glass-orb glass-orb-blue w-96 h-96 -top-48 -right-48 fixed" />
      <div className="glass-orb glass-orb-purple w-80 h-80 top-1/2 -left-40 fixed" />
      
      {/* Header */}
      <div className="glass-toolbar sticky top-0 z-50 mx-4 mt-4 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="font-semibold">{campaign?.name || 'Campaign Analytics'}</h1>
              <p className="text-sm text-muted-foreground">
                Sent {campaign?.sent_at ? new Date(campaign.sent_at).toLocaleDateString() : 'Dec 10, 2024'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="glass-button gap-2">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="glass-button gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-5 gap-4">
          <MetricCard
            title="Delivered"
            value={analytics.delivered.toLocaleString()}
            subtitle={`${analytics.sent.toLocaleString()} sent`}
            icon={Mail}
            color="blue"
          />
          <MetricCard
            title="Opens"
            value={analytics.opened.toLocaleString()}
            subtitle={`${analytics.openRate.toFixed(1)}% open rate`}
            change="+12.4%"
            changeType="up"
            icon={Eye}
            color="green"
            sparkData={analytics.opensOverTime}
          />
          <MetricCard
            title="Clicks"
            value={analytics.clicked.toLocaleString()}
            subtitle={`${analytics.clickRate.toFixed(1)}% click rate`}
            change="+8.2%"
            changeType="up"
            icon={MousePointerClick}
            color="purple"
            sparkData={analytics.clicksOverTime}
          />
          <MetricCard
            title="Bounced"
            value={analytics.bounced}
            subtitle={`${analytics.bounceRate}% bounce rate`}
            icon={AlertTriangle}
            color="orange"
          />
          <MetricCard
            title="Unsubscribed"
            value={analytics.unsubscribed}
            subtitle="0.24% unsubscribe rate"
            icon={Users}
            color="red"
          />
        </div>

        {/* Performance vs Industry */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Performance vs Industry</h3>
              <p className="text-sm text-muted-foreground">How you compare to industry averages</p>
            </div>
            <Badge className="glass-badge gap-1">
              <Sparkles className="h-3 w-3" />
              Outperforming
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Open Rate</span>
                <span className="text-sm text-muted-foreground">Industry: {analytics.industryOpenRate}%</span>
              </div>
              <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${analytics.openRate}%` }}
                />
                <div 
                  className="absolute inset-y-0 w-0.5 bg-gray-400"
                  style={{ left: `${analytics.industryOpenRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-bold text-green-600">{analytics.openRate.toFixed(1)}%</span>
                <span className="text-sm text-green-600 font-medium">
                  +{(analytics.openRate - analytics.industryOpenRate).toFixed(1)}% above avg
                </span>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Click Rate</span>
                <span className="text-sm text-muted-foreground">Industry: {analytics.industryClickRate}%</span>
              </div>
              <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all duration-1000"
                  style={{ width: `${analytics.clickRate * 4}%` }}
                />
                <div 
                  className="absolute inset-y-0 w-0.5 bg-gray-400"
                  style={{ left: `${analytics.industryClickRate * 4}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-bold text-purple-600">{analytics.clickRate.toFixed(1)}%</span>
                <span className="text-sm text-purple-600 font-medium">
                  +{(analytics.clickRate - analytics.industryClickRate).toFixed(1)}% above avg
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Link Click Heatmap */}
          <div className="glass-card p-6 col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Link Click Heatmap</h3>
                <p className="text-sm text-muted-foreground">Which links got the most engagement</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <LinkClickHeatmap links={analytics.topLinks} />
          </div>

          {/* Best Send Times */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Best Send Times</h3>
                <p className="text-sm text-muted-foreground">When your audience opens emails</p>
              </div>
            </div>
            <div className="space-y-3">
              {analytics.bestHours.map((time, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16">
                    {time.hour}:00 {time.hour < 12 ? 'AM' : 'PM'}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                      style={{ width: `${(time.opens / 134) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {time.opens}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 glass-accent rounded-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium">AI Recommendation</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Send your next campaign at <strong>10:00 AM</strong> on weekdays for best results.
              </p>
            </div>
          </div>
        </div>

        {/* Device & Location Stats */}
        <div className="grid grid-cols-2 gap-6">
          {/* Device Breakdown */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6">Device Breakdown</h3>
            <div className="flex items-center gap-8">
              <DonutChart 
                value={analytics.devices[0].percentage} 
                max={100} 
                color="#6366f1"
              />
              <div className="flex-1 space-y-3">
                {analytics.devices.map((device, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: i === 0 ? '#6366f1' : i === 1 ? '#a855f7' : '#06b6d4'
                      }}
                    />
                    <span className="text-sm">{device.name}</span>
                    <span className="text-sm font-semibold ml-auto">{device.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Locations */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Top Locations</h3>
            </div>
            <div className="space-y-3">
              {analytics.topLocations.map((loc, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{['🇺🇸', '🇨🇦', '🇬🇧', '🇦🇺', '🇩🇪'][i]}</span>
                  <span className="text-sm flex-1">{loc.country}</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"
                      style={{ width: `${(loc.opens / analytics.topLocations[0].opens) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{loc.opens}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* A/B Test Results (if applicable) */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">A/B Test Results</h3>
                <p className="text-sm text-muted-foreground">Subject line performance comparison</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
              <Zap className="h-3 w-3" />
              Winner: Variant A
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50/50">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-green-100 text-green-700">Variant A - Winner</Badge>
                <span className="text-sm text-muted-foreground">625 recipients</span>
              </div>
              <p className="font-medium mb-4">"🎄 Our Holiday Special is Here!"</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-xl font-bold text-green-600">45.2%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Click Rate</p>
                  <p className="text-xl font-bold text-green-600">18.3%</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">Variant B</Badge>
                <span className="text-sm text-muted-foreground">625 recipients</span>
              </div>
              <p className="font-medium mb-4">"Exclusive holiday deals inside"</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-xl font-bold">38.4%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Click Rate</p>
                  <p className="text-xl font-bold">11.7%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
