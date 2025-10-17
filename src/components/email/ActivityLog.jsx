import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

export default function ActivityLog() {
  const [eventFilter, setEventFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activities, setActivities] = useState([])

  const eventTypes = [
    { id: 'all', label: 'All Events' },
    { id: 'sent', label: 'Sent' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'open', label: 'Opens' },
    { id: 'click', label: 'Clicks' },
    { id: 'bounce', label: 'Bounces' },
    { id: 'complaint', label: 'Complaints' },
    { id: 'unsubscribe', label: 'Unsubscribes' },
  ]

  const getEventBadgeColor = (type) => {
    switch (type) {
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'open': return 'bg-purple-100 text-purple-800'
      case 'click': return 'bg-cyan-100 text-cyan-800'
      case 'bounce': return 'bg-red-100 text-red-800'
      case 'complaint': return 'bg-orange-100 text-orange-800'
      case 'unsubscribe': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event-filter">Event Type</Label>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="campaign-filter">Campaign</Label>
                  <Input
                    id="campaign-filter"
                    placeholder="Filter by campaign name..."
                    value={campaignFilter}
                    onChange={(e) => setCampaignFilter(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Email events from all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start justify-between p-4 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getEventBadgeColor(activity.type)}>
                            {activity.type}
                          </Badge>
                          <span className="font-medium">{activity.email}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.campaign}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{new Date(activity.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Campaign Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Metrics</CardTitle>
              <CardDescription>Performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Sent</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Delivered</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Open Rate</p>
                  <p className="text-2xl font-bold">0%</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Click Rate</p>
                  <p className="text-2xl font-bold">0%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Device Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Desktop</span>
                  <span className="text-gray-600">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Mobile</span>
                  <span className="text-gray-600">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tablet</span>
                  <span className="text-gray-600">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
