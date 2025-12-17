// src/components/seo/SEOTechnicalAudit.jsx
// Technical SEO Audit component - displays site health metrics
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Shield,
  Zap,
  Smartphone,
  Globe,
  FileCode,
  Link2
} from 'lucide-react'

export default function SEOTechnicalAudit({ siteId }) {
  const { 
    technicalAudit, 
    technicalAuditLoading, 
    fetchTechnicalAudit,
    runTechnicalAudit 
  } = useSeoStore()
  
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (siteId) {
      fetchTechnicalAudit(siteId)
    }
  }, [siteId])

  const handleRunAudit = async () => {
    setIsRunning(true)
    try {
      await runTechnicalAudit(siteId)
      // Poll for results since it's a background function
      setTimeout(() => {
        fetchTechnicalAudit(siteId)
        setIsRunning(false)
      }, 5000)
    } catch (error) {
      console.error('Audit error:', error)
      setIsRunning(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-green-100'
    if (score >= 70) return 'bg-yellow-100'
    if (score >= 50) return 'bg-orange-100'
    return 'bg-red-100'
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      default: return 'secondary'
    }
  }

  const audit = technicalAudit?.results || technicalAudit

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Technical SEO Audit</h2>
          <p className="text-muted-foreground">
            Comprehensive site health analysis
          </p>
        </div>
        <Button 
          onClick={handleRunAudit} 
          disabled={isRunning || technicalAuditLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Audit...' : 'Run Audit'}
        </Button>
      </div>

      {/* Score Overview */}
      {audit?.score !== undefined && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-8">
              <div className={`flex items-center justify-center w-32 h-32 rounded-full ${getScoreBg(audit.score)}`}>
                <span className={`text-4xl font-bold ${getScoreColor(audit.score)}`}>
                  {audit.score}
                </span>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">
                    {audit.issues?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Issues</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {audit.warnings?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {audit.passed?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      {audit?.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Robots.txt */}
          <MetricCard
            icon={FileCode}
            title="Robots.txt"
            status={audit.metrics.robotsTxt?.passed ? 'passed' : 'issue'}
            details={audit.metrics.robotsTxt?.exists ? 'Found and valid' : 'Missing or invalid'}
          />

          {/* Sitemap */}
          <MetricCard
            icon={Globe}
            title="XML Sitemap"
            status={audit.metrics.sitemap?.passed ? 'passed' : 'issue'}
            details={audit.metrics.sitemap?.urlCount 
              ? `${audit.metrics.sitemap.urlCount} URLs indexed`
              : 'Not found'
            }
          />

          {/* Security */}
          <MetricCard
            icon={Shield}
            title="Security"
            status={audit.metrics.security?.https ? 'passed' : 'issue'}
            details={audit.metrics.security?.https ? 'HTTPS enabled' : 'HTTPS missing'}
          />

          {/* Core Web Vitals */}
          <MetricCard
            icon={Zap}
            title="Core Web Vitals"
            status={getCWVStatus(audit.metrics.coreWebVitals)}
            details={audit.metrics.coreWebVitals?.metrics?.performanceScore 
              ? `Score: ${audit.metrics.coreWebVitals.metrics.performanceScore}/100`
              : 'Data pending'
            }
          />

          {/* Mobile */}
          <MetricCard
            icon={Smartphone}
            title="Mobile Optimization"
            status={(audit.metrics.mobile?.issues?.length || 0) === 0 ? 'passed' : 'warning'}
            details={(audit.metrics.mobile?.passed?.length || 0) > 0 
              ? 'Mobile-friendly'
              : 'Needs review'
            }
          />

          {/* Pages */}
          <MetricCard
            icon={Link2}
            title="Page Health"
            status={audit.metrics.pages?.pagesWithIssues > 10 ? 'issue' : 'passed'}
            details={`${audit.metrics.pages?.totalPages || 0} pages analyzed`}
          />
        </div>
      )}

      {/* Issues List */}
      {audit?.issues?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Issues to Fix
            </CardTitle>
            <CardDescription>
              Critical problems that need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audit.issues.map((issue, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 bg-red-50 rounded-lg"
                >
                  <Badge variant={getSeverityColor(issue.severity)}>
                    {issue.severity || 'high'}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{issue.message || issue}</p>
                    {issue.type && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Type: {issue.type}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings List */}
      {audit?.warnings?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Warnings
            </CardTitle>
            <CardDescription>
              Recommendations for improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audit.warnings.map((warning, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg"
                >
                  <Badge variant="warning">
                    {warning.severity || 'medium'}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{warning.message || warning}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passed Checks */}
      {audit?.passed?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Passed Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {audit.passed.map((check, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-2 p-2 bg-green-50 rounded"
                >
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{typeof check === 'string' ? check : check.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      {audit?.recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
            <CardDescription>
              Prioritized fixes based on impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {audit.recommendations.map((rec, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{rec.title}</h4>
                    <Badge variant={getSeverityColor(rec.priority)}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {rec.description}
                  </p>
                  {rec.solution && (
                    <div className="bg-muted p-3 rounded text-sm">
                      <strong>Solution:</strong> {rec.solution}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!audit && !technicalAuditLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Audit Data</h3>
            <p className="text-muted-foreground mb-4">
              Run a technical audit to analyze your site's SEO health
            </p>
            <Button onClick={handleRunAudit}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run First Audit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper component for metric cards
function MetricCard({ icon: Icon, title, status, details }) {
  const statusConfig = {
    passed: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, iconColor: 'text-green-600' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: AlertTriangle, iconColor: 'text-yellow-600' },
    issue: { bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, iconColor: 'text-red-600' }
  }

  const config = statusConfig[status] || statusConfig.warning
  const StatusIcon = config.icon

  return (
    <Card className={`${config.bg} ${config.border}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div>
              <h4 className="font-semibold">{title}</h4>
              <p className="text-sm text-muted-foreground">{details}</p>
            </div>
          </div>
          <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
      </CardContent>
    </Card>
  )
}

// Helper to determine CWV status
function getCWVStatus(cwv) {
  if (!cwv?.hasData) return 'warning'
  const issues = cwv.issues?.length || 0
  if (issues > 1) return 'issue'
  if (issues === 1) return 'warning'
  return 'passed'
}
