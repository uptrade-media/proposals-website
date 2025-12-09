import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Target, 
  TrendingUp, 
  Users, 
  Zap, 
  CheckCircle, 
  Download, 
  AlertTriangle, 
  Smartphone, 
  Search, 
  Star, 
  Award, 
  Clock, 
  Shield,
  FileText,
  Eye,
  Share2
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'
import ProposalSignature from './ProposalSignature'
import api from '@/lib/api'

const ProposalTemplate = ({ proposal: proposalProp, proposalId, proposalSlug, isPublicView = false, onBack }) => {
  const { user } = useAuthStore()
  const [proposal, setProposal] = useState(proposalProp || null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const proposalRef = useRef(null)
  
  // Analytics tracking refs
  const startTimeRef = useRef(Date.now())
  const maxScrollDepthRef = useRef(0)
  const sectionsViewedRef = useRef(new Set())
  const lastScrollTrackRef = useRef(0)
  const timeTrackIntervalRef = useRef(null)

  // Track analytics event
  const trackEvent = async (eventType, metadata = {}) => {
    if (!isPublicView || !proposal?.id) return
    
    try {
      await api.post('/.netlify/functions/proposals-track-view', {
        proposalId: proposal.id,
        event: eventType,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          screenWidth: window.innerWidth,
          timestamp: new Date().toISOString()
        }
      })
    } catch (err) {
      // Silently fail - analytics shouldn't break the user experience
      console.warn('Failed to track event:', err)
    }
  }

  // Track time spent periodically
  useEffect(() => {
    if (!isPublicView || !proposal?.id) return

    // Track time spent every 30 seconds
    timeTrackIntervalRef.current = setInterval(() => {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
      trackEvent('time_spent', { duration: timeSpent, cumulative: true })
    }, 30000) // Every 30 seconds

    // Cleanup and send final time on unmount
    return () => {
      if (timeTrackIntervalRef.current) {
        clearInterval(timeTrackIntervalRef.current)
      }
      const finalTimeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (finalTimeSpent > 5) { // Only track if spent more than 5 seconds
        trackEvent('time_spent', { duration: finalTimeSpent, final: true })
      }
    }
  }, [isPublicView, proposal?.id])

  // Track scroll depth
  useEffect(() => {
    if (!isPublicView || !proposal?.id) return

    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = Math.round((scrollTop / docHeight) * 100)
      
      // Update max scroll depth
      if (scrollPercent > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = scrollPercent
        
        // Only track at certain milestones (25%, 50%, 75%, 90%, 100%)
        const milestones = [25, 50, 75, 90, 100]
        const now = Date.now()
        
        for (const milestone of milestones) {
          if (scrollPercent >= milestone && lastScrollTrackRef.current < milestone) {
            // Debounce - don't track same milestone within 2 seconds
            if (now - lastScrollTrackRef.current > 2000) {
              trackEvent('scroll', { scrollDepth: milestone, maxDepth: maxScrollDepthRef.current })
              lastScrollTrackRef.current = milestone
            }
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isPublicView, proposal?.id])

  // Track section visibility with Intersection Observer
  useEffect(() => {
    if (!isPublicView || !proposal?.id) return

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section')
            if (sectionId && !sectionsViewedRef.current.has(sectionId)) {
              sectionsViewedRef.current.add(sectionId)
              trackEvent('section_view', { section: sectionId })
            }
          }
        })
      },
      { threshold: 0.3 } // 30% visible
    )

    // Observe all sections with data-section attribute
    const sections = document.querySelectorAll('[data-section]')
    sections.forEach((section) => sectionObserver.observe(section))

    return () => sectionObserver.disconnect()
  }, [isPublicView, proposal?.id])

  const handleExportPDF = async () => {
    if (!proposal) return
    
    // Track PDF download
    if (isPublicView) {
      trackEvent('click', { action: 'pdf_download' })
    }
    
    setExportingPDF(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const margin = 20
      const contentWidth = pageWidth - (margin * 2)
      let yPos = margin
      
      // Helper to add page if needed
      const checkAddPage = (neededSpace = 10) => {
        if (yPos + neededSpace > pageHeight - margin) {
          pdf.addPage()
          yPos = margin
        }
      }
      
      // Title
      pdf.setFontSize(24)
      pdf.setTextColor(75, 191, 57) // Green
      pdf.text(proposal.title || 'Proposal', margin, yPos)
      yPos += 15
      
      // Client info
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 100)
      if (user?.name) {
        pdf.text(`Prepared for: ${user.name}`, margin, yPos)
        yPos += 7
      }
      if (user?.company) {
        pdf.text(`Company: ${user.company}`, margin, yPos)
        yPos += 7
      }
      yPos += 5
      
      // Status
      pdf.setFontSize(10)
      pdf.setTextColor(75, 191, 57)
      pdf.text(`Status: ${proposal.status?.toUpperCase() || 'DRAFT'}`, pageWidth - margin - 40, margin)
      
      // Divider line
      pdf.setDrawColor(220, 220, 220)
      pdf.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 10
      
      // Content section
      pdf.setFontSize(11)
      pdf.setTextColor(51, 51, 51)
      
      // Parse and add MDX content (simplified)
      const content = mbfmProposalContent
      
      if (content.overview) {
        checkAddPage(20)
        pdf.setFontSize(14)
        pdf.setTextColor(75, 191, 57)
        pdf.text('Overview', margin, yPos)
        yPos += 8
        
        pdf.setFontSize(10)
        pdf.setTextColor(51, 51, 51)
        const overviewLines = pdf.splitTextToSize(content.overview, contentWidth)
        overviewLines.forEach(line => {
          checkAddPage(7)
          pdf.text(line, margin, yPos)
          yPos += 6
        })
        yPos += 5
      }
      
      // Goals
      if (content.goals?.length > 0) {
        checkAddPage(20)
        pdf.setFontSize(14)
        pdf.setTextColor(75, 191, 57)
        pdf.text('Goals', margin, yPos)
        yPos += 8
        
        pdf.setFontSize(10)
        pdf.setTextColor(51, 51, 51)
        content.goals.forEach((goal, idx) => {
          checkAddPage(7)
          const goalText = pdf.splitTextToSize(`${idx + 1}. ${goal}`, contentWidth - 10)
          goalText.forEach(line => {
            pdf.text(line, margin + 5, yPos)
            yPos += 6
          })
        })
        yPos += 5
      }
      
      // Deliverables
      if (content.deliverables?.length > 0) {
        checkAddPage(20)
        pdf.setFontSize(14)
        pdf.setTextColor(75, 191, 57)
        pdf.text('Deliverables', margin, yPos)
        yPos += 8
        
        pdf.setFontSize(10)
        pdf.setTextColor(51, 51, 51)
        content.deliverables.forEach(item => {
          checkAddPage(12)
          pdf.setFont(undefined, 'bold')
          pdf.text(item.title, margin + 5, yPos)
          yPos += 6
          
          pdf.setFont(undefined, 'normal')
          const descLines = pdf.splitTextToSize(item.description, contentWidth - 10)
          descLines.forEach(line => {
            checkAddPage(6)
            pdf.text(line, margin + 5, yPos)
            yPos += 5
          })
          yPos += 3
        })
        yPos += 5
      }
      
      // Investment
      if (content.investment) {
        checkAddPage(30)
        pdf.setFontSize(14)
        pdf.setTextColor(75, 191, 57)
        pdf.text('Investment', margin, yPos)
        yPos += 10
        
        pdf.setFontSize(16)
        pdf.setTextColor(51, 51, 51)
        pdf.setFont(undefined, 'bold')
        pdf.text(content.investment, margin + 5, yPos)
        pdf.setFont(undefined, 'normal')
        yPos += 10
      }
      
      // Signature section
      if (proposal.signedAt) {
        checkAddPage(40)
        yPos += 10
        pdf.setDrawColor(220, 220, 220)
        pdf.line(margin, yPos, pageWidth - margin, yPos)
        yPos += 10
        
        pdf.setFontSize(12)
        pdf.setTextColor(75, 191, 57)
        pdf.text('Signature', margin, yPos)
        yPos += 8
        
        pdf.setFontSize(10)
        pdf.setTextColor(51, 51, 51)
        pdf.text(`Signed by: ${user?.name || 'Client'}`, margin, yPos)
        yPos += 6
        pdf.text(`Date: ${new Date(proposal.signedAt).toLocaleDateString()}`, margin, yPos)
        yPos += 10
        
        // Note about signature
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text('(Digital signature captured - see original document for signature image)', margin, yPos)
      }
      
      // Footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      const footerY = pageHeight - 10
      pdf.text('Generated by Uptrade Media Portal', margin, footerY)
      pdf.text(new Date().toLocaleString(), pageWidth - margin - 40, footerY)
      
      // Download
      pdf.save(`${proposal.title.replace(/[^a-z0-9]/gi, '_')}.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setExportingPDF(false)
    }
  }

  useEffect(() => {
    // If proposal is passed as prop, use it directly
    if (proposalProp) {
      setProposal(proposalProp)
    }
  }, [proposalProp])

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!proposal) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Proposal not found</h3>
          <p className="text-gray-500 mb-4">The requested proposal could not be loaded.</p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  // Sample MBFM proposal content (this would come from the database in a real implementation)
  const mbfmProposalContent = {
    title: "Website Redesign, AI Integration, and Digital Growth Proposal",
    client: "Mercedes-Benz of Fort Mitchell Vans",
    date: "October 6, 2025",
    status: proposal.is_approved ? "approved" : "pending",
    urgentIssues: [
      {
        title: "Mobile Experience Breakdown",
        description: "Your mobile website is completely broken, showing 404 errors and formatting issues that prevent customers from browsing inventory or contacting your dealership.",
        impact: "68% Mobile Traffic Lost"
      },
      {
        title: "Homepage Layout Issues", 
        description: "Critical formatting problems on mobile devices make your inventory impossible to view, directly impacting sales and customer experience.",
        impact: "$2,400 Daily Revenue Loss"
      }
    ],
    currentStats: {
      monthlyVisitors: 216,
      keywords: 101,
      trafficValue: 353,
      paidVisibility: 0
    },
    objectives: [
      "Build a modern, fully responsive website independent of Dealer.com with perfect mobile experience",
      "Integrate an AI Sales Assistant to answer customer questions, qualify leads, and initiate financing instantly",
      "Connect live inventory with vehicle-level structured data for maximum SEO visibility and local search dominance",
      "Increase organic search traffic by 400–600% within 6 months through advanced SEO strategies",
      "Improve conversion rates from 1% to 5%+ through optimized user experience and instant lead response",
      "Route all qualified leads directly to CRM and finance systems with automated follow-up sequences"
    ],
    timeline: [
      { phase: "Discovery & Planning", duration: "Week 1-2", description: "Site audit, competitor analysis, and technical planning" },
      { phase: "Design & Development", duration: "Week 3-8", description: "Custom website build with mobile-first approach" },
      { phase: "AI Integration", duration: "Week 9-10", description: "AI sales assistant implementation and training" },
      { phase: "Testing & Launch", duration: "Week 11-12", description: "Quality assurance, performance optimization, and go-live" }
    ],
    investment: {
      websiteRedesign: 15000,
      aiIntegration: 8000,
      seoOptimization: 5000,
      total: 28000,
      monthlyMaintenance: 1500
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={exportingPDF}
          >
            <Download className="w-4 h-4 mr-2" />
            {exportingPDF ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Proposal Content - wrapped in ref for PDF export */}
      <div ref={proposalRef}>
        {/* Proposal Header */}
        <Card className="mb-8">
          <CardHeader className="bg-gradient-to-r from-[#4bbf39]/5 to-[#39bfb0]/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{mbfmProposalContent.title}</CardTitle>
              <CardDescription className="text-lg">
                Prepared for: {mbfmProposalContent.client}
              </CardDescription>
            </div>
            <Badge 
              className={
                mbfmProposalContent.status === 'approved' 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
              }
            >
              {mbfmProposalContent.status === 'approved' ? 'Approved' : 'Pending Review'}
            </Badge>
          </div>
          <div className="flex items-center space-x-6 text-sm text-gray-600 mt-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {mbfmProposalContent.date}
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              ${mbfmProposalContent.investment.total.toLocaleString()} Total Investment
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              12 Week Timeline
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Critical Issues Alert */}
      <Card className="mb-8 border-red-200 bg-red-50" data-section="critical-issues">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center">
            <AlertTriangle className="h-6 w-6 mr-2" />
            Critical Issues Identified
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {mbfmProposalContent.urgentIssues.map((issue, index) => (
              <div key={index} className="bg-white rounded-lg p-6 border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                  {index === 0 ? <Smartphone className="h-5 w-5 mr-2" /> : <Search className="h-5 w-5 mr-2" />}
                  {issue.title}
                </h4>
                <p className="text-gray-700 mb-3">{issue.description}</p>
                <Badge variant="destructive">{issue.impact}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Performance */}
      <Card className="mb-8" data-section="current-performance">
        <CardHeader>
          <CardTitle>Current Website Performance</CardTitle>
          <CardDescription>SEMrush audit results showing critical performance gaps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">{mbfmProposalContent.currentStats.monthlyVisitors}</div>
              <div className="text-sm text-gray-600">Monthly Visitors</div>
              <div className="text-xs text-red-500 mt-1">Should be 2,000+</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">{mbfmProposalContent.currentStats.keywords}</div>
              <div className="text-sm text-gray-600">Keywords (100% branded)</div>
              <div className="text-xs text-red-500 mt-1">Missing 500+ opportunities</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">${mbfmProposalContent.currentStats.trafficValue}</div>
              <div className="text-sm text-gray-600">Total Traffic Value</div>
              <div className="text-xs text-red-500 mt-1">Should be $15,000+</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">{mbfmProposalContent.currentStats.paidVisibility}</div>
              <div className="text-sm text-gray-600">Paid Search Visibility</div>
              <div className="text-xs text-red-500 mt-1">Competitors dominating</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Objectives */}
      <Card className="mb-8" data-section="objectives">
        <CardHeader>
          <CardTitle>Project Objectives</CardTitle>
          <CardDescription>Key goals and deliverables for this engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {mbfmProposalContent.objectives.map((objective, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-[#4bbf39] mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">{objective}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Timeline */}
      <Card className="mb-8" data-section="timeline">
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
          <CardDescription>12-week implementation roadmap</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mbfmProposalContent.timeline.map((phase, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{phase.phase}</h4>
                    <Badge variant="outline">{phase.duration}</Badge>
                  </div>
                  <p className="text-gray-600">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Investment Breakdown */}
      <Card className="mb-8" data-section="investment">
        <CardHeader>
          <CardTitle>Investment Breakdown</CardTitle>
          <CardDescription>Detailed pricing for all project components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <h4 className="font-medium">Website Redesign & Development</h4>
                <p className="text-sm text-gray-600">Custom responsive website with mobile optimization</p>
              </div>
              <div className="text-lg font-semibold">${mbfmProposalContent.investment.websiteRedesign.toLocaleString()}</div>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <h4 className="font-medium">AI Sales Assistant Integration</h4>
                <p className="text-sm text-gray-600">Custom AI chatbot with CRM integration</p>
              </div>
              <div className="text-lg font-semibold">${mbfmProposalContent.investment.aiIntegration.toLocaleString()}</div>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <h4 className="font-medium">SEO Optimization & Setup</h4>
                <p className="text-sm text-gray-600">Technical SEO, structured data, and content optimization</p>
              </div>
              <div className="text-lg font-semibold">${mbfmProposalContent.investment.seoOptimization.toLocaleString()}</div>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-3">
              <div>
                <h4 className="text-lg font-bold">Total Project Investment</h4>
                <p className="text-sm text-gray-600">One-time development cost</p>
              </div>
              <div className="text-2xl font-bold text-[#4bbf39]">${mbfmProposalContent.investment.total.toLocaleString()}</div>
            </div>
            <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
              <div>
                <h4 className="font-medium">Monthly Maintenance & Support</h4>
                <p className="text-sm text-gray-600">Ongoing updates, security, and optimization</p>
              </div>
              <div className="text-lg font-semibold">${mbfmProposalContent.investment.monthlyMaintenance.toLocaleString()}/month</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Why Choose Uptrade Media */}
      <Card className="mb-8" data-section="why-choose-us">
        <CardHeader>
          <CardTitle>Why Choose Uptrade Media</CardTitle>
          <CardDescription>Our competitive advantages and proven track record</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-r from-[#4bbf39]/5 to-[#39bfb0]/5 rounded-lg">
              <Award className="h-12 w-12 text-[#4bbf39] mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Automotive Expertise</h4>
              <p className="text-sm text-gray-600">Specialized experience with Mercedes-Benz dealerships and automotive digital marketing</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-r from-[#4bbf39]/5 to-[#39bfb0]/5 rounded-lg">
              <TrendingUp className="h-12 w-12 text-[#4bbf39] mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Proven Results</h4>
              <p className="text-sm text-gray-600">Average 400% increase in organic traffic and 300% improvement in conversion rates</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-r from-[#4bbf39]/5 to-[#39bfb0]/5 rounded-lg">
              <Shield className="h-12 w-12 text-[#4bbf39] mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Full Support</h4>
              <p className="text-sm text-gray-600">Dedicated account management with 24/7 technical support and ongoing optimization</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Section */}
      <div data-section="signature">
        {proposal && (
          <ProposalSignature 
            proposalId={proposal.id}
            proposalTitle={proposal.title}
            clientName={user?.name}
            clientEmail={user?.email}
            onSignatureStarted={() => isPublicView && trackEvent('signature_started')}
          />
        )}
      </div>
      </div>
      {/* End of PDF export content */}

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 rounded-full w-12 h-12 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a] shadow-lg"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 rotate-90" />
        </Button>
      )}
    </div>
  )
}

export default ProposalTemplate
