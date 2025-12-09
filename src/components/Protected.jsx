// src/components/Protected.jsx
import React from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import useAuthStore from '../lib/auth-store'

export default function Protected({ children }) {
  const { slug } = useParams()
  const nav = useNavigate()
  const loc = useLocation()
  const { isAuthenticated, user } = useAuthStore()
  
  React.useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      console.log('[Protected] User not authenticated, redirecting to login')
      const next = encodeURIComponent(loc.pathname + loc.search)
      const prefix = slug ? `/login?brand=${encodeURIComponent(slug)}&next=${next}` : `/login?next=${next}`
      nav(prefix, { replace: true })
      return
    }
    
    console.log('[Protected] User authenticated:', user?.email)
  }, [isAuthenticated, user, loc.pathname, loc.search, slug, nav])

  // Show nothing while redirecting or if not authenticated
  if (!isAuthenticated || !user) return null
  
  return children
}
