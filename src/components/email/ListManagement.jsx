/**
 * ListManagement - Manage subscriber lists with double opt-in, welcome emails, and health metrics
 * Liquid glass design with comprehensive list controls
 */
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Users,
  Plus,
  Settings,
  Mail,
  Shield,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Heart,
  Zap,
  Target,
  BarChart3,
  UserPlus,
  UserMinus,
  FileText
} from 'lucide-react'
import './styles/liquid-glass.css'

// List health score component
function ListHealthScore({ score, trend }) {
  const getHealthColor = (score) => {
    if (score >= 80) return 'green'
    if (score >= 60) return 'yellow'
    if (score >= 40) return 'orange'
    return 'red'
  }
  
  const color = getHealthColor(score)
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke={`var(--${color}-500)`}
            strokeWidth="6"
            strokeDasharray={`${(score / 100) * 176} 176`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">List Health</p>
        <div className={`flex items-center gap-1 text-sm text-${color}-600`}>
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}% from last month
        </div>
      </div>
    </div>
  )
}

// List card component
function ListCard({ list, onEdit, onDelete, onViewDetails }) {
  return (
    <Card className="glass-card hover:shadow-lg transition-all group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{list.name}</CardTitle>
            <CardDescription>{list.description}</CardDescription>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(list)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => onDelete(list)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold">{list.subscriberCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Subscribers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{list.openRate}%</p>
            <p className="text-xs text-muted-foreground">Open Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{list.clickRate}%</p>
            <p className="text-xs text-muted-foreground">Click Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{list.bounceRate}%</p>
            <p className="text-xs text-muted-foreground">Bounce Rate</p>
          </div>
        </div>
        
        {/* List features */}
        <div className="flex items-center gap-2 mb-4">
          {list.doubleOptIn && (
            <Badge variant="outline" className="gap-1 bg-green-50 text-green-700">
              <Shield className="h-3 w-3" />
              Double Opt-in
            </Badge>
          )}
          {list.welcomeEmail && (
            <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700">
              <Mail className="h-3 w-3" />
              Welcome Email
            </Badge>
          )}
          {list.unsubscribeAutomation && (
            <Badge variant="outline" className="gap-1 bg-purple-50 text-purple-700">
              <Zap className="h-3 w-3" />
              Auto-cleanup
            </Badge>
          )}
        </div>
        
        {/* Growth indicator */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-sm">
            {list.growth >= 0 ? (
              <>
                <UserPlus className="h-4 w-4 text-green-600" />
                <span className="text-green-600">+{list.growth}</span>
              </>
            ) : (
              <>
                <UserMinus className="h-4 w-4 text-red-600" />
                <span className="text-red-600">{list.growth}</span>
              </>
            )}
            <span className="text-muted-foreground">this month</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onViewDetails(list)}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Create/Edit list dialog
function ListFormDialog({ open, onOpenChange, list, onSave }) {
  const [formData, setFormData] = useState({
    name: list?.name || '',
    description: list?.description || '',
    doubleOptIn: list?.doubleOptIn ?? true,
    welcomeEmail: list?.welcomeEmail ?? true,
    welcomeSubject: list?.welcomeSubject || 'Welcome to our newsletter!',
    welcomeContent: list?.welcomeContent || '',
    unsubscribeAutomation: list?.unsubscribeAutomation ?? false,
    cleanInactiveAfter: list?.cleanInactiveAfter || 90,
  })

  const handleSave = () => {
    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass-panel border-0">
        <DialogHeader>
          <DialogTitle>{list ? 'Edit List' : 'Create New List'}</DialogTitle>
          <DialogDescription>
            Configure your subscriber list settings and automation
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="optin">Opt-in Settings</TabsTrigger>
            <TabsTrigger value="welcome">Welcome Email</TabsTrigger>
            <TabsTrigger value="cleanup">Auto-cleanup</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">List Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Newsletter Subscribers"
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this list for?"
                className="glass-input"
              />
            </div>
          </TabsContent>

          <TabsContent value="optin" className="space-y-4 mt-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Double Opt-in</p>
                    <p className="text-sm text-muted-foreground">
                      Require email confirmation before adding to list
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.doubleOptIn}
                  onCheckedChange={(checked) => setFormData({ ...formData, doubleOptIn: checked })}
                />
              </div>
            </div>
            
            {formData.doubleOptIn && (
              <div className="glass-accent p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium">Why Double Opt-in?</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Reduces spam complaints and bounces</li>
                  <li>• Ensures genuine subscribers only</li>
                  <li>• Required by GDPR for EU subscribers</li>
                  <li>• Improves overall list health and deliverability</li>
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="welcome" className="space-y-4 mt-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Welcome Email</p>
                    <p className="text-sm text-muted-foreground">
                      Send an email when someone subscribes
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.welcomeEmail}
                  onCheckedChange={(checked) => setFormData({ ...formData, welcomeEmail: checked })}
                />
              </div>
              
              {formData.welcomeEmail && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject Line</label>
                    <Input
                      value={formData.welcomeSubject}
                      onChange={(e) => setFormData({ ...formData, welcomeSubject: e.target.value })}
                      placeholder="Welcome to our newsletter!"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email Content</label>
                    <Textarea
                      value={formData.welcomeContent}
                      onChange={(e) => setFormData({ ...formData, welcomeContent: e.target.value })}
                      placeholder="Write your welcome message..."
                      rows={4}
                      className="glass-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {'{name}'} to insert subscriber's name
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cleanup" className="space-y-4 mt-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Auto-cleanup Inactive</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically remove unengaged subscribers
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.unsubscribeAutomation}
                  onCheckedChange={(checked) => setFormData({ ...formData, unsubscribeAutomation: checked })}
                />
              </div>
              
              {formData.unsubscribeAutomation && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium mb-2 block">
                    Remove after no engagement for
                  </label>
                  <Select
                    value={String(formData.cleanInactiveAfter)}
                    onValueChange={(v) => setFormData({ ...formData, cleanInactiveAfter: parseInt(v) })}
                  >
                    <SelectTrigger className="w-48 glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">6 months</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Subscribers who haven't opened an email in this period will be marked inactive
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-200/50">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Before removing inactive subscribers</p>
                <p className="text-sm text-amber-800 mt-1">
                  We'll send a re-engagement email asking if they want to stay subscribed. 
                  Only those who don't respond will be removed.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name}>
            {list ? 'Save Changes' : 'Create List'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ListManagement() {
  // Use real data from the store
  const { 
    lists: storeLists, 
    listsLoading, 
    listsError, 
    fetchLists,
    createList,
    updateList,
    deleteList
  } = useEmailPlatformStore()
  
  // Transform store lists to include UI-friendly properties
  const lists = (storeLists || []).map(list => ({
    ...list,
    subscriberCount: list.subscriber_count || 0,
    openRate: list.open_rate || 0,
    clickRate: list.click_rate || 0,
    bounceRate: list.bounce_rate || 0,
    growth: list.growth_this_month || 0,
    doubleOptIn: list.double_optin ?? true,
    welcomeEmail: list.welcome_email_enabled ?? false,
    unsubscribeAutomation: list.auto_cleanup ?? false,
    healthScore: list.health_score || 75,
    healthTrend: list.health_trend || 0
  }))

  // Fetch lists on mount
  useEffect(() => {
    fetchLists()
  }, [fetchLists])
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingList, setEditingList] = useState(null)

  const totalSubscribers = lists.reduce((sum, list) => sum + (list.subscriberCount || 0), 0)
  const avgOpenRate = lists.length > 0 
    ? lists.reduce((sum, list) => sum + (list.openRate || 0), 0) / lists.length 
    : 0
  const avgClickRate = lists.length > 0 
    ? lists.reduce((sum, list) => sum + (list.clickRate || 0), 0) / lists.length 
    : 0

  const handleCreateList = async (data) => {
    try {
      await createList({
        name: data.name,
        description: data.description,
        double_optin: data.doubleOptIn,
        welcome_email_enabled: data.welcomeEmail,
        auto_cleanup: data.unsubscribeAutomation
      })
      await fetchLists()
    } catch (error) {
      console.error('Failed to create list:', error)
    }
  }

  const handleEditList = (list) => {
    setEditingList(list)
    setIsFormOpen(true)
  }

  const handleDeleteList = async (list) => {
    try {
      await deleteList(list.id)
      await fetchLists()
    } catch (error) {
      console.error('Failed to delete list:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{totalSubscribers.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{lists.length}</p>
                <p className="text-sm text-muted-foreground">Active Lists</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{avgOpenRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Avg Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100">
                <Heart className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">84</p>
                <p className="text-sm text-muted-foreground">Overall Health</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="glass-toolbar px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-[var(--text-primary)]">Your Lists</h2>
          <Badge variant="secondary">{lists.length} lists</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export All
          </Button>
          <Button size="sm" onClick={() => { setEditingList(null); setIsFormOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4" />
            Create List
          </Button>
        </div>
      </div>

      {/* Lists Grid */}
      {listsLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
          <span className="ml-2 text-[var(--text-secondary)]">Loading lists...</span>
        </div>
      ) : lists.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No lists yet</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Create your first subscriber list to start organizing your audience
            </p>
            <Button onClick={() => { setEditingList(null); setIsFormOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onEdit={handleEditList}
              onDelete={handleDeleteList}
              onViewDetails={() => {}}
            />
          ))}
        </div>
      )}

      {/* List Health Overview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            List Health Overview
          </CardTitle>
          <CardDescription>
            Monitor the health and engagement of your email lists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lists.map((list) => (
              <div key={list.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium truncate">{list.name}</p>
                    <Badge 
                      variant="outline"
                      className={
                        list.healthScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                        list.healthScore >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {list.healthScore >= 80 ? 'Healthy' : list.healthScore >= 60 ? 'Fair' : 'Needs Attention'}
                    </Badge>
                  </div>
                  <Progress 
                    value={list.healthScore} 
                    className="h-2"
                  />
                </div>
                <ListHealthScore score={list.healthScore} trend={list.healthTrend} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List Form Dialog */}
      <ListFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        list={editingList}
        onSave={handleCreateList}
      />
    </div>
  )
}
