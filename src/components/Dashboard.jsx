import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  MessageSquare, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Bell,
  Shield,
  Plus
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import axios from 'axios'
import UptradeLoading from './UptradeLoading'

const Dashboard = () => {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const hasFetchedRef = useRef(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    projects: [],
    recentMessages: [],
    pendingInvoices: [],
    notifications: [],
    totalClients: 0,
    activeProposals: 0
  })

  const fetchAdminStats = useCallback(async () => {
    try {
      // Fetch admin overview data
      const [clientsRes, proposalsRes] = await Promise.all([
        axios.get('/.netlify/functions/admin-clients-list').catch(err => ({ data: { clients: [] } })),
        axios.get('/.netlify/functions/admin-proposals-list').catch(err => ({ data: { proposals: [] } }))
      ])

      setDashboardData({
        projects: proposalsRes.data.proposals?.slice(0, 2) || [],
        recentMessages: [],
        pendingInvoices: [],
        notifications: [],
        totalClients: clientsRes.data.clients?.length || 0,
        activeProposals: proposalsRes.data.proposals?.filter(p => p.status === 'sent').length || 0
      })
    } catch (err) {
      console.error('Failed to fetch admin stats:', err)
      // Set empty data on error to prevent infinite loops
      setDashboardData({
        projects: [],
        recentMessages: [],
        pendingInvoices: [],
        notifications: [],
        totalClients: 0,
        activeProposals: 0
      })
    }
  }, [])

  const fetchClientData = useCallback(async () => {
    // Mock data for client view
    setDashboardData({
      projects: [
        {
          id: 1,
          title: 'Website Redesign',
          status: 'in_progress',
          progress: 75,
          dueDate: '2024-11-15'
        },
        {
          id: 2,
          title: 'SEO Optimization',
          status: 'review',
          progress: 90,
          dueDate: '2024-10-30'
        }
      ],
      recentMessages: [
        {
          id: 1,
          subject: 'Project Update',
          sender: 'Uptrade Media Team',
          timestamp: '2 hours ago',
          unread: true
        },
        {
          id: 2,
          subject: 'Invoice #1234',
          sender: 'Billing Department',
          timestamp: '1 day ago',
          unread: false
        }
      ],
      pendingInvoices: [
        {
          id: 1,
          invoiceNumber: 'INV-2024-001',
          amount: 2500.00,
          dueDate: '2024-11-01',
          status: 'pending'
        }
      ],
      notifications: [
        {
          id: 1,
          message: 'New proposal available for review',
          type: 'info',
          timestamp: '1 hour ago'
        },
        {
          id: 2,
          message: 'Payment due in 3 days',
          type: 'warning',
          timestamp: '2 hours ago'
        }
      ]
    })
  }, [])

  // Fetch data on mount - only once
  useEffect(() => {
    if (!user || hasFetchedRef.current) return
    
    hasFetchedRef.current = true
    
    const loadData = async () => {
      try {
        if (user.role === 'admin') {
          await fetchAdminStats()
        } else {
          await fetchClientData()
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [user?.id]) // Only depend on user ID, not the entire user object

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'review':
        return 'bg-yellow-100 text-yellow-800'
      case 'planning':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'in_progress':
        return <Clock className="w-4 h-4" />
      case 'review':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  // Show loading only once on initial load
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <UptradeLoading />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {user?.first_name}!
            </h1>
            <p className="text-white/90">
              {isAdmin ? "Manage clients, proposals, and invoices from your admin dashboard." : "Here's what's happening with your projects today."}
            </p>
          </div>
          {isAdmin && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.totalClients || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.activeProposals || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting response
                </p>
              </CardContent>
            </Card>
          </>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.projects.length}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.recentMessages.filter(m => m.unread).length}
            </div>
            <p className="text-xs text-muted-foreground">
              New messages today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.pendingInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              Due this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82%</div>
            <p className="text-xs text-muted-foreground">
              Average completion
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>
              Your current projects and their status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(project.status)}
                  <div>
                    <h4 className="font-medium">{project.title}</h4>
                    <p className="text-sm text-gray-500">Due: {project.dueDate}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(project.status)}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                  <div className="text-right">
                    <div className="text-sm font-medium">{project.progress}%</div>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#4bbf39] h-2 rounded-full" 
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View All Projects
            </Button>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>
              Latest communications from your team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.recentMessages.map((message) => (
              <div key={message.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${message.unread ? 'bg-[#4bbf39]' : 'bg-gray-300'}`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${message.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                      {message.subject}
                    </h4>
                    <span className="text-xs text-gray-500">{message.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-500">{message.sender}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View All Messages
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notifications and Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData.notifications.map((notification) => (
              <div key={notification.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm">{notification.message}</p>
                  <span className="text-xs text-gray-500">{notification.timestamp}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Pending Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData.pendingInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                  <p className="text-sm text-gray-500">Due: {invoice.dueDate}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">${invoice.amount.toFixed(2)}</div>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View All Invoices
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
