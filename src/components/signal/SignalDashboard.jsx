import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Zap,
  TrendingUp,
  Activity,
  Eye,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { signalApi } from '@/services/api/signal-api'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'

export default function SignalDashboard({ projectId }) {
  const [actions, setActions] = useState({ pending: [], completed: [], failed: [] })
  const [monitors, setMonitors] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [projectId])

  const loadData = async () => {
    try {
      const [actionsData, monitorsData, statsData] = await Promise.all([
        signalApi.getActions(projectId),
        signalApi.getMonitors(projectId),
        signalApi.getStats(projectId),
      ])

      // Group actions by status
      setActions({
        pending: actionsData.filter(a => a.status === 'pending' && a.approval_required),
        completed: actionsData.filter(a => a.status === 'completed').slice(0, 10),
        failed: actionsData.filter(a => a.status === 'failed').slice(0, 5),
      })

      setMonitors(monitorsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load Signal data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (actionId) => {
    try {
      await signalApi.approveAction(actionId)
      toast({
        title: 'Action approved',
        description: 'Signal is executing your request',
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Failed to approve',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleReject = async (actionId, reason) => {
    try {
      await signalApi.rejectAction(actionId, reason)
      toast({
        title: 'Action rejected',
        description: 'Signal will not execute this action',
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Failed to reject',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleRetry = async (actionId) => {
    try {
      await signalApi.retryAction(actionId)
      toast({
        title: 'Action queued for retry',
        description: 'Signal will attempt this action again',
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Failed to retry',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handlePauseMonitor = async (monitorId) => {
    try {
      await signalApi.pauseMonitor(monitorId)
      toast({
        title: 'Monitor paused',
        description: 'This monitor will not run until resumed',
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Failed to pause',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleResumeMonitor = async (monitorId) => {
    try {
      await signalApi.resumeMonitor(monitorId)
      toast({
        title: 'Monitor resumed',
        description: 'This monitor is now active',
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Failed to resume',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <SignalIcon className="h-8 w-8 mx-auto mb-2 animate-pulse" style={{ color: 'var(--brand-primary)' }} />
          <p className="text-muted-foreground">Loading Signal dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions.pending.length}</div>
            <p className="text-xs text-muted-foreground">
              {actions.pending.filter(a => a.tier === 2).length} tier 2, 
              {' '}{actions.pending.filter(a => a.tier === 3).length} tier 3
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed_today || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.autonomous_count || 0} autonomous
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Monitors</CardTitle>
            <Activity className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitors.filter(m => m.status === 'active').length}/{monitors.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {monitors.filter(m => m.last_status === 'success').length} healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.success_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for pending approvals */}
      {actions.pending.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {actions.pending.length} action{actions.pending.length > 1 ? 's' : ''} waiting for approval
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approvals
            {actions.pending.length > 0 && (
              <Badge variant="destructive" className="ml-2">{actions.pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          <TabsTrigger value="monitors">Monitors</TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Actions Waiting for Approval</CardTitle>
              <CardDescription>
                Review and approve high-impact actions before Signal executes them
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actions.pending.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending approvals</p>
                  <p className="text-sm text-muted-foreground">Signal is working autonomously</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {actions.pending.map((action) => (
                      <Card key={action.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={action.tier === 2 ? 'default' : 'destructive'}>
                                  Tier {action.tier}
                                </Badge>
                                <Badge variant="outline">{action.action_category}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              
                              <h4 className="font-semibold mb-1">
                                {action.action_type} {action.action_target}
                              </h4>
                              
                              <p className="text-sm text-muted-foreground mb-3">
                                {action.reasoning}
                              </p>

                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">Confidence:</span>
                                <div className="flex-1 max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full transition-all"
                                    style={{ 
                                      width: `${action.confidence}%`,
                                      background: 'var(--brand-primary)',
                                    }}
                                  />
                                </div>
                                <span>{action.confidence}%</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              <Button 
                                onClick={() => handleApprove(action.id)}
                                className="gap-2"
                                style={{
                                  backgroundColor: 'var(--brand-primary)',
                                  color: 'white',
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => handleReject(action.id, 'User rejected')}
                                className="gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </Button>
                              <Button 
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Timeline Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Real-time view of Signal's actions and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {/* Completed Actions */}
                  {actions.completed.map((action) => (
                    <div key={action.id} className="flex items-start gap-3 pb-4 border-b">
                      <div 
                        className="p-2 rounded-full"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                      >
                        <CheckCircle className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {action.action_type} {action.action_target}
                          </span>
                          <Badge variant="outline" className="text-xs">{action.action_category}</Badge>
                          {action.tier === 1 && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Zap className="h-3 w-3" />
                              Autonomous
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{action.reasoning}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed {formatDistanceToNow(new Date(action.completed_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Failed Actions */}
                  {actions.failed.map((action) => (
                    <div key={action.id} className="flex items-start gap-3 pb-4 border-b">
                      <div className="p-2 rounded-full bg-red-100">
                        <XCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {action.action_type} {action.action_target}
                          </span>
                          <Badge variant="destructive" className="text-xs">Failed</Badge>
                        </div>
                        <p className="text-sm text-red-600">{action.error_message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Failed {formatDistanceToNow(new Date(action.updated_at), { addSuffix: true })}
                        </p>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="mt-2 gap-2"
                          onClick={() => handleRetry(action.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitors Tab */}
        <TabsContent value="monitors">
          <Card>
            <CardHeader>
              <CardTitle>Active Monitors</CardTitle>
              <CardDescription>
                Signal continuously monitors these areas and takes action when needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monitors.map((monitor) => (
                  <Card key={monitor.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{monitor.monitor_type}</h4>
                            <Badge variant={monitor.status === 'active' ? 'default' : 'secondary'}>
                              {monitor.status}
                            </Badge>
                            {monitor.last_status === 'error' && (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Frequency:</span>
                              <p className="font-medium">{monitor.frequency}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last checked:</span>
                              <p className="font-medium">
                                {monitor.last_checked_at 
                                  ? formatDistanceToNow(new Date(monitor.last_checked_at), { addSuffix: true })
                                  : 'Never'
                                }
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actions triggered:</span>
                              <p className="font-medium">{monitor.actions_triggered || 0}</p>
                            </div>
                          </div>

                          {monitor.last_error && (
                            <p className="text-sm text-red-600 mt-2">{monitor.last_error}</p>
                          )}
                        </div>

                        <div className="ml-4">
                          {monitor.status === 'active' ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => handlePauseMonitor(monitor.id)}
                            >
                              <Pause className="h-4 w-4" />
                              Pause
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => handleResumeMonitor(monitor.id)}
                            >
                              <Play className="h-4 w-4" />
                              Resume
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
