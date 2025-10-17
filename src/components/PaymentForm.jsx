// src/components/PaymentForm.jsx
// Square Web Payments SDK integration for credit card payments

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, Lock, CheckCircle } from 'lucide-react'

/**
 * PaymentForm Component
 * 
 * Integrates Square Web Payments SDK for secure card payments
 * 
 * Props:
 * - invoice: Invoice object with id, amount, and details
 * - customer: Customer object with email, givenName, familyName
 * - onSuccess: Callback when payment succeeds
 * - onError: Callback when payment fails
 * - onCancel: Callback when user cancels
 */
export default function PaymentForm({ invoice, customer, onSuccess, onError, onCancel }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [card, setCard] = useState(null)
  const cardContainerRef = useRef(null)

  // Load Square Web Payments SDK
  useEffect(() => {
    const script = document.createElement('script')
    const isProduction = import.meta.env.VITE_SQUARE_ENVIRONMENT === 'production'
    script.src = isProduction 
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js'
    script.async = true
    script.onload = initializeSquare
    script.onerror = () => {
      setError('Failed to load Square payment form')
      setIsLoading(false)
    }
    document.body.appendChild(script)

    return () => {
      if (card) {
        card.destroy()
      }
      document.body.removeChild(script)
    }
  }, [])

  // Initialize Square Web Payments SDK
  async function initializeSquare() {
    if (!window.Square) {
      setError('Square SDK not loaded')
      setIsLoading(false)
      return
    }

    try {
      // Get application ID and location ID from environment variables
      const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID
      const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID

      if (!applicationId) {
        throw new Error('VITE_SQUARE_APPLICATION_ID is required')
      }

      if (!locationId) {
        throw new Error('VITE_SQUARE_LOCATION_ID is required')
      }

      // Initialize payments
      const payments = window.Square.payments(applicationId, locationId)

      // Create card payment form
      const cardInstance = await payments.card({
        style: {
          input: {
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1f2937',
            '::placeholder': {
              color: '#9ca3af'
            }
          },
          '.input-container': {
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          },
          '.input-container.is-focus': {
            border: '2px solid #39bfb0'
          },
          '.input-container.is-error': {
            border: '2px solid #ef4444'
          },
          '.message-text': {
            color: '#ef4444',
            fontSize: '14px'
          }
        }
      })

      // Attach card form to DOM
      await cardInstance.attach(cardContainerRef.current)
      
      setCard(cardInstance)
      setIsLoading(false)
    } catch (e) {
      console.error('Error initializing Square:', e)
      setError('Failed to initialize payment form')
      setIsLoading(false)
    }
  }

  // Handle payment submission
  async function handlePayment(e) {
    e.preventDefault()
    
    if (!card) {
      setError('Payment form not ready')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Tokenize card details
      const result = await card.tokenize()

      if (result.status === 'OK') {
        // Send token to backend for payment processing
        if (onSuccess) {
          await onSuccess({
            sourceId: result.token,
            amount: invoice.totalAmount,
            customer: customer
          })
        }
      } else {
        // Handle tokenization errors
        let errorMessage = 'Card verification failed'
        
        if (result.errors) {
          errorMessage = result.errors.map(error => error.message).join(', ')
        }

        setError(errorMessage)
        if (onError) {
          onError(new Error(errorMessage))
        }
      }
    } catch (e) {
      console.error('Payment error:', e)
      setError(e.message || 'Payment processing failed')
      if (onError) {
        onError(e)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Payment Details
            </CardTitle>
            <CardDescription className="mt-1">
              Invoice #{invoice?.invoiceNumber || invoice?.id}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Amount Due</div>
            <div className="text-2xl font-bold text-green-600">
              ${invoice?.totalAmount?.toFixed(2)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Secure badge */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
          <Lock className="h-4 w-4" />
          <span>Secure payment powered by Square</span>
        </div>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        )}

        {/* Square card form container */}
        {!isLoading && (
          <form onSubmit={handlePayment} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Card Information
              </label>
              <div 
                ref={cardContainerRef} 
                id="card-container"
                className="min-h-[120px]"
              />
            </div>

            {/* Customer info display */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="text-sm font-medium">Billing Information</div>
              <div className="text-sm text-muted-foreground">
                {customer?.givenName} {customer?.familyName}
              </div>
              <div className="text-sm text-muted-foreground">
                {customer?.email}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !card}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Pay ${invoice?.totalAmount?.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Security notice */}
        <div className="text-xs text-center text-muted-foreground">
          Your payment information is encrypted and secure. We never store your card details.
        </div>
      </CardContent>
    </Card>
  )
}
