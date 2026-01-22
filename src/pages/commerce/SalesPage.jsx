// src/pages/commerce/SalesPage.jsx
// Sales list and management

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCommerceStore } from '@/lib/commerce-store'
import useAuthStore from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  MoreHorizontal,
  Eye,
  Check,
  RefreshCw,
  Calendar,
} from 'lucide-react'

const statusConfig = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  deposit_paid: { label: 'Deposit Paid', variant: 'outline', icon: DollarSign },
  completed: { label: 'Completed', variant: 'default', icon: Check },
  refunded: { label: 'Refunded', variant: 'destructive', icon: RefreshCw },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: null },
}

export default function SalesPage() {
  const { currentProject } = useAuthStore()
  const {
    sales,
    salesLoading,
    salesError,
    fetchSales,
    salesStats,
    fetchSalesStats,
    completeSale,
    refundSale,
  } = useCommerceStore()

  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    if (currentProject?.id) {
      const filters = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }
      
      // Add date range based on filter
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1)
            break
        }
        
        if (startDate) {
          filters.start_date = startDate.toISOString()
        }
      }
      
      fetchSales(currentProject.id, filters)
      fetchSalesStats(currentProject.id)
    }
  }, [currentProject?.id, statusFilter, dateFilter, fetchSales, fetchSalesStats])

  const handleComplete = async (saleId) => {
    if (window.confirm('Mark this sale as completed?')) {
      await completeSale(currentProject.id, saleId)
    }
  }

  const handleRefund = async (saleId) => {
    const reason = window.prompt('Enter refund reason (optional):')
    if (reason !== null) {
      await refundSale(currentProject.id, saleId, reason)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground">
            View and manage all transactions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(salesStats?.totalRevenue || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesStats?.totalSales || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesStats?.completedSales || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesStats?.pendingSales || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {salesLoading ? (
            <TableSkeleton />
          ) : salesError ? (
            <div className="p-6 text-center text-red-600">
              Failed to load sales: {salesError}
            </div>
          ) : sales.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No sales found</h3>
              <p className="text-muted-foreground">
                Sales will appear here when customers make purchases
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Offering</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map(sale => {
                  const config = statusConfig[sale.status] || statusConfig.pending
                  
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(sale.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.customer ? (
                          <Link
                            to={`/commerce/customers/${sale.customer.id}`}
                            className="hover:underline"
                          >
                            {sale.customer.name || sale.customer.email}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Anonymous</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sale.offering ? (
                          <Link
                            to={`/commerce/offerings/${sale.offering.id}`}
                            className="hover:underline"
                          >
                            {sale.offering.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                        {sale.quantity > 1 && (
                          <span className="text-muted-foreground"> × {sale.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            ${sale.total_amount?.toLocaleString()}
                          </p>
                          {sale.deposit_amount && sale.remaining_amount > 0 && (
                            <p className="text-sm text-muted-foreground">
                              ${sale.deposit_amount} paid, ${sale.remaining_amount} due
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {(sale.status === 'pending' || sale.status === 'deposit_paid') && (
                              <DropdownMenuItem onClick={() => handleComplete(sale.id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            {sale.status === 'completed' && (
                              <DropdownMenuItem
                                onClick={() => handleRefund(sale.id)}
                                className="text-red-600"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refund
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}
