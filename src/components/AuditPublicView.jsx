/**
 * AuditPublicView - Refactored
 * Full audit display for public magic link access
 * Uses extracted components from /audit/ folder following Liquid Glass design system
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Zap, 
  Search, 
  Eye, 
  Shield, 
  Smartphone,
  Activity,
  Timer,
  Clock,
  TrendingUp,
  Sparkles,
  Target
} from 'lucide-react'
import SchedulerModal from './SchedulerModal'

// Import all audit components
import {
  // Utilities
  fadeInUp,
  staggerContainer,
  calculateGrade,
  gradeColors,
  formatMs,
  
  // Score components
  ScoreCard,
  MetricCard,
  MiniMetricCard,
  ScoreGrid,
  
  // Issue components
  IssueItem,
  SecurityCheckRow,
  IssueList,
  IssueSection,
  
  // Header/Footer
  AuditHeader,
  AuditFooter,
  
  // Analysis sections
  BusinessImpactSection,
  IndustryComparisonSection,
  ResourceBreakdownSection,
  OpportunitiesSection,
  CodeSnippetsSection,
  AIInsightsSection,
  QuickWinsSection,
  
  // CTA components
  CTASection,
  FloatingActions,
  PriorityActionsCard
} from './audit'

export default function AuditPublicView({ audit, contact }) {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  
  // Handle scroll for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Normalize scores - handle both flat properties and nested scores object
  const scores = {
    performance: audit.scores?.performance ?? audit.performanceScore ?? null,
    seo: audit.scores?.seo ?? audit.seoScore ?? null,
    accessibility: audit.scores?.accessibility ?? audit.accessibilityScore ?? null,
    bestPractices: audit.scores?.bestPractices ?? audit.bestPracticesScore ?? null,
    pwa: audit.scores?.pwa ?? audit.pwaScore ?? null,
    security: audit.scores?.security ?? audit.securityScore ?? null,
    overall: audit.scores?.overall ?? audit.overallScore ?? null
  }
  
  // Calculate grade
  const grade = audit.grade || calculateGrade({ 
    performanceScore: scores.performance,
    seoScore: scores.seo,
    accessibilityScore: scores.accessibility,
    bestPracticesScore: scores.bestPractices
  })
  const gradeColor = gradeColors[grade] || gradeColors['N/A']
  
  // Extract data from summary or fullAuditJson
  const summary = audit.summary || {}
  const fullAuditData = typeof audit.fullAuditJson === 'string' 
    ? (JSON.parse(audit.fullAuditJson || '{}') || {}) 
    : (audit.fullAuditJson || {})
  
  // Issue data
  const seoIssues = audit.seoIssues || summary.seoIssues || fullAuditData.seoIssues || []
  const securityIssues = audit.securityIssues || summary.securityIssues || fullAuditData.securityIssues || {}
  const performanceIssues = audit.performanceIssues || summary.performanceIssues || fullAuditData.performanceIssues || []
  const accessibilityIssues = audit.accessibilityIssues || summary.accessibilityIssues || fullAuditData.accessibilityIssues || []
  const priorityActions = audit.priorityActions || summary.priorityActions || fullAuditData.priorityActions || []
  const insightsSummary = audit.insightsSummary || summary.insightsSummary || fullAuditData.insightsSummary || null
  
  // Enhanced audit data
  const quickWins = summary.quickWins || fullAuditData.quickWins || []
  const resources = summary.resources || fullAuditData.resources || {}
  const opportunities = summary.opportunities || fullAuditData.opportunities || []
  const businessImpact = summary.businessImpact || fullAuditData.businessImpact || {}
  const industryComparison = summary.industryComparison || fullAuditData.industryComparison || {}
  const codeSnippets = summary.codeSnippets || fullAuditData.codeSnippets || []
  const aiInsights = summary.aiInsights || fullAuditData.aiInsights || null
  
  // Scroll to section helper
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Header */}
      <AuditHeader 
        audit={audit}
        contact={contact}
        grade={grade}
        gradeColor={gradeColor}
      />

      {/* Score Cards Grid */}
      <ScoreGrid>
        <ScoreCard 
          label="Performance" 
          value={scores.performance} 
          icon={Zap}
          description="Page speed & responsiveness"
        />
        <ScoreCard 
          label="SEO" 
          value={scores.seo} 
          icon={Search}
          description="Search engine optimization"
        />
        <ScoreCard 
          label="Accessibility" 
          value={scores.accessibility} 
          icon={Eye}
          description="Usability for all users"
        />
        <ScoreCard 
          label="Best Practices" 
          value={scores.bestPractices} 
          icon={Shield}
          description="Security & modern standards"
        />
        {scores.pwa != null && scores.pwa > 0 && (
          <ScoreCard 
            label="PWA" 
            value={scores.pwa} 
            icon={Smartphone}
            description="Progressive Web App"
          />
        )}
      </ScoreGrid>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      >
        {/* Core Web Vitals Section */}
        <CoreWebVitalsSection audit={audit} />

        {/* SEO Issues */}
        {seoIssues.length > 0 && (
          <IssueSection
            id="seo-issues"
            title="SEO Analysis"
            description="Issues affecting your search engine visibility"
            icon={Search}
            iconColor="text-[var(--accent-blue)]"
            iconBg="bg-[var(--accent-blue)]/10"
            shadowColor="hover:shadow-[var(--accent-blue)]/5"
          >
            <IssueList>
              {seoIssues.map((issue, i) => (
                <IssueItem key={i} {...issue} />
              ))}
            </IssueList>
          </IssueSection>
        )}

        {/* Security Analysis */}
        <IssueSection
          id="security-issues"
          title="Security Analysis"
          description="Security headers and HTTPS configuration"
          icon={Shield}
          iconColor="text-[var(--accent-green)]"
          iconBg="bg-[var(--accent-green)]/10"
          shadowColor="hover:shadow-[var(--accent-green)]/5"
        >
          <motion.div 
            variants={staggerContainer} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }} 
            className="grid md:grid-cols-2 gap-3"
          >
            <SecurityCheckRow name="HTTPS Enabled" status={securityIssues.https ?? true} />
            <SecurityCheckRow name="Content Security Policy" status={securityIssues.csp} />
            <SecurityCheckRow name="X-Frame-Options" status={securityIssues.xFrameOptions} />
            <SecurityCheckRow name="X-Content-Type-Options" status={securityIssues.xContentType} />
            <SecurityCheckRow name="Strict-Transport-Security" status={securityIssues.hsts} />
            <SecurityCheckRow name="Referrer-Policy" status={securityIssues.referrerPolicy} />
          </motion.div>
        </IssueSection>

        {/* Performance Issues */}
        {performanceIssues.length > 0 && (
          <IssueSection
            id="performance-issues"
            title="Performance Opportunities"
            description="Improvements that could speed up your website"
            icon={Zap}
            iconColor="text-[var(--accent-orange)]"
            iconBg="bg-[var(--accent-orange)]/10"
            shadowColor="hover:shadow-[var(--accent-orange)]/5"
          >
            <IssueList>
              {performanceIssues.map((issue, i) => (
                <IssueItem key={i} {...issue} />
              ))}
            </IssueList>
          </IssueSection>
        )}

        {/* Accessibility Issues */}
        {accessibilityIssues.length > 0 && (
          <IssueSection
            id="accessibility-issues"
            title="Accessibility Issues"
            description="Barriers that may prevent users from accessing your content"
            icon={Eye}
            iconColor="text-[var(--accent-purple)]"
            iconBg="bg-[var(--accent-purple)]/10"
            shadowColor="hover:shadow-[var(--accent-purple)]/5"
          >
            <IssueList>
              {accessibilityIssues.map((issue, i) => (
                <IssueItem key={i} {...issue} />
              ))}
            </IssueList>
          </IssueSection>
        )}

        {/* Priority Actions */}
        <PriorityActionsCard
          priorityActions={priorityActions}
          scores={scores}
          securityIssues={securityIssues}
          insightsSummary={insightsSummary}
          onScrollToSection={scrollToSection}
        />

        {/* Business Impact Analysis */}
        <BusinessImpactSection businessImpact={businessImpact} />

        {/* Industry Comparison */}
        <IndustryComparisonSection industryComparison={industryComparison} />

        {/* Resource Breakdown */}
        <ResourceBreakdownSection resources={resources} />

        {/* Performance Opportunities */}
        <OpportunitiesSection opportunities={opportunities} />

        {/* Quick Wins */}
        <QuickWinsSection quickWins={quickWins} />

        {/* Code Snippets */}
        <CodeSnippetsSection codeSnippets={codeSnippets} />

        {/* AI Insights */}
        <AIInsightsSection aiInsights={aiInsights} />

        {/* CTA Section */}
        <CTASection onScheduleClick={() => setShowScheduler(true)} />

        {/* Footer */}
        <AuditFooter />
      </motion.div>

      {/* Floating Action Buttons */}
      <FloatingActions 
        show={showBackToTop}
        onScheduleClick={() => setShowScheduler(true)}
        onBackToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />

      {/* Scheduler Modal */}
      <SchedulerModal
        isOpen={showScheduler}
        onClose={() => setShowScheduler(false)}
        title="Review Your Audit Results"
        defaultMeetingType="audit"
        auditContext={{
          auditId: audit.id,
          targetUrl: audit.targetUrl,
          grade: grade
        }}
        prefillData={contact ? {
          name: contact.name || '',
          email: contact.email || '',
          company: contact.company || ''
        } : null}
      />
    </div>
  )
}

/**
 * CoreWebVitalsSection - Extracted Core Web Vitals display
 */
function CoreWebVitalsSection({ audit }) {
  return (
    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden hover:shadow-xl hover:shadow-[var(--brand-primary)]/5 transition-shadow duration-500">
        <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)]/5 to-[var(--brand-secondary)]/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>Key metrics that Google uses to evaluate user experience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Main CWV metrics */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <MetricCard 
              name="Largest Contentful Paint (LCP)"
              value={formatMs(audit.lcpMs)}
              target="< 2.5s"
              score={audit.lcpMs ? Math.max(0, 100 - (parseFloat(audit.lcpMs) / 25)) : 0}
            />
            <MetricCard 
              name="First Input Delay (FID)"
              value={formatMs(audit.fidMs)}
              target="< 100ms"
              score={audit.fidMs ? Math.max(0, 100 - parseFloat(audit.fidMs)) : 0}
            />
            <MetricCard 
              name="Cumulative Layout Shift (CLS)"
              value={audit.clsScore ?? 'N/A'}
              target="< 0.1"
              score={audit.clsScore ? Math.max(0, 100 - (parseFloat(audit.clsScore) * 100)) : 0}
            />
            <MetricCard 
              name="Time to First Byte (TTFB)"
              value={formatMs(audit.fcpMs)}
              target="< 800ms"
              score={audit.fcpMs ? Math.max(0, 100 - (parseFloat(audit.fcpMs) / 8)) : 0}
            />
          </motion.div>
          
          {/* Secondary metrics */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-4 mt-4"
          >
            <MiniMetricCard 
              icon={Timer}
              value={formatMs(audit.ttiMs)}
              label="Time to Interactive"
            />
            <MiniMetricCard 
              icon={Clock}
              value={formatMs(audit.tbtMs)}
              label="Total Blocking Time"
            />
            <MiniMetricCard 
              icon={TrendingUp}
              value={formatMs(audit.speedIndexMs)}
              label="Speed Index"
            />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
