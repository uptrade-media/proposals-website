// src/pages/ecommerce/OrdersPage.jsx
// Orders viewing with filters and detail view

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEcommerceStore } from '@/lib/ecommerce-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, ShoppingCart, Loader2, Search, ExternalLink, 
  Package, Truck, CreditCard, User, MapPin, Clock, RefreshCw 
} from 'lucide-react'
import { format } from 'date-fns'

// Status badge configurations
const financialStatusColors = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  partially_refunded: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  authorized: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  voided: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

const fulfillmentStatusColors = {
  fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  unfulfilled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  restocked: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

export default function OrdersPage({ embedded = false, onNavigate }) {
  const navigate = useNavigate()
  const { 
    store, fetchStore, storeLoading,
    orders, ordersLoading, ordersTotal, fetchOrders, fetchOrder 
  } = useEcommerceStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [financialFilter, setFinancialFilter] = useState('any')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('any')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderDetailLoading, setOrderDetailLoading] = useState(false)
  
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
  
  useEffect(() => {
    if (store) {
      loadOrders()
    }
  }, [store, financialFilter, fulfillmentFilter])
  
  const loadOrders = () => {
    const params = { status: 'any', limit: 50 }
    if (financialFilter !== 'any') params.financial_status = financialFilter
    if (fulfillmentFilter !== 'any') params.fulfillment_status = fulfillmentFilter
    fetchOrders(params)
  }
  
  const handleViewOrder = async (order) => {
    setOrderDetailLoading(true)
    setSelectedOrder(order)
    // Fetch full order details
    const fullOrder = await fetchOrder(order.id)
    if (fullOrder) {
      setSelectedOrder(fullOrder)
    }
    setOrderDetailLoading(false)
  }
  
  // Filter orders by search query (order number or customer email)
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.name?.toLowerCase().includes(query) ||
      order.orderNumber?.toString().includes(query) ||
      order.email?.toLowerCase().includes(query) ||
      order.customer?.firstName?.toLowerCase().includes(query) ||
      order.customer?.lastName?.toLowerCase().includes(query)
    )
  })

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigateTo('dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-sm text-muted-foreground">
              {ordersTotal} total orders
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={ordersLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${ordersLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a 
              href={`https://${store.shopDomain}/admin/orders`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Shopify Admin
            </a>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by order # or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={financialFilter} onValueChange={setFinancialFilter}>
              <SelectTrigger className="w-[160px]">
                <CreditCard className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="authorized">Authorized</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="partially_refunded">Partial Refund</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
              <SelectTrigger className="w-[160px]">
                <Package className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Fulfillment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All Fulfillment</SelectItem>
                <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {ordersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {searchQuery || financialFilter !== 'any' || fulfillmentFilter !== 'any'
                ? 'Try adjusting your filters'
                : 'Orders will appear here once customers make purchases'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleViewOrder(order)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{order.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={financialStatusColors[order.financialStatus] || ''}
                      >
                        {order.financialStatus?.replace('_', ' ')}
                      </Badge>
                      <Badge 
                        variant="secondary"
                        className={fulfillmentStatusColors[order.fulfillmentStatus] || ''}
                      >
                        {order.fulfillmentStatus?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {order.customer && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.customer.firstName} {order.customer.lastName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                      <span>{order.itemsCount} item{order.itemsCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${parseFloat(order.totalPrice).toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">{order.currency}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="!max-w-3xl !w-[90vw] max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Order {selectedOrder.name}
                  <Badge 
                    variant="secondary" 
                    className={financialStatusColors[selectedOrder.financialStatus] || ''}
                  >
                    {selectedOrder.financialStatus?.replace('_', ' ')}
                  </Badge>
                  <Badge 
                    variant="secondary"
                    className={fulfillmentStatusColors[selectedOrder.fulfillmentStatus] || ''}
                  >
                    {selectedOrder.fulfillmentStatus?.replace('_', ' ')}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              {orderDetailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="ml-2">{format(new Date(selectedOrder.createdAt), 'PPpp')}</span>
                    </div>
                    {selectedOrder.email && (
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <span className="ml-2">{selectedOrder.email}</span>
                      </div>
                    )}
                  </div>

                  <Separator />
                  
                  {/* Line Items */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Items ({selectedOrder.itemsCount})
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.lineItems?.map((item) => (
                        <div key={item.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{item.title}</div>
                            {item.variantTitle && item.variantTitle !== 'Default Title' && (
                              <div className="text-sm text-muted-foreground">{item.variantTitle}</div>
                            )}
                            {item.sku && (
                              <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div>${parseFloat(item.price).toFixed(2)} × {item.quantity}</div>
                            <div className="font-medium">
                              ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />
                  
                  {/* Order Summary */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Addresses */}
                    <div className="space-y-4">
                      {selectedOrder.shippingAddress && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Shipping Address
                          </h4>
                          <div className="text-sm space-y-1">
                            <div>{selectedOrder.shippingAddress.name}</div>
                            <div>{selectedOrder.shippingAddress.address1}</div>
                            {selectedOrder.shippingAddress.address2 && (
                              <div>{selectedOrder.shippingAddress.address2}</div>
                            )}
                            <div>
                              {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.province} {selectedOrder.shippingAddress.zip}
                            </div>
                            <div>{selectedOrder.shippingAddress.country}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Customer */}
                      {selectedOrder.customer && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Customer
                          </h4>
                          <div className="text-sm space-y-1">
                            <div>{selectedOrder.customer.firstName} {selectedOrder.customer.lastName}</div>
                            <div className="text-muted-foreground">{selectedOrder.customer.email}</div>
                            <div className="text-muted-foreground">
                              {selectedOrder.customer.ordersCount} order{selectedOrder.customer.ordersCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Totals */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Payment Summary
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${parseFloat(selectedOrder.subtotalPrice).toFixed(2)}</span>
                        </div>
                        {parseFloat(selectedOrder.totalDiscounts) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-${parseFloat(selectedOrder.totalDiscounts).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Shipping</span>
                          <span>${parseFloat(selectedOrder.totalShipping).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>${parseFloat(selectedOrder.totalTax).toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold text-base">
                          <span>Total</span>
                          <span>${parseFloat(selectedOrder.totalPrice).toFixed(2)} {selectedOrder.currency}</span>
                        </div>
                      </div>
                      
                      {/* Fulfillments */}
                      {selectedOrder.fulfillments?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Tracking</h4>
                          <div className="space-y-2">
                            {selectedOrder.fulfillments.map((f) => (
                              <div key={f.id} className="text-sm">
                                {f.trackingUrl ? (
                                  <a 
                                    href={f.trackingUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {f.trackingNumber || 'View Tracking'}
                                  </a>
                                ) : f.trackingNumber ? (
                                  <span>{f.trackingNumber}</span>
                                ) : null}
                                {f.trackingCompany && (
                                  <span className="text-muted-foreground ml-2">({f.trackingCompany})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Notes */}
                  {selectedOrder.note && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Order Notes</h4>
                        <p className="text-sm text-muted-foreground">{selectedOrder.note}</p>
                      </div>
                    </>
                  )}
                  
                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" asChild>
                      <a 
                        href={`https://${store.shopDomain}/admin/orders/${selectedOrder.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View in Shopify
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
