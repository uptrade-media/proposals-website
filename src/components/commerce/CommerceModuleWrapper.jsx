// src/components/commerce/CommerceModuleWrapper.jsx
// Wrapper for embedding Commerce module in MainLayout

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCommerceStore } from '@/lib/commerce-store'
import useAuthStore from '@/lib/auth-store'
import CommerceDashboard from '@/pages/commerce/CommerceDashboard'

export default function CommerceModuleWrapper({ onNavigate }) {
  const { currentProject } = useAuthStore()
  const { settings, fetchSettings } = useCommerceStore()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentProject?.id && !settings) {
      fetchSettings(currentProject.id)
    }
  }, [currentProject?.id, settings, fetchSettings])

  useEffect(() => {
    const match = location.pathname.match(/^\/commerce\/offerings\/([^/]+)(?:\/(edit))?$/)
    if (match) {
      const offeringId = match[1]
      const isEdit = match[2] === 'edit'
      const params = new URLSearchParams({
        view: 'offering',
        offeringId,
      })
      if (isEdit) {
        params.set('mode', 'edit')
      }
      navigate(`/commerce?${params.toString()}`, { replace: true })
    }
  }, [location.pathname, navigate])

  return <CommerceDashboard onNavigate={onNavigate} />
}
