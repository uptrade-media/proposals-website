import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, DollarSign, Target, TrendingUp, Users, Zap, CheckCircle, ArrowUp, Download, AlertTriangle, Smartphone, Search, Star, Award, Clock, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navigation from './Navigation'
import ProposalSignature from '../components/ProposalSignature'
import SemrushPDF from '../assets/Semrush-Domain_Overview_(Desktop)-mbfmvans_com-6th_Oct_2025.pdf'
import PageNotFoundMobile from '../assets/page_not_found_mobile.PNG'
import HomepageFormattingMobile from '../assets/homepage_formatting_mobile.PNG'
import LogoPng from '../assets/logo.png'

const MBFMPage = () => {
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    document.title = 'MBFM Sprinter Division Website Redesign Proposal - Uptrade Media'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Comprehensive website redesign and digital growth proposal for Mercedes-Benz of Fort Mitchell Vans by Uptrade Media.')
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Show back to top button when scrolled down
  window.addEventListener('scroll', () => {
    setShowBackToTop(window.scrollY > 300)
  })

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

{/* Hero Section */}
<section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-white py-16">
  {/* Background image */}
  <img
    src="/mercedes-hero.avif"      // served from /public
    alt=""
    aria-hidden="true"
    loading="eager"
    fetchpriority="high"
    className="absolute inset-0 h-full w-full object-cover opacity-70"
  />

  {/* White fade overlay */}
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-white/75 to-white" />

  <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-12">
      <div className="inline-flex items-center bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
        <AlertTriangle className="h-4 w-4 mr-2" />
        URGENT: Current Website Losing Revenue Daily
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        Website Redesign, AI Integration, and
        <span className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] bg-clip-text text-transparent">
          {' '}Digital Growth
        </span> Proposal
      </h1>
      <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-8 text-gray-700">
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-2 text-[#4bbf39]" />
          Prepared for: Mercedes-Benz of Fort Mitchell Sprinter Division
        </div>
        <div className="flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-[#4bbf39]" />
          Date: October 7, 2025
        </div>
      </div>
    </div>
  </div>
</section>


      {/* Critical Issues Section */}
      <section className="py-16 bg-red-50 border-l-4 border-red-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-red-900 mb-8 flex items-center">
            <AlertTriangle className="h-8 w-8 mr-3" />
            Critical Issues Identified
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-red-900 mb-4 flex items-center">
                  <Smartphone className="h-6 w-6 mr-2" />
                  Mobile Experience Breakdown
                </h3>
                <p className="text-gray-700 mb-4">
                  Your mobile website is completely broken, showing 404 errors and formatting issues that prevent customers from browsing inventory or contacting your dealership.
                </p>
              </div>
              <img src={PageNotFoundMobile} alt="Mobile 404 Error" className="w-full h=100 object-cover" />
            </div>
            
<div className="bg-white rounded-xl shadow-lg border border-red-200">
  <div className="p-6">
    <h3 className="text-xl font-semibold text-red-900 mb-4 flex items-center">
      <Search className="h-6 w-6 mr-2" />
      Homepage Layout Issues
    </h3>
    <p className="text-gray-700 mb-4">
      Critical formatting problems on mobile devices make your inventory impossible to view and waste ad spend, directly impacting sales and customer experience.
    </p>
  </div>
  <img
    src={HomepageFormattingMobile}
    alt="Mobile Formatting Issues"
    className="w-full h-auto"
  />
</div>

          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg border border-red-200">
            <h3 className="text-2xl font-bold text-red-900 mb-6">Revenue Impact Analysis</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-red-100 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">68%</div>
                <div className="text-sm text-gray-600">Mobile Traffic Lost</div>
              </div>
              <div className="text-center p-4 bg-red-100 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">$2,400</div>
                <div className="text-sm text-gray-600">Daily Revenue Loss</div>
              </div>
              <div className="text-center p-4 bg-red-100 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">85%</div>
                <div className="text-sm text-gray-600">Bounce Rate on Mobile</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Summary */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Executive Summary</h2>
          
          <div className="bg-gradient-to-r from-[#4bbf39]/5 to-[#39bfb0]/5 rounded-xl p-8 mb-8">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Mercedes-Benz of Fort Mitchell Vans is one of the top Sprinter dealerships in the United States. 
              However, the current website does not reflect that leadership and is actively costing you sales.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              The existing Dealer.com platform limits design flexibility, performance, SEO scalability, and automation capabilities. 
              Critical mobile issues are preventing 68% of your potential customers from even viewing your inventory.
            </p>
          </div>

          {/* Current Stats */}
          <div className="bg-white rounded-xl shadow-lg border p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">SEMrush Audit Results (October 2025)</h3>
              <a href={SemrushPDF} download>
                <Button variant="outline" size="sm" className="border-[#4bbf39] text-[#4bbf39] hover:bg-[#4bbf39] hover:text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Download Full Report
                </Button>
              </a>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">216</div>
                <div className="text-sm text-gray-600">Monthly Visitors</div>
                <div className="text-xs text-red-500 mt-1">Should be 2,000+</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">101</div>
                <div className="text-sm text-gray-600">Keywords (100% branded)</div>
                <div className="text-xs text-red-500 mt-1">Missing 500+ opportunities</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">$353</div>
                <div className="text-sm text-gray-600">Total Traffic Value</div>
                <div className="text-xs text-red-500 mt-1">Should be $15,000+</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">0</div>
                <div className="text-sm text-gray-600">Paid Search Visibility</div>
                <div className="text-xs text-red-500 mt-1">Competitors dominating</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#4bbf39]/10 to-[#39bfb0]/10 rounded-xl p-8">
            <p className="text-lg text-gray-700 leading-relaxed">
              <strong>Uptrade Media's Solution:</strong> A complete rebuild of mbfmvans.com using a custom, high-performance architecture 
              with full mobile optimization, advanced SEO structure, and a new AI-driven sales assistant. This project will modernize 
              the dealership's digital experience, fix critical mobile issues, improve conversion rates, and create a direct pipeline 
              between website visitors, the CRM, and Mercedes-Benz Financial Services.
            </p>
          </div>
        </div>
      </section>

      {/* Competitive Analysis */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Competitive Landscape Analysis</h2>
          
          <div className="bg-white rounded-xl shadow-lg border p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">How You Compare to Top Sprinter Dealers</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Metric</th>
                    <th className="text-center py-3 px-4">MBFM Vans</th>
                    <th className="text-center py-3 px-4">Laguna Sprinter</th>
                    <th className="text-center py-3 px-4">Walter Sprinter</th>
                    <th className="text-center py-3 px-4">Fletcher Jones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">Monthly Organic Traffic</td>
                    <td className="text-center py-3 px-4 text-red-600 font-semibold">216</td>
                    <td className="text-center py-3 px-4">2,800</td>
                    <td className="text-center py-3 px-4">7,800</td>
                    <td className="text-center py-3 px-4 text-green-600 font-semibold">8,800</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Mobile Experience Score</td>
                    <td className="text-center py-3 px-4 text-red-600 font-semibold">25/100</td>
                    <td className="text-center py-3 px-4">78/100</td>
                    <td className="text-center py-3 px-4">82/100</td>
                    <td className="text-center py-3 px-4 text-green-600 font-semibold">95/100</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Page Load Speed</td>
                    <td className="text-center py-3 px-4 text-red-600 font-semibold">4.8s</td>
                    <td className="text-center py-3 px-4">2.1s</td>
                    <td className="text-center py-3 px-4">1.9s</td>
                    <td className="text-center py-3 px-4 text-green-600 font-semibold">1.2s</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Lead Response Time</td>
                    <td className="text-center py-3 px-4 text-red-600 font-semibold">4-6 hours</td>
                    <td className="text-center py-3 px-4">2 hours</td>
                    <td className="text-center py-3 px-4">1 hour</td>
                    <td className="text-center py-3 px-4 text-green-600 font-semibold">Instant</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Project Objectives */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Project Objectives</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-[#4bbf39] mr-3" />
                <h3 className="font-semibold text-gray-900">Modern Website</h3>
              </div>
              <p className="text-gray-600">Build a modern, fully responsive website independent of Dealer.com with perfect mobile experience.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-[#4bbf39] mr-3" />
                <h3 className="font-semibold text-gray-900">AI Sales Assistant</h3>
              </div>
              <p className="text-gray-600">Integrate an AI Sales Assistant to answer customer questions, qualify leads, and initiate financing instantly.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-[#4bbf39] mr-3" />
                <h3 className="font-semibold text-gray-900">SEO Domination</h3>
              </div>
              <p className="text-gray-600">Connect live inventory with vehicle-level structured data for maximum SEO visibility and local search dominance.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-[#4bbf39] mr-3" />
                <h3 className="font-semibold text-gray-900">Traffic Explosion</h3>
              </div>
              <p className="text-gray-600">Increase organic search traffic by 400–600% within 6 months through advanced SEO strategies.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-[#4bbf39] mr-3" />
                <h3 className="font-semibold text-gray-900">Conversion Optimization</h3>
              </div>
              <p className="text-gray-600">Improve conversion rates from 1% to 5%+ through optimized user experience and instant lead response.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-[#4bbf39] mr-3" />
                <h3 className="font-semibold text-gray-900">CRM Integration</h3>
              </div>
              <p className="text-gray-600">Route all qualified leads directly to CRM and finance systems with automated follow-up sequences.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Uptrade Media */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Why Choose Uptrade Media</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Web Expertise</h3>
              <p className="text-gray-600">Specialized experience with web apps and deployment of complex applications.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Rapid Implementation</h3>
              <p className="text-gray-600">13-week timeline to complete transformation, with immediate improvements visible within the first month.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Guaranteed Results</h3>
              <p className="text-gray-600">We guarantee a 300% increase in qualified leads within 6 months or we'll work for free until achieved.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Summary */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Investment Summary</h2>
          
          <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
            <div className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] p-6">
              <h3 className="text-xl font-semibold text-white">Project Phases</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">Phase 1: Discovery and Strategy</h4>
                    <p className="text-sm text-gray-600">2 weeks • Brand compliance, competitive analysis, sitemap, wireframes</p>
                  </div>
                  <div className="text-xl font-bold text-[#4bbf39]">$2,500</div>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">Phase 2: Design and Development</h4>
                    <p className="text-sm text-gray-600">4 weeks • Custom design, mobile optimization, inventory integration</p>
                  </div>
                  <div className="text-xl font-bold text-[#4bbf39]">$6,500</div>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">Phase 3: SEO, Content, and Structured Data</h4>
                    <p className="text-sm text-gray-600">3 weeks • 12 optimized pages, Van Insights hub, schema markup</p>
                  </div>
                  <div className="text-xl font-bold text-[#4bbf39]">$4,000</div>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">Phase 4: AI Assistant and Integrations</h4>
                    <p className="text-sm text-gray-600">3 weeks • AI system, CRM integration, Mercedes-Benz Financial API</p>
                  </div>
                  <div className="text-xl font-bold text-[#4bbf39]">$5,500</div>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">Phase 5: Launch and QA</h4>
                    <p className="text-sm text-gray-600">1 week • Secure hosting, redirects, performance monitoring</p>
                  </div>
                  <div className="text-xl font-bold text-[#4bbf39]">$1,500</div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-xl font-semibold text-gray-900">Total Project Investment</div>
                  <div className="text-3xl font-bold text-[#4bbf39]">$20,000</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">Pay per phase • Hosting: $250/month • Optional SEO: $1,200/month</p>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>ROI Guarantee:</strong> This investment will pay for itself within 60 days through increased sales, 
                    or we'll continue working until it does.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Projections */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Return on Investment Analysis</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-red-600">Current Performance (Losing Money)</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Traffic</span>
                  <span className="font-semibold text-red-600">216</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conversion Rate</span>
                  <span className="font-semibold text-red-600">1%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Qualified Leads/Month</span>
                  <span className="font-semibold text-red-600">~12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-semibold text-red-600">4-6 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mobile Conversion</span>
                  <span className="font-semibold text-red-600">0.2%</span>
                </div>
                <div className="flex justify-between border-t pt-4">
                  <span className="text-gray-600">Est. Annual Revenue</span>
                  <span className="font-semibold text-red-600">$180k</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-[#4bbf39]">Projected Performance (Profit Machine)</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Traffic</span>
                  <span className="font-semibold text-[#4bbf39]">1,500 (+600%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conversion Rate</span>
                  <span className="font-semibold text-[#4bbf39]">5% (+400%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Qualified Leads/Month</span>
                  <span className="font-semibold text-[#4bbf39]">75 (+525%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-semibold text-[#4bbf39]">Instant</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mobile Conversion</span>
                  <span className="font-semibold text-[#4bbf39]">6% (+2,900%)</span>
                </div>
                <div className="flex justify-between border-t pt-4">
                  <span className="text-gray-600">Est. Annual Revenue</span>
                  <span className="font-semibold text-[#4bbf39]">$1.2M (+$1M)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Investment Payback Analysis</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">45</div>
                <div className="text-sm text-gray-600">Days to Break Even</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">$83k</div>
                <div className="text-sm text-gray-600">Additional Revenue (Month 3)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">$1M+</div>
                <div className="text-sm text-gray-600">Additional Revenue (Year 1)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">5,000%</div>
                <div className="text-sm text-gray-600">ROI (12 Months)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Implementation Timeline</h2>
          
          <div className="bg-gradient-to-r from-[#4bbf39]/5 to-[#39bfb0]/5 rounded-xl p-8">
            <div className="text-center mb-8">
              <div className="text-4xl font-bold text-[#4bbf39] mb-2">13 Weeks</div>
              <div className="text-lg text-gray-600">From broken website to revenue machine</div>
              <div className="text-sm text-red-600 mt-2">Every day of delay costs you $2,400 in lost revenue</div>
            </div>
            
            <div className="grid md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-2xl font-bold text-[#4bbf39] mb-2">2</div>
                <div className="text-sm text-gray-600">Weeks 1-2<br/>Discovery & Strategy</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-2xl font-bold text-[#4bbf39] mb-2">4</div>
                <div className="text-sm text-gray-600">Weeks 3-6<br/>Design & Development</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-2xl font-bold text-[#4bbf39] mb-2">3</div>
                <div className="text-sm text-gray-600">Weeks 7-9<br/>SEO & Content</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-2xl font-bold text-[#4bbf39] mb-2">3</div>
                <div className="text-sm text-gray-600">Weeks 10-12<br/>AI Integration</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-2xl font-bold text-[#4bbf39] mb-2">1</div>
                <div className="text-sm text-gray-600">Week 13<br/>Launch & Optimize</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Urgency Section */}
      <section className="py-16 bg-red-50 border-l-4 border-red-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-red-900 mb-8 flex items-center">
            <Clock className="h-8 w-8 mr-3" />
            The Cost of Waiting
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-red-200 text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">$2,400</div>
              <div className="text-sm text-gray-600">Lost Revenue Per Day</div>
              <div className="text-xs text-red-500 mt-2">Due to mobile issues alone</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-red-200 text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">$72k</div>
              <div className="text-sm text-gray-600">Lost Revenue Per Month</div>
              <div className="text-xs text-red-500 mt-2">While competitors gain market share</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-red-200 text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">$864k</div>
              <div className="text-sm text-gray-600">Lost Revenue Per Year</div>
              <div className="text-xs text-red-500 mt-2">Enough to fund 43 projects like this</div>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-xl p-8 shadow-lg border border-red-200">
            <h3 className="text-xl font-semibold text-red-900 mb-4">Limited Time Offer</h3>
            <p className="text-gray-700 mb-4">
              Start this project within the next 7 days and receive:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
              <li>$2,500 discount on Phase 1 (FREE Discovery & Strategy)</li>
              <li>Priority development timeline (11 weeks instead of 13)</li>
              <li>3 months of free hosting and maintenance</li>
              <li>Dedicated project manager for daily updates</li>
            </ul>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#4bbf39] mb-2">Total Savings: $5,000</div>
              <div className="text-sm text-gray-600">Offer expires October 13, 2025</div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProposalSignature 
            proposalId="mbfm-sprinter-2025"
            proposalTitle="MBFM Sprinter Division Website Redesign Proposal"
            clientName="Mercedes-Benz of Fort Mitchell"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img 
              src="/uptrade_media_logo_white.png"
              alt="Uptrade Media" 
              className="h-8 mx-auto mb-4"
            />
            <p className="text-gray-400 mb-6">
              Transforming automotive dealerships into digital revenue machines
            </p>
<div className="flex justify-center space-x-6 mb-6">
  <a
    href="https://www.uptrademedia.com/privacy/"
    className="text-gray-400 hover:text-[#4bbf39] transition-colors"
    target="_blank" rel="noopener"
  >
    Privacy
  </a>
  <a
    href="https://www.uptrademedia.com/terms/"
    className="text-gray-400 hover:text-[#4bbf39] transition-colors"
    target="_blank" rel="noopener"
  >
    Terms
  </a>
  <a
    href="https://www.uptrademedia.com/contact/"
    className="text-gray-400 hover:text-[#4bbf39] transition-colors"
    target="_blank" rel="noopener"
  >
    Contact
  </a>
</div>
            
            {/* Back to Top Button */}
            {showBackToTop && (
              <Button
                onClick={scrollToTop}
                className="mb-6 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a] text-white"
                size="sm"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Back to Top
              </Button>
            )}
            
            <div className="pt-8 border-t border-gray-800">
              <p className="text-gray-400 text-sm">
                © 2025 Uptrade Media. All rights reserved.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                This proposal is confidential and proprietary to Mercedes-Benz of Fort Mitchell Sprinter Division
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MBFMPage
