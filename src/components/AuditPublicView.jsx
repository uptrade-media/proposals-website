// src/components/AuditPublicView.jsx
// Full audit display for public magic link access
// Uses Liquid Glass design system with world-class animations
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import SchedulerModal from './SchedulerModal'
import { 
  Zap, 
  Search, 
  Eye, 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Download,
  Phone,
  Mail,
  Calendar,
  Target,
  TrendingUp,
  Globe,
  Smartphone,
  MonitorSmartphone,
  Timer,
  Activity,
  ArrowUp,
  Sparkles
} from 'lucide-react'

// Animation variants for Liquid Glass
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
}

// Score thresholds
const getScoreColor = (score) => {
  if (score >= 90) return { bg: 'bg-[var(--accent-green)]/10', text: 'text-[var(--accent-green)]', label: 'Excellent' }
  if (score >= 70) return { bg: 'bg-[var(--accent-orange)]/10', text: 'text-[var(--accent-orange)]', label: 'Needs Work' }
  return { bg: 'bg-[var(--accent-red)]/10', text: 'text-[var(--accent-red)]', label: 'Poor' }
}

// Grade calculation
const calculateGrade = (audit) => {
  const scores = [
    audit.performanceScore,
    audit.seoScore,
    audit.accessibilityScore,
    audit.bestPracticesScore
  ].filter(s => s != null)
  
  if (scores.length === 0) return 'N/A'
  
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  if (avg >= 90) return 'A'
  if (avg >= 80) return 'B'
  if (avg >= 70) return 'C'
  if (avg >= 60) return 'D'
  return 'F'
}

const gradeColors = {
  'A': 'from-[var(--accent-green)] to-emerald-600',
  'B': 'from-[var(--accent-blue)] to-blue-600',
  'C': 'from-[var(--accent-orange)] to-amber-600',
  'D': 'from-orange-500 to-orange-600',
  'F': 'from-[var(--accent-red)] to-red-600',
  'N/A': 'from-gray-400 to-gray-500'
}

// Format milliseconds to human readable
const formatMs = (ms) => {
  if (ms == null) return 'N/A'
  const num = parseFloat(ms)
  if (num >= 1000) return `${(num / 1000).toFixed(1)}s`
  return `${Math.round(num)}ms`
}

// Score Card Component with hover effects
function ScoreCard({ label, value, icon: Icon, description }) {
  const colors = getScoreColor(value)
  
  return (
    <motion.div 
      variants={scaleIn}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`rounded-2xl p-5 ${colors.bg} border border-[var(--glass-border)] backdrop-blur-sm cursor-default
        hover:shadow-lg hover:shadow-[var(--brand-primary)]/10 transition-shadow duration-300`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
      </div>
      <div className={`text-4xl font-bold ${colors.text} mb-1 tabular-nums`}>
        {value ?? 'N/A'}
      </div>
      <div className="text-xs text-[var(--text-tertiary)] font-medium">{colors.label}</div>
      {description && (
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{description}</p>
      )}
    </motion.div>
  )
}

// Core Web Vital Card with animation
function MetricCard({ name, value, target, score }) {
  const colors = getScoreColor(score)
  
  return (
    <motion.div 
      variants={fadeInUp}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="bg-[var(--glass-bg)] backdrop-blur-sm rounded-xl p-4 border border-[var(--glass-border)]
        hover:border-[var(--glass-border-strong)] transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
        <Badge variant="outline" className={`${colors.bg} ${colors.text} border-0 text-xs font-medium`}>
          {colors.label}
        </Badge>
      </div>
      <div className={`text-2xl font-bold ${colors.text} mb-1 tabular-nums`}>{value}</div>
      <div className="text-xs text-[var(--text-tertiary)]">Target: {target}</div>
      <div className="mt-2 h-1.5 bg-[var(--glass-bg-inset)] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
          className={`h-full rounded-full ${score >= 90 ? 'bg-[var(--accent-green)]' : score >= 70 ? 'bg-[var(--accent-orange)]' : 'bg-[var(--accent-red)]'}`}
        />
      </div>
    </motion.div>
  )
}

// Issue Item Component with hover animation
function IssueItem({ title, description, severity, recommendation }) {
  const severityConfig = {
    critical: { bg: 'border-l-[var(--accent-red)] bg-[var(--accent-red)]/5', icon: XCircle, iconColor: 'text-[var(--accent-red)]', glow: 'hover:shadow-[var(--accent-red)]/10' },
    warning: { bg: 'border-l-[var(--accent-orange)] bg-[var(--accent-orange)]/5', icon: AlertTriangle, iconColor: 'text-[var(--accent-orange)]', glow: 'hover:shadow-[var(--accent-orange)]/10' },
    info: { bg: 'border-l-[var(--accent-blue)] bg-[var(--accent-blue)]/5', icon: Eye, iconColor: 'text-[var(--accent-blue)]', glow: 'hover:shadow-[var(--accent-blue)]/10' }
  }
  
  const config = severityConfig[severity] || severityConfig.info
  const IconComponent = config.icon
  
  return (
    <motion.div 
      variants={fadeInUp}
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
      className={`border-l-4 ${config.bg} p-4 rounded-r-xl hover:shadow-lg ${config.glow} transition-all duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[var(--text-primary)]">{title}</h4>
          <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{description}</p>
          {recommendation && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 flex items-start gap-2 p-2 bg-[var(--accent-green)]/5 rounded-lg"
            >
              <CheckCircle className="w-4 h-4 text-[var(--accent-green)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--accent-green)]">
                <span className="font-medium">Fix:</span> {recommendation}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Security Check Row with animation
function SecurityCheckRow({ name, status }) {
  return (
    <motion.div 
      variants={fadeInUp}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className="flex items-center justify-between p-3 bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)]
        hover:border-[var(--glass-border-strong)] transition-all duration-300"
    >
      <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
      {status ? (
        <Badge className="bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-0 font-medium">
          <CheckCircle className="w-3 h-3 mr-1" />
          Enabled
        </Badge>
      ) : (
        <Badge className="bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-0 font-medium">
          <XCircle className="w-3 h-3 mr-1" />
          Missing
        </Badge>
      )}
    </motion.div>
  )
}

export default function AuditPublicView({ audit, contact }) {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  
  // Handle scroll for back to top button with proper cleanup
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Normalize scores - handle both flat properties and nested scores object
  // Main site API returns: { scores: { performance, seo, accessibility, security, overall } }
  // Portal API returns: { performanceScore, seoScore, accessibilityScore, ... }
  const scores = {
    performance: audit.scores?.performance ?? audit.performanceScore ?? null,
    seo: audit.scores?.seo ?? audit.seoScore ?? null,
    accessibility: audit.scores?.accessibility ?? audit.accessibilityScore ?? null,
    bestPractices: audit.scores?.bestPractices ?? audit.bestPracticesScore ?? null,
    pwa: audit.scores?.pwa ?? audit.pwaScore ?? null,
    security: audit.scores?.security ?? audit.securityScore ?? null,
    overall: audit.scores?.overall ?? audit.overallScore ?? null
  }
  
  // Use grade from API or calculate from normalized scores
  const grade = audit.grade || calculateGrade({ 
    performanceScore: scores.performance,
    seoScore: scores.seo,
    accessibilityScore: scores.accessibility,
    bestPracticesScore: scores.bestPractices
  })
  const gradeColor = gradeColors[grade] || gradeColors['N/A']
  
  // Issues from summary object (main site) or flat properties (portal)
  // Also check fullAuditJson for AI-generated insights
  const summary = audit.summary || {}
  const fullAuditData = typeof audit.fullAuditJson === 'string' 
    ? (JSON.parse(audit.fullAuditJson || '{}') || {}) 
    : (audit.fullAuditJson || {})
  
  const seoIssues = audit.seoIssues || summary.seoIssues || fullAuditData.seoIssues || []
  const securityIssues = audit.securityIssues || summary.securityIssues || fullAuditData.securityIssues || {}
  const performanceIssues = audit.performanceIssues || summary.performanceIssues || fullAuditData.performanceIssues || []
  const accessibilityIssues = audit.accessibilityIssues || summary.accessibilityIssues || fullAuditData.accessibilityIssues || []
  const priorityActions = audit.priorityActions || summary.priorityActions || fullAuditData.priorityActions || []
  const insightsSummary = audit.insightsSummary || summary.insightsSummary || fullAuditData.insightsSummary || null
  
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Header with glass overlay */}
      <header className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-12 overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--brand-primary)]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--brand-secondary)]/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div>
              {/* Logo */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-6"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/30">
                  <span className="text-white font-bold">U</span>
                </div>
                <span className="font-semibold text-white/90 text-lg">Uptrade Media</span>
              </motion.div>
              
              <h1 className="text-3xl font-bold mb-2">Website Audit Report</h1>
              <div className="flex items-center gap-2 text-gray-300 text-lg">
                <Globe className="w-5 h-5" />
                <a href={audit.targetUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  {audit.targetUrl}
                </a>
                <ExternalLink className="w-4 h-4" />
              </div>
              
              <div className="flex items-center gap-4 mt-4 text-gray-400 text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(audit.completedAt || audit.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  {audit.deviceType === 'mobile' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <MonitorSmartphone className="w-4 h-4" />
                  )}
                  {audit.deviceType === 'mobile' ? 'Mobile' : 'Desktop'} Analysis
                </div>
              </div>
              
              {contact?.name && (
                <p className="text-gray-400 mt-3">
                  Prepared for: <span className="text-white">{contact.name}</span>
                  {contact.company && <span className="text-gray-500"> ({contact.company})</span>}
                </p>
              )}
            </div>
            
            {/* Grade Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              className={`w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br ${gradeColor} flex items-center justify-center shadow-2xl flex-shrink-0 ring-4 ring-white/10`}
            >
              <span className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg">{grade}</span>
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* Score Cards */}
      <div className="bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--glass-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-5 gap-4"
          >
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
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      >
        
        {/* Core Web Vitals */}
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
            
            {/* Additional Performance Metrics */}
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-4 mt-4"
            >
              <motion.div variants={fadeInUp} className="bg-[var(--glass-bg-inset)] rounded-xl p-4 text-center hover:bg-[var(--glass-bg)] transition-colors duration-300">
                <Timer className="w-6 h-6 mx-auto mb-2 text-[var(--text-secondary)]" />
                <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatMs(audit.ttiMs)}</div>
                <div className="text-xs text-[var(--text-tertiary)] font-medium">Time to Interactive</div>
              </motion.div>
              <motion.div variants={fadeInUp} className="bg-[var(--glass-bg-inset)] rounded-xl p-4 text-center hover:bg-[var(--glass-bg)] transition-colors duration-300">
                <Clock className="w-6 h-6 mx-auto mb-2 text-[var(--text-secondary)]" />
                <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatMs(audit.tbtMs)}</div>
                <div className="text-xs text-[var(--text-tertiary)] font-medium">Total Blocking Time</div>
              </motion.div>
              <motion.div variants={fadeInUp} className="bg-[var(--glass-bg-inset)] rounded-xl p-4 text-center hover:bg-[var(--glass-bg)] transition-colors duration-300">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[var(--text-secondary)]" />
                <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatMs(audit.speedIndexMs)}</div>
                <div className="text-xs text-[var(--text-tertiary)] font-medium">Speed Index</div>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
        </motion.div>

        {/* SEO Issues */}
        {seoIssues.length > 0 && (
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden hover:shadow-xl hover:shadow-[var(--accent-blue)]/5 transition-shadow duration-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue)]/10 flex items-center justify-center">
                    <Search className="w-5 h-5 text-[var(--accent-blue)]" />
                  </div>
                  <div>
                    <CardTitle>SEO Analysis</CardTitle>
                    <CardDescription>Issues affecting your search engine visibility</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
                  {seoIssues.map((issue, i) => (
                    <IssueItem key={i} {...issue} />
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Security Analysis */}
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden hover:shadow-xl hover:shadow-[var(--accent-green)]/5 transition-shadow duration-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-green)]/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[var(--accent-green)]" />
                </div>
                <div>
                  <CardTitle>Security Analysis</CardTitle>
                  <CardDescription>Security headers and HTTPS configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-2 gap-3">
                <SecurityCheckRow name="HTTPS Enabled" status={securityIssues.https ?? true} />
                <SecurityCheckRow name="Content Security Policy" status={securityIssues.csp} />
                <SecurityCheckRow name="X-Frame-Options" status={securityIssues.xFrameOptions} />
                <SecurityCheckRow name="X-Content-Type-Options" status={securityIssues.xContentType} />
                <SecurityCheckRow name="Strict-Transport-Security" status={securityIssues.hsts} />
                <SecurityCheckRow name="Referrer-Policy" status={securityIssues.referrerPolicy} />
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Issues */}
        {performanceIssues.length > 0 && (
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden hover:shadow-xl hover:shadow-[var(--accent-orange)]/5 transition-shadow duration-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-orange)]/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[var(--accent-orange)]" />
                  </div>
                  <div>
                    <CardTitle>Performance Opportunities</CardTitle>
                    <CardDescription>Improvements that could speed up your website</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
                  {performanceIssues.map((issue, i) => (
                    <IssueItem key={i} {...issue} />
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Accessibility Issues */}
        {accessibilityIssues.length > 0 && (
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden hover:shadow-xl hover:shadow-[var(--accent-purple)]/5 transition-shadow duration-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-purple)]/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-[var(--accent-purple)]" />
                  </div>
                  <div>
                    <CardTitle>Accessibility Issues</CardTitle>
                    <CardDescription>Barriers that may prevent users from accessing your content</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
                  {accessibilityIssues.map((issue, i) => (
                    <IssueItem key={i} {...issue} />
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Priority Action Items */}
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Card className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden border-0 shadow-2xl">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--brand-secondary)]/10 rounded-full blur-3xl" />
            
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/30">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white">Priority Action Items</CardTitle>
                  <CardDescription className="text-gray-400">Top recommendations to improve your website</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {/* Show AI-generated insights summary if available */}
              {insightsSummary && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-6 p-5 bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-secondary)]/10 rounded-2xl border border-white/10 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-200 text-sm leading-relaxed">{insightsSummary}</p>
                  </div>
                </motion.div>
              )}
              
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="space-y-4"
              >
                {/* Use API priority actions if available, otherwise fall back to score-based logic */}
                {priorityActions.length > 0 ? (
                  priorityActions.map((action, index) => (
                    <motion.div 
                      key={index} 
                      variants={fadeInUp}
                      whileHover={{ x: 4, transition: { duration: 0.2 } }}
                      className="flex items-start gap-4 bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors duration-300 border border-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--brand-primary)]/20">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-gray-200 text-sm leading-relaxed">{action}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <>
                    {scores.performance < 70 && (
                      <motion.div variants={fadeInUp} className="flex items-start gap-4 bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-red)]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[var(--accent-red)] font-bold">1</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Improve Page Speed</h4>
                          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                            Your performance score of {scores.performance} is below optimal. Consider optimizing images, 
                            minifying CSS/JS, and implementing lazy loading.
                          </p>
                        </div>
                      </motion.div>
                    )}
              
                    {scores.seo < 80 && (
                      <motion.div variants={fadeInUp} className="flex items-start gap-4 bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-orange)]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[var(--accent-orange)] font-bold">2</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Optimize for Search Engines</h4>
                          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                            Your SEO score could be improved. Ensure meta descriptions, title tags, and structured data are properly configured.
                          </p>
                        </div>
                      </motion.div>
                    )}
              
                    {scores.accessibility < 90 && (
                      <motion.div variants={fadeInUp} className="flex items-start gap-4 bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-blue)]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[var(--accent-blue)] font-bold">3</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Improve Accessibility</h4>
                          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                            Make your site more accessible by adding alt text to images, ensuring sufficient color contrast, and using proper heading hierarchy.
                          </p>
                        </div>
                      </motion.div>
                    )}
              
                    {scores.performance >= 70 && scores.seo >= 80 && scores.accessibility >= 90 && (
                      <motion.div variants={fadeInUp} className="flex items-start gap-4 bg-[var(--accent-green)]/10 rounded-xl p-4 border border-[var(--accent-green)]/20">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-green)]/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-[var(--accent-green)]" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Great Job!</h4>
                          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                            Your website is performing well across all major categories. Keep monitoring and optimizing for best results.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Section */}
        <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden hover:shadow-xl hover:shadow-[var(--brand-primary)]/5 transition-shadow duration-500">
            <CardContent className="py-12 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
                  Need Help Fixing These Issues?
                </h2>
                <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-8 leading-relaxed">
                  Our team specializes in website optimization and can help you implement these improvements to boost your rankings and conversions.
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button 
                  onClick={() => setShowScheduler(true)}
                  className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white font-bold rounded-xl 
                    hover:shadow-xl hover:shadow-[var(--brand-primary)]/30 hover:scale-[1.02] transition-all duration-300"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Free Consultation
                </button>
                <a 
                  href="tel:+15139511110"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-[var(--glass-bg-elevated)] text-[var(--text-primary)] font-bold rounded-xl border border-[var(--glass-border)] 
                    hover:bg-[var(--glass-bg-hover)] hover:border-[var(--brand-primary)]/30 hover:scale-[1.02] transition-all duration-300"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call (513) 951-1110
                </a>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.footer 
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center py-8 border-t border-[var(--glass-border)]"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20">
              <span className="text-white font-bold">U</span>
            </div>
            <span className="font-semibold text-[var(--text-primary)] text-lg">Uptrade Media</span>
          </div>
          <p className="text-[var(--text-tertiary)] text-sm">
            High-Performance Websites & Digital Marketing<br />
            Cincinnati & Northern Kentucky
          </p>
        </motion.footer>
      </motion.div>

      {/* Floating Action Buttons */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
          >
            {/* Schedule Consultation FAB */}
            <motion.button
              onClick={() => setShowScheduler(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white font-semibold rounded-full shadow-lg shadow-[var(--brand-primary)]/30 hover:shadow-xl transition-shadow"
            >
              <Calendar className="w-5 h-5" />
              <span className="hidden sm:inline">Schedule Consultation</span>
            </motion.button>
            
            {/* Back to Top Button */}
            <Button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="rounded-full w-12 h-12 bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] shadow-lg hover:scale-110 transition-all self-end"
              size="sm"
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

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
