// src/pages/ecommerce/index.jsx
// Ecommerce Module - Main dashboard with store connection

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEcommerceStore } from '@/lib/ecommerce-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  ShoppingBag, 
  Package, 
  ShoppingCart, 
  Settings, 
  RefreshCw,
  Store,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Unplug
} from 'lucide-react'

export default function EcommerceDashboard({ embedded = false, onNavigate }) {
  const { 
    store, 
    storeLoading, 
    storeError, 
    fetchStore, 
    connectStore, 
    disconnectStore,
    isSyncing,
    triggerSync
  } = useEcommerceStore()

  const [connectOpen, setConnectOpen] = useState(false)
  const [shopDomain, setShopDomain] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')

  // No useEffect needed - EcommerceModuleWrapper already fetches store data

  const handleConnect = async (e) => {
    e.preventDefault()
    setConnecting(true)
    setConnectError('')

    const result = await connectStore(shopDomain, accessToken)
    
    if (result.success) {
      setConnectOpen(false)
      setShopDomain('')
      setAccessToken('')
    } else {
      setConnectError(result.error)
    }
    setConnecting(false)
  }

  const handleDisconnect = async () => {
    await disconnectStore()
  }

  const handleSync = async () => {
    await triggerSync('full')
  }

  // Loading state
  if (storeLoading && !store) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No store connected - show connection UI
  if (!store) {
    return (
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Ecommerce</h1>
          <p className="text-muted-foreground mt-1">
            Connect your Shopify store to manage products, inventory, and orders.
          </p>
        </div>

        {storeError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{storeError}</AlertDescription>
          </Alert>
        )}

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Connect Your Shopify Store
            </CardTitle>
            <CardDescription>
              Connect your store using a Custom App access token to manage your inventory directly from the portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">How to create a Custom App:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to your Shopify Admin → Settings → Apps and sales channels</li>
                  <li>Click "Develop apps" → "Create an app"</li>
                  <li>Configure Admin API scopes:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>read_products, write_products</li>
                      <li>read_inventory, write_inventory</li>
                      <li>read_orders</li>
                      <li>read_locations</li>
                    </ul>
                  </li>
                  <li>Install the app and copy the Admin API access token</li>
                </ol>
              </div>

              <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <Store className="mr-2 h-4 w-4" />
                    Connect Store
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleConnect}>
                    <DialogHeader>
                      <DialogTitle>Connect Shopify Store</DialogTitle>
                      <DialogDescription>
                        Enter your store domain and Custom App access token.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      {connectError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{connectError}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="shopDomain">Store Domain</Label>
                        <Input
                          id="shopDomain"
                          placeholder="your-store.myshopify.com"
                          value={shopDomain}
                          onChange={(e) => setShopDomain(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Your .myshopify.com domain (not your custom domain)
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="accessToken">Admin API Access Token</Label>
                        <Input
                          id="accessToken"
                          type="password"
                          placeholder="shpat_..."
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          From your Custom App → API credentials
                        </p>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setConnectOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={connecting}>
                        {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect Store
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Store connected - show dashboard
  return (
    <div className="py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Ecommerce</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Shopify store products, inventory, and orders.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Unplug className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Store?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will disconnect <strong>{store.shopName}</strong> from the portal. 
                  All cached data will be removed. You can reconnect at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Connected Store Info */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{store.shopName}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {store.shopDomain}
                  <a 
                    href={`https://${store.shopDomain}/admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Admin
                  </a>
                </CardDescription>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Plan: <span className="font-medium">{store.planName || 'Unknown'}</span></p>
              <p>Currency: <span className="font-medium">{store.currency}</span></p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Module Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Products</CardTitle>
                <CardDescription>Manage your product catalog</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Edit products, update prices, manage SEO titles and descriptions.
            </p>
            {embedded ? (
              <Button variant="outline" className="w-full" onClick={() => onNavigate?.('products')}>
                View Products
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link to="/ecommerce/products">
                  View Products
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Inventory</CardTitle>
                <CardDescription>Track and update stock levels</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View inventory across locations, adjust quantities, set alerts.
            </p>
            {embedded ? (
              <Button variant="outline" className="w-full" onClick={() => onNavigate?.('inventory')}>
                Manage Inventory
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link to="/ecommerce/inventory">
                  Manage Inventory
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Orders</CardTitle>
                <CardDescription>View recent orders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Browse order history, view customer details and fulfillment status.
            </p>
            {embedded ? (
              <Button variant="outline" className="w-full" onClick={() => onNavigate?.('orders')}>
                View Orders
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link to="/ecommerce/orders">
                  View Orders
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Info */}
      {store.lastSyncAt && (
        <p className="text-sm text-muted-foreground text-center mt-8">
          Last synced: {new Date(store.lastSyncAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
