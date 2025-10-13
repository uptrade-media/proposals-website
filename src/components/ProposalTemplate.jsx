import { useState, useEffect } from 'react'
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
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'

const ProposalTemplate = ({ proposalId, onBack }) => {
  const { user } = useAuthStore()
  const { proposals, fetchProposals } = useProjectsStore()
  const [proposal, setProposal] = useState(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    if (proposalId) {
      // Find the proposal in the store or fetch it
      const foundProposal = proposals.find(p => p.id === parseInt(proposalId))
      if (foundProposal) {
        setProposal(foundProposal)
      } else {
        fetchProposals()
      }
    }
  }, [proposalId, proposals, fetchProposals])

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
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

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
      <Card className="mb-8 border-red-200 bg-red-50">
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
      <Card className="mb-8">
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
      <Card className="mb-8">
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
      <Card className="mb-8">
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
      <Card className="mb-8">
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
      <Card className="mb-8">
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

      {/* Call to Action */}
      <Card className="mb-8 bg-gradient-to-r from-[#4bbf39]/10 to-[#39bfb0]/10">
        <CardContent className="p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Transform Your Digital Presence?</h3>
          <p className="text-lg text-gray-700 mb-6">
            Every day you wait is revenue lost to competitors. Let's fix your mobile experience and dominate local search.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Approve This Proposal
            </Button>
            <Button size="lg" variant="outline">
              <Calendar className="w-5 h-5 mr-2" />
              Schedule a Call
            </Button>
          </div>
        </CardContent>
      </Card>

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
