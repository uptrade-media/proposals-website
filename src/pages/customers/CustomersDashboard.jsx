/**
 * Customers Dashboard
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Overview of all customers with key metrics.
 * Per design doc: Total customers, Revenue (LTV), Repeat Rate, New (30d)
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, DollarSign, RefreshCw, TrendingUp, Plus, Search, Download } from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { useCustomersStore } from '@/lib/customers-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import UptradeLoading from '@/components/UptradeLoading'

export default function CustomersDashboard() {
  const navigate = useNavigate()
  const { currentProject } = useAuthStore()
  const { 
    stats, 
    customers, 
    isLoading, 
    error,
    fetchStats, 
    fetchCustomers 
  } = useCustomersStore()
  
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (currentProject?.id) {
      fetchStats(currentProject.id)
      fetchCustomers(currentProject.id, { limit: 10 })
    }
  }, [currentProject?.id, fetchStats, fetchCustomers])

  if (isLoading && !stats) {
    return <UptradeLoading />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 mb-4">Failed to load customers: {error}</p>
        <Button onClick={() => fetchStats(currentProject?.id)}>Retry</Button>
      </div>
    )
  }

  const metrics = [
    {
      label: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: Users,
      trend: stats?.customersTrend,
    },
    {
      label: 'Total Revenue (LTV)',
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      trend: stats?.revenueTrend,
    },
    {
      label: 'Repeat Rate',
      value: `${stats?.repeatRate || 0}%`,
      icon: RefreshCw,
      trend: stats?.repeatTrend,
    },
    {
      label: 'New (30 days)',
      value: stats?.newCustomers30d || 0,
      icon: TrendingUp,
      trend: null,
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Customers</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            People who have purchased from you
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">{metric.label}</p>
                  <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
                    {metric.value}
                  </p>
                  {metric.trend && (
                    <p className={`text-xs mt-1 ${metric.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {metric.trend >= 0 ? '↑' : '↓'} {Math.abs(metric.trend)}% vs last period
                    </p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center">
                  <metric.icon className="h-5 w-5 text-[var(--brand-primary)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => navigate('/customers/list')}>
          View All
        </Button>
      </div>

      {/* Recent Customers */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="text-lg">Recent Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {customers?.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-3" />
              <p className="text-[var(--text-secondary)]">No customers yet</p>
              <p className="text-sm text-[var(--text-tertiary)]">
                Customers are automatically created when sales are made
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {customers?.slice(0, 10).map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--glass-bg-hover)] cursor-pointer transition-colors"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-[var(--brand-primary)]">
                        {customer.name?.[0]?.toUpperCase() || customer.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {customer.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">{customer.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[var(--text-primary)]">
                      ${(customer.total_spent || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {customer.total_purchases || 0} purchase{customer.total_purchases !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
