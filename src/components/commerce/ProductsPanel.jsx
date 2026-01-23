// src/components/commerce/ProductsPanel.jsx
// Products/E-commerce panel - inventory, variants, Shopify sync

import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Plus,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock data for demo
const mockProducts = [
  { id: '1', name: 'GWA Logo Hoodie - Black', price: 59.99, stock: 23, status: 'active', image: null },
  { id: '2', name: 'Fitness Resistance Bands Set', price: 29.99, stock: 45, status: 'active', image: null },
  { id: '3', name: 'Premium Workout Guide', price: 19.99, stock: null, status: 'active', image: null, digital: true },
  { id: '4', name: 'Protein Shaker Bottle', price: 14.99, stock: 8, status: 'low_stock', image: null },
]

const mockLowStock = [
  { id: '1', name: 'GWA Logo Hoodie - Black', stock: 3, threshold: 10 },
  { id: '2', name: 'Fitness Resistance Bands', stock: 5, threshold: 15 },
  { id: '3', name: 'Protein Shaker Bottle', stock: 8, threshold: 20 },
]

export function ProductsPanel({ 
  products = [], 
  lowStockItems = [],
  stats = {},
  shopifyConnected = false,
  showMockData = true,
  compact = false,
  brandColors = {},
  className 
}) {
  const navigate = useNavigate()
  
  const displayProducts = products.length > 0 ? products : (showMockData ? mockProducts : [])
  const displayLowStock = lowStockItems.length > 0 ? lowStockItems : (showMockData ? mockLowStock : [])
  const displayStats = Object.keys(stats).length > 0 ? stats : (showMockData ? {
    totalProducts: 47,
    activeProducts: 42,
    totalInventory: 1234,
    lowStockCount: 3,
  } : {})

  const primary = brandColors.primary || '#4bbf39'
  const rgba = brandColors.rgba || { primary10: 'rgba(75, 191, 57, 0.1)', primary20: 'rgba(75, 191, 57, 0.2)' }

  if (compact) {
    return (
      <Card className={cn("border-l-4", className)} style={{ borderLeftColor: primary }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: rgba.primary10, color: primary }}
              >
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Products</p>
                <p className="text-sm text-muted-foreground">{displayStats.activeProducts || 0} active</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('/commerce/offerings?type=product')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {displayLowStock.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{displayLowStock.length} items low on stock</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-l-4", className)} style={{ borderLeftColor: primary }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: rgba.primary10, color: primary }}
            >
              <Package className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>Physical &amp; digital goods</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {shopifyConnected && (
              <Badge variant="outline" className="gap-1">
                <Store className="h-3 w-3" />
                Shopify
              </Badge>
            )}
            <Button size="sm" onClick={() => navigate('/commerce/offerings/new?type=product')}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Total" value={displayStats.totalProducts || 0} />
          <StatBox label="Active" value={displayStats.activeProducts || 0} />
          <StatBox label="Inventory" value={displayStats.totalInventory || 0} />
          <StatBox 
            label="Low Stock" 
            value={displayStats.lowStockCount || 0} 
            alert={displayStats.lowStockCount > 0}
          />
        </div>

        {/* Low Stock Alerts */}
        {displayLowStock.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium text-sm">Low Stock Alerts</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {displayLowStock.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{item.name}</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 ml-2">
                    {item.stock} left
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Products */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Recent Products</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/commerce/offerings?type=product">View All</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {displayProducts.slice(0, 4).map(product => (
              <div 
                key={product.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/commerce/offerings/${product.id}`)}
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {product.image ? (
                    <img src={product.image} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ${product.price} • {product.digital ? 'Digital' : `${product.stock} in stock`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shopify Sync Status */}
        {shopifyConnected && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Last synced 2 hours ago</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7">
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value, alert = false }) {
  return (
    <div className={cn(
      "p-2 rounded-lg text-center",
      alert ? "bg-amber-50 dark:bg-amber-900/10" : "bg-muted/50"
    )}>
      <p className={cn(
        "text-lg font-bold",
        alert && "text-amber-600"
      )}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export default ProductsPanel
