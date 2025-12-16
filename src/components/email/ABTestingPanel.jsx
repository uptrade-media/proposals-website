/**
 * ABTestingPanel - Create and manage A/B tests for email campaigns
 * Test subject lines, content, send times, and more
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
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
  Target,
  Plus,
  Trophy,
  Clock,
  Users,
  Percent,
  BarChart3,
  Sparkles,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  TrendingUp,
  Zap,
  AlertCircle,
  Copy,
  ChevronRight,
  Mail,
  Eye,
  MousePointerClick,
  Crown
} from 'lucide-react'
import './styles/liquid-glass.css'

// A/B Test card for listing tests
function ABTestCard({ test, onViewResults }) {
  const isRunning = test.status === 'running'
  const isComplete = test.status === 'completed'
  const winner = test.variants.find(v => v.isWinner)

  return (
    <Card className="glass-card hover:shadow-lg transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{test.name}</CardTitle>
              <Badge 
                variant="outline"
                className={
                  isRunning ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  isComplete ? 'bg-green-50 text-green-700 border-green-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }
              >
                {isRunning && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1" />}
                {test.status}
              </Badge>
            </div>
            <CardDescription>{test.testType} test</CardDescription>
          </div>
          {winner && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
              <Crown className="h-4 w-4" />
              Winner: {winner.name}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Variants comparison */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {test.variants.map((variant, i) => (
            <div 
              key={i}
              className={`p-3 rounded-xl ${
                variant.isWinner ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{variant.name}</span>
                {variant.isWinner && <Trophy className="h-4 w-4 text-amber-500" />}
              </div>
              {test.testType === 'subject' && (
                <p className="text-sm text-muted-foreground truncate">"{variant.subject}"</p>
              )}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <p className="text-lg font-bold">{variant.openRate}%</p>
                  <p className="text-xs text-muted-foreground">Open Rate</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{variant.clickRate}%</p>
                  <p className="text-xs text-muted-foreground">Click Rate</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar for running tests */}
        {isRunning && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Test progress</span>
              <span className="font-medium">{test.progress}%</span>
            </div>
            <Progress value={test.progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {test.sentCount.toLocaleString()} of {test.totalSize.toLocaleString()} emails sent
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {test.totalSize.toLocaleString()} recipients
          </div>
          <Button variant="outline" size="sm" onClick={() => onViewResults(test)} className="gap-1">
            View Results
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Create A/B Test Dialog
function CreateABTestDialog({ open, onOpenChange, onCreate }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    testType: 'subject',
    variants: [
      { name: 'Variant A', subject: '', content: '' },
      { name: 'Variant B', subject: '', content: '' },
    ],
    sampleSize: 20,
    winningMetric: 'opens',
    duration: 4,
    autoSendWinner: true
  })

  const testTypes = [
    { value: 'subject', label: 'Subject Line', icon: Mail, description: 'Test different subject lines' },
    { value: 'sender', label: 'Sender Name', icon: Users, description: 'Test different sender names' },
    { value: 'content', label: 'Email Content', icon: Eye, description: 'Test different email content' },
    { value: 'sendTime', label: 'Send Time', icon: Clock, description: 'Test optimal send times' },
  ]

  const handleAddVariant = () => {
    const letter = String.fromCharCode(65 + formData.variants.length) // A, B, C...
    setFormData({
      ...formData,
      variants: [...formData.variants, { name: `Variant ${letter}`, subject: '', content: '' }]
    })
  }

  const updateVariant = (index, updates) => {
    const newVariants = [...formData.variants]
    newVariants[index] = { ...newVariants[index], ...updates }
    setFormData({ ...formData, variants: newVariants })
  }

  const handleCreate = () => {
    onCreate(formData)
    onOpenChange(false)
    setStep(1)
    setFormData({
      name: '',
      testType: 'subject',
      variants: [
        { name: 'Variant A', subject: '', content: '' },
        { name: 'Variant B', subject: '', content: '' },
      ],
      sampleSize: 20,
      winningMetric: 'opens',
      duration: 4,
      autoSendWinner: true
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass-panel border-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create A/B Test
          </DialogTitle>
          <DialogDescription>
            Test different variations to optimize your email performance
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step ? 'bg-indigo-600 text-white' :
                s < step ? 'bg-green-100 text-green-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {s < step ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              <span className={`text-sm ${s === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {s === 1 ? 'Test Type' : s === 2 ? 'Variants' : 'Settings'}
              </span>
              {s < 3 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Step 1: Test Type */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Test Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Holiday Subject Line Test"
                className="glass-input"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">What do you want to test?</label>
              <div className="grid grid-cols-2 gap-3">
                {testTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, testType: type.value })}
                    className={`p-4 rounded-xl text-left transition-all ${
                      formData.testType === type.value
                        ? 'bg-indigo-50 border-2 border-indigo-500'
                        : 'glass-card hover:shadow-lg'
                    }`}
                  >
                    <type.icon className={`h-5 w-5 mb-2 ${
                      formData.testType === type.value ? 'text-indigo-600' : 'text-muted-foreground'
                    }`} />
                    <p className="font-medium">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Variants */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Variants ({formData.variants.length})</label>
              {formData.variants.length < 4 && (
                <Button variant="outline" size="sm" onClick={handleAddVariant} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Variant
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              {formData.variants.map((variant, i) => (
                <div key={i} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Input
                      value={variant.name}
                      onChange={(e) => updateVariant(i, { name: e.target.value })}
                      className="w-32 glass-input font-medium"
                    />
                    {formData.variants.length > 2 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500"
                        onClick={() => setFormData({
                          ...formData,
                          variants: formData.variants.filter((_, idx) => idx !== i)
                        })}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  {formData.testType === 'subject' && (
                    <Input
                      value={variant.subject}
                      onChange={(e) => updateVariant(i, { subject: e.target.value })}
                      placeholder="Enter subject line..."
                      className="glass-input"
                    />
                  )}
                  
                  {formData.testType === 'sender' && (
                    <Input
                      value={variant.sender || ''}
                      onChange={(e) => updateVariant(i, { sender: e.target.value })}
                      placeholder="Enter sender name..."
                      className="glass-input"
                    />
                  )}
                  
                  {formData.testType === 'content' && (
                    <Textarea
                      value={variant.content}
                      onChange={(e) => updateVariant(i, { content: e.target.value })}
                      placeholder="Enter email content..."
                      rows={3}
                      className="glass-input"
                    />
                  )}
                  
                  {formData.testType === 'sendTime' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={variant.date || ''}
                        onChange={(e) => updateVariant(i, { date: e.target.value })}
                        className="glass-input"
                      />
                      <Input
                        type="time"
                        value={variant.time || ''}
                        onChange={(e) => updateVariant(i, { time: e.target.value })}
                        className="glass-input"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Test Sample Size</label>
                <span className="text-sm font-medium text-indigo-600">{formData.sampleSize}% of list</span>
              </div>
              <Slider
                value={[formData.sampleSize]}
                onValueChange={([v]) => setFormData({ ...formData, sampleSize: v })}
                min={10}
                max={50}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Each variant will be sent to {formData.sampleSize / formData.variants.length}% of your audience
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Winning Metric</label>
              <Select
                value={formData.winningMetric}
                onValueChange={(v) => setFormData({ ...formData, winningMetric: v })}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opens">Highest Open Rate</SelectItem>
                  <SelectItem value="clicks">Highest Click Rate</SelectItem>
                  <SelectItem value="conversions">Highest Conversions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Test Duration</label>
              <Select
                value={String(formData.duration)}
                onValueChange={(v) => setFormData({ ...formData, duration: parseInt(v) })}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="glass-accent p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.autoSendWinner}
                  onChange={(e) => setFormData({ ...formData, autoSendWinner: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-medium">Auto-send winning variant</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically send the winner to the remaining {100 - formData.sampleSize}% of your list
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !formData.name}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleCreate} className="gap-2">
              <Play className="h-4 w-4" />
              Start Test
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ABTestingPanel() {
  const [tests, setTests] = useState([
    {
      id: 1,
      name: 'Holiday Subject Line Test',
      testType: 'subject',
      status: 'completed',
      variants: [
        { name: 'A', subject: '🎄 Our Holiday Special is Here!', openRate: 45.2, clickRate: 18.3, isWinner: true },
        { name: 'B', subject: 'Exclusive holiday deals inside', openRate: 38.4, clickRate: 11.7, isWinner: false },
      ],
      totalSize: 5000,
      sentCount: 5000,
      progress: 100,
    },
    {
      id: 2,
      name: 'Welcome Email Content Test',
      testType: 'content',
      status: 'running',
      variants: [
        { name: 'A', content: 'Personal welcome...', openRate: 52.1, clickRate: 22.4, isWinner: false },
        { name: 'B', content: 'Brand story welcome...', openRate: 48.6, clickRate: 19.8, isWinner: false },
      ],
      totalSize: 2000,
      sentCount: 800,
      progress: 40,
    },
  ])
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const handleCreateTest = (data) => {
    setTests([
      {
        id: Date.now(),
        ...data,
        status: 'running',
        progress: 0,
        sentCount: 0,
        totalSize: 1000,
      },
      ...tests
    ])
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{tests.length}</p>
                <p className="text-sm text-muted-foreground">Total Tests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100">
                <Play className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{tests.filter(t => t.status === 'running').length}</p>
                <p className="text-sm text-muted-foreground">Running</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">{tests.filter(t => t.status === 'completed').length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">+12%</p>
                <p className="text-sm text-muted-foreground">Avg Lift</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="glass-toolbar px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold">A/B Tests</h2>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="running">Running</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Test
        </Button>
      </div>

      {/* Test Tips */}
      <div className="glass-accent p-4 rounded-xl flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
        <div>
          <p className="font-medium">A/B Testing Best Practices</p>
          <ul className="text-sm text-muted-foreground mt-1 space-y-1">
            <li>• Test one variable at a time for clear results</li>
            <li>• Use at least 1,000 subscribers per variant for statistical significance</li>
            <li>• Run tests for at least 4 hours to capture different time zones</li>
            <li>• Focus on metrics that align with your goals (opens vs clicks)</li>
          </ul>
        </div>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-2 gap-6">
        {tests.map((test) => (
          <ABTestCard
            key={test.id}
            test={test}
            onViewResults={() => {}}
          />
        ))}
      </div>

      {/* Empty State */}
      {tests.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No A/B tests yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Create your first A/B test to start optimizing your email campaigns
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Test
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <CreateABTestDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={handleCreateTest}
      />
    </div>
  )
}
