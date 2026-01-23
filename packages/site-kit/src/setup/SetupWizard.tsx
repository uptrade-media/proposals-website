'use client'

/**
 * Uptrade Setup Wizard
 * 
 * Visual setup wizard that runs at /_uptrade/setup during development.
 * Supports THREE flows:
 * 
 * 🆕 NEW SITE:
 *    Brand new site, nothing exists yet.
 *    Define brand manually → Choose modules → Scaffold → Integration → Copilot → Complete
 * 
 * 🔧 EXISTING PROJECT:
 *    NextJS project already built by us. Adding Portal integration.
 *    Scan codebase → Migrate forms/widgets → Integration → Copilot → Complete
 * 
 * 🔄 REBUILD:
 *    Company has a live site, we're recreating it in NextJS.
 *    Enter domain → Scrape live site → Review extracted data → Track redirects → Integration → Copilot → Complete
 */

import React, { useState, useEffect, useCallback } from 'react'

// ============================================
// Types
// ============================================

type SetupType = 'new' | 'existing' | 'rebuild' | null

type Step = 
  | 'welcome' 
  | 'auth' 
  | 'project' 
  | 'setup-type'
  // NEW flow
  | 'brand'
  | 'modules'
  | 'scaffold'
  // EXISTING flow
  | 'scan'
  | 'migrate'
  // REBUILD flow
  | 'domain'
  | 'scrape'
  | 'review'
  | 'redirects'
  // Common finish
  | 'integration'
  | 'copilot'
  | 'complete'

interface ScanResults {
  forms: DetectedItem[]
  widgets: DetectedItem[]
  metadata: DetectedItem[]
  analytics: DetectedItem[]
}

interface DetectedItem {
  type: string
  file: string
  line: number
  details: Record<string, unknown>
  selected: boolean
}

interface Project {
  id: string
  name: string
  domain: string
}

interface Organization {
  id: string
  name: string
  projects: Project[]
}

interface ScrapeStatus {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  current_step: string
  pages_found: number
  routes_planned: number
  faqs_imported: number
  brand?: {
    business_name?: string
    primary_colors?: { hex: string }[]
    secondary_colors?: { hex: string }[]
    logo_url?: string
    tagline?: string
  }
  routes?: Array<{ path: string; title: string; type: string }>
  error?: string
}

interface BrandConfig {
  businessName: string
  tagline: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string
}

// Available Uptrade modules
const AVAILABLE_MODULES = [
  { id: 'analytics', name: 'Analytics', description: 'Page views, events, sessions, web vitals', icon: '📊', recommended: true },
  { id: 'seo', name: 'SEO', description: 'Managed FAQs, meta tags, schema markup', icon: '🔍', recommended: true },
  { id: 'forms', name: 'Forms', description: 'Managed forms with Portal submissions', icon: '📝', recommended: true },
  { id: 'engage', name: 'Engage', description: 'Live chat, popups, nudges, banners', icon: '💬', recommended: false },
  { id: 'commerce', name: 'Commerce', description: 'Products, services, checkout', icon: '🛒', recommended: false },
]

interface SetupWizardProps {
  config?: {
    url?: string
    anonKey?: string
    portalApiUrl?: string
  }
}

// ============================================
// Setup Wizard Component
// ============================================

export function SetupWizard({ config }: SetupWizardProps = {}) {
  const [step, setStep] = useState<Step>('welcome')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  
  // Organization & Project state
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDomain, setNewProjectDomain] = useState('')
  
  // ProjectStep local state (hoisted to avoid re-render issues)
  const [createNewProject, setCreateNewProject] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [showNewOrg, setShowNewOrg] = useState(false)
  
  // Setup type
  const [setupType, setSetupType] = useState<SetupType>(null)
  
  // NEW flow: Brand configuration
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    businessName: '',
    tagline: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    logoUrl: '',
  })
  
  // NEW/EXISTING flow: Module selection
  const [selectedModules, setSelectedModules] = useState<string[]>(['analytics', 'seo', 'forms'])
  
  // EXISTING flow: Scan results
  const [scanResults, setScanResults] = useState<ScanResults | null>(null)
  const [migrationProgress, setMigrationProgress] = useState(0)
  const [migrationLog, setMigrationLog] = useState<string[]>([])
  
  // REBUILD flow: Scrape state
  const [scrapeDomain, setScrapeDomain] = useState('')
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null)
  const [redirectMappings, setRedirectMappings] = useState<Array<{ from: string; to: string; enabled: boolean }>>([])
  
  // Copilot instructions
  const [copilotInstructions, setCopilotInstructions] = useState<string>('')
  const [generatingCopilot, setGeneratingCopilot] = useState(false)

  // API URL helpers
  const portalApiUrl = config?.portalApiUrl || 'http://localhost:3002'
  
  // Project step handlers (hoisted to prevent re-creation)
  const handleCreateOrg = useCallback(async () => {
    if (!newOrgName.trim()) return
    setCreatingOrg(true)
    try {
      const res = await fetch(`${portalApiUrl}/setup/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ name: newOrgName })
      })
      if (!res.ok) throw new Error('Failed to create organization')
      const org = await res.json()
      setOrganizations(prev => [...prev, org])
      setSelectedOrg(org)
      setNewOrgName('')
      setShowNewOrg(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreatingOrg(false)
    }
  }, [portalApiUrl, accessToken, newOrgName])

  const handleCreateProject = useCallback(async () => {
    if (!selectedOrg || !newProjectName.trim()) return
    setCreatingProject(true)
    try {
      const res = await fetch(`${portalApiUrl}/setup/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ orgId: selectedOrg.id, name: newProjectName, domain: newProjectDomain || (typeof window !== 'undefined' ? window.location.hostname : 'localhost') })
      })
      if (!res.ok) throw new Error('Failed to create project')
      const project = await res.json()
      setSelectedProject(project)
      setStep('setup-type')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreatingProject(false)
    }
  }, [portalApiUrl, accessToken, selectedOrg, newProjectName, newProjectDomain])

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project)
    setStep('setup-type')
  }, [])
  
  // Helper to make Portal API calls
  const callPortalApi = useCallback(async (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    return fetch(`${portalApiUrl}${path}`, {
      ...options,
      headers,
    })
  }, [portalApiUrl, accessToken])

  // Check if already configured
  useEffect(() => {
    checkExistingConfig()
  }, [])

  async function checkExistingConfig() {
    try {
      const localRes = await fetch('/_uptrade/api/status')
      const localData = await localRes.json()
      if (localData.configured) {
        setStep('complete')
        return
      }
      
      const storedToken = localStorage.getItem('uptrade_access_token')
      if (storedToken) {
        setAccessToken(storedToken)
        const res = await fetch(`${portalApiUrl}/setup/session`, {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        })
        const data = await res.json()
        if (data.authenticated) {
          setIsAuthenticated(true)
          setUserEmail(data.email)
          setStep('project')
        }
      }
    } catch {
      // Not configured yet
    }
  }

  // ============================================
  // Step: Welcome
  // ============================================

  function WelcomeStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Uptrade Site-Kit</h1>
          <p className="text-gray-400 text-lg">
            Let's set up your project in just a few steps
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 my-8">
          <FeatureCard icon="📊" title="Analytics" description="Track page views, events, and user sessions" />
          <FeatureCard icon="📝" title="Forms" description="Managed forms with validation and submissions" />
          <FeatureCard icon="💬" title="Engage" description="Popups, nudges, and live chat widgets" />
        </div>

        <div className="flex justify-center">
          <Button onClick={() => setStep('auth')}>Get Started →</Button>
        </div>
      </div>
    )
  }

  // ============================================
  // Step: Authentication
  // ============================================

  function AuthStep() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [authMode, setAuthMode] = useState<'portal' | 'login' | 'magic'>('portal')
    const [waitingForPopup, setWaitingForPopup] = useState(false)

    // Listen for messages from Portal popup
    useEffect(() => {
      function handleMessage(event: MessageEvent) {
        // Only accept messages from Portal
        const portalOrigins = ['https://portal.uptrademedia.com', 'http://localhost:5173', 'http://localhost:8888']
        if (!portalOrigins.includes(event.origin)) return
        
        if (event.data?.type === 'uptrade-auth-success') {
          const { accessToken: token, email: userEmail } = event.data
          if (token) {
            localStorage.setItem('uptrade_access_token', token)
            setAccessToken(token)
            setIsAuthenticated(true)
            setUserEmail(userEmail)
            setWaitingForPopup(false)
            loadOrganizations(token).then(() => setStep('project'))
          }
        } else if (event.data?.type === 'uptrade-auth-error') {
          setError(event.data.message || 'Authentication failed')
          setWaitingForPopup(false)
        }
      }
      
      window.addEventListener('message', handleMessage)
      return () => window.removeEventListener('message', handleMessage)
    }, [])

    async function handlePortalAuth() {
      setWaitingForPopup(true)
      setError(null)
      
      // Open Portal auth page in popup - use localhost:5173 for dev
      const portalUrl = portalApiUrl.includes('localhost') ? 'http://localhost:5173' : 'https://portal.uptrademedia.com'
      const callbackUrl = encodeURIComponent(window.location.origin)
      const popup = window.open(
        `${portalUrl}/auth/site-kit?callback=${callbackUrl}`,
        'uptrade-auth',
        'width=500,height=700,left=100,top=100'
      )
      
      // Check if popup was blocked
      if (!popup) {
        setError('Popup was blocked. Please allow popups and try again.')
        setWaitingForPopup(false)
        return
      }
      
      // Poll for popup close (in case user closes without completing)
      const pollInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollInterval)
          setWaitingForPopup(false)
        }
      }, 1000)
    }

    async function handleLogin() {
      if (!email.trim() || !password.trim()) return
      setIsLoading(true)
      setError(null)
      try {
        const supabaseUrl = config?.url || 'https://mwcjtnoqxolplwpkxnfe.supabase.co'
        const supabaseKey = config?.anonKey || ''
        
        const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
          body: JSON.stringify({ email, password })
        })
        
        if (!authRes.ok) {
          const errData = await authRes.json()
          throw new Error(errData.error_description || errData.msg || 'Login failed')
        }
        
        const authData = await authRes.json()
        const token = authData.access_token
        
        localStorage.setItem('uptrade_access_token', token)
        setAccessToken(token)
        
        const sessionRes = await fetch(`${portalApiUrl}/setup/session`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const session = await sessionRes.json()
        
        if (session.authenticated) {
          setIsAuthenticated(true)
          setUserEmail(session.email)
          await loadOrganizations(token)
          setStep('project')
        } else {
          throw new Error('Authentication failed - user not found in Portal')
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    async function handleMagicLink() {
      if (!email.trim()) return
      setIsLoading(true)
      setError(null)
      try {
        const supabaseUrl = config?.url || 'https://mwcjtnoqxolplwpkxnfe.supabase.co'
        const supabaseKey = config?.anonKey || ''
        
        const res = await fetch(`${supabaseUrl}/auth/v1/magiclink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
          body: JSON.stringify({ email, options: { redirectTo: window.location.href } })
        })
        
        if (!res.ok) throw new Error('Failed to send magic link')
        alert('Check your email for a login link!')
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Connect to Uptrade</h2>
          <p className="text-gray-400">Sign in with your Uptrade Portal account</p>
        </div>

        {/* Primary: Sign in with Portal (uses existing session) */}
        <div className="max-w-md mx-auto">
          <Button onClick={handlePortalAuth} loading={waitingForPopup} disabled={waitingForPopup}>
            {waitingForPopup ? 'Waiting for Portal...' : '🚀 Sign in with Uptrade Portal'}
          </Button>
          <p className="text-gray-500 text-xs text-center mt-2">
            Uses your existing Portal session (Google, email, etc.)
          </p>
        </div>

        <div className="flex items-center gap-4 max-w-md mx-auto">
          <div className="flex-1 border-t border-gray-700" />
          <span className="text-gray-500 text-sm">or sign in directly</span>
          <div className="flex-1 border-t border-gray-700" />
        </div>

        <div className="flex gap-4 justify-center mb-6">
          <button className={`px-4 py-2 rounded-lg ${authMode === 'login' ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => setAuthMode('login')}>
            Email & Password
          </button>
          <button className={`px-4 py-2 rounded-lg ${authMode === 'magic' ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => setAuthMode('magic')}>
            Magic Link
          </button>
        </div>

        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>

          {authMode === 'login' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
          )}

          <Button onClick={authMode === 'login' ? handleLogin : handleMagicLink} loading={isLoading} variant="secondary"
            disabled={!email.trim() || (authMode === 'login' && !password.trim())}>
            {authMode === 'login' ? 'Sign In →' : 'Send Magic Link →'}
          </Button>

          <p className="text-gray-500 text-sm text-center">
            Don't have an account?{' '}
            <a href="https://portal.uptrademedia.com/signup" target="_blank" className="text-blue-400 hover:underline">
              Sign up at Portal
            </a>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center">{error}</div>
        )}
      </div>
    )
  }

  // ============================================
  // Step: Project Selection
  // ============================================

  async function loadOrganizations(token?: string) {
    try {
      const authToken = token || accessToken
      const res = await fetch(`${portalApiUrl}/setup/organizations`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      })
      const data = await res.json()
      setOrganizations(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load organizations')
    }
  }

  // ============================================
  // Step: Setup Type Selection
  // ============================================

  function SetupTypeStep() {
    function handleSelectType(type: SetupType) {
      setSetupType(type)
      if (type === 'new') {
        setBrandConfig(prev => ({ ...prev, businessName: selectedProject?.name || '' }))
        setStep('brand')
      } else if (type === 'existing') {
        // Go to modules first, then scan
        setStep('modules')
      } else {
        setScrapeDomain(selectedProject?.domain || '')
        setStep('domain')
      }
    }

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">What are we setting up?</h2>
          <p className="text-gray-400">Choose the flow that matches your project</p>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
          {/* NEW Site */}
          <button onClick={() => handleSelectType('new')}
            className="p-6 bg-gray-800/50 rounded-xl border-2 border-gray-700 hover:border-blue-500 transition-all text-left group">
            <div className="text-4xl mb-3">🆕</div>
            <h3 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors">New Site</h3>
            <p className="text-gray-400 text-sm mb-3">
              Brand new project. Nothing exists yet - we'll define everything from scratch.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>✓ Define brand & colors</li>
              <li>✓ Choose modules</li>
              <li>✓ Generate scaffolding</li>
            </ul>
          </button>

          {/* EXISTING Project */}
          <button onClick={() => handleSelectType('existing')}
            className="p-6 bg-gray-800/50 rounded-xl border-2 border-gray-700 hover:border-green-500 transition-all text-left group">
            <div className="text-4xl mb-3">🔧</div>
            <h3 className="text-lg font-bold mb-2 group-hover:text-green-400 transition-colors">Existing Project</h3>
            <p className="text-gray-400 text-sm mb-3">
              NextJS project already built. Adding Portal integration to manage content.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>✓ Scan for forms & widgets</li>
              <li>✓ Migrate to managed versions</li>
              <li>✓ Keep existing structure</li>
            </ul>
          </button>

          {/* REBUILD */}
          <button onClick={() => handleSelectType('rebuild')}
            className="p-6 bg-gray-800/50 rounded-xl border-2 border-gray-700 hover:border-purple-500 transition-all text-left group">
            <div className="text-4xl mb-3">🔄</div>
            <h3 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors">Rebuild</h3>
            <p className="text-gray-400 text-sm mb-3">
              Client has a live site we didn't build. Recreating it in NextJS with Portal.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>✓ Scrape existing site</li>
              <li>✓ Extract brand & content</li>
              <li>✓ Track redirects for SEO</li>
            </ul>
          </button>
        </div>
      </div>
    )
  }

  // ============================================
  // NEW FLOW: Brand Configuration
  // ============================================

  function BrandStep() {
    const [isExtracting, setIsExtracting] = useState(false)
    const [extractUrl, setExtractUrl] = useState('')
    const [showExtract, setShowExtract] = useState(false)
    
    async function handleExtractBrand() {
      if (!extractUrl.trim()) return
      
      setIsExtracting(true)
      setError(null)
      
      try {
        const response = await callPortalApi('/site-scrape/brand-only', {
          method: 'POST',
          body: JSON.stringify({ domain: extractUrl.replace(/^https?:\/\//, '').split('/')[0] }),
        }) as { business_name?: string; tagline?: string; primary_color?: string; secondary_color?: string; logo_url?: string }
        
        // Update brand config with extracted values
        setBrandConfig(prev => ({
          ...prev,
          businessName: response.business_name || prev.businessName,
          tagline: response.tagline || prev.tagline,
          primaryColor: response.primary_color || prev.primaryColor,
          secondaryColor: response.secondary_color || prev.secondaryColor,
          logoUrl: response.logo_url || prev.logoUrl,
        }))
        
        setShowExtract(false)
        setExtractUrl('')
      } catch (err) {
        setError(`Failed to extract brand: ${(err as Error).message}`)
      } finally {
        setIsExtracting(false)
      }
    }

    function handleContinue() {
      if (!brandConfig.businessName.trim()) return
      setStep('modules')
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Define Your Brand</h2>
          <p className="text-gray-400">Set up the basic brand identity for this project</p>
        </div>

        {/* Brand Extraction Option */}
        {!showExtract ? (
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setShowExtract(true)}
              className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition-all"
            >
              <span className="text-2xl">🔍</span>
              <div className="text-left">
                <div className="font-medium">Extract from existing website</div>
                <div className="text-sm text-gray-400">Auto-detect colors, name, and logo from a live site</div>
              </div>
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔍</span>
              <span className="font-medium">Extract Brand from Website</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={extractUrl}
                onChange={(e) => setExtractUrl(e.target.value)}
                placeholder="example.com"
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleExtractBrand()}
              />
              <Button onClick={handleExtractBrand} disabled={isExtracting || !extractUrl.trim()}>
                {isExtracting ? 'Extracting...' : 'Extract'}
              </Button>
            </div>
            <button
              onClick={() => setShowExtract(false)}
              className="text-sm text-gray-500 hover:text-gray-400 mt-2"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="max-w-lg mx-auto space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Business Name *</label>
            <input type="text" value={brandConfig.businessName} onChange={(e) => setBrandConfig(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="Acme Inc" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Tagline</label>
            <input type="text" value={brandConfig.tagline} onChange={(e) => setBrandConfig(prev => ({ ...prev, tagline: e.target.value }))}
              placeholder="Making the world better" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={brandConfig.primaryColor} onChange={(e) => setBrandConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-12 h-12 rounded border border-gray-700 cursor-pointer" />
                <input type="text" value={brandConfig.primaryColor} onChange={(e) => setBrandConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Secondary Color</label>
              <div className="flex gap-2">
                <input type="color" value={brandConfig.secondaryColor} onChange={(e) => setBrandConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-12 h-12 rounded border border-gray-700 cursor-pointer" />
                <input type="text" value={brandConfig.secondaryColor} onChange={(e) => setBrandConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Logo URL (optional)</label>
            <input type="text" value={brandConfig.logoUrl} onChange={(e) => setBrandConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="https://example.com/logo.svg" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg" />
            <p className="text-xs text-gray-500 mt-1">You can add this later via Portal</p>
          </div>

          {/* Preview */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <h4 className="text-sm text-gray-400 mb-3">Preview</h4>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: brandConfig.primaryColor }}>
                {brandConfig.businessName.charAt(0) || '?'}
              </div>
              <div>
                <div className="font-semibold">{brandConfig.businessName || 'Your Business'}</div>
                <div className="text-sm text-gray-400">{brandConfig.tagline || 'Your tagline here'}</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: brandConfig.primaryColor }} title="Primary" />
              <div className="w-8 h-8 rounded" style={{ backgroundColor: brandConfig.secondaryColor }} title="Secondary" />
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => setStep('setup-type')}>← Back</Button>
          <Button onClick={handleContinue} disabled={!brandConfig.businessName.trim()}>Continue →</Button>
        </div>
      </div>
    )
  }

  // ============================================
  // NEW/EXISTING FLOW: Module Selection
  // ============================================

  function ModulesStep() {
    function toggleModule(moduleId: string) {
      setSelectedModules(prev => prev.includes(moduleId) ? prev.filter(m => m !== moduleId) : [...prev, moduleId])
    }

    async function handleContinue() {
      try {
        // Save brand config and modules to project
        await callPortalApi(`/setup/projects/${selectedProject?.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            brand_primary: brandConfig.primaryColor,
            brand_secondary: brandConfig.secondaryColor,
            settings: { brand: brandConfig },
            modules_enabled: selectedModules,
          })
        })
        // For existing projects, go to scan; for new projects, go to scaffold
        if (setupType === 'existing') {
          setStep('scan')
        } else {
          setStep('scaffold')
        }
      } catch (err) {
        setError((err as Error).message)
      }
    }

    // Back button goes to different places based on setup type
    function handleBack() {
      if (setupType === 'existing') {
        setStep('setup-type')
      } else {
        setStep('brand')
      }
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Select Modules</h2>
          <p className="text-gray-400">Choose which Uptrade modules to enable</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {AVAILABLE_MODULES.map(mod => (
            <button key={mod.id} onClick={() => toggleModule(mod.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                selectedModules.includes(mod.id) ? 'bg-blue-500/10 border-blue-500' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}>
              <div className="text-3xl">{mod.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{mod.name}</span>
                  {mod.recommended && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Recommended</span>}
                </div>
                <p className="text-sm text-gray-400">{mod.description}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedModules.includes(mod.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
              }`}>
                {selectedModules.includes(mod.id) && <span className="text-white text-sm">✓</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={handleBack}>← Back</Button>
          <Button onClick={handleContinue} disabled={selectedModules.length === 0}>Continue →</Button>
        </div>
      </div>
    )
  }

  // ============================================
  // NEW FLOW: Scaffolding
  // ============================================

  function ScaffoldStep() {
    const [scaffolding, setScaffolding] = useState(false)
    const [scaffoldLog, setScaffoldLog] = useState<string[]>([])

    async function handleScaffold() {
      setScaffolding(true)
      setScaffoldLog(['Starting scaffolding...'])

      const steps = []
      if (selectedModules.includes('analytics')) steps.push('✓ Analytics provider configured')
      if (selectedModules.includes('seo')) {
        steps.push('✓ SEO utilities ready')
        steps.push('✓ ManagedFAQ component available')
      }
      if (selectedModules.includes('forms')) steps.push('✓ Forms integration configured')
      if (selectedModules.includes('engage')) steps.push('✓ Engage widgets ready')
      if (selectedModules.includes('commerce')) steps.push('✓ Commerce hooks available')

      for (const step of steps) {
        await new Promise(r => setTimeout(r, 400))
        setScaffoldLog(prev => [...prev, step])
      }

      setScaffoldLog(prev => [...prev, '', '🎉 Scaffolding complete!'])
      setScaffolding(false)
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project Scaffolding</h2>
          <p className="text-gray-400">Setting up your selected modules</p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold mb-2">Configuration</h3>
            <div className="text-sm text-gray-400 space-y-1">
              <p><strong>Brand:</strong> {brandConfig.businessName}</p>
              <p><strong>Modules:</strong> {selectedModules.join(', ')}</p>
            </div>
          </div>

          {scaffoldLog.length > 0 && (
            <div className="mt-4 bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-48 overflow-y-auto">
              {scaffoldLog.map((log, i) => (
                <div key={i} className={log.startsWith('✓') ? 'text-green-400' : log.startsWith('🎉') ? 'text-yellow-400' : 'text-gray-400'}>{log}</div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4">
          {scaffoldLog.length === 0 ? (
            <>
              <Button variant="secondary" onClick={() => setStep('modules')}>← Back</Button>
              <Button onClick={handleScaffold} loading={scaffolding}>Generate Scaffolding →</Button>
            </>
          ) : !scaffolding && (
            <Button onClick={() => setStep('integration')}>Continue to Integration →</Button>
          )}
        </div>
      </div>
    )
  }

  // ============================================
  // EXISTING FLOW: Scan Codebase
  // ============================================

  const handleScan = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/_uptrade/api/scan', { method: 'POST' })
      const data = await res.json()
      setScanResults({
        forms: (data.forms || []).map((f: DetectedItem) => ({ ...f, selected: true })),
        widgets: (data.widgets || []).map((w: DetectedItem) => ({ ...w, selected: true })),
        metadata: (data.metadata || []).map((m: DetectedItem) => ({ ...m, selected: true })),
        analytics: (data.analytics || []).map((a: DetectedItem) => ({ ...a, selected: false })),
      })
      setStep('migrate')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  function ScanStep() {
    useEffect(() => { handleScan() }, [])

    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl animate-pulse">🔍</div>
        <h2 className="text-2xl font-bold">Scanning Your Codebase</h2>
        <p className="text-gray-400">Looking for forms, widgets, and metadata to migrate...</p>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // ============================================
  // EXISTING FLOW: Migration
  // ============================================

  function MigrateStep() {
    if (!scanResults) return null

    const allItems = [...scanResults.forms, ...scanResults.widgets, ...scanResults.metadata]
    const selectedItems = allItems.filter(i => i.selected)

    function toggleItem(type: keyof ScanResults, index: number) {
      setScanResults(prev => {
        if (!prev) return prev
        const updated = { ...prev }
        updated[type] = [...prev[type]]
        updated[type][index] = { ...updated[type][index], selected: !updated[type][index].selected }
        return updated
      })
    }

    async function handleMigrate() {
      setIsLoading(true)
      setMigrationLog([])
      setMigrationProgress(0)

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i]
        setMigrationLog(prev => [...prev, `Migrating ${item.type} in ${item.file}...`])
        try {
          await fetch('/_uptrade/api/migrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item, projectId: selectedProject?.id })
          })
          setMigrationLog(prev => [...prev, `✓ Migrated ${item.type}`])
        } catch {
          setMigrationLog(prev => [...prev, `✗ Failed to migrate ${item.type}`])
        }
        setMigrationProgress(Math.round(((i + 1) / selectedItems.length) * 100))
      }

      setIsLoading(false)
      setStep('integration')
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Review & Migrate</h2>
          <p className="text-gray-400">Select items to migrate to managed versions</p>
        </div>

        {scanResults.forms.length > 0 && (
          <Section title="📝 Forms" count={scanResults.forms.filter(f => f.selected).length}>
            {scanResults.forms.map((form, i) => <ItemRow key={i} item={form} onToggle={() => toggleItem('forms', i)} />)}
          </Section>
        )}

        {scanResults.widgets.length > 0 && (
          <Section title="💬 Widgets" count={scanResults.widgets.filter(w => w.selected).length}>
            {scanResults.widgets.map((widget, i) => <ItemRow key={i} item={widget} onToggle={() => toggleItem('widgets', i)} />)}
          </Section>
        )}

        {scanResults.metadata.length > 0 && (
          <Section title="🏷️ Metadata/Schema" count={scanResults.metadata.filter(m => m.selected).length}>
            {scanResults.metadata.map((meta, i) => <ItemRow key={i} item={meta} onToggle={() => toggleItem('metadata', i)} />)}
          </Section>
        )}

        {allItems.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-4">✨</div>
            <p>No existing forms or widgets detected.</p>
            <p className="text-sm">You're starting fresh!</p>
          </div>
        )}

        {migrationLog.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-48 overflow-y-auto">
            {migrationLog.map((log, i) => (
              <div key={i} className={log.startsWith('✗') ? 'text-red-400' : log.startsWith('✓') ? 'text-green-400' : 'text-gray-400'}>{log}</div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${migrationProgress}%` }} />
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => setStep('integration')}>Skip Migration</Button>
          <Button onClick={handleMigrate} loading={isLoading}>Migrate {selectedItems.length} Items →</Button>
        </div>
      </div>
    )
  }

  // ============================================
  // REBUILD FLOW: Domain Input
  // ============================================

  function DomainStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Enter Existing Site Domain</h2>
          <p className="text-gray-400">We'll scrape it to extract brand, routes, FAQs, and content</p>
        </div>

        <div className="max-w-lg mx-auto space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Website Domain</label>
            <input type="text" value={scrapeDomain} onChange={(e) => setScrapeDomain(e.target.value)} placeholder="example.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500" />
            <p className="text-sm text-gray-500 mt-2">Enter without https://</p>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-purple-400 mb-2">What we'll extract:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>🎨 Brand colors, logos, and fonts</li>
              <li>🗺️ Sitemap and all routes</li>
              <li>❓ FAQ sections → Managed FAQs</li>
              <li>📧 Contact info and social profiles</li>
              <li>🔀 Route mappings for redirects</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => setStep('setup-type')}>← Back</Button>
          <Button onClick={() => setStep('scrape')} disabled={!scrapeDomain.trim()}>Start Scrape →</Button>
        </div>
      </div>
    )
  }

  // ============================================
  // REBUILD FLOW: Scraping
  // ============================================

  function ScrapeStep() {
    const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

    useEffect(() => {
      startScrape()
      return () => { if (pollInterval) clearInterval(pollInterval) }
    }, [])

    async function startScrape() {
      try {
        const res = await callPortalApi('/site-scrape', {
          method: 'POST',
          body: JSON.stringify({ project_id: selectedProject?.id, domain: scrapeDomain.replace(/^https?:\/\//, '') })
        })
        if (!res.ok) throw new Error('Failed to start scrape')
        const data = await res.json()
        setScrapeStatus(data)

        const interval = setInterval(async () => {
          try {
            const statusRes = await callPortalApi(`/site-scrape/${data.id}/status`)
            const status = await statusRes.json()
            setScrapeStatus(status)

            if (status.status === 'completed') {
              clearInterval(interval)
              setPollInterval(null)
              // Initialize redirect mappings from scraped routes
              if (status.routes) {
                setRedirectMappings(status.routes.map((r: any) => ({ from: r.path, to: r.path, enabled: true })))
              }
              setTimeout(() => setStep('review'), 1000)
            } else if (status.status === 'failed') {
              clearInterval(interval)
              setPollInterval(null)
              setError(status.error || 'Scrape failed')
            }
          } catch (err) { console.error('Poll error:', err) }
        }, 2000)
        setPollInterval(interval)
      } catch (err) {
        setError((err as Error).message)
      }
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl animate-pulse mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-2">Scraping {scrapeDomain}</h2>
          <p className="text-gray-400">{scrapeStatus?.current_step || 'Starting...'}</p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style={{ width: `${scrapeStatus?.progress || 0}%` }} />
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>{scrapeStatus?.progress || 0}%</span>
            <span>{scrapeStatus?.pages_found || 0} pages</span>
          </div>
        </div>

        {scrapeStatus && (
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <StatCard value={scrapeStatus.pages_found || 0} label="Pages" color="purple" />
            <StatCard value={scrapeStatus.routes_planned || 0} label="Routes" color="pink" />
            <StatCard value={scrapeStatus.faqs_imported || 0} label="FAQs" color="blue" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center max-w-lg mx-auto">
            {error}
            <button onClick={() => { setError(null); startScrape() }} className="block mx-auto mt-2 text-sm underline">Try again</button>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // REBUILD FLOW: Review Results
  // ============================================

  function ReviewStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Scrape Complete!</h2>
          <p className="text-gray-400">Here's what we found on {scrapeDomain}</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {scrapeStatus?.brand && (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <h3 className="font-semibold mb-3">🎨 Brand</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Business Name</div>
                  <div className="font-medium">{scrapeStatus.brand.business_name || 'Not found'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Colors</div>
                  <div className="flex gap-2">
                    {scrapeStatus.brand.primary_colors?.slice(0, 4).map((c, i) => (
                      <div key={i} className="w-8 h-8 rounded border border-gray-600" style={{ backgroundColor: c.hex }} title={c.hex} />
                    )) || <span className="text-gray-500">None</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <StatCard value={scrapeStatus?.pages_found || 0} label="Pages Crawled" color="purple" large />
            <StatCard value={scrapeStatus?.routes_planned || 0} label="Routes Mapped" color="pink" large />
            <StatCard value={scrapeStatus?.faqs_imported || 0} label="FAQs Imported" color="blue" large />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-400">
              💡 All data saved to your project. FAQs are ready in Portal. Next: set up redirects for SEO.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={() => setStep('redirects')}>Configure Redirects →</Button>
        </div>
      </div>
    )
  }

  // ============================================
  // REBUILD FLOW: Redirect Mappings
  // ============================================

  function RedirectsStep() {
    function updateRedirect(index: number, field: 'from' | 'to' | 'enabled', value: string | boolean) {
      setRedirectMappings(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
      })
    }

    async function handleSaveRedirects() {
      try {
        await callPortalApi(`/site-scrape/${scrapeStatus?.id}/redirects`, {
          method: 'POST',
          body: JSON.stringify({ redirects: redirectMappings.filter(r => r.enabled && r.from !== r.to) })
        })
        setStep('integration')
      } catch (err) {
        setError((err as Error).message)
      }
    }

    const changedRedirects = redirectMappings.filter(r => r.enabled && r.from !== r.to)

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Configure Redirects</h2>
          <p className="text-gray-400">Map old URLs to new routes to preserve SEO</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-800 flex justify-between items-center border-b border-gray-700">
              <span className="font-medium">Route Mappings</span>
              <span className="text-sm text-gray-400">{changedRedirects.length} redirects</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-700">
              {redirectMappings.map((redirect, i) => (
                <div key={i} className={`flex items-center gap-4 px-4 py-3 ${!redirect.enabled ? 'opacity-50' : ''}`}>
                  <input type="checkbox" checked={redirect.enabled} onChange={(e) => updateRedirect(i, 'enabled', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700" />
                  <input type="text" value={redirect.from} onChange={(e) => updateRedirect(i, 'from', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm font-mono" placeholder="/old-path" />
                  <span className="text-gray-500">→</span>
                  <input type="text" value={redirect.to} onChange={(e) => updateRedirect(i, 'to', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm font-mono" placeholder="/new-path" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-400">
              ⚠️ Only routes where "from" differs from "to" will create redirects. 
              Same paths = no redirect needed.
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => setStep('review')}>← Back</Button>
          <Button onClick={handleSaveRedirects}>
            {changedRedirects.length > 0 ? `Save ${changedRedirects.length} Redirects →` : 'Skip & Continue →'}
          </Button>
        </div>
      </div>
    )
  }

  // ============================================
  // COMMON: Integration Code
  // ============================================

  function IntegrationStep() {
    const envVars = `NEXT_PUBLIC_UPTRADE_PROJECT_ID=${selectedProject?.id || 'xxx'}
NEXT_PUBLIC_SUPABASE_URL=${config?.url || 'https://xxx.supabase.co'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${config?.anonKey || 'xxx'}`

    const providerCode = `import { SiteKitProvider } from '@uptrade/site-kit'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SiteKitProvider
          projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
        >
          {children}
        </SiteKitProvider>
      </body>
    </html>
  )
}`

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Integration Code</h2>
          <p className="text-gray-400">Add these to connect your project to Uptrade</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <ConfigPreview title="Environment Variables" description=".env.local" content={envVars} />
          <ConfigPreview title="Layout Provider" description="app/layout.tsx" content={providerCode} />
          <div className="text-center text-gray-500 text-sm">
            <p>Install: <code className="bg-gray-800 px-2 py-1 rounded">pnpm add @uptrade/site-kit</code></p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => {
            if (setupType === 'new') setStep('scaffold')
            else if (setupType === 'existing') setStep('migrate')
            else setStep('redirects')
          }}>← Back</Button>
          <Button onClick={() => setStep('copilot')}>Continue to Copilot →</Button>
        </div>
      </div>
    )
  }

  // ============================================
  // COMMON: Copilot Instructions
  // ============================================

  function CopilotStep() {
    useEffect(() => { generateCopilotInstructions() }, [])

    async function generateCopilotInstructions() {
      setGeneratingCopilot(true)
      try {
        const res = await callPortalApi('/signal/generate-copilot-instructions', {
          method: 'POST',
          body: JSON.stringify({
            projectId: selectedProject?.id,
            setupType,
            modules: selectedModules,
            domain: scrapeDomain || selectedProject?.domain,
            brand: setupType === 'new' ? brandConfig : scrapeStatus?.brand,
            routes: scrapeStatus?.routes,
          })
        })
        if (res.ok) {
          const data = await res.json()
          setCopilotInstructions(data.instructions || data.content || '')
        } else {
          setCopilotInstructions(generateFallbackTemplate())
        }
      } catch {
        setCopilotInstructions(generateFallbackTemplate())
      } finally {
        setGeneratingCopilot(false)
      }
    }

    function generateFallbackTemplate() {
      const brand = setupType === 'new' ? brandConfig : scrapeStatus?.brand
      const brandName = (brand as any)?.businessName || (brand as any)?.business_name || 'TBD'
      return `# ${selectedProject?.name} - Copilot Instructions

**Project:** ${selectedProject?.name}
**Domain:** ${scrapeDomain || selectedProject?.domain}
**Stack:** Next.js + @uptrade/site-kit
**Setup Type:** ${setupType}

## Brand
- **Name:** ${brandName}
- **Primary Color:** ${brandConfig?.primaryColor || 'TBD'}
- **Secondary Color:** ${brandConfig?.secondaryColor || 'TBD'}

## Enabled Modules
${selectedModules.map(m => `- ${m}`).join('\n')}

## Development Notes
- This project uses @uptrade/site-kit for managed content
- Forms, FAQs, and metadata are managed via Uptrade Portal
- Analytics tracked via SiteKitProvider
${setupType === 'rebuild' ? '- This is a rebuild of an existing site - check redirects for SEO' : ''}
`
    }

    async function copyToClipboard() {
      await navigator.clipboard.writeText(copilotInstructions)
      alert('Copied!')
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Copilot Instructions</h2>
          <p className="text-gray-400">Add this to your repo for better AI assistance</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {generatingCopilot ? (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Generating with AI...</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
              <div className="px-4 py-2 bg-gray-800 flex justify-between items-center">
                <span className="font-medium">.github/copilot-instructions.md</span>
                <button onClick={copyToClipboard} className="text-sm text-blue-400 hover:underline">Copy</button>
              </div>
              <pre className="p-4 text-sm overflow-x-auto max-h-80 overflow-y-auto">
                <code className="text-gray-300 whitespace-pre-wrap">{copilotInstructions}</code>
              </pre>
            </div>
          )}

          <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-sm text-green-400">
              💡 Save as <code className="bg-gray-800 px-1 rounded">.github/copilot-instructions.md</code> for GitHub Copilot context.
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => setStep('integration')}>← Back</Button>
          <Button onClick={() => setStep('complete')}>Finish Setup →</Button>
        </div>
      </div>
    )
  }

  // ============================================
  // Step: Complete
  // ============================================

  function CompleteStep() {
    const [removing, setRemoving] = useState(false)

    async function handleRemoveSetup() {
      setRemoving(true)
      try {
        await fetch('/_uptrade/api/self-destruct', { method: 'POST' })
        window.location.href = '/'
      } catch (err) {
        setError((err as Error).message)
        setRemoving(false)
      }
    }

    function handleReset() {
      localStorage.removeItem('uptrade_access_token')
      setStep('welcome')
      setIsAuthenticated(false)
      setAccessToken(null)
      setUserEmail(null)
      setSelectedOrg(null)
      setSelectedProject(null)
      setSetupType(null)
    }

    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-3xl font-bold">You're All Set!</h2>
        <p className="text-gray-400 text-lg">Site-Kit is configured for {selectedProject?.name}</p>

        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto my-8">
          <QuickLink icon="📊" title="Project Dashboard" href={`https://portal.uptrademedia.com/projects/${selectedProject?.id}`} />
          <QuickLink icon="📝" title="Manage Forms" href={`https://portal.uptrademedia.com/projects/${selectedProject?.id}/forms`} />
          <QuickLink icon="📖" title="Documentation" href="https://docs.uptrademedia.com/site-kit" />
          <QuickLink icon="💬" title="Get Help" href="https://portal.uptrademedia.com/messages" />
        </div>

        <div className="flex gap-4 justify-center">
          <Button variant="secondary" onClick={handleReset}>Restart Setup</Button>
        </div>

        <div className="pt-8 border-t border-gray-700">
          <p className="text-gray-400 mb-4">Remove this setup wizard from your project?</p>
          <Button variant="danger" onClick={handleRemoveSetup} loading={removing}>Remove Setup Wizard</Button>
          <p className="text-gray-500 text-sm mt-2">This will delete the /_uptrade route</p>
        </div>
      </div>
    )
  }

  // ============================================
  // Render
  // ============================================

  // Render step content directly to avoid component recreation on state changes
  const renderStep = () => {
    switch (step) {
      case 'welcome': return <WelcomeStep />
      case 'auth': return <AuthStep />
      case 'project': return (
        <div className="space-y-6" key="project-step">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Select Your Project</h2>
            <p className="text-gray-400">Choose an existing project or create a new one</p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-400">Organization</label>
              <button type="button" className="text-sm text-blue-400 hover:underline" onClick={() => setShowNewOrg(!showNewOrg)}>
                {showNewOrg ? 'Select existing' : '+ New organization'}
              </button>
            </div>
            
            {showNewOrg ? (
              <div className="space-y-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <input 
                  id="new-org-name"
                  key="new-org-name"
                  type="text" 
                  value={newOrgName} 
                  onChange={(e) => setNewOrgName(e.target.value)} 
                  placeholder="Organization name"
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500" 
                />
                <Button onClick={handleCreateOrg} loading={creatingOrg} disabled={!newOrgName.trim()}>Create Organization</Button>
              </div>
            ) : (
              <select value={selectedOrg?.id || ''} onChange={(e) => setSelectedOrg(organizations.find(o => o.id === e.target.value) || null)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg">
                <option value="">Select organization...</option>
                {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            )}
          </div>

          {selectedOrg && (
            <div className="max-w-lg mx-auto space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-400">Projects</label>
                <button type="button" className="text-sm text-blue-400 hover:underline" onClick={() => setCreateNewProject(!createNewProject)}>
                  {createNewProject ? 'Select existing' : '+ Create new'}
                </button>
              </div>

              {createNewProject ? (
                <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <input 
                    id="new-project-name"
                    key="new-project-name"
                    type="text" 
                    value={newProjectName} 
                    onChange={(e) => setNewProjectName(e.target.value)} 
                    placeholder="Project name"
                    autoComplete="off"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg" 
                  />
                  <input 
                    id="new-project-domain"
                    key="new-project-domain"
                    type="text" 
                    value={newProjectDomain} 
                    onChange={(e) => setNewProjectDomain(e.target.value)} 
                    placeholder="localhost"
                    autoComplete="off"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg" 
                  />
                  <Button onClick={handleCreateProject} loading={creatingProject} disabled={!newProjectName.trim()}>Create Project</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedOrg.projects.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No projects yet. <button type="button" className="text-blue-400 hover:underline" onClick={() => setCreateNewProject(true)}>Create one</button>
                    </p>
                  ) : selectedOrg.projects.map(project => (
                    <button type="button" key={project.id} onClick={() => handleSelectProject(project)}
                      className="w-full text-left px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-gray-400">{project.domain}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )
      case 'setup-type': return <SetupTypeStep />
      case 'brand': return <BrandStep />
      case 'modules': return <ModulesStep />
      case 'scaffold': return <ScaffoldStep />
      case 'scan': return <ScanStep />
      case 'migrate': return <MigrateStep />
      case 'domain': return <DomainStep />
      case 'scrape': return <ScrapeStep />
      case 'review': return <ReviewStep />
      case 'redirects': return <RedirectsStep />
      case 'integration': return <IntegrationStep />
      case 'copilot': return <CopilotStep />
      case 'complete': return <CompleteStep />
      default: return <WelcomeStep />
    }
  }

  const getProgress = () => {
    const common = ['welcome', 'auth', 'project', 'setup-type']
    const newFlow = ['brand', 'modules', 'scaffold']
    const existingFlow = ['modules', 'scan', 'migrate']
    const rebuildFlow = ['domain', 'scrape', 'review', 'redirects']
    const finish = ['integration', 'copilot', 'complete']
    
    const flow = setupType === 'new' ? [...common, ...newFlow, ...finish]
      : setupType === 'existing' ? [...common, ...existingFlow, ...finish]
      : setupType === 'rebuild' ? [...common, ...rebuildFlow, ...finish]
      : [...common, ...finish]
    
    const idx = flow.indexOf(step)
    return idx >= 0 ? (idx / (flow.length - 1)) * 100 : 0
  }

  const setupLabels = { new: '🆕 New Site', existing: '🔧 Existing', rebuild: '🔄 Rebuild' }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      minHeight: '100vh', 
      backgroundColor: '#0f172a', 
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'auto'
    }} className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white">
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', backgroundColor: '#1e293b', zIndex: 100000 }}>
        <div style={{ height: '100%', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', transition: 'width 0.5s', width: `${getProgress()}%` }} />
      </div>

      <header style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
          <span className="font-semibold">Uptrade Site-Kit</span>
          {setupType && (
            <span className={`text-xs px-2 py-1 rounded ${
              setupType === 'new' ? 'bg-blue-500/20 text-blue-400' 
              : setupType === 'existing' ? 'bg-green-500/20 text-green-400'
              : 'bg-purple-500/20 text-purple-400'
            }`}>{setupLabels[setupType]}</span>
          )}
        </div>
        {userEmail && <div className="text-gray-400 text-sm">{userEmail}</div>}
      </header>

      <main className="max-w-4xl mx-auto px-8 py-12">{renderStep()}</main>

      <footer className="fixed bottom-0 left-0 right-0 px-8 py-4 text-center text-gray-500 text-sm">
        <a href="https://uptrademedia.com" target="_blank" className="hover:text-gray-300">Uptrade Media</a>
        {' · '}
        <a href="https://docs.uptrademedia.com" target="_blank" className="hover:text-gray-300">Docs</a>
      </footer>
    </div>
  )
}

// ============================================
// UI Components
// ============================================

function Button({ children, onClick, loading, disabled, variant = 'primary' }: {
  children: React.ReactNode; onClick?: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    secondary: 'bg-gray-700 hover:bg-gray-600',
    danger: 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30'
  }
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className={`px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}>
      {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Loading...</span> : children}
    </button>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700 text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}

function StatCard({ value, label, color, large }: { value: number; label: string; color: 'purple' | 'pink' | 'blue'; large?: boolean }) {
  const colors = { purple: 'text-purple-400', pink: 'text-pink-400', blue: 'text-blue-400' }
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700">
      <div className={`${large ? 'text-3xl' : 'text-2xl'} font-bold ${colors[color]}`}>{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-800/50 flex justify-between items-center">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-gray-400">{count} selected</span>
      </div>
      <div className="divide-y divide-gray-700">{children}</div>
    </div>
  )
}

function ItemRow({ item, onToggle }: { item: DetectedItem; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/30 transition-colors">
      <input type="checkbox" checked={item.selected} onChange={onToggle} className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.type}</div>
        <div className="text-sm text-gray-400 truncate">{item.file}:{item.line}</div>
      </div>
    </div>
  )
}

function ConfigPreview({ title, description, content }: { title: string; description: string; content: string }) {
  async function copy() { await navigator.clipboard.writeText(content) }
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-2 bg-gray-800 flex justify-between items-center">
        <span className="font-medium">{title}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{description}</span>
          <button onClick={copy} className="text-sm text-blue-400 hover:underline">Copy</button>
        </div>
      </div>
      <pre className="p-4 text-sm overflow-x-auto"><code className="text-green-400">{content}</code></pre>
    </div>
  )
}

function QuickLink({ icon, title, href }: { icon: string; title: string; href: string }) {
  return (
    <a href={href} target="_blank" className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors">
      <span className="text-2xl">{icon}</span>
      <span className="font-medium">{title}</span>
    </a>
  )
}

export default SetupWizard
