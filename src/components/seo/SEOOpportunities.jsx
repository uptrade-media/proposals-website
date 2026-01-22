// src/components/seo/SEOOpportunities.jsx
// Opportunities list with filtering and actions
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Zap,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  FileText,
  Target,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'
import { useSeoStore } from '@/lib/seo-store'
import EffortEstimate, { calculateTotalEffort } from './signal/EffortEstimate'

export default function SEOOpportunities({ site, projectId, onSelectPage }) {
  const { 
    opportunities,
    opportunitiesLoading,
    fetchOpportunities,
    updateOpportunity,
    detectOpportunities
  } = useSeoStore()

  const [statusFilter, setStatusFilter] = useState('open')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [detecting, setDetecting] = useState(false)
  const [updatingIds, setUpdatingIds] = useState(new Set())

  // Use projectId directly (new architecture) or fallback to site.id (legacy)
  const siteId = projectId || site?.id

  // Fetch opportunities when filters change
  useEffect(() => {
    if (siteId) {
      fetchOpportunities(siteId, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      })
    }
  }, [siteId, statusFilter, priorityFilter, typeFilter])

  const handleDetect = async () => {
    setDetecting(true)
    try {
      await detectOpportunities(siteId)
    } finally {
      setDetecting(false)
    }
  }

  const handleUpdateStatus = async (id, status) => {
    setUpdatingIds(prev => new Set([...prev, id]))
    try {
      await updateOpportunity(id, { status })
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'in-progress': return <Play className="h-4 w-4 text-blue-400" />
      case 'dismissed': return <XCircle className="h-4 w-4 text-muted-foreground" />
      default: return <Clock className="h-4 w-4 text-yellow-400" />
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'missing-title': return <FileText className="h-4 w-4" />
      case 'missing-meta': return <FileText className="h-4 w-4" />
      case 'thin-content': return <AlertTriangle className="h-4 w-4" />
      case 'striking-distance': return <Target className="h-4 w-4" />
      case 'low-ctr': return <TrendingUp className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type) => {
    const labels = {
      'missing-title': 'Missing Title',
      'missing-meta': 'Missing Meta',
      'title-too-short': 'Title Too Short',
      'title-too-long': 'Title Too Long',
      'meta-too-short': 'Meta Too Short',
      'meta-too-long': 'Meta Too Long',
      'missing-h1': 'Missing H1',
      'multiple-h1': 'Multiple H1s',
      'thin-content': 'Thin Content',
      'images-missing-alt': 'Images Missing Alt',
      'no-schema': 'No Schema',
      'not-indexed': 'Not Indexed',
      'striking-distance': 'Striking Distance',
      'low-ctr': 'Low CTR',
      'cannibalization': 'Cannibalization'
    }
    return labels[type] || type
  }

  // Get unique types for filter
  const availableTypes = [...new Set(opportunities.map(o => o.type))]

  // Group opportunities by status for stats
  const openCount = opportunities.filter(o => o.status === 'open').length
  const inProgressCount = opportunities.filter(o => o.status === 'in-progress').length
  const completedCount = opportunities.filter(o => o.status === 'completed').length
  
  // Calculate total effort for open opportunities
  const openOpportunities = opportunities.filter(o => o.status === 'open')
  const effortSummary = calculateTotalEffort(openOpportunities)

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'open' ? 'border-primary' : ''}`}
          onClick={() => setStatusFilter('open')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              <span className="text-sm text-muted-foreground">Open</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{openCount}</span>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'in-progress' ? 'border-primary' : ''}`}
          onClick={() => setStatusFilter('in-progress')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{inProgressCount}</span>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'completed' ? 'border-primary' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{completedCount}</span>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'all' ? 'border-primary' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">All</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{opportunities.length}</span>
          </CardContent>
        </Card>
        {/* Effort Summary Card */}
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-400" />
              <span className="text-sm text-muted-foreground">Est. Time</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{effortSummary.totalTimeLabel}</span>
            {effortSummary.autoApplyCount > 0 && (
              <p className="text-xs text-green-400 mt-1">
                ✨ {effortSummary.autoApplyCount} can be auto-fixed
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {availableTypes.map(type => (
                <SelectItem key={type} value={type}>{getTypeLabel(type)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleDetect} disabled={detecting}>
          {detecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Detect New Opportunities
        </Button>
      </div>

      {/* Opportunities List */}
      <Card>
        <CardContent className="p-0">
          {opportunitiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No opportunities found</p>
              <p className="text-sm mb-4">
                {statusFilter !== 'all' 
                  ? 'Try changing the filters'
                  : 'Run opportunity detection to find SEO issues'}
              </p>
              <Button onClick={handleDetect} disabled={detecting}>
                {detecting ? 'Detecting...' : 'Detect Opportunities'}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {opportunities.map((opp) => (
                <div 
                  key={opp.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1">
                        {getStatusIcon(opp.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getPriorityColor(opp.priority)}>
                            {opp.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getTypeIcon(opp.type)}
                            <span className="ml-1">{getTypeLabel(opp.type)}</span>
                          </Badge>
                          <EffortEstimate 
                            effort={opp.effort} 
                            taskType={opp.type} 
                            variant="badge"
                          />
                        </div>
                        <h4 className="font-medium text-foreground mb-1">
                          {opp.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {opp.description}
                        </p>
                        {opp.page_path && (
                          <button
                            onClick={() => opp.page_id && onSelectPage(opp.page_id)}
                            className="text-sm text-primary hover:underline"
                          >
                            {opp.page_path}
                          </button>
                        )}
                        {opp.ai_recommendation && (
                          <div className="mt-3 p-3 rounded bg-muted/30 text-sm">
                            <p className="text-xs text-muted-foreground mb-1">AI Recommendation</p>
                            <p className="text-foreground">{opp.ai_recommendation}</p>
                          </div>
                        )}
                        {(opp.current_value || opp.recommended_value) && (
                          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                            {opp.current_value && (
                              <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                <p className="text-xs text-red-400 mb-1">Current</p>
                                <p className="text-foreground text-xs truncate">
                                  {opp.current_value}
                                </p>
                              </div>
                            )}
                            {opp.recommended_value && (
                              <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                <p className="text-xs text-green-400 mb-1">Recommended</p>
                                <p className="text-foreground text-xs truncate">
                                  {opp.recommended_value}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {opp.status === 'open' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(opp.id, 'in-progress')}
                            disabled={updatingIds.has(opp.id)}
                          >
                            {updatingIds.has(opp.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateStatus(opp.id, 'dismissed')}
                            disabled={updatingIds.has(opp.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {opp.status === 'in-progress' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUpdateStatus(opp.id, 'completed')}
                          disabled={updatingIds.has(opp.id)}
                        >
                          {updatingIds.has(opp.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </>
                          )}
                        </Button>
                      )}
                      {opp.status === 'completed' && (
                        <Badge className="bg-green-500/20 text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      )}
                      {opp.status === 'dismissed' && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Dismissed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
