/**
 * SEO Setup Gate
 * 
 * Checks if SEO module is set up for the current site.
 * Shows setup wizard if needed, otherwise renders children.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Brain, Sparkles, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SEOSetupWizard from './SEOSetupWizard'
import { useSeoStore } from '@/lib/seo-store'
import axios from 'axios'

export default function SEOSetupGate({ children, siteId }) {
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [siteData, setSiteData] = useState(null)
  
  const { setCurrentSite } = useSeoStore()

  useEffect(() => {
    checkSetupStatus()
  }, [siteId])

  async function checkSetupStatus() {
    if (!siteId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Get site data
      const siteRes = await axios.get(`/.netlify/functions/seo-sites-get?siteId=${siteId}`)
      const site = siteRes.data.site
      
      if (!site) {
        setNeedsSetup(true)
        setLoading(false)
        return
      }

      setSiteData(site)
      setCurrentSite(site)

      // Check if setup is complete
      const isSetupComplete = site.setup_completed === true

      // Also check if AI brain is trained
      let isBrainTrained = false
      try {
        const knowledgeRes = await axios.get(`/.netlify/functions/seo-ai-knowledge?siteId=${siteId}`)
        isBrainTrained = knowledgeRes.data.knowledge?.training_status === 'completed'
      } catch (e) {
        // No knowledge base yet
      }

      // Check if we have pages
      let hasPages = false
      try {
        const pagesRes = await axios.get(`/.netlify/functions/seo-pages-list?siteId=${siteId}&limit=1`)
        hasPages = (pagesRes.data.pages?.length || 0) > 0
      } catch (e) {
        // No pages yet
      }

      // Needs setup if:
      // - Setup not marked complete AND
      // - (No AI brain trained OR no pages discovered)
      const setupRequired = !isSetupComplete && (!isBrainTrained || !hasPages)
      
      setNeedsSetup(setupRequired)
      
      // Auto-show wizard if setup is required
      if (setupRequired) {
        setShowWizard(true)
      }

    } catch (error) {
      console.error('Failed to check setup status:', error)
      setNeedsSetup(true)
    } finally {
      setLoading(false)
    }
  }

  function handleSetupComplete() {
    setShowWizard(false)
    setNeedsSetup(false)
    // Refresh data
    checkSetupStatus()
  }

  function handleSkip() {
    setShowWizard(false)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <Brain className="w-16 h-16 text-primary mx-auto mb-4" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0"
            >
              <Sparkles className="w-6 h-6 text-amber-500 absolute -top-1 -right-1" />
            </motion.div>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-gray-500">Loading SEO Intelligence...</p>
        </motion.div>
      </div>
    )
  }

  // Show wizard
  if (showWizard) {
    return (
      <SEOSetupWizard
        siteId={siteId}
        domain={siteData?.domain || 'your website'}
        onComplete={handleSetupComplete}
        onSkip={handleSkip}
      />
    )
  }

  // Setup prompt (if they skipped but still needs setup)
  if (needsSetup) {
    return (
      <div className="p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl p-8 mb-8">
            <Brain className="w-20 h-20 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Complete SEO Setup
            </h2>
            <p className="text-gray-600 mb-6">
              Your AI SEO Brain needs to analyze your website before it can provide 
              intelligent recommendations. This process takes about 2-5 minutes.
            </p>
            <Button 
              size="lg" 
              onClick={() => setShowWizard(true)}
              className="bg-gradient-to-r from-primary to-purple-600"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start AI Setup
            </Button>
          </div>

          <p className="text-sm text-gray-500">
            The AI will analyze your pages, content, and search performance 
            to provide personalized SEO recommendations.
          </p>
        </motion.div>
      </div>
    )
  }

  // Setup complete - render children with optional re-run button
  return (
    <div className="relative">
      {/* Optional: Floating setup button for re-running */}
      <div className="absolute top-0 right-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowWizard(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          <Settings className="w-4 h-4 mr-1" />
          Re-run Setup
        </Button>
      </div>
      
      {children}
    </div>
  )
}
