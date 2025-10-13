import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import ProposalSignature from './ProposalSignature'
import Navigation from '@/pages/Navigation'
import { Calendar, Users, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProposalLayout({ 
  children, 
  meta = {},
  showSignature = true 
}) {
  const {
    title = 'Proposal',
    client = 'Client',
    clientEmail = '',
    date = new Date().toLocaleDateString(),
    proposalId = 'proposal-id',
    heroVideo = null,
    heroImage = null,
    heroSubtitle = null,
    brandColors = {
      primary: '#4bbf39',
      secondary: '#39bfb0'
    }
  } = meta

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-black py-12 sm:py-16 min-h-screen flex items-center">
        {/* Background Media */}
        {heroVideo && (
          <video 
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay 
            muted 
            loop 
            playsInline
            src={heroVideo}
          />
        )}
        {heroImage && !heroVideo && (
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
        )}
        {!heroVideo && !heroImage && (
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)`
            }}
          />
        )}
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center">
            {/* Badge */}
            <div 
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold tracking-wider mb-6 sm:mb-8 transform -skew-x-12 shadow-lg"
              style={{ 
                background: `linear-gradient(to right, ${brandColors.primary}, ${brandColors.secondary})`,
                color: 'black'
              }}
            >
              <span className="hidden sm:inline">DIGITAL GROWTH PROPOSAL</span>
              <span className="sm:hidden">PROPOSAL</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 sm:mb-8 tracking-tight drop-shadow-2xl leading-tight">
              {title}
            </h1>
            
            {heroSubtitle && (
              <div className="max-w-3xl mx-auto mb-8 sm:mb-12">
                <p className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed font-medium drop-shadow-lg px-2">
                  {heroSubtitle}
                </p>
              </div>
            )}
            
            {/* Info Box */}
            <div className="relative inline-block w-full max-w-md sm:max-w-none">
              <div 
                className="absolute -inset-2 sm:-inset-4 border-2 transform rotate-1 shadow-xl"
                style={{ borderColor: brandColors.primary }}
              ></div>
              <div className="relative bg-black bg-opacity-80 border p-4 sm:p-6 md:p-8 backdrop-blur-sm"
                style={{ borderColor: brandColors.secondary }}
              >
                <div className="flex flex-col md:flex-row justify-center items-center space-y-3 md:space-y-0 md:space-x-12 text-white">
                  <div className="flex items-center">
                    <Users 
                      className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" 
                      style={{ color: brandColors.primary }}
                    />
                    <span className="font-bold text-sm sm:text-base lg:text-lg tracking-wide">
                      {client}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar 
                      className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3"
                      style={{ color: brandColors.primary }}
                    />
                    <span className="font-bold text-sm sm:text-base lg:text-lg tracking-wide">
                      {date}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>

      {/* Signature Section */}
      {showSignature && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProposalSignature 
              proposalId={proposalId}
              proposalTitle={title}
              clientName={client}
              clientEmail={clientEmail}
            />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer 
        className="text-white py-12 border-t-4"
        style={{ 
          backgroundColor: 'black',
          borderColor: brandColors.primary 
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img 
              src="/logo.png" 
              alt="Uptrade Media" 
              className="h-12 mx-auto mb-6 opacity-90"
            />
            <div className="space-y-2">
              <p className="text-white/90 text-sm">
                © {new Date().getFullYear()} Uptrade Media. All rights reserved.
              </p>
              <p 
                className="text-xs mt-2 font-bold tracking-wider"
                style={{ color: brandColors.primary }}
              >
                THIS PROPOSAL IS CONFIDENTIAL AND PROPRIETARY
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
