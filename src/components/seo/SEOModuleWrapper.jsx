// src/components/seo/SEOModuleWrapper.jsx
// Single entry point for SEO module
// Handles setup status and routes to appropriate view
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Globe, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSeoStore } from '@/lib/seo-store'
import useAuthStore from '@/lib/auth-store'
import { useSEOSetupStatus } from '@/hooks/useSEOContext'
import { SEOSetupWizard } from '@/components/signal/SignalSetupWizard'
import SEODashboard from './SEODashboard'
import SEODashboardV2 from './SEODashboardV2'
import SignalSEOLogo from './SignalSEOLogo'

// Feature flag: Set to true to use the new redesigned dashboard
const USE_NEW_DASHBOARD = true

export default function SEOModuleWrapper({ onNavigate }) {
  const { currentOrg } = useAuthStore()
  const { 
    currentSite, 
    sitesLoading,
    fetchSiteForOrg,
    fetchSiteKnowledge 
  } = useSeoStore()
  
  const [initialized, setInitialized] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  
  // Load site data on mount
  useEffect(() => {
    async function loadSiteData() {
      if (!currentOrg?.id) return
      
      try {
        // Try to fetch existing site
        const site = await fetchSiteForOrg(currentOrg.id, false)
        
        if (site?.id) {
          // Also fetch knowledge base to check AI training status
          await fetchSiteKnowledge(site.id)
        }
      } catch (error) {
        console.error('Failed to load SEO site:', error)
      } finally {
        setInitialized(true)
      }
    }
    
    loadSiteData()
  }, [currentOrg?.id])

  // Get setup status using our hook
  const { status, progress } = useSEOSetupStatus()
  
  // Track if setup was just completed (to avoid re-showing wizard)
  const [setupJustCompleted, setSetupJustCompleted] = useState(false)

  // Handle wizard completion
  const handleSetupComplete = async () => {
    setShowWizard(false)
    setSetupJustCompleted(true) // Prevent re-showing wizard
    
    // Refresh site data to get updated setup_completed flag
    if (currentOrg?.id) {
      await fetchSiteForOrg(currentOrg.id, false)
    }
  }

  const handleSkipWizard = () => {
    setShowWizard(false)
  }

  // Loading state
  if (!initialized || sitesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <SignalSEOLogo size={80} animate className="mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading Signal SEO...</p>
        </motion.div>
      </div>
    )
  }

  // No domain configured
  if (status === 'no-domain') {
    return (
      <div className="p-6">
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
              No Domain Configured
            </h3>
            <p className="text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
              To use the SEO module, configure a domain for {currentOrg?.name || 'this organization'} in the organization settings.
            </p>
            <Button variant="outline" onClick={() => onNavigate?.('settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Domain
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Needs setup - show wizard (but not if setup was just completed)
  if ((status === 'needs-setup' && !setupJustCompleted) || showWizard) {
    return (
      <SEOSetupWizard
        siteId={currentSite?.id}
        domain={currentOrg?.domain || 'your website'}
        onComplete={handleSetupComplete}
        onSkip={handleSkipWizard}
      />
    )
  }

  // Incomplete setup - offer to resume (but not if setup was just completed)
  if (status === 'incomplete' && !showWizard && !setupJustCompleted) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="border-[var(--accent-primary)]/30 bg-gradient-to-br from-[#95d47d]/5 to-[#238b95]/5">
            <CardContent className="py-8">
              <div className="text-center mb-6">
                <SignalSEOLogo size={64} animate className="mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">
                  Resume Signal SEO Setup
                </h3>
                <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                  Your SEO setup isn't complete yet. Let's finish configuring 
                  <strong className="text-[var(--text-primary)]"> {currentOrg?.domain}</strong> 
                  for optimal search performance.
                </p>
              </div>

              {/* Progress indicators */}
              {progress && (
                <div className="flex justify-center gap-4 mb-6">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    progress.hasPages 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {progress.hasPages ? '✓' : '○'} Pages discovered
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    progress.hasBrain 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {progress.hasBrain ? '✓' : '○'} AI trained
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button onClick={() => setShowWizard(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Continue Setup
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setInitialized(true)}
                >
                  Skip for Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Option to go to dashboard anyway */}
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSkipWizard}
              className="text-[var(--text-tertiary)]"
            >
              View Dashboard with Limited Features →
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Setup complete - show full dashboard
  const Dashboard = USE_NEW_DASHBOARD ? SEODashboardV2 : SEODashboard
  return <Dashboard onNavigate={onNavigate} onRunSetup={() => setShowWizard(true)} />
}
