// src/components/seo/SEOAlerts.jsx
// SEO Alerts - intelligent monitoring and notifications
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingDown,
  Bug,
  Target,
  Clock,
  Eye
} from 'lucide-react'

export default function SEOAlerts({ siteId }) {
  const { 
    alerts, 
    alertsStats,
    alertsLoading, 
    fetchAlerts,
    checkAlerts,
    acknowledgeAlert,
    resolveAlert
  } = useSeoStore()
  
  const [isChecking, setIsChecking] = useState(false)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    if (siteId) {
      fetchAlerts(siteId)
    }
  }, [siteId])

  const handleCheckAlerts = async () => {
    setIsChecking(true)
    try {
      await checkAlerts(siteId, true) // true = send notifications
    } catch (error) {
      console.error('Check alerts error:', error)
    }
    setIsChecking(false)
  }

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId)
    } catch (error) {
      console.error('Acknowledge error:', error)
    }
  }

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId)
    } catch (error) {
      console.error('Resolve error:', error)
    }
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'ranking_drop': return <TrendingDown className="h-5 w-5" />
      case 'traffic_drop': return <TrendingDown className="h-5 w-5" />
      case 'content_decay': return <TrendingDown className="h-5 w-5" />
      case 'technical_issue': return <Bug className="h-5 w-5" />
      case 'competitor_gain': return <Target className="h-5 w-5" />
      case 'pending_actions': return <Clock className="h-5 w-5" />
      default: return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'critical':
        return { bg: 'bg-red-50 border-red-200', icon: 'text-red-600', badge: 'destructive' }
      case 'high':
        return { bg: 'bg-orange-50 border-orange-200', icon: 'text-orange-600', badge: 'destructive' }
      case 'medium':
        return { bg: 'bg-yellow-50 border-yellow-200', icon: 'text-yellow-600', badge: 'warning' }
      default:
        return { bg: 'bg-blue-50 border-blue-200', icon: 'text-blue-600', badge: 'secondary' }
    }
  }

  const filteredAlerts = alerts?.filter(alert => {
    if (filter === 'all') return true
    return alert.status === filter
  }) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SEO Alerts</h2>
          <p className="text-muted-foreground">
            Intelligent monitoring for ranking and traffic changes
          </p>
        </div>
        <Button 
          onClick={handleCheckAlerts} 
          disabled={isChecking || alertsLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Check Now'}
        </Button>
      </div>

      {/* Stats */}
      {alertsStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={alertsStats.critical > 0 ? 'bg-red-50 border-red-200' : ''}>
            <CardContent className="pt-6 text-center">
              <XCircle className={`h-6 w-6 mx-auto mb-2 ${alertsStats.critical > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
              <p className={`text-2xl font-bold ${alertsStats.critical > 0 ? 'text-red-600' : ''}`}>
                {alertsStats.critical || 0}
              </p>
              <p className="text-sm text-muted-foreground">Critical</p>
            </CardContent>
          </Card>

          <Card className={alertsStats.high > 0 ? 'bg-orange-50 border-orange-200' : ''}>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${alertsStats.high > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
              <p className={`text-2xl font-bold ${alertsStats.high > 0 ? 'text-orange-600' : ''}`}>
                {alertsStats.high || 0}
              </p>
              <p className="text-sm text-muted-foreground">High</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Eye className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{alertsStats.acknowledged || 0}</p>
              <p className="text-sm text-muted-foreground">Acknowledged</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{alertsStats.resolved || 0}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['active', 'acknowledged', 'resolved', 'all'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'active' && alertsStats?.active > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {alertsStats.active}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <div className="space-y-4">
          {filteredAlerts.map((alert, i) => {
            const config = getSeverityConfig(alert.severity)
            return (
              <Card key={alert.id || i} className={config.bg}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-white ${config.icon}`}>
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={config.badge}>{alert.severity}</Badge>
                            <Badge variant="outline">
                              {alert.alert_type?.replace('_', ' ')}
                            </Badge>
                            {alert.status !== 'active' && (
                              <Badge variant="outline" className="bg-white">
                                {alert.status}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold">{alert.title}</h4>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {alert.triggered_at 
                            ? new Date(alert.triggered_at).toLocaleDateString()
                            : ''
                          }
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {alert.message}
                      </p>

                      {/* Alert Data */}
                      {alert.data && (
                        <div className="bg-white/50 p-3 rounded text-sm mb-3">
                          {alert.data.keyword && (
                            <p><strong>Keyword:</strong> {alert.data.keyword}</p>
                          )}
                          {alert.data.page && (
                            <p><strong>Page:</strong> {alert.data.page}</p>
                          )}
                          {alert.data.previousPosition && alert.data.currentPosition && (
                            <p>
                              <strong>Position:</strong> {alert.data.previousPosition} → {alert.data.currentPosition}
                            </p>
                          )}
                          {alert.data.dropPercent && (
                            <p><strong>Drop:</strong> {alert.data.dropPercent}%</p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {alert.status === 'active' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Acknowledge
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Resolve
                          </Button>
                        </div>
                      )}
                      {alert.status === 'acknowledged' && (
                        <Button
                          size="sm"
                          onClick={() => handleResolve(alert.id)}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {filter === 'active' ? 'No Active Alerts' : 'No Alerts'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'active' 
                ? 'All systems running smoothly! Check for new alerts.'
                : 'No alerts match the current filter.'
              }
            </p>
            <Button onClick={handleCheckAlerts}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check for Alerts
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
