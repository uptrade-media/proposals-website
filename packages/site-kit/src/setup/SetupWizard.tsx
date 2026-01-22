'use client'

/**
 * Uptrade Setup Wizard
 * 
 * Visual setup wizard that runs at /_uptrade/setup during development.
 * Guides developers through:
 * 1. Authentication with Uptrade Portal
 * 2. Organization & Project selection
 * 3. Codebase scanning for existing forms, widgets, metadata
 * 4. Migration of detected items to Site-Kit
 * 5. Configuration generation
 * 6. Self-destruction (removal of setup code)
 */

import React, { useState, useEffect, useCallback } from 'react'

// ============================================
// Types
// ============================================

type Step = 'welcome' | 'auth' | 'project' | 'scan' | 'migrate' | 'configure' | 'complete'

interface ScanResults {
  forms: DetectedItem[]
  widgets: DetectedItem[]
  metadata: DetectedItem[]
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
  
  // Scan results
  const [scanResults, setScanResults] = useState<ScanResults | null>(null)
  
  // Migration progress
  const [migrationProgress, setMigrationProgress] = useState(0)
  const [migrationLog, setMigrationLog] = useState<string[]>([])

  // API URL helpers
  const portalApiUrl = config?.portalApiUrl || 'http://localhost:3002'
  
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
      // Check local status first
      const localRes = await fetch('/_uptrade/api/status')
      const localData = await localRes.json()
      if (localData.configured) {
        setStep('complete')
        return
      }
      
      // Check if we have a token in localStorage
      const storedToken = localStorage.getItem('uptrade_access_token')
      if (storedToken) {
        setAccessToken(storedToken)
        // Validate with Portal API
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
          <FeatureCard
            icon="📊"
            title="Analytics"
            description="Track page views, events, and user sessions"
          />
          <FeatureCard
            icon="📝"
            title="Forms"
            description="Managed forms with validation and submissions"
          />
          <FeatureCard
            icon="💬"
            title="Engage"
            description="Popups, nudges, and live chat widgets"
          />
        </div>

        <div className="flex justify-center">
          <Button onClick={() => setStep('auth')}>
            Get Started →
          </Button>
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
    const [authMode, setAuthMode] = useState<'login' | 'magic'>('login')

    async function handleLogin() {
      if (!email.trim() || !password.trim()) return
      setIsLoading(true)
      setError(null)
      try {
        // Sign in via Supabase Auth directly using Uptrade's Supabase
        const supabaseUrl = config?.url || 'https://mwcjtnoqxolplwpkxnfe.supabase.co'
        const supabaseKey = config?.anonKey || ''
        
        const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({ email, password })
        })
        
        if (!authRes.ok) {
          const errData = await authRes.json()
          throw new Error(errData.error_description || errData.msg || 'Login failed')
        }
        
        const authData = await authRes.json()
        const token = authData.access_token
        
        // Store token
        localStorage.setItem('uptrade_access_token', token)
        setAccessToken(token)
        
        // Validate with Portal API and get user info
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
        
        // Request magic link
        const res = await fetch(`${supabaseUrl}/auth/v1/magiclink`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({ 
            email,
            options: {
              redirectTo: window.location.href
            }
          })
        })
        
        if (!res.ok) throw new Error('Failed to send magic link')
        
        setError(null)
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
          <p className="text-gray-400">
            Sign in with your Uptrade Portal account
          </p>
        </div>

        <div className="flex gap-4 justify-center mb-6">
          <button
            className={`px-4 py-2 rounded-lg ${authMode === 'login' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setAuthMode('login')}
          >
            Email & Password
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${authMode === 'magic' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setAuthMode('magic')}
          >
            Magic Link
          </button>
        </div>

        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {authMode === 'login' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <Button 
            onClick={authMode === 'login' ? handleLogin : handleMagicLink} 
            loading={isLoading} 
            disabled={!email.trim() || (authMode === 'login' && !password.trim())}
          >
            {authMode === 'login' ? 'Sign In →' : 'Send Magic Link →'}
          </Button>

          <p className="text-gray-500 text-sm text-center">
            Don't have an account?{' '}
            <a 
              href="https://portal.uptrademedia.com/signup" 
              target="_blank"
              className="text-blue-400 hover:underline"
            >
              Sign up at Portal
            </a>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center">
            {error}
          </div>
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
    } catch (err) {
      setError('Failed to load organizations')
    }
  }

  function ProjectStep() {
    const [createNew, setCreateNew] = useState(false)
    const [creating, setCreating] = useState(false)
    const [creatingOrg, setCreatingOrg] = useState(false)
    const [newOrgName, setNewOrgName] = useState('')

    async function handleCreateOrg() {
      if (!newOrgName.trim()) return
      setCreatingOrg(true)
      try {
        const res = await fetch(`${portalApiUrl}/setup/organizations`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({
            name: newOrgName,
            domain: window.location.hostname
          })
        })
        
        if (!res.ok) throw new Error('Failed to create organization')
        
        const org = await res.json()
        // Reload organizations
        await loadOrganizations()
        setSelectedOrg({ ...org, projects: [] })
        setNewOrgName('')
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setCreatingOrg(false)
      }
    }

    async function handleCreateProject() {
      if (!selectedOrg || !newProjectName.trim()) return
      setCreating(true)
      try {
        const res = await fetch(`${portalApiUrl}/setup/projects`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({
            orgId: selectedOrg.id,
            name: newProjectName,
            domain: newProjectDomain || window.location.hostname
          })
        })
        
        if (!res.ok) throw new Error('Failed to create project')
        
        const project = await res.json()
        setSelectedProject(project)
        setStep('scan')
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setCreating(false)
      }
    }

    async function handleSelectProject(project: Project) {
      setSelectedProject(project)
      setStep('scan')
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Select Your Project</h2>
          <p className="text-gray-400">
            Choose an existing project or create a new one
          </p>
        </div>

        {/* Organization selector */}
        <div className="max-w-lg mx-auto">
          <label className="block text-sm text-gray-400 mb-2">Organization</label>
          <select
            value={selectedOrg?.id || ''}
            onChange={(e) => setSelectedOrg(organizations.find(o => o.id === e.target.value) || null)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
          >
            <option value="">Select organization...</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        {/* Project list */}
        {selectedOrg && (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-400">Projects</label>
              <button
                className="text-sm text-blue-400 hover:underline"
                onClick={() => setCreateNew(!createNew)}
              >
                {createNew ? 'Select existing' : '+ Create new'}
              </button>
            </div>

            {createNew ? (
              <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
                />
                <input
                  type="text"
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  placeholder={window.location.hostname}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
                />
                <Button 
                  onClick={handleCreateProject} 
                  loading={creating}
                  disabled={!newProjectName.trim()}
                >
                  Create Project
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedOrg.projects.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No projects yet.{' '}
                    <button 
                      className="text-blue-400 hover:underline"
                      onClick={() => setCreateNew(true)}
                    >
                      Create one
                    </button>
                  </p>
                ) : (
                  selectedOrg.projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className="w-full text-left px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors"
                    >
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-gray-400">{project.domain}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // Step: Scan Codebase
  // ============================================

  const handleScan = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/_uptrade/api/scan', { method: 'POST' })
      const data = await res.json()
      setScanResults({
        forms: data.forms.map((f: DetectedItem) => ({ ...f, selected: true })),
        widgets: data.widgets.map((w: DetectedItem) => ({ ...w, selected: true })),
        metadata: data.metadata.map((m: DetectedItem) => ({ ...m, selected: false }))
      })
      setStep('migrate')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  function ScanStep() {
    useEffect(() => {
      handleScan()
    }, [])

    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl animate-pulse">🔍</div>
        <h2 className="text-2xl font-bold">Scanning Your Codebase</h2>
        <p className="text-gray-400">
          Looking for forms, widgets, and metadata to migrate...
        </p>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // ============================================
  // Step: Migration Preview
  // ============================================

  function MigrateStep() {
    if (!scanResults) return null

    const totalItems = [
      ...scanResults.forms,
      ...scanResults.widgets,
      ...scanResults.metadata
    ]
    const selectedItems = totalItems.filter(i => i.selected)

    function toggleItem(type: 'forms' | 'widgets' | 'metadata', index: number) {
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

      const items = selectedItems
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
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
        
        setMigrationProgress(Math.round(((i + 1) / items.length) * 100))
      }

      setIsLoading(false)
      setStep('configure')
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Review & Migrate</h2>
          <p className="text-gray-400">
            Select what you'd like to migrate to Site-Kit
          </p>
        </div>

        {/* Forms section */}
        {scanResults.forms.length > 0 && (
          <Section title="📝 Forms" count={scanResults.forms.filter(f => f.selected).length}>
            {scanResults.forms.map((form, i) => (
              <ItemRow
                key={i}
                item={form}
                onToggle={() => toggleItem('forms', i)}
              />
            ))}
          </Section>
        )}

        {/* Widgets section */}
        {scanResults.widgets.length > 0 && (
          <Section title="💬 Chat Widgets" count={scanResults.widgets.filter(w => w.selected).length}>
            {scanResults.widgets.map((widget, i) => (
              <ItemRow
                key={i}
                item={widget}
                onToggle={() => toggleItem('widgets', i)}
              />
            ))}
          </Section>
        )}

        {/* Metadata section */}
        {scanResults.metadata.length > 0 && (
          <Section title="🏷️ Metadata" count={scanResults.metadata.filter(m => m.selected).length}>
            {scanResults.metadata.map((meta, i) => (
              <ItemRow
                key={i}
                item={meta}
                onToggle={() => toggleItem('metadata', i)}
              />
            ))}
          </Section>
        )}

        {/* No items found */}
        {totalItems.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-4">✨</div>
            <p>No existing forms or widgets detected.</p>
            <p className="text-sm">You're starting fresh!</p>
          </div>
        )}

        {/* Migration log */}
        {migrationLog.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-48 overflow-y-auto">
            {migrationLog.map((log, i) => (
              <div key={i} className={log.startsWith('✗') ? 'text-red-400' : 'text-green-400'}>
                {log}
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {isLoading && (
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${migrationProgress}%` }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => setStep('configure')}>
            Skip Migration
          </Button>
          <Button onClick={handleMigrate} loading={isLoading}>
            Migrate {selectedItems.length} Items →
          </Button>
        </div>
      </div>
    )
  }

  // ============================================
  // Step: Configure
  // ============================================

  function ConfigureStep() {
    const [configuring, setConfiguring] = useState(false)

    async function handleConfigure() {
      setConfiguring(true)
      try {
        await fetch('/_uptrade/api/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: selectedProject?.id })
        })
        setStep('complete')
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setConfiguring(false)
      }
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Configure Site-Kit</h2>
          <p className="text-gray-400">
            We'll add the SiteKitProvider to your layout and set up environment variables
          </p>
        </div>

        <div className="max-w-lg mx-auto space-y-4">
          <ConfigPreview
            title="Environment Variables"
            description=".env.local"
            content={`NEXT_PUBLIC_UPTRADE_PROJECT_ID=${selectedProject?.id || 'xxx'}
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
UPTRADE_API_KEY=ut_xxx`}
          />

          <ConfigPreview
            title="Layout Provider"
            description="app/layout.tsx"
            content={`<SiteKitProvider
  projectId={process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID!}
  supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
  supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
>
  {children}
</SiteKitProvider>`}
          />
        </div>

        <div className="flex justify-center">
          <Button onClick={handleConfigure} loading={configuring}>
            Apply Configuration →
          </Button>
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

    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-3xl font-bold">You're All Set!</h2>
        <p className="text-gray-400 text-lg">
          Site-Kit is now configured and ready to use
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto my-8">
          <QuickLink
            icon="📊"
            title="View Dashboard"
            href="https://portal.uptrademedia.com/dashboard"
          />
          <QuickLink
            icon="📝"
            title="Create Form"
            href="https://portal.uptrademedia.com/forms/new"
          />
          <QuickLink
            icon="📖"
            title="Documentation"
            href="https://docs.uptrademedia.com/site-kit"
          />
          <QuickLink
            icon="💬"
            title="Get Help"
            href="https://portal.uptrademedia.com/support"
          />
        </div>

        <div className="pt-8 border-t border-gray-700">
          <p className="text-gray-400 mb-4">
            Remove this setup wizard from your project?
          </p>
          <Button variant="danger" onClick={handleRemoveSetup} loading={removing}>
            Remove Setup Wizard
          </Button>
          <p className="text-gray-500 text-sm mt-2">
            This will delete the /_uptrade route
          </p>
        </div>
      </div>
    )
  }

  // ============================================
  // Render
  // ============================================

  const steps: Record<Step, React.ComponentType> = {
    welcome: WelcomeStep,
    auth: AuthStep,
    project: ProjectStep,
    scan: ScanStep,
    migrate: MigrateStep,
    configure: ConfigureStep,
    complete: CompleteStep,
  }

  const CurrentStep = steps[step]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${(Object.keys(steps).indexOf(step) / (Object.keys(steps).length - 1)) * 100}%` }}
        />
      </div>

      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
          <span className="font-semibold">Uptrade Site-Kit</span>
        </div>
        {userEmail && (
          <div className="text-gray-400 text-sm">
            {userEmail}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-8 py-16">
        <CurrentStep />
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 px-8 py-4 text-center text-gray-500 text-sm">
        <a href="https://uptrademedia.com" target="_blank" className="hover:text-gray-300">
          Uptrade Media
        </a>
        {' · '}
        <a href="https://docs.uptrademedia.com" target="_blank" className="hover:text-gray-300">
          Docs
        </a>
        {' · '}
        <a href="https://github.com/uptrademedia/site-kit" target="_blank" className="hover:text-gray-300">
          GitHub
        </a>
      </footer>
    </div>
  )
}

// ============================================
// UI Components
// ============================================

function Button({
  children,
  onClick,
  loading,
  disabled,
  variant = 'primary'
}: {
  children: React.ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    secondary: 'bg-gray-700 hover:bg-gray-600',
    danger: 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30'
  }

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : children}
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

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-800/50 flex justify-between items-center">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-gray-400">{count} selected</span>
      </div>
      <div className="divide-y divide-gray-700">
        {children}
      </div>
    </div>
  )
}

function ItemRow({ item, onToggle }: { item: DetectedItem; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/30 transition-colors">
      <input
        type="checkbox"
        checked={item.selected}
        onChange={onToggle}
        className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.type}</div>
        <div className="text-sm text-gray-400 truncate">{item.file}:{item.line}</div>
      </div>
    </div>
  )
}

function ConfigPreview({ title, description, content }: { title: string; description: string; content: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-2 bg-gray-800 flex justify-between items-center">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-gray-400">{description}</span>
      </div>
      <pre className="p-4 text-sm overflow-x-auto">
        <code className="text-green-400">{content}</code>
      </pre>
    </div>
  )
}

function QuickLink({ icon, title, href }: { icon: string; title: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-medium">{title}</span>
    </a>
  )
}

export default SetupWizard
