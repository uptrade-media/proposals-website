// src/components/LighthouseReport.jsx
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Zap,
  Loader2,
  RefreshCw,
  Play
} from 'lucide-react'
import useReportsStore from '@/lib/reports-store'
import useAuthStore from '@/lib/auth-store'

// Helper: Check if audit is completed (handles both 'complete' and 'completed' statuses)
const isAuditCompleted = (status) => status === 'completed' || status === 'complete'

const LighthouseReport = ({ projectId }) => {
  const { user } = useAuthStore()
  const {
    lighthouseReport,
    isLoading,
    error,
    clearError,
    fetchLighthouseReport,
    startLighthouseAudit,
    getScoreColor,
    getMetricStatus,
    formatLighthouseMetric
  } = useReportsStore()

  const [targetUrl, setTargetUrl] = useState('')
  const [deviceType, setDeviceType] = useState('mobile')
  const [isRunning, setIsRunning] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState(null)

  // Fetch audits on mount
  useEffect(() => {
    if (projectId) {
      fetchLighthouseReport(projectId)
    }
  }, [projectId])

  const handleStartAudit = async () => {
    if (!targetUrl.trim()) {
      alert('Please enter a target URL')
      return
    }

    setIsRunning(true)
    clearError()

    const result = await startLighthouseAudit(projectId, targetUrl, deviceType)

    if (result.success) {
      setTargetUrl('')
      // Refetch audits after starting
      setTimeout(() => {
        fetchLighthouseReport(projectId)
        setIsRunning(false)
      }, 2000)
    } else {
      setIsRunning(false)
    }
  }

  if (!projectId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-[var(--text-secondary)]">Select a project to view Lighthouse audits</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading && !lighthouseReport) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </CardContent>
      </Card>
    )
  }

  const audits = lighthouseReport?.audits || []
  const summary = lighthouseReport?.summary || {}
  const latestAudit = summary.latestAudit
  const trends = summary.trends

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Start New Audit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Run Lighthouse Audit
          </CardTitle>
          <CardDescription>Analyze your website's performance, accessibility, and best practices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="target-url">Target URL</Label>
              <Input
                id="target-url"
                placeholder="https://example.com"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                disabled={isRunning}
              />
            </div>
            <div>
              <Label htmlFor="device-type">Device Type</Label>
              <select
                id="device-type"
                className="w-full px-3 py-2 border border-[var(--glass-border)] rounded-md text-sm bg-[var(--glass-bg)]"
                value={deviceType}
                onChange={e => setDeviceType(e.target.value)}
                disabled={isRunning}
              >
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleStartAudit}
                disabled={isRunning}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Audit
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Audits may take 1-3 minutes. You'll receive an email when complete.
          </p>
        </CardContent>
      </Card>

      {/* Latest Audit Summary */}
      {latestAudit && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg">Latest Audit Results</CardTitle>
            <CardDescription>{new Date(latestAudit.date).toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(latestAudit.scores).map(([key, score]) => (
                <div key={key} className="text-center">
                  <div
                    className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-xl mb-2"
                    style={{ backgroundColor: getScoreColor(score || 0) }}
                  >
                    {score}
                  </div>
                  <p className="text-sm font-medium capitalize">{key.replace('_', ' ')}</p>
                  {trends && trends[key] && (
                    <p className="text-xs mt-1 flex items-center justify-center gap-1">
                      {trends[key].change > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-600" />
                      ) : trends[key].change < 0 ? (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      ) : null}
                      <span>{Math.abs(trends[key].change) > 0 ? Math.abs(trends[key].change).toFixed(1) : '—'}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Core Web Vitals */}
      {latestAudit && latestAudit.scores && (
        <Card>
          <CardHeader>
            <CardTitle>Core Web Vitals</CardTitle>
            <CardDescription>Key metrics for user experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'lcp', label: 'Largest Contentful Paint', unit: 'ms' },
                { key: 'fid', label: 'First Input Delay', unit: 'ms' },
                { key: 'cls', label: 'Cumulative Layout Shift', unit: 'unitless' }
              ].map(metric => (
                <div
                  key={metric.key}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{metric.label}</p>
                    <Badge
                      variant="outline"
                      className={`
                        ${
                          getMetricStatus(metric.key, latestAudit.metrics?.[metric.key]) === 'good'
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : getMetricStatus(metric.key, latestAudit.metrics?.[metric.key]) === 'needs_improvement'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                              : 'bg-red-50 text-red-700 border-red-300'
                        }
                      `}
                    >
                      {getMetricStatus(metric.key, latestAudit.metrics?.[metric.key])}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatLighthouseMetric(latestAudit.metrics?.[metric.key], metric.unit)}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Unit: {metric.unit}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit History */}
      {audits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audit History</CardTitle>
            <CardDescription>Last {audits.length} audits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audits.map(audit => (
                <div
                  key={audit.id}
                  className="p-3 border rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition"
                  onClick={() => setSelectedAudit(selectedAudit?.id === audit.id ? null : audit)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{audit.targetUrl}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {new Date(audit.completedAt || audit.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isAuditCompleted(audit.status) ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : audit.status === 'failed' ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                    </div>
                  </div>

                  {/* Expanded audit details */}
                  {selectedAudit?.id === audit.id && isAuditCompleted(audit.status) && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {Object.entries(audit.scores).map(([key, score]) => (
                          <div key={key} className="text-center">
                            <div
                              className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white font-bold text-sm mb-1"
                              style={{ backgroundColor: getScoreColor(score || 0) }}
                            >
                              {score}
                            </div>
                            <p className="text-xs capitalize">{key.replace('_', ' ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Audits Yet */}
      {audits.length === 0 && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">No audits yet. Run your first Lighthouse audit above.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default LighthouseReport
