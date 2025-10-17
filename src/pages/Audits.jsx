// src/pages/Audits.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { 
  BarChart3, 
  ExternalLink, 
  Loader2, 
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react'
import useReportsStore from '../lib/reports-store'
import useProjectsStore from '../lib/projects-store'

export default function Audits() {
  const navigate = useNavigate()
  const { 
    audits, 
    fetchAudits, 
    requestAudit,
    getAuditStatusBadge,
    isLoading,
    error 
  } = useReportsStore()
  
  const { projects, fetchProjects } = useProjectsStore()
  
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestUrl, setRequestUrl] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    fetchAudits()
    fetchProjects()
  }, [])

  const handleRequestAudit = async (e) => {
    e.preventDefault()
    setRequestError('')
    
    if (!requestUrl) {
      setRequestError('Please enter a URL')
      return
    }
    
    if (!selectedProjectId) {
      setRequestError('Please select a project')
      return
    }

    setIsRequesting(true)
    const result = await requestAudit(requestUrl, selectedProjectId)
    setIsRequesting(false)

    if (result.success) {
      setShowRequestForm(false)
      setRequestUrl('')
      setSelectedProjectId('')
      fetchAudits() // Refresh list
    } else {
      setRequestError(result.error || 'Failed to request audit')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 50) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  if (isLoading && audits.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4bbf39]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Website Audits</h1>
          <p className="text-gray-600 mt-1">
            Performance, SEO, and accessibility analysis for your websites
          </p>
        </div>
        <Button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Request New Audit
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Request Form */}
      {showRequestForm && (
        <Card>
          <CardHeader>
            <CardTitle>Request New Audit</CardTitle>
            <CardDescription>
              Enter a website URL to analyze its performance, SEO, and accessibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestAudit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Website URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Choose a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {requestError && (
                <Alert variant="destructive">
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isRequesting}
                  className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
                >
                  {isRequesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    'Request Audit'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRequestForm(false)
                    setRequestError('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Audits List */}
      {audits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No audits yet
            </h3>
            <p className="text-gray-600 mb-4">
              Request your first website audit to get started
            </p>
            <Button
              onClick={() => setShowRequestForm(true)}
              className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Request Audit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {audits.map(audit => {
            const statusBadge = getAuditStatusBadge(audit.status)
            
            return (
              <Card 
                key={audit.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/audits/${audit.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* URL and Status */}
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusIcon(audit.status)}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            {audit.targetUrl}
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={statusBadge.color}>
                              {statusBadge.text}
                            </Badge>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(audit.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Scores (only show if completed) */}
                      {audit.status === 'completed' && (
                        <div className="flex gap-3 mt-4">
                          {audit.scorePerformance !== null && (
                            <div className={`px-3 py-2 rounded-lg ${getScoreColor(audit.scorePerformance)}`}>
                              <div className="text-xs font-medium">Performance</div>
                              <div className="text-2xl font-bold">{audit.scorePerformance}</div>
                            </div>
                          )}
                          {audit.scoreSeo !== null && (
                            <div className={`px-3 py-2 rounded-lg ${getScoreColor(audit.scoreSeo)}`}>
                              <div className="text-xs font-medium">SEO</div>
                              <div className="text-2xl font-bold">{audit.scoreSeo}</div>
                            </div>
                          )}
                          {audit.scoreAccessibility !== null && (
                            <div className={`px-3 py-2 rounded-lg ${getScoreColor(audit.scoreAccessibility)}`}>
                              <div className="text-xs font-medium">Accessibility</div>
                              <div className="text-2xl font-bold">{audit.scoreAccessibility}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Processing message */}
                      {(audit.status === 'pending' || audit.status === 'running') && (
                        <p className="text-sm text-gray-600 mt-2">
                          Analysis in progress. This usually takes 2-3 minutes.
                        </p>
                      )}

                      {/* Failed message */}
                      {audit.status === 'failed' && (
                        <p className="text-sm text-red-600 mt-2">
                          Audit failed. Please try requesting a new audit.
                        </p>
                      )}
                    </div>

                    {/* View Button */}
                    {audit.status === 'completed' && (
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/audits/${audit.id}`)
                        }}
                      >
                        View Report
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
