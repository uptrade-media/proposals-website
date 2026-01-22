/**
 * Customers List
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Spreadsheet-style list of all customers with filtering and search.
 */

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Download, Plus, ChevronDown, Tag } from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { useCustomersStore } from '@/lib/customers-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import UptradeLoading from '@/components/UptradeLoading'

export default function CustomersList() {
  const navigate = useNavigate()
  const { currentProject } = useAuthStore()
  const { 
    customers, 
    isLoading, 
    error,
    fetchCustomers,
    totalCount 
  } = useCustomersStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [sortBy, setSortBy] = useState('last_purchase_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    if (currentProject?.id) {
      fetchCustomers(currentProject.id, {
        search: searchQuery,
        tags: selectedTags,
        sortBy,
        sortOrder,
      })
    }
  }, [currentProject?.id, searchQuery, selectedTags, sortBy, sortOrder, fetchCustomers])

  const allTags = useMemo(() => {
    const tags = new Set()
    customers?.forEach(c => c.tags?.forEach(t => tags.add(t)))
    return Array.from(tags)
  }, [customers])

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === customers?.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(customers?.map(c => c.id) || [])
    }
  }

  if (isLoading && !customers) {
    return <UptradeLoading />
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">All Customers</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {totalCount || customers?.length || 0} total customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => navigate('/customers/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Tags Filter */}
        {allTags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Tag className="h-4 w-4 mr-2" />
                Tags
                {selectedTags.length > 0 && (
                  <span className="ml-2 bg-[var(--brand-primary)] text-white rounded-full px-2 py-0.5 text-xs">
                    {selectedTags.length}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {allTags.map(tag => (
                <DropdownMenuItem 
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    )
                  }}
                >
                  <Checkbox 
                    checked={selectedTags.includes(tag)} 
                    className="mr-2"
                  />
                  {tag}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Sort
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setSortBy('last_purchase_at'); setSortOrder('desc'); }}>
              Most Recent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy('total_spent'); setSortOrder('desc'); }}>
              Highest Value
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy('total_purchases'); setSortOrder('desc'); }}>
              Most Purchases
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>
              Name (A-Z)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-[var(--brand-primary)]/10 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <Button variant="outline" size="sm">Add Tag</Button>
          <Button variant="outline" size="sm">Export Selected</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Clear</Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--glass-bg-hover)]">
            <tr>
              <th className="p-3 text-left w-12">
                <Checkbox 
                  checked={selectedIds.length === customers?.length && customers?.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Name</th>
              <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Email</th>
              <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Purchases</th>
              <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Total Spent</th>
              <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Tags</th>
              <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Last Purchase</th>
            </tr>
          </thead>
          <tbody>
            {customers?.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">
                  No customers found
                </td>
              </tr>
            ) : (
              customers?.map(customer => (
                <tr 
                  key={customer.id}
                  className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] cursor-pointer transition-colors"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.includes(customer.id)}
                      onCheckedChange={() => toggleSelect(customer.id)}
                    />
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-[var(--text-primary)]">
                      {customer.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">{customer.email}</td>
                  <td className="p-3 text-[var(--text-primary)]">{customer.total_purchases || 0}</td>
                  <td className="p-3 text-[var(--text-primary)] font-medium">
                    ${(customer.total_spent || 0).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {customer.tags?.slice(0, 3).map(tag => (
                        <span 
                          key={tag}
                          className="px-2 py-0.5 text-xs rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                        >
                          {tag}
                        </span>
                      ))}
                      {customer.tags?.length > 3 && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          +{customer.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)] text-sm">
                    {customer.last_purchase_at 
                      ? new Date(customer.last_purchase_at).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
