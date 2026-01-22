/**
 * Customer Detail View
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Full customer profile with:
 * - Contact info
 * - Tags
 * - Purchase history
 * - Upcoming bookings
 * - Notes
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Tag, 
  Plus, 
  Edit2, 
  Trash2,
  Calendar,
  ShoppingBag,
  StickyNote,
  ExternalLink
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { useCustomersStore } from '@/lib/customers-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import UptradeLoading from '@/components/UptradeLoading'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentProject } = useAuthStore()
  const { 
    currentCustomer, 
    purchases,
    isLoading, 
    error,
    fetchCustomer,
    fetchPurchases,
    updateCustomer,
    addNote,
    addTag,
    removeTag,
  } = useCustomersStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (currentProject?.id && id) {
      fetchCustomer(currentProject.id, id)
      fetchPurchases(currentProject.id, id)
    }
  }, [currentProject?.id, id, fetchCustomer, fetchPurchases])

  if (isLoading && !currentCustomer) {
    return <UptradeLoading />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 mb-4">Failed to load customer: {error}</p>
        <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
      </div>
    )
  }

  const customer = currentCustomer

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    await addNote(currentProject.id, id, newNote)
    setNewNote('')
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) return
    await addTag(currentProject.id, id, newTag)
    setNewTag('')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Customers
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this customer record. Purchase history will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Customer Header Card */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <span className="text-2xl font-semibold text-[var(--brand-primary)]">
                  {customer?.name?.[0]?.toUpperCase() || customer?.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                  {customer?.name || 'Unknown Customer'}
                </h1>
                <div className="flex items-center gap-4 mt-1 text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {customer?.email}
                  </span>
                  {customer?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold text-[var(--text-primary)]">
                ${(customer?.total_spent || 0).toLocaleString()}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Lifetime Value
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            {customer?.tags?.map(tag => (
              <Badge 
                key={tag} 
                variant="secondary"
                className="flex items-center gap-1"
              >
                {tag}
                <button 
                  onClick={() => removeTag(currentProject.id, id, tag)}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="px-2 py-1 text-sm border border-[var(--glass-border)] rounded bg-transparent"
              />
              <Button variant="ghost" size="sm" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase History */}
        <Card className="lg:col-span-2 bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Purchase History
              <span className="text-sm font-normal text-[var(--text-secondary)]">
                ({customer?.total_purchases || 0} total)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchases?.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)] py-8">
                No purchases yet
              </p>
            ) : (
              <div className="space-y-3">
                {purchases?.map(purchase => (
                  <div 
                    key={purchase.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors"
                  >
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {purchase.offering?.name || 'Unknown Item'}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {new Date(purchase.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[var(--text-primary)]">
                        ${(purchase.total_amount || 0).toLocaleString()}
                      </p>
                      <Badge variant={purchase.status === 'completed' ? 'success' : 'secondary'}>
                        {purchase.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Bookings */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Upcoming Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-secondary)]">No upcoming bookings</p>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer?.notes ? (
                <p className="text-sm text-[var(--text-primary)]">{customer.notes}</p>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">No notes yet</p>
              )}
              <div>
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
