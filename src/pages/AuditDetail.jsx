// src/pages/AuditDetail.jsx
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Alert, AlertDescription } from '../components/ui/alert'
import { 
  Loader2, 
  ArrowLeft, 
  Download, 
  Printer,
  ExternalLink,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react'
import useReportsStore from '../lib/reports-store'

export default function AuditDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { 
    currentAudit, 
    fetchAudit,
    isLoading,
    error 
  } = useReportsStore()

  useEffect(() => {
    if (id) {
      fetchAudit(id)
    }
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (currentAudit?.reportUrl) {
      window.open(currentAudit.reportUrl, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#4bbf39] mx-auto mb-4" />
          <p className="text-gray-600">Loading audit report...</p>
        </div>
      </div>
    )
  }

  if (error || !currentAudit) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {error || 'Audit not found'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => navigate('/audits')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Audits
        </Button>
      </div>
    )
  }

  // Audit is pending or running
  if (currentAudit.status === 'pending' || currentAudit.status === 'running') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate('/audits')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Audits
        </Button>

        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Audit Processing
            </h2>
            <p className="text-gray-600 mb-4">
              Your audit for <span className="font-medium">{currentAudit.targetUrl}</span> is currently being analyzed.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This usually takes 2-3 minutes. The page will update automatically.
            </p>
            <Button
              onClick={() => fetchAudit(id)}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Audit failed
  if (currentAudit.status === 'failed') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate('/audits')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Audits
        </Button>

        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Audit Failed
            </h2>
            <p className="text-gray-600 mb-4">
              We encountered an issue analyzing <span className="font-medium">{currentAudit.targetUrl}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please contact support or request a new audit.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => navigate('/audits')}
                className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
              >
                Request New Audit
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/contact')}
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Audit completed - render the report
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Don't print this */}
      <div className="no-print bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/audits')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Audits
            </Button>

            <div className="flex gap-2">
              {currentAudit.reportUrl && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(currentAudit.targetUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Site
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 no-print">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Audit Report
          </h1>
          <p className="text-gray-600">
            {currentAudit.targetUrl}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Generated on {new Date(currentAudit.createdAt).toLocaleDateString()} at{' '}
            {new Date(currentAudit.createdAt).toLocaleTimeString()}
          </p>
        </div>

        {/* Render report based on what's available */}
        {currentAudit.reportUrl ? (
          // If we have a report URL, render it in an iframe
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <iframe
              src={currentAudit.reportUrl}
              title="Audit Report"
              className="w-full min-h-screen border-0"
              style={{ height: 'calc(100vh - 200px)' }}
            />
          </div>
        ) : currentAudit.fullAuditJson ? (
          // If we have JSON data, render a simple scores view
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Audit Scores</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {currentAudit.performanceScore !== null && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {currentAudit.performanceScore}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Performance</div>
                  </div>
                )}
                {currentAudit.seoScore !== null && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {currentAudit.seoScore}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">SEO</div>
                  </div>
                )}
                {currentAudit.accessibilityScore !== null && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {currentAudit.accessibilityScore}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Accessibility</div>
                  </div>
                )}
                {currentAudit.bestPracticesScore !== null && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600">
                      {currentAudit.bestPracticesScore}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Best Practices</div>
                  </div>
                )}
                {currentAudit.pwaScore !== null && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-pink-600">
                      {currentAudit.pwaScore}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">PWA</div>
                  </div>
                )}
              </div>
              
              <Alert className="mt-6">
                <AlertDescription>
                  Full report visualization coming soon. For now, you can view the raw scores above.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          // No report data available
          <Alert>
            <AlertDescription>
              Report data is not yet available. Please check back in a few moments.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
