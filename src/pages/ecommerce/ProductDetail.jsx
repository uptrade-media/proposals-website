// src/pages/ecommerce/ProductDetail.jsx
// Product detail page with image management, editing, SEO

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEcommerceStore } from '@/lib/ecommerce-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog'
import { 
  ArrowLeft,
  Save,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  Trash2,
  GripVertical,
  Plus,
  Eye,
  X,
  Loader2,
  Check,
  AlertCircle,
  Package,
  Tag,
  Search,
  FileText,
  Layers,
  DollarSign
} from 'lucide-react'
import axios from 'axios'
import { ecommerceApi } from '@/lib/portal-api'

export default function ProductDetail({ embedded = false, onNavigate, productId: propProductId }) {
  // Support both route params and props for embedded mode
  const { id: routeId } = useParams()
  const id = propProductId || routeId
  const navigate = useNavigate()
  
  // Navigation helper - uses embedded callback or router
  const navigateTo = (path) => {
    if (embedded && onNavigate) {
      onNavigate(path)
    } else if (path === 'products') {
      navigate('/ecommerce/products')
    } else {
      navigate(`/ecommerce/${path}`)
    }
  }
  
  const { store, fetchStore, selectedProduct, selectedProductLoading, fetchProduct, updateVariant } = useEcommerceStore()
  
  const [product, setProduct] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Image management
  const [images, setImages] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageToDelete, setImageToDelete] = useState(null)
  const [editingImageAlt, setEditingImageAlt] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [draggedImage, setDraggedImage] = useState(null)
  
  // Pricing state
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceValue, setPriceValue] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)
  
  const fileInputRef = useRef(null)
  
  // Fetch store and product
  useEffect(() => {
    if (!store) fetchStore()
  }, [store, fetchStore])
  
  useEffect(() => {
    if (store && id) {
      fetchProduct(id)
    }
  }, [store, id, fetchProduct])
  
  // Initialize local state when product loads
  useEffect(() => {
    if (selectedProduct) {
      setProduct({ ...selectedProduct })
      setImages(selectedProduct.images || [])
      setIsDirty(false)
      // Initialize pricing
      setPriceValue(selectedProduct.price || '')
      setCompareAtPrice(selectedProduct.compare_at_price || '')
    }
  }, [selectedProduct])
  
  const handleChange = (field, value) => {
    setProduct(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }
  
  // Save pricing to Shopify via variant update
  const handleSavePrice = async () => {
    if (!product || !product.variants?.length) return
    
    // Get the first variant (for single-variant products)
    // For multi-variant products, this updates the main variant
    const variantId = product.variants[0]?.id
    if (!variantId) {
      setSaveError('No variant found to update pricing')
      return
    }
    
    setSavingPrice(true)
    setSaveError('')
    
    try {
      const result = await updateVariant(variantId, {
        price: priceValue,
        compare_at_price: compareAtPrice || null
      })
      
      if (result.success) {
        // Update local product state
        setProduct(prev => ({
          ...prev,
          price: priceValue,
          compare_at_price: compareAtPrice
        }))
        setEditingPrice(false)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        setSaveError(result.error)
      }
    } catch (error) {
      setSaveError(error.message)
    } finally {
      setSavingPrice(false)
    }
  }
  
  const handleSave = async () => {
    if (!product) return
    
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    
    try {
      const { data } = await ecommerceApi.updateProduct(product.id, {
        title: product.title,
        body_html: product.body_html,
        vendor: product.vendor,
        product_type: product.product_type,
        tags: product.tags,
        status: product.status,
        seo_title: product.seo_title,
        seo_description: product.seo_description,
        images: images.map((img, idx) => ({
          id: img.id,
          alt: img.alt,
          position: idx + 1
        }))
      })
      
      setProduct(data.product)
      setImages(data.product.images || [])
      setIsDirty(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      setSaveError(error.response?.data?.error || error.message)
    } finally {
      setSaving(false)
    }
  }
  
  // ===== IMAGE MANAGEMENT =====
  
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate
    if (!file.type.startsWith('image/')) {
      setSaveError('Please select an image file')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setSaveError('Image must be less than 20MB')
      return
    }
    
    setUploadingImage(true)
    setSaveError('')
    
    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1]
        
        const { data } = await ecommerceApi.uploadProductImage(product.id, {
          attachment: base64,
          filename: file.name
        })
        
        setImages(data.images || [])
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Failed to upload image')
      setUploadingImage(false)
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handleDeleteImage = async () => {
    if (!imageToDelete) return
    
    try {
      const { data } = await ecommerceApi.deleteProductImage(product.id, imageToDelete.id)
      
      setImages(data.images || [])
      setImageToDelete(null)
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Failed to delete image')
    }
  }
  
  const handleUpdateImageAlt = (imageId, alt) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, alt } : img
    ))
    setIsDirty(true)
    setEditingImageAlt(null)
  }
  
  // Drag and drop for image reordering
  const handleDragStart = (e, index) => {
    setDraggedImage(index)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedImage === null || draggedImage === index) return
    
    const newImages = [...images]
    const [removed] = newImages.splice(draggedImage, 1)
    newImages.splice(index, 0, removed)
    setImages(newImages)
    setDraggedImage(index)
    setIsDirty(true)
  }
  
  const handleDragEnd = () => {
    setDraggedImage(null)
  }
  
  // Loading
  if (selectedProductLoading || !product) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigateTo('products')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{product.status}</Badge>
              {product.vendor && <span className="text-sm text-muted-foreground">{product.vendor}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-green-600 flex items-center gap-1 text-sm">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          
          <Button 
            variant="outline" 
            asChild
          >
            <a 
              href={`https://${store?.shopDomain}/admin/products/${product.shopify_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Shopify
            </a>
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Error */}
      {saveError && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {saveError}
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setSaveError('')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Media
              </CardTitle>
              <CardDescription>
                Drag to reorder. First image is the featured image.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden group cursor-move transition-all ${
                      draggedImage === index ? 'opacity-50 border-primary' : 'border-transparent hover:border-primary/50'
                    }`}
                  >
                    <img 
                      src={image.src} 
                      alt={image.alt || ''} 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Position indicator */}
                    {index === 0 && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                        Featured
                      </div>
                    )}
                    
                    {/* Drag handle */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button 
                        size="icon" 
                        variant="secondary"
                        onClick={() => setPreviewImage(image)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="secondary"
                        onClick={() => setEditingImageAlt(image)}
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="destructive"
                        onClick={() => setImageToDelete(image)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Upload button */}
                <div 
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Add image</span>
                    </>
                  )}
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={product.title || ''}
                  onChange={(e) => handleChange('title', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="body">Description</Label>
                <RichTextEditor
                  value={product.body_html || ''}
                  onChange={(html) => handleChange('body_html', html)}
                  placeholder="Product description"
                  minHeight="180px"
                />
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    value={product.vendor || ''}
                    onChange={(e) => handleChange('vendor', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Product Type</Label>
                  <Input
                    id="type"
                    value={product.product_type || ''}
                    onChange={(e) => handleChange('product_type', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || '')}
                  onChange={(e) => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="tag1, tag2, tag3"
                />
                <p className="text-xs text-muted-foreground">Separate tags with commas</p>
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Engine Listing
              </CardTitle>
              <CardDescription>
                Customize how this product appears in search results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">SEO Title</Label>
                <Input
                  id="seo_title"
                  value={product.seo_title || ''}
                  onChange={(e) => handleChange('seo_title', e.target.value)}
                  placeholder={product.title}
                  maxLength={70}
                />
                <p className="text-xs text-muted-foreground">
                  {(product.seo_title || product.title || '').length}/70 characters
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="seo_description">SEO Description</Label>
                <Textarea
                  id="seo_description"
                  value={product.seo_description || ''}
                  onChange={(e) => handleChange('seo_description', e.target.value)}
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {(product.seo_description || '').length}/160 characters
                </p>
              </div>
              
              {/* Preview */}
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm font-medium text-primary truncate">
                  {product.seo_title || product.title}
                </p>
                <p className="text-xs text-green-600 truncate">
                  {store?.shopDomain}/products/{product.shopify_handle}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {product.seo_description || product.body_html?.replace(/<[^>]*>/g, '').slice(0, 160)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={product.status} 
                onValueChange={(v) => handleChange('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Inventory Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{product.total_inventory}</div>
              <p className="text-sm text-muted-foreground">
                {product.variants_count} variant{product.variants_count !== 1 ? 's' : ''}
              </p>
              
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/ecommerce/inventory')}
              >
                Manage Inventory
              </Button>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingPrice ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={priceValue}
                        onChange={(e) => setPriceValue(e.target.value)}
                        className="pl-7"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="compare_at_price">Compare at price</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="compare_at_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={compareAtPrice}
                        onChange={(e) => setCompareAtPrice(e.target.value)}
                        className="pl-7"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Original price for showing discount
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSavePrice}
                      disabled={savingPrice}
                    >
                      {savingPrice ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingPrice(false)
                        setPriceValue(product.price || '')
                        setCompareAtPrice(product.compare_at_price || '')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium text-lg">${parseFloat(product.price || 0).toFixed(2)}</span>
                  </div>
                  {product.compare_at_price && parseFloat(product.compare_at_price) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Compare at</span>
                      <span className="text-muted-foreground line-through">
                        ${parseFloat(product.compare_at_price).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setEditingPrice(true)}
                  >
                    Edit Pricing
                  </Button>
                  {product.variants_count > 1 && (
                    <p className="text-xs text-muted-foreground">
                      This updates the default variant. Edit individual variants in Shopify for advanced pricing.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex items-center justify-center">
              <img 
                src={previewImage.src} 
                alt={previewImage.alt || ''} 
                className="max-h-[70vh] object-contain"
              />
            </div>
          )}
          {previewImage?.alt && (
            <p className="text-center text-sm text-muted-foreground">
              Alt text: {previewImage.alt}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Alt Text Dialog */}
      <Dialog open={!!editingImageAlt} onOpenChange={() => setEditingImageAlt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Alt Text</DialogTitle>
            <DialogDescription>
              Alt text helps with accessibility and SEO
            </DialogDescription>
          </DialogHeader>
          {editingImageAlt && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img 
                  src={editingImageAlt.src} 
                  alt="" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alt-text">Alt Text</Label>
                <Input
                  id="alt-text"
                  defaultValue={editingImageAlt.alt || ''}
                  placeholder="Describe this image..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateImageAlt(editingImageAlt.id, e.target.value)
                    }
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingImageAlt(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              const input = document.getElementById('alt-text')
              handleUpdateImageAlt(editingImageAlt.id, input.value)
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Image Confirmation */}
      <AlertDialog open={!!imageToDelete} onOpenChange={() => setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this image from the product on Shopify.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {imageToDelete && (
            <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden">
              <img src={imageToDelete.src} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteImage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
