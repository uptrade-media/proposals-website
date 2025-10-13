import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, DollarSign, Target, TrendingUp, Users, Zap, CheckCircle, ArrowUp, Download, AlertTriangle, Smartphone, Search, Star, Award, Clock, Shield, BarChart3, Globe, ShoppingCart, Mail, MapPin, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navigation from './Navigation'
import ProposalSignature from '../components/ProposalSignature'
import SemrushPDF from '../assets/Semrush-Domain_Overview_(Desktop)-row94whiskey_com-9th_Oct_2025.pdf'
import LogoPng from '../assets/logo.png'

const Row94WhiskeyPage = () => {
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    document.title = 'Row 94 Whiskey Digital Growth Proposal - Uptrade Media'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Comprehensive digital growth and compliance optimization proposal for Row 94 Whiskey by Uptrade Media.')
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
<section className="relative overflow-hidden bg-black py-12 sm:py-16 min-h-screen flex items-center">
  {/* Row 94 Authentic Video Background */}
  <video 
    className="absolute inset-0 w-full h-full object-cover"
    autoPlay 
    muted 
    loop 
    playsInline
    src="https://row94whiskey.com/wp-content/uploads/2024/09/ROW94_WEB-HEADER_FINAL.mp4"
  />
  
  {/* Dark overlay for text readability */}
  <div className="absolute inset-0 bg-black bg-opacity-60"></div>

  <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
    <div className="text-center">
      {/* Row 94 Style Badge */}
      <div className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold tracking-wider mb-6 sm:mb-8 transform -skew-x-12 shadow-lg">
        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
        <span className="hidden sm:inline">AMPLIFY YOUR DIGITAL PRESENCE</span>
        <span className="sm:hidden">DIGITAL GROWTH</span>
      </div>
      
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 sm:mb-8 tracking-tight drop-shadow-2xl leading-tight">
        <span className="block sm:inline">DIGITAL GROWTH</span>
        <br className="hidden sm:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 drop-shadow-lg block sm:inline mt-2 sm:mt-0">
          NO APOLOGIES.
        </span>
      </h1>
      
      <div className="max-w-3xl mx-auto mb-8 sm:mb-12">
        <p className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed font-medium drop-shadow-lg px-2">
          Transform Row 94 Whiskey into a compliant, discoverable, and conversion-optimized digital revenue machine.
        </p>
      </div>
      
      {/* Gold geometric frame around key info */}
      <div className="relative inline-block w-full max-w-md sm:max-w-none">
        <div className="absolute -inset-2 sm:-inset-4 border-2 border-yellow-500 transform rotate-1 shadow-xl"></div>
        <div className="relative bg-black bg-opacity-80 border border-yellow-400 p-4 sm:p-6 md:p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-3 md:space-y-0 md:space-x-12 text-white">
            <div className="flex items-center">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-yellow-400" />
              <span className="font-bold text-sm sm:text-base lg:text-lg tracking-wide">ROW 94 WHISKEY TEAM</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-yellow-400" />
              <span className="font-bold text-sm sm:text-base lg:text-lg tracking-wide">OCTOBER 10, 2025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Executive Summary */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Executive Summary</h2>
          
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4 sm:mb-6">
              Row 94 Whiskey already carries the storytelling and credibility of a national brand through its partnership with Dierks Bentley. 
              However, the current digital infrastructure is not converting this recognition into recurring revenue at its full potential.
            </p>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              Our mission is to make Row 94 discoverable, compliant, and conversion-focused through data-driven optimization 
              and smart API integrations that automate compliance, personalize experiences, and boost revenue within weeks.
            </p>
          </div>

          {/* Current Performance Metrics */}
          <div className="bg-white rounded-xl shadow-lg border p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-0">Current Digital Performance (SEMrush Analysis)</h3>
              <a href={SemrushPDF} download>
                <Button variant="outline" size="sm" className="border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-black font-bold w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Download Full Report
                </Button>
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-1 sm:mb-2">557</div>
                <div className="text-xs sm:text-sm text-gray-600">Monthly Organic Visitors</div>
                <div className="text-xs text-orange-500 mt-1">-1% change</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-1 sm:mb-2">173</div>
                <div className="text-xs sm:text-sm text-gray-600">Keywords Ranking</div>
                <div className="text-xs text-orange-500 mt-1">-2% change</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg">
                <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">$865</div>
                <div className="text-xs sm:text-sm text-gray-600">Traffic Value</div>
                <div className="text-xs text-red-500 mt-1">-21% decline</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg">
                <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">0</div>
                <div className="text-xs sm:text-sm text-gray-600">Paid Search Campaigns</div>
                <div className="text-xs text-red-500 mt-1">Missing opportunity</div>
              </div>
            </div>
          </div>

          {/* Critical Issues */}
          <div className="bg-black rounded-xl p-4 sm:p-8 border-l-4 border-yellow-500">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center">
              <div className="flex items-center mb-2 sm:mb-0">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-yellow-400" />
                <span className="text-yellow-400">CRITICAL DIGITAL GAPS</span>
              </div>
              <span className="text-white text-lg sm:text-2xl">IDENTIFIED</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-300 rounded-lg p-4 sm:p-6 shadow-lg">
                <h4 className="font-bold text-black mb-3 flex items-center text-base sm:text-lg">
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-yellow-600" />
                  BRAND DEPENDENCY CRISIS
                </h4>
                <p className="text-gray-800 text-sm mb-3 sm:mb-4 font-medium">
                  77.56% of traffic comes from branded searches only. Missing 80% of potential whiskey discovery market.
                </p>
                <div className="text-2xl sm:text-3xl font-black text-yellow-600">22.44%</div>
                <div className="text-xs text-gray-600 font-semibold tracking-wide">NON-BRANDED TRAFFIC SHARE</div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-300 rounded-lg p-4 sm:p-6 shadow-lg">
                <h4 className="font-bold text-black mb-3 flex items-center text-base sm:text-lg">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-yellow-600" />
                  COMPLIANCE VULNERABILITIES
                </h4>
                <p className="text-gray-800 text-sm mb-3 sm:mb-4 font-medium">
                  No automated age verification or shipping compliance system for alcohol sales.
                </p>
                <div className="text-2xl sm:text-3xl font-black text-yellow-600">HIGH RISK</div>
                <div className="text-xs text-gray-600 font-semibold tracking-wide">LEGAL & OPERATIONAL EXPOSURE</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Competitive Landscape Analysis */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Competitive Landscape Analysis</h2>
          
          <div className="bg-white rounded-xl shadow-lg border p-4 sm:p-8 mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">How Row 94 Compares to Leading Whiskey Brands</h3>
            
            {/* Mobile-optimized cards for small screens */}
            <div className="block sm:hidden space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Row 94 Whiskey</div>
                <div className="text-xs text-gray-500 mb-3">Current Performance</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-lg font-bold text-red-600">557</div>
                    <div className="text-xs text-gray-600">Monthly Organic Traffic</div>
                    <div className="text-xs text-red-500">-1% change</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">173</div>
                    <div className="text-xs text-gray-600">Keywords Ranking</div>
                    <div className="text-xs text-red-500">77% branded only</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-600">25</div>
                    <div className="text-xs text-gray-600">Authority Score</div>
                    <div className="text-xs text-orange-500">Needs work</div>
                  </div>
                  <div>
                    <div className="text-sm text-red-600 font-medium">Underperforming</div>
                    <div className="text-xs text-gray-600">Market Position</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Calumet Bourbon</div>
                <div className="text-xs text-gray-500 mb-3">Market Leader</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-lg font-bold text-green-600">8,400</div>
                    <div className="text-xs text-gray-600">Monthly Organic Traffic</div>
                    <div className="text-xs text-green-500">15x Row 94</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">1,500</div>
                    <div className="text-xs text-gray-600">Keywords Ranking</div>
                    <div className="text-xs text-green-500">8.7x Row 94</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">28</div>
                    <div className="text-xs text-gray-600">Authority Score</div>
                    <div className="text-xs text-green-500">Solid foundation</div>
                  </div>
                  <div>
                    <div className="text-sm text-green-600 font-medium">Dominant</div>
                    <div className="text-xs text-gray-600">Market Position</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Augusta Distillery</div>
                <div className="text-xs text-gray-500 mb-3">Regional Competitor</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-lg font-bold text-yellow-600">3,000</div>
                    <div className="text-xs text-gray-600">Monthly Organic Traffic</div>
                    <div className="text-xs text-yellow-500">5.4x Row 94</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">381</div>
                    <div className="text-xs text-gray-600">Keywords Ranking</div>
                    <div className="text-xs text-yellow-500">2.2x Row 94</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">29</div>
                    <div className="text-xs text-gray-600">Authority Score</div>
                    <div className="text-xs text-yellow-500">Strong foundation</div>
                  </div>
                  <div>
                    <div className="text-sm text-yellow-600 font-medium">Competitive</div>
                    <div className="text-xs text-gray-600">Market Position</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">Brother Justus</div>
                <div className="text-xs text-gray-500 mb-3">UX Issues Present</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-lg font-bold text-yellow-600">2,600</div>
                    <div className="text-xs text-gray-600">Monthly Organic Traffic</div>
                    <div className="text-xs text-yellow-500">4.7x Row 94</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">697</div>
                    <div className="text-xs text-gray-600">Keywords Ranking</div>
                    <div className="text-xs text-yellow-500">4x Row 94</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">27</div>
                    <div className="text-xs text-gray-600">Authority Score</div>
                    <div className="text-xs text-yellow-500">Adequate base</div>
                  </div>
                  <div>
                    <div className="text-sm text-yellow-600 font-medium">Opportunity Gap</div>
                    <div className="text-xs text-gray-600">Market Position</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Desktop table for larger screens */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-2 sm:px-4 font-semibold text-gray-900 text-sm sm:text-base">Brand</th>
                    <th className="text-center py-4 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Monthly Organic Traffic</th>
                    <th className="text-center py-4 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Keywords Ranking</th>
                    <th className="text-center py-4 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Authority Score</th>
                    <th className="text-center py-4 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Market Position</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-2 sm:px-4">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Row 94 Whiskey</div>
                      <div className="text-xs sm:text-sm text-gray-500">Current Performance</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-red-600">557</div>
                      <div className="text-xs text-red-500">-1% change</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-red-600">173</div>
                      <div className="text-xs text-red-500">77% branded only</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-orange-600">25</div>
                      <div className="text-xs text-orange-500">Needs work</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-xs sm:text-sm text-red-600 font-medium">Underperforming</div>
                    </td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-2 sm:px-4">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Calumet Bourbon</div>
                      <div className="text-xs sm:text-sm text-gray-500">Market Leader</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-green-600">8,400</div>
                      <div className="text-xs text-green-500">15x Row 94</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-green-600">1,500</div>
                      <div className="text-xs text-green-500">8.7x Row 94</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-green-600">28</div>
                      <div className="text-xs text-green-500">Solid foundation</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-xs sm:text-sm text-green-600 font-medium">Dominant</div>
                    </td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-2 sm:px-4">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Augusta Distillery</div>
                      <div className="text-xs sm:text-sm text-gray-500">Regional Competitor</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-yellow-600">3,000</div>
                      <div className="text-xs text-yellow-500">5.4x Row 94</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-yellow-600">381</div>
                      <div className="text-xs text-yellow-500">2.2x Row 94</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-yellow-600">29</div>
                      <div className="text-xs text-yellow-500">Strong foundation</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-xs sm:text-sm text-yellow-600 font-medium">Competitive</div>
                    </td>
                  </tr>
                  
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-2 sm:px-4">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Brother Justus</div>
                      <div className="text-xs sm:text-sm text-gray-500">UX Issues Present</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-yellow-600">2,600</div>
                      <div className="text-xs text-yellow-500">4.7x Row 94</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-yellow-600">697</div>
                      <div className="text-xs text-yellow-500">4x Row 94</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-base sm:text-lg font-bold text-yellow-600">27</div>
                      <div className="text-xs text-yellow-500">Adequate base</div>
                    </td>
                    <td className="text-center py-4 px-2 sm:px-4">
                      <div className="text-xs sm:text-sm text-yellow-600 font-medium">Opportunity Gap</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white rounded-xl shadow-lg border p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-amber-600" />
                Market Opportunity
              </h3>
              <div className="space-y-4">
                <div className="p-3 sm:p-4 bg-amber-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-amber-600 mb-1">15x</div>
                  <div className="text-xs sm:text-sm text-gray-600">Traffic gap vs. Calumet Bourbon</div>
                </div>
                <p className="text-gray-700 text-sm">
                  Row 94 has significant room for growth. Even reaching 25% of Calumet's traffic would mean 
                  <strong className="text-amber-600"> 2,100 monthly visitors</strong> - a 377% increase from current levels.
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-600" />
                Competitive Advantage
              </h3>
              <div className="space-y-4">
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                  <div className="text-base sm:text-lg font-bold text-green-600 mb-1">Celebrity Partnership</div>
                  <div className="text-xs sm:text-sm text-gray-600">Dierks Bentley association</div>
                </div>
                <p className="text-gray-700 text-sm">
                  Brother Justus shows that even with good traffic (2.6k), 
                  <strong className="text-green-600"> poor UX leaves sales on the table</strong>. 
                  Row 94's celebrity partnership + optimized experience = market disruption potential.
                </p>
              </div>
            </div>
          </div>

          {/* Growth Projection */}
          <div className="mt-6 sm:mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 sm:p-8 border-l-4 border-amber-500">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Row 94's Growth Trajectory</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-400 mb-1 sm:mb-2">557</div>
                <div className="text-xs sm:text-sm text-gray-500 mb-1">Current Traffic</div>
                <div className="text-xs text-red-500">Baseline</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-amber-600 mb-1 sm:mb-2">1,200</div>
                <div className="text-xs sm:text-sm text-gray-600 mb-1">6-Month Target</div>
                <div className="text-xs text-amber-500">+115% growth</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-1 sm:mb-2">2,100</div>
                <div className="text-xs sm:text-sm text-gray-600 mb-1">12-Month Goal</div>
                <div className="text-xs text-orange-500">+277% growth</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">4,000+</div>
                <div className="text-xs sm:text-sm text-gray-600 mb-1">18-Month Vision</div>
                <div className="text-xs text-green-500">Market competitive</div>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-sm text-gray-700">
                <strong>Strategic Insight:</strong> While competitors focus on traffic volume, Row 94 can win through 
                <span className="text-amber-600 font-medium"> conversion optimization + compliance excellence + celebrity leverage</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Roadmap */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Strategic Roadmap</h2>
          
          {/* Phase 1 */}
          <div className="bg-white rounded-xl shadow-lg border mb-8 overflow-hidden">
            <div className="bg-black text-white p-6 border-b-4 border-yellow-500">
              <h3 className="text-2xl font-black mb-2 tracking-tight">PHASE 1: FOUNDATION & QUICK-WIN INTEGRATIONS</h3>
              <p className="text-yellow-400 font-bold tracking-wide">WEEKS 1-3 • SOLVE COMPLIANCE, TRUST, AND CONVERSION BARRIERS IMMEDIATELY</p>
            </div>
            
            <div className="p-4 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-4 sm:space-y-6">
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex flex-col sm:flex-row sm:items-center">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-amber-600" />
                        <span className="text-sm sm:text-base">Age Verification & Compliance Stack</span>
                      </div>
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Veratad + Sovos ShipCompliant + MaxMind GeoIP2 integration for 100% legal compliance and improved checkout flow.
                    </p>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs sm:text-sm font-medium text-green-800">Expected Impact:</div>
                      <div className="text-xs sm:text-sm text-green-700">+10-15% checkout completion rate</div>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex flex-col sm:flex-row sm:items-center">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-amber-600" />
                        <span className="text-sm sm:text-base">Customer Reviews & Social Proof</span>
                      </div>
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Yotpo integration for verified buyer reviews, photos, and star ratings with rich snippets for SEO.
                    </p>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs sm:text-sm font-medium text-green-800">Expected Impact:</div>
                      <div className="text-xs sm:text-sm text-green-700">+20-30% product page conversion lift</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex flex-col sm:flex-row sm:items-center">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-amber-600" />
                        <span className="text-sm sm:text-base">Email & SMS Automation</span>
                      </div>
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Klaviyo + Postscript for automated sequences, abandoned cart recovery, and Row Club nurturing.
                    </p>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs sm:text-sm font-medium text-green-800">Expected Impact:</div>
                      <div className="text-xs sm:text-sm text-green-700">+15-25% lift in total sales</div>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex flex-col sm:flex-row sm:items-center">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-amber-600" />
                        <span className="text-sm sm:text-base">Store Locator & Retail Bridge</span>
                      </div>
                    </h4>
                    <p className="text-gray-600 text-sm mb-3">
                      Google Maps integration to convert blocked DTC visitors into retail purchasers.
                    </p>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs sm:text-sm font-medium text-green-800">Expected Impact:</div>
                      <div className="text-xs sm:text-sm text-green-700">+25% engagement from restricted states</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-black rounded-lg border border-yellow-500">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-white mb-1 text-lg tracking-wide">PHASE 1 INVESTMENT</h4>
                    <p className="text-sm text-yellow-400 font-semibold">QUICK-WIN INTEGRATIONS AND COMPLIANCE SETUP</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-yellow-400">$4,500</div>
                    <div className="text-sm text-gray-300 font-bold">3-WEEK TIMELINE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="bg-white rounded-xl shadow-lg border mb-8 overflow-hidden">
            <div className="bg-black text-white p-6 border-b-4 border-yellow-500">
              <h3 className="text-2xl font-black mb-2 tracking-tight">PHASE 2: CONTENT & SEO EXPANSION</h3>
              <p className="text-yellow-400 font-bold tracking-wide">WEEKS 3-8 • BUILD DISCOVERY PRESENCE AND ORGANIC GROWTH</p>
            </div>
            
            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Globe className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Row 94 Journal Launch</h4>
                  <p className="text-sm text-gray-600">Bourbon education and cocktail content hub</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Search className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">SEO Foundation</h4>
                  <p className="text-sm text-gray-600">Product, FAQ, and Article schema implementation</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-3" />
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
              
              <div className="mt-6 p-6 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Phase 2 Investment</h4>
                    <p className="text-sm text-gray-600">Content creation and SEO optimization</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">$5,300</div>
                    <div className="text-sm text-gray-500">5-week timeline</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
            <div className="bg-black text-white p-6 border-b-4 border-yellow-500">
              <h3 className="text-2xl font-black mb-2 tracking-tight">PHASE 3: RETENTION & LOYALTY</h3>
              <p className="text-yellow-400 font-bold tracking-wide">WEEKS 8-12 • MAXIMIZE CUSTOMER LIFETIME VALUE</p>
            </div>
            
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-green-600" />
                    Row Club Loyalty Program
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Deploy Smile.io or LoyaltyLion for Row Club rewards with tiered perks, referral incentives, 
                    and personalized offers through Klaviyo data integration.
                  </p>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-lg font-bold text-green-600">+50%</div>
                    <div className="text-sm text-gray-600">Returning customer rate improvement</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                    Advanced Analytics
                  </h4>
                  <p className="text-gray-600 mb-4">
                    GA4 + Meta Conversions API for privacy-compliant tracking, precision retargeting, 
                    and advanced attribution across all channels.
                  </p>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-lg font-bold text-green-600">+300%</div>
                    <div className="text-sm text-gray-600">ROAS improvement on retargeting</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-black rounded-lg border border-yellow-500">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-white mb-1 text-lg tracking-wide">PHASE 3 INVESTMENT</h4>
                    <p className="text-sm text-yellow-400 font-semibold">LOYALTY PROGRAM AND ADVANCED ANALYTICS</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-yellow-400">$2,700</div>
                    <div className="text-sm text-gray-300 font-bold">4-WEEK TIMELINE</div>
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
          
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-xl p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Project Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                    <div>
                      <div className="font-medium text-gray-900">Phase 1: Quick-Win Integrations</div>
                      <div className="text-sm text-gray-600">Compliance + conversion optimization</div>
                    </div>
                    <div className="text-lg font-bold text-green-600">$4,500</div>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                    <div>
                      <div className="font-medium text-gray-900">Phase 2: Content & SEO</div>
                      <div className="text-sm text-gray-600">Organic growth foundation</div>
                    </div>
                    <div className="text-lg font-bold text-green-600">$5,300</div>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                    <div>
                      <div className="font-medium text-gray-900">Phase 3: Retention & Analytics</div>
                      <div className="text-sm text-gray-600">Loyalty program + advanced tracking</div>
                    </div>
                    <div className="text-lg font-bold text-green-600">$2,700</div>
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
                    <div className="text-2xl font-bold text-green-600">$1,000/month</div>
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
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
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
              <div className="border-l-4 border-green-500 pl-6">
                <h4 className="font-semibold text-gray-900 mb-2">Queen City Riverboats</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Tourism & Entertainment Industry
                </p>
                <div className="text-2xl font-bold text-green-600 mb-1">1,084.4%</div>
                <div className="text-sm text-gray-500">Organic traffic increase</div>
              </div>
              
              <div className="border-l-4 border-green-500 pl-6">
                <h4 className="font-semibold text-gray-900 mb-2">Spade Kreations</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Custom Manufacturing & Design
                </p>
                <div className="text-2xl font-bold text-green-600 mb-1">3x</div>
                <div className="text-sm text-gray-500">Inbound lead generation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Implementation Timeline</h2>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 sm:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="text-3xl sm:text-4xl font-bold text-grey-600 mb-2">12 Weeks</div>
              <div className="text-base sm:text-lg text-gray-600">From compliance gaps to revenue optimization</div>
              <div className="text-sm text-amber-600 mt-2">Fast execution with measurable milestones</div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1 sm:mb-2">3</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Weeks 1-3</div>
                <div className="text-xs text-gray-500">Compliance & Quick Wins</div>
              </div>
              
              <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Search className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1 sm:mb-2">5</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Weeks 4-8</div>
                <div className="text-xs text-gray-500">Content & SEO Growth</div>
              </div>
              
              <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-sm">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1 sm:mb-2">4</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Weeks 9-12</div>
                <div className="text-xs text-gray-500">Loyalty & Optimization</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-12 sm:py-16 bg-amber-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">Ready to Transform Row 94's Digital Presence?</h2>
          
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Next Steps</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center p-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">1. Approve Proposal</h4>
                <p className="text-xs sm:text-sm text-gray-600">Sign digitally to start implementation</p>
              </div>
              
              <div className="text-center p-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">2. Kickoff Call</h4>
                <p className="text-xs sm:text-sm text-gray-600">Confirm integrations, credentials, and goals</p>
              </div>
              
              <div className="text-center p-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">3. Launch Phase 1</h4>
                <p className="text-xs sm:text-sm text-gray-600">Compliance stack live within 3 weeks</p>
              </div>
              
              <div className="text-center p-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">4. Scale & Optimize</h4>
                <p className="text-xs sm:text-sm text-gray-600">Phases 2-3 for sustained growth</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6 px-2">
              Transform Row 94 Whiskey into a compliant, discoverable, and conversion-optimized digital revenue machine.
            </p>
            <div className="inline-flex items-center bg-amber-100 text-amber-800 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-center">Limited availability: Only 2 spirits industry projects in Q4 2025</span>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProposalSignature 
            proposalId="row94-whiskey-2025"
            proposalTitle="Row 94 Whiskey Digital Growth Proposal"
            clientName="Row 94 Whiskey Team"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t-4 border-yellow-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img 
              src="/uptrade_media_logo_white.png"
              alt="Uptrade Media" 
              className="h-8 mx-auto mb-4"
            />
            <p className="text-yellow-400 mb-6 font-bold tracking-wide">
              TRANSFORMING SPIRITS BRANDS INTO DIGITAL REVENUE MACHINES
            </p>
            <div className="flex justify-center space-x-6 mb-6">
              <a
                href="https://www.uptrademedia.com/privacy/"
                className="text-gray-300 hover:text-yellow-400 transition-colors font-semibold"
                target="_blank" rel="noopener"
              >
                PRIVACY
              </a>
              <a
                href="https://www.uptrademedia.com/terms/"
                className="text-gray-300 hover:text-yellow-400 transition-colors font-semibold"
                target="_blank" rel="noopener"
              >
                TERMS
              </a>
              <a
                href="https://www.uptrademedia.com/contact/"
                className="text-gray-300 hover:text-yellow-400 transition-colors font-semibold"
                target="_blank" rel="noopener"
              >
                CONTACT
              </a>
            </div>
            
            {/* Back to Top Button */}
            {showBackToTop && (
              <Button
                onClick={scrollToTop}
                className="mb-4 sm:mb-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold fixed bottom-4 right-4 sm:static sm:bottom-auto sm:right-auto z-50 rounded-full sm:rounded px-3 py-2 sm:px-4 sm:py-2"
                size="sm"
              >
                <ArrowUp className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">BACK TO TOP</span>
              </Button>
            )}
            
            <div className="pt-8 border-t border-yellow-500">
              <p className="text-gray-300 text-sm font-semibold">
                © 2025 UPTRADE MEDIA. ALL RIGHTS RESERVED.
              </p>
              <p className="text-yellow-400 text-xs mt-2 font-bold tracking-wider">
                THIS PROPOSAL IS CONFIDENTIAL AND PROPRIETARY TO ROW 94 WHISKEY
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Row94WhiskeyPage