import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, DollarSign, Target, TrendingUp, Users, Zap, CheckCircle, ArrowUp, Download, AlertTriangle, Smartphone, Search, Star, Award, Clock, Shield, BarChart3, Globe, ShoppingCart, Mail, MapPin, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import Navigation from './Navigation'
import Row94DocuSignSignature from './Row94DocuSignSignature'
import SemrushPDF from '../assets/Semrush-Domain_Overview_(Desktop)-row94whiskey_com-9th_Oct_2025.pdf'
import LogoPng from '../assets/logo.png'

const Row94WhiskeyPage = () => {
  const [showBackToTop, setShowBackToTop] = useState(false)

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Show back to top button when scrolled down
  window.addEventListener('scroll', () => {
    setShowBackToTop(window.scrollY > 300)
  })

  return (
    <>
      <Helmet>
        <title>Row 94 Whiskey Digital Growth Proposal - Uptrade Media</title>
        <meta name="description" content="Comprehensive digital growth and compliance optimization proposal for Row 94 Whiskey by Uptrade Media." />
      </Helmet>
    <div className="min-h-screen bg-white">
      <Navigation />

{/* Hero Section */}
<section className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 py-16">
  {/* Background pattern */}
  <div className="absolute inset-0 opacity-10">
    <div className="absolute inset-0" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d97706' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    }} />
  </div>

  <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-12">
      <div className="inline-flex items-center bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
        <TrendingUp className="h-4 w-4 mr-2" />
        OPPORTUNITY: Untapped Digital Revenue Potential
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        Digital Growth, Compliance & 
        <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
          {' '}Revenue Optimization
        </span> Proposal
      </h1>
      <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-8 text-gray-700">
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-2 text-amber-600" />
          Prepared for: Row 94 Whiskey Team
        </div>
        <div className="flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-amber-600" />
          Date: October 10, 2025
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Executive Summary */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Executive Summary</h2>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8 mb-8">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Row 94 Whiskey already carries the storytelling and credibility of a national brand through its partnership with Dierks Bentley. 
              However, the current digital infrastructure is not converting this recognition into recurring revenue at its full potential.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Our mission is to make Row 94 discoverable, compliant, and conversion-focused through data-driven optimization 
              and smart API integrations that automate compliance, personalize experiences, and boost revenue within weeks.
            </p>
          </div>

          {/* Current Performance Metrics */}
          <div className="bg-white rounded-xl shadow-lg border p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Current Digital Performance (SEMrush Analysis)</h3>
              <a href={SemrushPDF} download>
                <Button variant="outline" size="sm" className="border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Download Full Report
                </Button>
              </a>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600 mb-2">557</div>
                <div className="text-sm text-gray-600">Monthly Organic Visitors</div>
                <div className="text-xs text-orange-500 mt-1">-1% change</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600 mb-2">173</div>
                <div className="text-sm text-gray-600">Keywords Ranking</div>
                <div className="text-xs text-orange-500 mt-1">-2% change</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">$865</div>
                <div className="text-sm text-gray-600">Traffic Value</div>
                <div className="text-xs text-red-500 mt-1">-21% decline</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">0</div>
                <div className="text-sm text-gray-600">Paid Search Campaigns</div>
                <div className="text-xs text-red-500 mt-1">Missing opportunity</div>
              </div>
            </div>
          </div>

          {/* Critical Issues */}
          <div className="bg-red-50 rounded-xl p-8 border-l-4 border-red-500">
            <h3 className="text-2xl font-bold text-red-900 mb-6 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-3" />
              Critical Digital Gaps Identified
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-semibold text-red-900 mb-3 flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Brand Dependency Crisis
                </h4>
                <p className="text-gray-700 text-sm mb-2">
                  77.56% of traffic comes from branded searches only. Missing 80% of potential whiskey discovery market.
                </p>
                <div className="text-2xl font-bold text-red-600">22.44%</div>
                <div className="text-xs text-gray-500">Non-branded traffic share</div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-semibold text-red-900 mb-3 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Compliance Vulnerabilities
                </h4>
                <p className="text-gray-700 text-sm mb-2">
                  No automated age verification or shipping compliance system for alcohol sales.
                </p>
                <div className="text-2xl font-bold text-red-600">High Risk</div>
                <div className="text-xs text-gray-500">Legal & operational exposure</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Roadmap */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Strategic Roadmap</h2>
          
          {/* Phase 1 */}
          <div className="bg-white rounded-xl shadow-lg border mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6">
              <h3 className="text-2xl font-bold mb-2">Phase 1: Foundation & Quick-Win Integrations</h3>
              <p className="text-amber-100">Weeks 1-3 • Solve compliance, trust, and conversion barriers immediately</p>
            </div>
            
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-amber-600" />
                      Age Verification & Compliance Stack
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Veratad + Sovos ShipCompliant + MaxMind GeoIP2 integration for 100% legal compliance and improved checkout flow.
                    </p>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-green-800">Expected Impact:</div>
                      <div className="text-sm text-green-700">+10-15% checkout completion rate</div>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Star className="h-5 w-5 mr-2 text-amber-600" />
                      Customer Reviews & Social Proof
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Yotpo integration for verified buyer reviews, photos, and star ratings with rich snippets for SEO.
                    </p>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-green-800">Expected Impact:</div>
                      <div className="text-sm text-green-700">+20-30% product page conversion lift</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Mail className="h-5 w-5 mr-2 text-amber-600" />
                      Email & SMS Automation
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Klaviyo + Postscript for automated sequences, abandoned cart recovery, and Row Club nurturing.
                    </p>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-green-800">Expected Impact:</div>
                      <div className="text-sm text-green-700">+15-25% lift in total sales</div>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-amber-600" />
                      Store Locator & Retail Bridge
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Google Maps integration to convert blocked DTC visitors into retail purchasers.
                    </p>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-green-800">Expected Impact:</div>
                      <div className="text-sm text-green-700">+25% engagement from restricted states</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-amber-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Phase 1 Investment</h4>
                    <p className="text-sm text-gray-600">Quick-win integrations and compliance setup</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-600">$4,500</div>
                    <div className="text-sm text-gray-500">3-week timeline</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="bg-white rounded-xl shadow-lg border mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <h3 className="text-2xl font-bold mb-2">Phase 2: Content & SEO Expansion</h3>
              <p className="text-blue-100">Weeks 3-8 • Build discovery presence and organic growth</p>
            </div>
            
            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Globe className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Row 94 Journal Launch</h4>
                  <p className="text-sm text-gray-600">Bourbon education and cocktail content hub</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Search className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">SEO Foundation</h4>
                  <p className="text-sm text-gray-600">Product, FAQ, and Article schema implementation</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Authority Building</h4>
                  <p className="text-sm text-gray-600">Backlink outreach and internal link architecture</p>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-3">Expected Growth Metrics</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-600">+75-120%</div>
                    <div className="text-sm text-gray-600">Organic traffic increase</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">+300</div>
                    <div className="text-sm text-gray-600">New non-branded keywords</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-6 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Phase 2 Investment</h4>
                    <p className="text-sm text-gray-600">Content creation and SEO optimization</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">$5,300</div>
                    <div className="text-sm text-gray-500">5-week timeline</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <h3 className="text-2xl font-bold mb-2">Phase 3: Retention & Loyalty</h3>
              <p className="text-purple-100">Weeks 8-12 • Maximize customer lifetime value</p>
            </div>
            
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-purple-600" />
                    Row Club Loyalty Program
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Deploy Smile.io or LoyaltyLion for Row Club rewards with tiered perks, referral incentives, 
                    and personalized offers through Klaviyo data integration.
                  </p>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">+50%</div>
                    <div className="text-sm text-gray-600">Returning customer rate improvement</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                    Advanced Analytics
                  </h4>
                  <p className="text-gray-600 mb-4">
                    GA4 + Meta Conversions API for privacy-compliant tracking, precision retargeting, 
                    and advanced attribution across all channels.
                  </p>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">+300%</div>
                    <div className="text-sm text-gray-600">ROAS improvement on retargeting</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-purple-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Phase 3 Investment</h4>
                    <p className="text-sm text-gray-600">Loyalty program and advanced analytics</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">$2,700</div>
                    <div className="text-sm text-gray-500">4-week timeline</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Summary */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Investment Summary</h2>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Project Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                    <div>
                      <div className="font-medium text-gray-900">Phase 1: Quick-Win Integrations</div>
                      <div className="text-sm text-gray-600">Compliance + conversion optimization</div>
                    </div>
                    <div className="text-lg font-bold text-amber-600">$4,500</div>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                    <div>
                      <div className="font-medium text-gray-900">Phase 2: Content & SEO</div>
                      <div className="text-sm text-gray-600">Organic growth foundation</div>
                    </div>
                    <div className="text-lg font-bold text-blue-600">$5,300</div>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                    <div>
                      <div className="font-medium text-gray-900">Phase 3: Retention & Analytics</div>
                      <div className="text-sm text-gray-600">Loyalty program + advanced tracking</div>
                    </div>
                    <div className="text-lg font-bold text-purple-600">$2,700</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Total Investment</h3>
                <div className="bg-white rounded-xl p-6 shadow-lg border text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">$12,500</div>
                  <div className="text-lg text-gray-600 mb-4">Complete Digital Transformation</div>
                  <div className="text-sm text-gray-500 mb-6">12-week implementation timeline</div>
                  
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium text-gray-900 mb-2">Optional Ongoing Support</div>
                    <div className="text-2xl font-bold text-amber-600">$1,000/month</div>
                    <div className="text-xs text-gray-500">SEO, reporting, CRO testing</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROI Projections */}
          <div className="bg-green-50 rounded-xl p-8 border-l-4 border-green-500">
            <h3 className="text-2xl font-bold text-green-900 mb-6">Projected ROI & Growth</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">75-120%</div>
                <div className="text-sm text-gray-600">Organic Traffic Growth</div>
                <div className="text-xs text-green-500 mt-1">Within 6 months</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">25-40%</div>
                <div className="text-sm text-gray-600">Conversion Rate Lift</div>
                <div className="text-xs text-green-500 mt-1">Through optimization</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">300%</div>
                <div className="text-sm text-gray-600">ROAS Improvement</div>
                <div className="text-xs text-green-500 mt-1">On retargeting campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">50%</div>
                <div className="text-sm text-gray-600">Returning Customers</div>
                <div className="text-xs text-green-500 mt-1">Through loyalty program</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Uptrade Media */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Why Choose Uptrade Media</h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3">Regulated Industry Expertise</h3>
              <p className="text-gray-600 text-sm">
                Specialized experience with alcohol compliance, age verification, and DTC beverage brands. 
                We understand the unique challenges of the spirits industry.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3">Proven Growth Results</h3>
              <p className="text-gray-600 text-sm">
                Increased organic traffic by 1084.4% for Queen City Riverboats and tripled inbound leads 
                for Spade Kreations through data-driven strategies.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3">Fast Implementation</h3>
              <p className="text-gray-600 text-sm">
                Quick-win integrations live within 3 weeks. Transparent communication, 
                measurable outcomes, and dedicated project management throughout.
              </p>
            </div>
          </div>

          {/* Success Stories */}
          <div className="bg-white rounded-xl shadow-lg border p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Client Success Highlights</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="border-l-4 border-amber-500 pl-6">
                <h4 className="font-semibold text-gray-900 mb-2">Queen City Riverboats</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Tourism & Entertainment Industry
                </p>
                <div className="text-2xl font-bold text-amber-600 mb-1">1,084.4%</div>
                <div className="text-sm text-gray-500">Organic traffic increase</div>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-6">
                <h4 className="font-semibold text-gray-900 mb-2">Spade Kreations</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Custom Manufacturing & Design
                </p>
                <div className="text-2xl font-bold text-blue-600 mb-1">3x</div>
                <div className="text-sm text-gray-500">Inbound lead generation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Implementation Timeline</h2>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8">
            <div className="text-center mb-8">
              <div className="text-4xl font-bold text-amber-600 mb-2">12 Weeks</div>
              <div className="text-lg text-gray-600">From compliance gaps to revenue optimization</div>
              <div className="text-sm text-amber-600 mt-2">Fast execution with measurable milestones</div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-600 mb-2">3</div>
                <div className="text-sm text-gray-600 font-medium mb-2">Weeks 1-3</div>
                <div className="text-xs text-gray-500">Compliance & Quick Wins</div>
              </div>
              
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-2">5</div>
                <div className="text-sm text-gray-600 font-medium mb-2">Weeks 4-8</div>
                <div className="text-xs text-gray-500">Content & SEO Growth</div>
              </div>
              
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600 mb-2">4</div>
                <div className="text-sm text-gray-600 font-medium mb-2">Weeks 9-12</div>
                <div className="text-xs text-gray-500">Loyalty & Optimization</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16 bg-amber-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Ready to Transform Row 94's Digital Presence?</h2>
          
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Next Steps</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">1. Approve Proposal</h4>
                <p className="text-sm text-gray-600">Sign digitally to start implementation</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">2. Kickoff Call</h4>
                <p className="text-sm text-gray-600">Confirm integrations, credentials, and goals</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">3. Launch Phase 1</h4>
                <p className="text-sm text-gray-600">Compliance stack live within 3 weeks</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">4. Scale & Optimize</h4>
                <p className="text-sm text-gray-600">Phases 2-3 for sustained growth</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg text-gray-700 mb-6">
              Transform Row 94 Whiskey into a compliant, discoverable, and conversion-optimized digital revenue machine.
            </p>
            <div className="inline-flex items-center bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
              <Clock className="h-4 w-4 mr-2" />
              Limited availability: Only 2 spirits industry projects in Q4 2025
            </div>
          </div>
        </div>
      </section>

      {/* DocuSign Signature Integration */}
      <Row94DocuSignSignature />

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
              Transforming spirits brands into digital revenue machines
            </p>
            <div className="flex justify-center space-x-6 mb-6">
              <a
                href="https://www.uptrademedia.com/privacy/"
                className="text-gray-400 hover:text-amber-500 transition-colors"
                target="_blank" rel="noopener"
              >
                Privacy
              </a>
              <a
                href="https://www.uptrademedia.com/terms/"
                className="text-gray-400 hover:text-amber-500 transition-colors"
                target="_blank" rel="noopener"
              >
                Terms
              </a>
              <a
                href="https://www.uptrademedia.com/contact/"
                className="text-gray-400 hover:text-amber-500 transition-colors"
                target="_blank" rel="noopener"
              >
                Contact
              </a>
            </div>
            
            {/* Back to Top Button */}
            {showBackToTop && (
              <Button
                onClick={scrollToTop}
                className="mb-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
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
                This proposal is confidential and proprietary to Row 94 Whiskey
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}

export default Row94WhiskeyPage
