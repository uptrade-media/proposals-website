/**
 * @uptrade/site-kit/commerce - useEventModal hook
 * 
 * Hook for managing event modal state.
 */

'use client'

import { useState, useCallback } from 'react'
import type { CommerceOffering, CommerceSchedule } from './types'

export interface UseEventModalReturn {
  /** Currently selected event */
  event: CommerceOffering | null
  /** Currently selected schedule */
  schedule: CommerceSchedule | null
  /** Whether modal is open */
  isOpen: boolean
  /** Open modal with event */
  openModal: (event: CommerceOffering, schedule?: CommerceSchedule) => void
  /** Close modal */
  closeModal: () => void
}

export function useEventModal(): UseEventModalReturn {
  const [event, setEvent] = useState<CommerceOffering | null>(null)
  const [schedule, setSchedule] = useState<CommerceSchedule | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  
  const openModal = useCallback((newEvent: CommerceOffering, newSchedule?: CommerceSchedule) => {
    setEvent(newEvent)
    setSchedule(newSchedule || newEvent.schedules?.[0] || null)
    setIsOpen(true)
  }, [])
  
  const closeModal = useCallback(() => {
    setIsOpen(false)
    // Delay clearing event data for exit animation
    setTimeout(() => {
      setEvent(null)
      setSchedule(null)
    }, 200)
  }, [])
  
  return {
    event,
    schedule,
    isOpen,
    openModal,
    closeModal,
  }
}

export default useEventModal
