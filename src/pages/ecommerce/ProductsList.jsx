// src/pages/ecommerce/ProductsList.jsx
// Products grid with search, filters, and quick edit

import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEcommerceStore } from '@/lib/ecommerce-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Search,
  ArrowLeft,
  Package,
  Image as ImageIcon,
  MoreVertical,
  ExternalLink,
  Edit,
  Eye,
  RefreshCw,
  Grid3X3,
  List,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  PackageX
} from 'lucide-react'

const statusColors = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}

export default function ProductsList({ embedded = false, onNavigate }) {
  const navigate = useNavigate()
  
  // Navigation helper - uses embedded callback or router
  const navigateTo = (path, data) => {
    if (embedded && onNavigate) {
      onNavigate(path, data)
    } else if (path === 'dashboard' || path === '') {
      navigate('/ecommerce')
    } else if (path.startsWith('product-detail:')) {
      const productId = path.split(':')[1]
      navigate(`/ecommerce/products/${productId}`)
    } else {
      navigate(`/ecommerce/${path}`)
    }
  }
  
  const { 
    store,
    products, 
    productsLoading, 
    productsError,
    productsTotal,
    fetchProducts,
    fetchStore,
    triggerSync,
    isSyncing
  } = useEcommerceStore()
  
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('title')
  
  const limit = 24
  
  // Fetch store if not loaded
  useEffect(() => {
    if (!store) {
      fetchStore()
    }
  }, [store, fetchStore])
  
  // Fetch products when filters change
  useEffect(() => {
    if (store) {
      fetchProducts({
        page,
        limit,
        status: status === 'all' ? null : status,
        search: search || null,
        sortBy
      })
    }
  }, [store, page, status, search, sortBy, fetchProducts])
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])
  
  useEffect(() => {
    if (store && debouncedSearch !== undefined) {
      setPage(1)
      fetchProducts({
        page: 1,
        limit,
        status: status === 'all' ? null : status,
        search: debouncedSearch || null,
        sortBy
      })
    }
  }, [debouncedSearch])
  
  const totalPages = Math.ceil(productsTotal / limit)
  
  const handleSync = async () => {
    await triggerSync('products')
    // Refetch after sync
    fetchProducts({ page, limit, status: status === 'all' ? null : status, search, sortBy })
  }

  // No store - redirect to connection
  if (!store && !productsLoading) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <PackageX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Store Connected</h2>
          <p className="text-muted-foreground mb-4">Connect your Shopify store to manage products.</p>
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
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">
              {productsTotal} products in {store?.shopName || 'your store'}
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Products'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Title A-Z</SelectItem>
            <SelectItem value="created_at">Newest</SelectItem>
            <SelectItem value="total_inventory">Inventory</SelectItem>
            <SelectItem value="price">Price</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex border rounded-md">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="icon"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="icon"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {productsError && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {productsError}
        </div>
      )}

      {/* Loading State */}
      {productsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!productsLoading && products.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'Try a different search term' : 'Sync your products from Shopify to get started'}
          </p>
          {!search && (
            <Button onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          )}
        </div>
      )}

      {/* Products Grid */}
      {!productsLoading && products.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product} store={store} onNavigate={navigateTo} />
          ))}
        </div>
      )}

      {/* Products List */}
      {!productsLoading && products.length > 0 && viewMode === 'list' && (
        <div className="border rounded-lg divide-y">
          {products.map(product => (
            <ProductRow key={product.id} product={product} store={store} onNavigate={navigateTo} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!productsLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, productsTotal)} of {productsTotal}
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              Page {page} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCard({ product, store, onNavigate }) {
  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => onNavigate(`product-detail:${product.id}`)}
    >
      {/* Image */}
      <div className="aspect-square bg-muted relative">
        {product.featured_image_url ? (
          <img 
            src={product.featured_image_url} 
            alt={product.featured_image_alt || product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Status Badge */}
        <Badge 
          className={`absolute top-2 left-2 ${statusColors[product.status] || statusColors.draft}`}
        >
          {product.status}
        </Badge>
        
        {/* Image count */}
        {product.images?.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
            +{product.images.length - 1}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {product.title}
        </h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {product.variants_count} variant{product.variants_count !== 1 ? 's' : ''}
          </span>
          <span className="font-medium">
            ${parseFloat(product.price || 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${product.total_inventory <= 0 ? 'text-red-500' : product.total_inventory < 10 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
            {product.total_inventory} in stock
          </span>
        </div>
      </div>
    </Card>
  )
}

function ProductRow({ product, store, onNavigate }) {
  return (
    <div 
      className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onNavigate(`product-detail:${product.id}`)}
    >
      {/* Image */}
      <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
        {product.featured_image_url ? (
          <img 
            src={product.featured_image_url} 
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{product.title}</h3>
        <p className="text-sm text-muted-foreground">
          {product.vendor} • {product.product_type || 'No type'}
        </p>
      </div>
      
      {/* Status */}
      <Badge className={statusColors[product.status] || statusColors.draft}>
        {product.status}
      </Badge>
      
      {/* Inventory */}
      <div className="text-right w-20">
        <p className={`font-medium ${product.total_inventory <= 0 ? 'text-red-500' : ''}`}>
          {product.total_inventory}
        </p>
        <p className="text-xs text-muted-foreground">in stock</p>
      </div>
      
      {/* Price */}
      <div className="text-right w-24">
        <p className="font-medium">${parseFloat(product.price || 0).toFixed(2)}</p>
        {product.variants_count > 1 && (
          <p className="text-xs text-muted-foreground">{product.variants_count} variants</p>
        )}
      </div>
      
      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNavigate(`product-detail:${product.id}`); }}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a 
              href={`https://${store?.shopDomain}/admin/products/${product.shopify_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View in Shopify
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
