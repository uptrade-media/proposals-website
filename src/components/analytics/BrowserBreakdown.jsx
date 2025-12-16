import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DonutChart, BarList } from '@tremor/react'
import { Globe, Monitor, Smartphone, Tablet, Chrome, Apple, Laptop } from 'lucide-react'

// Browser icons
const browserIcons = {
  Chrome: '🌐',
  Safari: '🧭',
  Firefox: '🦊',
  Edge: '🔷',
  Opera: '⭕',
  Samsung: '📱',
  unknown: '❓'
}

// OS icons
const osIcons = {
  Windows: <Monitor className="w-4 h-4" />,
  macOS: <Apple className="w-4 h-4" />,
  iOS: <Smartphone className="w-4 h-4" />,
  Android: <Smartphone className="w-4 h-4" />,
  Linux: <Laptop className="w-4 h-4" />,
  unknown: <Globe className="w-4 h-4" />
}

// Device type icons
const deviceIcons = {
  desktop: <Monitor className="w-4 h-4" />,
  mobile: <Smartphone className="w-4 h-4" />,
  tablet: <Tablet className="w-4 h-4" />
}

// Colors for charts
const browserColors = ['cyan', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'red', 'orange']
const osColors = ['emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink']

export default function BrowserBreakdown({ sessions }) {
  if (!sessions) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Browser & OS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const { browsers = [], operatingSystems = [], devices = [] } = sessions

  // Format for DonutChart
  const browserChartData = browsers.map((b, i) => ({
    name: b.name,
    value: b.count,
    color: browserColors[i % browserColors.length]
  }))

  const osChartData = operatingSystems.map((o, i) => ({
    name: o.name,
    value: o.count,
    color: osColors[i % osColors.length]
  }))

  // Format for BarList
  const browserBarData = browsers.slice(0, 6).map(b => ({
    name: `${browserIcons[b.name] || '🌐'} ${b.name}`,
    value: b.count
  }))

  const osBarData = operatingSystems.slice(0, 6).map(o => ({
    name: o.name,
    value: o.count,
    icon: osIcons[o.name] || osIcons.unknown
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Browser Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Chrome className="w-5 h-5 text-blue-500" />
            Browsers
          </CardTitle>
          <CardDescription>
            Distribution by browser type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <DonutChart
              data={browserChartData}
              category="value"
              index="name"
              colors={browserColors}
              className="h-32 w-32"
              showLabel={false}
              showAnimation
            />
            <div className="flex-1">
              <BarList 
                data={browserBarData} 
                className="mt-2"
                showAnimation
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OS Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-5 h-5 text-emerald-500" />
            Operating Systems
          </CardTitle>
          <CardDescription>
            Distribution by operating system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <DonutChart
              data={osChartData}
              category="value"
              index="name"
              colors={osColors}
              className="h-32 w-32"
              showLabel={false}
              showAnimation
            />
            <div className="flex-1">
              <BarList 
                data={osBarData.map(o => ({ name: o.name, value: o.value }))} 
                className="mt-2"
                showAnimation
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Type Summary */}
      {devices.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {devices.map(device => (
                <div 
                  key={device.name}
                  className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg flex-1 min-w-[150px]"
                >
                  <div className="p-2 bg-background rounded-md">
                    {deviceIcons[device.name] || <Monitor className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{device.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.count.toLocaleString()} sessions ({device.percentage}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
