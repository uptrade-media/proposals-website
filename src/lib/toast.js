/**
 * Toast notification utility wrapper for Sonner
 * Provides consistent toast notifications across the application
 * 
 * Usage:
 *   import { toast } from '@/lib/toast'
 *   toast.success('Operation completed!')
 *   toast.error('Something went wrong')
 */

import { toast as sonnerToast } from 'sonner'

export const toast = {
  /**
   * Show a success toast notification
   * @param {string} message - The success message to display
   * @param {object} options - Additional Sonner options
   */
  success: (message, options = {}) => {
    sonnerToast.success(message, {
      duration: 4000,
      ...options
    })
  },
  
  /**
   * Show an error toast notification
   * @param {string} message - The error message to display
   * @param {object} options - Additional Sonner options
   */
  error: (message, options = {}) => {
    sonnerToast.error(message, {
      duration: 6000,
      ...options
    })
  },
  
  /**
   * Show an info toast notification
   * @param {string} message - The info message to display
   * @param {object} options - Additional Sonner options
   */
  info: (message, options = {}) => {
    sonnerToast.info(message, {
      duration: 4000,
      ...options
    })
  },
  
  /**
   * Show a loading toast notification
   * Returns an ID that can be used to update/dismiss the toast
   * @param {string} message - The loading message to display
   * @param {object} options - Additional Sonner options
   * @returns {string|number} Toast ID
   */
  loading: (message, options = {}) => {
    return sonnerToast.loading(message, options)
  },
  
  /**
   * Show a promise-based toast that updates on resolution/rejection
   * @param {Promise} promise - The promise to track
   * @param {object} messages - Messages for loading, success, and error states
   * @returns {Promise} The original promise
   */
  promise: (promise, messages) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Error occurred',
      ...messages
    })
  },
  
  /**
   * Dismiss a specific toast by ID
   * @param {string|number} toastId - The ID of the toast to dismiss
   */
  dismiss: (toastId) => {
    sonnerToast.dismiss(toastId)
  },
  
  /**
   * Dismiss all active toasts
   */
  dismissAll: () => {
    sonnerToast.dismiss()
  }
}
