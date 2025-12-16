// src/pages/InvoicePayment.jsx
// Public invoice payment page - no login required
// Accessible via /pay/:token

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Receipt, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Calendar,
  Building,
  CreditCard,
  Lock
} from 'lucide-react'
import api from '@/lib/api'

// Square Web SDK - use VITE_ prefix for client-side access
// These should match your Netlify env vars (All scopes = available to frontend)
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID || import.meta.env.SQUARE_APPLICATION_ID
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID || import.meta.env.SQUARE_LOCATION_ID
const SQUARE_ENV = import.meta.env.VITE_SQUARE_ENVIRONMENT || import.meta.env.SQUARE_ENVIRONMENT || 'sandbox'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateString) {
  if (!dateString) return 'Upon Receipt'
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

export default function InvoicePayment() {
  const { token } = useParams()
  const navigate = useNavigate()
  
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentError, setPaymentError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [card, setCard] = useState(null)
  const [payments, setPayments] = useState(null)

  // Fetch invoice on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid payment link')
      setLoading(false)
      return
    }

    fetchInvoice()
  }, [token])

  // Initialize Square Web SDK
  useEffect(() => {
    if (!invoice || invoice.status === 'paid' || !SQUARE_APP_ID) return

    initializeSquare()
  }, [invoice])

  const fetchInvoice = async () => {
    try {
      const response = await api.get(`/.netlify/functions/invoices-get-public?token=${token}`)
      setInvoice(response.data.invoice)
    } catch (err) {
      console.error('Failed to fetch invoice:', err)
      if (err.response?.status === 410) {
        setError('This payment link has expired. Please contact us for a new invoice.')
      } else if (err.response?.status === 404) {
        setError('Invoice not found. This link may be invalid or expired.')
      } else {
        setError('Failed to load invoice. Please try again or contact support.')
      }
    } finally {
      setLoading(false)
    }
  }

  const initializeSquare = async () => {
    try {
      // Load Square Web SDK
      if (!window.Square) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = SQUARE_ENV === 'production' 
            ? 'https://web.squarecdn.com/v1/square.js'
            : 'https://sandbox.web.squarecdn.com/v1/square.js'
          script.onload = resolve
          script.onerror = reject
          document.body.appendChild(script)
        })
      }

      const paymentsInstance = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID)
      setPayments(paymentsInstance)

      const cardInstance = await paymentsInstance.card()
      await cardInstance.attach('#card-container')
      setCard(cardInstance)
    } catch (err) {
      console.error('Failed to initialize Square:', err)
      setPaymentError('Failed to initialize payment form. Please refresh and try again.')
    }
  }

  const handlePayment = async () => {
    if (!card || !invoice) return

    setProcessing(true)
    setPaymentError(null)

    try {
      // Tokenize card
      const result = await card.tokenize()
      
      if (result.status !== 'OK') {
        throw new Error(result.errors?.[0]?.message || 'Card validation failed')
      }

      // Process payment
      const response = await api.post('/.netlify/functions/invoices-pay-public', {
        token,
        sourceId: result.token
      })

      if (response.data.success) {
        setPaymentSuccess(true)
        setInvoice(prev => ({ ...prev, status: 'paid' }))
      }
    } catch (err) {
      console.error('Payment failed:', err)
      setPaymentError(err.response?.data?.details || err.response?.data?.error || err.message || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#4bbf39] mx-auto mb-4" />
            <p className="text-gray-600">Loading invoice...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Invoice</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.href = 'mailto:hello@uptrademedia.com'}>
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Payment success state
  if (paymentSuccess || invoice?.status === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#4bbf39] to-[#3a9c2d] p-6 text-center">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
          </div>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-6">
              Thank you for your payment. A receipt has been sent to your email.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Invoice</span>
                <span className="font-medium">{invoice?.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-bold text-[#4bbf39]">{formatCurrency(invoice?.totalAmount)}</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-500">
              Questions? Contact us at{' '}
              <a href="mailto:hello@uptrademedia.com" className="text-[#4bbf39] hover:underline">
                hello@uptrademedia.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main payment view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://uptrademedia.com/logo.png" 
            alt="Uptrade Media" 
            className="h-10 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Pay Invoice</h1>
          <p className="text-gray-600">Secure payment powered by Square</p>
        </div>

        {/* Invoice Details */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#4bbf39]" />
                {invoice.invoiceNumber}
              </CardTitle>
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                Due
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.contact && (
              <div className="flex items-center gap-2 text-gray-600">
                <Building className="w-4 h-4" />
                <span>{invoice.contact.company || invoice.contact.name}</span>
              </div>
            )}
            
            {invoice.description && (
              <p className="text-gray-600 text-sm border-l-2 border-[#4bbf39] pl-3">
                {invoice.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Due: {formatDate(invoice.dueDate)}</span>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Tax</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total Due</span>
                <span className="text-[#4bbf39]">{formatCurrency(invoice.totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}

            {/* Square Card Element Container */}
            <div 
              id="card-container" 
              className="min-h-[50px] border border-gray-200 rounded-lg p-3 bg-white"
            />

            <Button 
              onClick={handlePayment}
              disabled={processing || !card}
              className="w-full bg-[#4bbf39] hover:bg-[#3a9c2d] text-white py-6 text-lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Pay {formatCurrency(invoice.totalAmount)}
                </>
              )}
            </Button>

            <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Secure payment - Your card details are encrypted
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            Questions about this invoice?{' '}
            <a href="mailto:hello@uptrademedia.com" className="text-[#4bbf39] hover:underline">
              Contact us
            </a>
          </p>
          <p className="mt-2">© {new Date().getFullYear()} Uptrade Media</p>
        </div>
      </div>
    </div>
  )
}
