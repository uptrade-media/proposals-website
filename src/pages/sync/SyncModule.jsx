// src/pages/sync/SyncModule.jsx
// Main Sync module page - calendar management and booking
// Signal AI features conditionally shown based on org access

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SyncModule as SyncModuleComponent } from '@/components/sync'
import { useProject } from '@/hooks/useProject'
import useAuthStore from '@/lib/auth-store'
import UptradeLoading from '@/components/UptradeLoading'
import Navigation from '@/pages/Navigation'

export default function SyncModule() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuthStore()
  const { currentProject, isLoading: projectsLoading, error: projectsError } = useProject()
  
  // Loading state
  if (authLoading || projectsLoading) {
    return <UptradeLoading />
  }
  
  // No project selected - redirect to dashboard
  if (!currentProject && !projectsLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-page)]">
        <Navigation />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">No Project Selected</h1>
            <p className="text-muted-foreground mb-6">
              Please select a project from the sidebar to access Sync.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <Navigation />
      <main className="transition-all duration-200">
        <SyncModuleComponent />
      </main>
    </div>
  )
}
