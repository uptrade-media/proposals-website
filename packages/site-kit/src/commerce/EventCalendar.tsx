/**
 * @uptrade/site-kit/commerce - EventCalendar
 * 
 * Calendar view with built-in registration modal.
 * Clicking an event opens a popup for registration/checkout.
 */

'use client'

import React from 'react'
import type { CommerceOffering, CommerceSchedule, CheckoutResult } from './types'
import type { CalendarViewProps } from './CalendarView'
import type { AdditionalField } from './EventModal'
import { CalendarView } from './CalendarView'
import { EventModal } from './EventModal'
import { useEventModal } from './useEventModal'

export interface EventCalendarProps extends Omit<CalendarViewProps, 'onEventClick'> {
  /** Callback when registration/checkout succeeds */
  onRegistrationSuccess?: (result: CheckoutResult) => void
  /** Callback when registration/checkout fails */
  onRegistrationError?: (error: string) => void
  /** Collect phone number in registration form */
  collectPhone?: boolean
  /** Additional form fields for registration */
  additionalFields?: AdditionalField[]
  /** Custom modal class names */
  modalClassName?: string
  modalOverlayClassName?: string
  modalContentClassName?: string
}

export function EventCalendar({
  onRegistrationSuccess,
  onRegistrationError,
  collectPhone = false,
  additionalFields = [],
  modalClassName,
  modalOverlayClassName,
  modalContentClassName,
  ...calendarProps
}: EventCalendarProps) {
  const { event, schedule, isOpen, openModal, closeModal } = useEventModal()
  
  const handleEventClick = (clickedEvent: CommerceOffering, clickedSchedule: CommerceSchedule) => {
    openModal(clickedEvent, clickedSchedule)
  }
  
  const handleSuccess = (result: CheckoutResult) => {
    onRegistrationSuccess?.(result)
    // Keep modal open to show success state
  }
  
  const handleError = (error: string) => {
    onRegistrationError?.(error)
  }
  
  return (
    <>
      <CalendarView
        {...calendarProps}
        onEventClick={handleEventClick}
      />
      
      <EventModal
        event={event}
        schedule={schedule}
        isOpen={isOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
        onError={handleError}
        collectPhone={collectPhone}
        additionalFields={additionalFields}
        className={modalClassName}
        overlayClassName={modalOverlayClassName}
        contentClassName={modalContentClassName}
      />
    </>
  )
}

export default EventCalendar
