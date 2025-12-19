// src/pages/ecommerce/OrdersPage.jsx
// Orders viewing - Phase 4 placeholder

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEcommerceStore } from '@/lib/ecommerce-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ShoppingCart, Loader2 } from 'lucide-react'

export default function OrdersPage({ embedded = false, onNavigate }) {
  const navigate = useNavigate()
  const { store, fetchStore, storeLoading } = useEcommerceStore()
  
  // Navigation helper - uses embedded callback or router
  const navigateTo = (path) => {
    if (embedded && onNavigate) {
      onNavigate(path)
    } else if (path === 'dashboard') {
      navigate('/ecommerce')
    } else {
      navigate(`/ecommerce/${path}`)
    }
  }

  useEffect(() => {
    if (!store) fetchStore()
  }, [store, fetchStore])

  if (storeLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Store Connected</h2>
          <p className="text-muted-foreground mb-4">Connect your Shopify store first.</p>
          <Button onClick={() => navigateTo('dashboard')}>
            Connect Store
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigateTo('dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            View order history and fulfillment status
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Order viewing is coming in Phase 4.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Features planned:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
            <li>View recent orders (last 30 days)</li>
            <li>Filter by status (paid, pending, fulfilled)</li>
            <li>View order details and line items</li>
            <li>Customer information</li>
            <li>Fulfillment tracking</li>
          </ul>
          
          <p className="mt-4 text-sm">
            For now, manage orders directly in Shopify admin.
          </p>
          
          <Button 
            variant="outline" 
            className="mt-4"
            asChild
          >
            <a 
              href={`https://${store.shopDomain}/admin/orders`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Shopify Orders
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
