// src/pages/commerce/components/SalesViews.jsx
// Sales-related views: Overview, Invoices, Transactions

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart } from '@tremor/react'
import {
  Plus,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Archive,
  ChevronRight,
  CreditCard,
  Clock,
  Receipt,
  CheckCircle,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format, subDays } from 'date-fns'

// Invoice status config
export const INVOICE_STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: Clock },
  paid: { label: 'Paid', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  overdue: { label: 'Overdue', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', className: 'bg-[var(--glass-bg-inset)] text-[var(--text-tertiary)] border-[var(--glass-border)]', icon: Archive },
}

// Generate mock revenue chart data
const generateRevenueChartData = () => {
  const data = []
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i)
    data.push({
      date: format(date, 'MMM d'),
      Revenue: Math.floor(Math.random() * 1500) + 200,
      Invoices: Math.floor(Math.random() * 8) + 1,
    })
  }
  return data
}

export function InvoiceCard({ invoice, brandColors }) {
  const StatusIcon = INVOICE_STATUS_CONFIG[invoice.status]?.icon || Clock
  const isOverdue = invoice.status === 'pending' && new Date(invoice.due_date) < new Date()
  const displayStatus = isOverdue ? 'overdue' : invoice.status
  
  return (
    <Link to={`/commerce/invoices/${invoice.id}`}>
      <div className="group rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 hover:border-border transition-all duration-200 cursor-pointer p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
            displayStatus === 'paid' && "bg-emerald-500/10",
            displayStatus === 'pending' && "bg-amber-500/10",
            displayStatus === 'overdue' && "bg-red-500/10",
            displayStatus === 'cancelled' && "bg-muted"
          )}>
            <Receipt className={cn(
              "h-5 w-5",
              displayStatus === 'paid' && "text-emerald-500",
              displayStatus === 'pending' && "text-amber-500",
              displayStatus === 'overdue' && "text-red-500",
              displayStatus === 'cancelled' && "text-muted-foreground"
            )} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground group-hover:text-[var(--brand-primary)] transition-colors">
                {invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`}
              </h3>
              <Badge variant="outline" className={cn("text-xs", INVOICE_STATUS_CONFIG[displayStatus]?.className)}>
                {INVOICE_STATUS_CONFIG[displayStatus]?.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{invoice.customer_name || invoice.customer_email || 'Unknown'}</span>
              {invoice.due_date && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Due {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Amount */}
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">
              ${Number(invoice.total || invoice.amount || 0).toLocaleString()}
            </p>
            {invoice.sent_at && (
              <p className="text-xs text-muted-foreground">
                Sent {formatDistanceToNow(new Date(invoice.sent_at), { addSuffix: true })}
              </p>
            )}
          </div>
          
          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-[var(--brand-primary)] transition-colors flex-shrink-0" />
        </div>
      </div>
    </Link>
  )
}

export function InvoiceSkeleton() {
  return (
    <div className="rounded-xl bg-card border border-[var(--glass-border)] p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  )
}

export function SalesOverviewView({ invoices, brandColors, hasPaymentProcessor, onOpenIntegrations }) {
  const revenueData = useMemo(() => generateRevenueChartData(), [])
  
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || i.amount || 0), 0)
  const pendingAmount = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.total || i.amount || 0), 0)
  const overdueAmount = invoices.filter(i => {
    const isOverdue = i.status === 'pending' && new Date(i.due_date) < new Date()
    return isOverdue
  }).reduce((sum, i) => sum + (i.total || i.amount || 0), 0)
  
  const thisMonthRevenue = invoices.filter(i => {
    if (i.status !== 'paid') return false
    const paidDate = new Date(i.paid_at || i.updated_at)
    const now = new Date()
    return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear()
  }).reduce((sum, i) => sum + (i.total || i.amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Payment Processor Status */}
      {!hasPaymentProcessor && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">Connect a Payment Processor</h3>
              <p className="text-sm text-muted-foreground">Connect Stripe or Square to accept payments and track revenue automatically.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              onClick={onOpenIntegrations}
            >
              Connect
            </Button>
          </div>
        </div>
      )}
      
      {/* Stats Cards - Sync-style flat design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-emerald-500">${thisMonthRevenue.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-500">${pendingAmount.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-500">${overdueAmount.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Revenue Chart - Sync-style container */}
      <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Revenue (Last 30 Days)</h3>
          <p className="text-xs text-muted-foreground">Daily revenue from all sources</p>
        </div>
        <AreaChart
          className="h-72"
          data={revenueData}
          index="date"
          categories={["Revenue"]}
          colors={["emerald"]}
          valueFormatter={(value) => `$${value.toLocaleString()}`}
          showLegend={false}
          showGridLines={false}
          curveType="monotone"
        />
      </div>
      
      {/* Recent Invoices Preview - Sync-style container */}
      <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Invoices</h3>
            <p className="text-xs text-muted-foreground">Latest billing activity</p>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground/70">Create your first invoice to start tracking revenue</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.slice(0, 5).map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} brandColors={brandColors} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function InvoicesView({ invoices, isLoading, error, brandColors, loadInvoices, invoiceCounts }) {
  const [activeTab, setActiveTab] = useState('all')
  
  const filteredInvoices = useMemo(() => {
    if (activeTab === 'all') return invoices
    if (activeTab === 'overdue') {
      return invoices.filter(i => i.status === 'pending' && new Date(i.due_date) < new Date())
    }
    return invoices.filter(i => i.status === activeTab)
  }, [invoices, activeTab])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <InvoiceSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--accent-red)]">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadInvoices} 
          className="mt-4 border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab Pills - Sync style */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        {[
          { id: 'all', label: 'All', count: invoiceCounts.all },
          { id: 'pending', label: 'Pending', count: invoiceCounts.pending },
          { id: 'overdue', label: 'Overdue', count: invoiceCounts.overdue },
          { id: 'paid', label: 'Paid', count: invoiceCounts.paid },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
              activeTab === tab.id 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {tab.label}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              activeTab === tab.id ? "bg-muted" : "bg-muted/50"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>
      
      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {activeTab === 'all' ? 'No invoices yet' : `No ${activeTab} invoices`}
          </h3>
          <p className="text-muted-foreground mb-4">
            {activeTab === 'all' 
              ? 'Create your first invoice to start billing clients'
              : `You don't have any ${activeTab} invoices at the moment`
            }
          </p>
          {activeTab === 'all' && (
            <Link to="/commerce/invoices/new">
              <Button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} brandColors={brandColors} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TransactionsView({ transactions, isLoading, error, brandColors, loadTransactions }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <InvoiceSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
        <p className="text-red-500">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadTransactions} 
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    )
  }
  
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium text-foreground mb-2">No transactions yet</h3>
        <p className="text-muted-foreground">Sales from your products, services, and events will appear here</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div key={tx.id} className="rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 p-4 transition-colors">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{tx.offering_name || 'Sale'}</p>
              <p className="text-sm text-muted-foreground">{tx.customer_email || 'Unknown customer'}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-emerald-500">+${Number(tx.total || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'MMM d, h:mm a')}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
