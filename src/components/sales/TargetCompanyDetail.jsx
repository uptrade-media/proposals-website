/**
 * TargetCompanyDetail - Side panel showing full company details
 * Includes AI analysis, pitch angles, call prep, and prospect linking
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  X,
  Globe,
  Phone, 
  User,
  Clock,
  Sparkles,
  Target,
  Zap,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  UserPlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import useCrmStore from '@/lib/crm-store'
import { toast } from 'sonner'

// Score to label mapping
const getScoreConfig = (score) => {
  if (score >= 80) return { label: 'Hot Lead', color: 'bg-red-500/20 text-red-400 border-red-500/30', barColor: 'bg-red-500' }
  if (score >= 60) return { label: 'Warm', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', barColor: 'bg-orange-500' }
  if (score >= 40) return { label: 'Potential', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', barColor: 'bg-yellow-500' }
  if (score >= 20) return { label: 'Cool', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', barColor: 'bg-blue-500' }
  return { label: 'Low Priority', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', barColor: 'bg-zinc-500' }
}

export default function TargetCompanyDetail({ company, onClose }) {
  const [copiedField, setCopiedField] = useState(null)
  const [callPrepOpen, setCallPrepOpen] = useState(true)
  const [pitchAnglesOpen, setPitchAnglesOpen] = useState(true)
  const [signalsOpen, setSignalsOpen] = useState(false)
  
  const { 
    claimTargetCompany, 
    unclaimTargetCompany, 
    getCallPrep, 
    callPrepLoading 
  } = useCrmStore()

  if (!company) return null

  const scoreConfig = getScoreConfig(company.score || 0)
  const hasCallPrep = !!company.call_prep
  const isClaimed = !!company.claimed_by

  const handleCopy = async (text, field) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleClaim = async () => {
    try {
      await claimTargetCompany(company.id)
      toast.success('Company claimed')
    } catch (err) {
      toast.error('Failed to claim company')
    }
  }

  const handleUnclaim = async () => {
    try {
      await unclaimTargetCompany(company.id)
      toast.success('Company unclaimed')
    } catch (err) {
      toast.error('Failed to unclaim company')
    }
  }

  const handleGenerateCallPrep = async () => {
    try {
      await getCallPrep(company.id, true)
      toast.success('Call prep generated')
    } catch (err) {
      toast.error('Failed to generate call prep')
    }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--surface-primary)]">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--glass-border)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-[var(--accent-primary)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                {company.domain}
              </h2>
              {company.company_name && company.company_name !== company.domain && (
                <p className="text-sm text-[var(--text-muted)] truncate">
                  {company.company_name}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-4">
          <a 
            href={`https://${company.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] rounded-lg border border-[var(--glass-border)] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Visit Site
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(company.domain, 'domain')}
          >
            {copiedField === 'domain' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          {isClaimed ? (
            <Button variant="outline" size="sm" onClick={handleUnclaim}>
              Unclaim
            </Button>
          ) : (
            <Button size="sm" onClick={handleClaim}>
              <Zap className="w-3.5 h-3.5 mr-1" />
              Claim
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Score Card */}
          <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">AI Score</span>
              <Badge variant="outline" className={cn('border', scoreConfig.color)}>
                {scoreConfig.label}
              </Badge>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-[var(--text-primary)]">
                {company.score || 0}
              </span>
              <span className="text-sm text-[var(--text-muted)] pb-1">/100</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
              <div 
                className={cn('h-full rounded-full transition-all', scoreConfig.barColor)}
                style={{ width: `${company.score || 0}%` }}
              />
            </div>
          </div>

          {/* AI Summary */}
          {company.ai_summary && (
            <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                AI Analysis
              </h3>
              <p className="text-sm text-[var(--text-primary)]">
                {company.ai_summary}
              </p>
            </div>
          )}

          {/* Top Scoring Factors */}
          {company.top_factors?.length > 0 && (
            <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                Top Scoring Factors
              </h3>
              <div className="space-y-2">
                {company.top_factors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <div className={cn(
                      'w-5 h-5 rounded flex items-center justify-center text-xs font-medium',
                      factor.impact === 'positive' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                    )}>
                      {idx + 1}
                    </div>
                    <span className="text-[var(--text-primary)]">{factor.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pitch Angles */}
          {company.pitch_angles?.length > 0 && (
            <Collapsible open={pitchAnglesOpen} onOpenChange={setPitchAnglesOpen}>
              <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                    <Target className="w-4 h-4 text-[var(--accent-primary)]" />
                    Pitch Angles ({company.pitch_angles.length})
                  </h3>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-[var(--text-muted)] transition-transform',
                    pitchAnglesOpen && 'rotate-180'
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    {company.pitch_angles.map((angle, idx) => {
                      // Handle both string and object formats
                      const isString = typeof angle === 'string'
                      const title = isString ? `Angle ${idx + 1}` : (angle.title || `Angle ${idx + 1}`)
                      const hook = isString ? angle : (angle.hook || angle.description || '')
                      const proofPoints = !isString && Array.isArray(angle.proofPoints) ? angle.proofPoints : []
                      const confidence = !isString ? (angle.confidence || 'medium') : 'medium'
                      
                      return (
                        <div 
                          key={idx}
                          className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--glass-border)]"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-medium text-[var(--text-primary)]">
                              {title}
                            </h4>
                            <Badge variant="outline" className="text-[10px]">
                              {confidence}
                            </Badge>
                          </div>
                          {hook && (
                            <p className="text-xs text-[var(--text-secondary)]">
                              {hook}
                            </p>
                          )}
                          {proofPoints.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {proofPoints.map((point, pIdx) => (
                                <li key={pIdx} className="text-xs text-[var(--text-muted)] flex items-start gap-1.5">
                                  <span className="text-[var(--accent-primary)]">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Call Prep */}
          <Collapsible open={callPrepOpen} onOpenChange={setCallPrepOpen}>
            <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[var(--accent-primary)]" />
                  Call Prep
                  {hasCallPrep && (
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/30">
                      Ready
                    </Badge>
                  )}
                </h3>
                <ChevronDown className={cn(
                  'w-4 h-4 text-[var(--text-muted)] transition-transform',
                  callPrepOpen && 'rotate-180'
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  {hasCallPrep ? (
                    <div className="space-y-3">
                      {/* Opening Line */}
                      {company.call_prep.opening_line && (
                        <div>
                          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                            Opening Line
                          </label>
                          <p className="mt-1 text-sm text-[var(--text-primary)] italic">
                            "{company.call_prep.opening_line}"
                          </p>
                        </div>
                      )}
                      
                      {/* Key Points */}
                      {company.call_prep.key_points?.length > 0 && (
                        <div>
                          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                            Key Points
                          </label>
                          <ul className="mt-1 space-y-1">
                            {company.call_prep.key_points.map((point, idx) => (
                              <li key={idx} className="text-sm text-[var(--text-primary)] flex items-start gap-2">
                                <span className="text-[var(--accent-primary)]">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Objection Handlers */}
                      {company.call_prep.objection_handlers?.length > 0 && (
                        <div>
                          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                            Handle Objections
                          </label>
                          <div className="mt-1 space-y-2">
                            {company.call_prep.objection_handlers.map((handler, idx) => (
                              <div key={idx} className="p-2 rounded-lg bg-[var(--surface-secondary)]">
                                <p className="text-xs text-[var(--text-muted)]">"{handler.objection}"</p>
                                <p className="text-sm text-[var(--text-primary)] mt-1">→ {handler.response}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={handleGenerateCallPrep}
                        disabled={callPrepLoading}
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5 mr-1', callPrepLoading && 'animate-spin')} />
                        Regenerate
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-[var(--text-muted)] mb-3">
                        No call prep generated yet
                      </p>
                      <Button 
                        onClick={handleGenerateCallPrep}
                        disabled={callPrepLoading}
                      >
                        <Sparkles className={cn('w-4 h-4 mr-2', callPrepLoading && 'animate-pulse')} />
                        Generate Call Prep
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Tech Stack */}
          {company.tech_stack?.length > 0 && (
            <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                Tech Stack Detected
              </h3>
              <div className="flex flex-wrap gap-2">
                {company.tech_stack.map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Signals (Collapsible) */}
          {company.signals && Object.keys(company.signals).length > 0 && (
            <Collapsible open={signalsOpen} onOpenChange={setSignalsOpen}>
              <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Raw Signals
                  </h3>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-[var(--text-muted)] transition-transform',
                    signalsOpen && 'rotate-180'
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <pre className="text-xs text-[var(--text-muted)] overflow-auto max-h-48">
                      {JSON.stringify(company.signals, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Linked Prospects */}
          <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                <User className="w-4 h-4" />
                Linked Contacts
              </h3>
              <Button variant="ghost" size="sm" className="h-7">
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
            {company.prospects?.length > 0 ? (
              <div className="space-y-2">
                {company.prospects.map((prospect) => (
                  <div 
                    key={prospect.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-secondary)]"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-[var(--accent-primary)]">
                        {prospect.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {prospect.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {prospect.email || prospect.phone || 'No contact info'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-2">
                No contacts linked yet
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Analyzed {company.analyzed_at ? new Date(company.analyzed_at).toLocaleString() : 'N/A'}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
