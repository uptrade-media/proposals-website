import { useEffect, useState } from 'react'
import { format, formatDistance } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, Clock, AlertCircle } from 'lucide-react'
import axios from 'axios'

const priorityConfig = {
  high: { color: 'bg-red-100', textColor: 'text-red-700', label: 'High' },
  normal: { color: 'bg-yellow-100', textColor: 'text-yellow-700', label: 'Normal' },
  low: { color: 'bg-blue-100', textColor: 'text-blue-700', label: 'Low' }
}

const statusConfig = {
  overdue: { color: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700', icon: AlertCircle },
  'in-progress': { color: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700', icon: Clock },
  pending: { color: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', icon: Calendar },
  completed: { color: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700', icon: null }
}

function getDaysUntilColor(daysSince) {
  if (daysSince < 0) return 'destructive' // Overdue
  if (daysSince === 0) return 'destructive' // Today
  if (daysSince <= 3) return 'destructive' // 3 days or less
  if (daysSince <= 7) return 'outline' // 7 days or less
  return 'secondary' // More than 7 days
}

function formatDaysUntil(daysSince) {
  if (daysSince < 0) {
    return `${Math.abs(daysSince)}d overdue`
  }
  if (daysSince === 0) return 'Today'
  if (daysSince === 1) return 'Tomorrow'
  return `${daysSince}d away`
}

export function UpcomingDeadlines({ limit = 10 }) {
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDeadlines()
  }, [limit])

  const fetchDeadlines = async () => {
    try {
      setLoading(true)
      const response = await axios.get(
        `/.netlify/functions/dashboard-deadlines?daysAhead=30`
      )
      setDeadlines(response.data.deadlines || [])
      setError(null)
    } catch (err) {
      console.error('Failed to fetch deadlines:', err)
      setError('Failed to load deadlines')
      setDeadlines([])
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">{error}</p>
            <button
              onClick={fetchDeadlines}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : deadlines.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.slice(0, limit).map((deadline, index) => {
              const config = statusConfig[deadline.status] || statusConfig.pending
              const priorityConfig_ = priorityConfig[deadline.priority] || priorityConfig.normal
              const daysUntil = deadline.days_until || Math.floor((new Date(deadline.dueDate) - Date.now()) / (1000 * 60 * 60 * 24))
              const StatusIcon = config.icon

              return (
                <div
                  key={`${deadline.item_id}-${deadline.item_type}`}
                  className={`p-3 border rounded-lg transition-colors hover:shadow-sm ${config.color} ${config.borderColor}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {StatusIcon && (
                          <StatusIcon className={`w-4 h-4 ${config.textColor} flex-shrink-0`} />
                        )}
                        <p className={`font-medium ${config.textColor} truncate`}>
                          {deadline.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="capitalize">{deadline.item_type}</span>
                        <span>•</span>
                        <span>
                          Due {format(new Date(deadline.dueDate), 'MMM d')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={getDaysUntilColor(daysUntil)} className="text-xs whitespace-nowrap">
                        {formatDaysUntil(daysUntil)}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs whitespace-nowrap ${priorityConfig_.textColor}`}
                      >
                        {priorityConfig_.label}
                      </Badge>
                    </div>
                  </div>

                  {deadline.status === 'overdue' && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      ⚠️ This deadline has passed
                    </div>
                  )}
                </div>
              )
            })}

            {deadlines.length > limit && (
              <div className="text-center mt-4 pt-3 border-t">
                <a 
                  href="/dashboard"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View all {deadlines.length} deadlines
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UpcomingDeadlines
