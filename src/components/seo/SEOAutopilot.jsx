// src/components/seo/SEOAutopilot.jsx
// Autopilot mode - AI auto-applies safe changes with approval queue
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bot,
  Zap,
  Shield,
  Clock,
  Check,
  X,
  ChevronRight,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import portalApi from '@/lib/portal-api';

const CHANGE_TYPES = [
  { id: 'title', label: 'Page Titles', description: 'Optimize title tags for CTR', safe: true },
  { id: 'meta_description', label: 'Meta Descriptions', description: 'Improve meta descriptions', safe: true },
  { id: 'h1', label: 'H1 Headlines', description: 'Optimize main headlines', safe: false },
  { id: 'schema', label: 'Schema Markup', description: 'Add/update structured data', safe: true },
];

export default function SEOAutopilot({ projectId }) {
  const [settings, setSettings] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('queue');

  // Fetch settings and queue
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const [settingsData, queueData] = await Promise.all([
        portalApi.seo.getAutopilotSettings(projectId).catch(() => null),
        portalApi.seo.getAutopilotQueue(projectId, { status: 'pending,approved' }).catch(() => []),
      ]);
      
      setSettings(settingsData || {
        enabled: false,
        allowed_change_types: ['title', 'meta_description'],
        confidence_threshold: 80,
        max_daily_changes: 10,
        high_traffic_threshold: 1000,
        auto_revert_threshold: 20,
        notify_on_apply: true,
        notify_on_revert: true,
      });
      setQueue(Array.isArray(queueData) ? queueData : []);
    } catch (error) {
      console.error('Failed to fetch autopilot data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save settings
  const handleSaveSettings = async (updates) => {
    setSaving(true);
    try {
      const updated = await portalApi.seo.updateAutopilotSettings(projectId, {
        ...settings,
        ...updates,
      });
      setSettings(updated);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  // Toggle autopilot
  const handleToggleEnabled = async () => {
    await handleSaveSettings({ enabled: !settings?.enabled });
  };

  // Approve/reject queue items
  const handleApprove = async (itemId) => {
    try {
      await portalApi.seo.approveAutopilotItem(projectId, itemId);
      setQueue(queue.map(q => q.id === itemId ? { ...q, status: 'approved' } : q));
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (itemId) => {
    try {
      await portalApi.seo.rejectAutopilotItem(projectId, itemId);
      setQueue(queue.filter(q => q.id !== itemId));
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleApplyNow = async (itemId) => {
    try {
      await portalApi.seo.applyAutopilotItem(projectId, itemId);
      setQueue(queue.filter(q => q.id !== itemId));
    } catch (error) {
      console.error('Failed to apply:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  const pendingItems = queue.filter(q => q.status === 'pending');
  const approvedItems = queue.filter(q => q.status === 'approved');

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <Card className={cn(
        'border-2 transition-all',
        settings?.enabled
          ? 'border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent'
          : 'border-[var(--glass-border)]'
      )}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'p-3 rounded-xl transition-all',
                settings?.enabled
                  ? 'bg-green-500/20'
                  : 'bg-[var(--surface-elevated)]'
              )}>
                <Bot className={cn(
                  'h-6 w-6 transition-all',
                  settings?.enabled ? 'text-green-400' : 'text-[var(--text-tertiary)]'
                )} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  SEO Autopilot
                  {settings?.enabled && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Zap className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {settings?.enabled
                    ? 'AI is automatically optimizing safe changes'
                    : 'Enable to let AI auto-apply safe SEO changes'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {settings?.enabled && (
                <div className="text-right mr-4">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {pendingItems.length}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">pending review</p>
                </div>
              )}
              <Switch
                checked={settings?.enabled || false}
                onCheckedChange={handleToggleEnabled}
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Queue / Settings */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Queue
            {pendingItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px]">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4 mt-4">
          {pendingItems.length === 0 && approvedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bot className="h-12 w-12 mx-auto mb-4 text-[var(--accent-primary)] opacity-50" />
                <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
                  Queue is Empty
                </h3>
                <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                  {settings?.enabled
                    ? 'Autopilot is monitoring your site. Changes will appear here when AI finds optimization opportunities.'
                    : 'Enable Autopilot to start automatically finding optimization opportunities.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pending Review */}
              {pendingItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    Pending Review ({pendingItems.length})
                  </h3>
                  {pendingItems.map((item) => (
                    <QueueItem
                      key={item.id}
                      item={item}
                      onApprove={() => handleApprove(item.id)}
                      onReject={() => handleReject(item.id)}
                      onApplyNow={() => handleApplyNow(item.id)}
                      showActions
                    />
                  ))}
                </div>
              )}

              {/* Approved / Scheduled */}
              {approvedItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    Approved - Scheduled ({approvedItems.length})
                  </h3>
                  {approvedItems.map((item) => (
                    <QueueItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Safety Settings
              </CardTitle>
              <CardDescription>
                Control what Autopilot can change automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allowed Change Types */}
              <div className="space-y-3">
                <Label>Allowed Change Types</Label>
                <div className="grid gap-2">
                  {CHANGE_TYPES.map((type) => (
                    <div
                      key={type.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border transition-all',
                        settings?.allowed_change_types?.includes(type.id)
                          ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30'
                          : 'bg-[var(--glass-bg)] border-[var(--glass-border)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={settings?.allowed_change_types?.includes(type.id) || false}
                          onCheckedChange={(checked) => {
                            const types = settings?.allowed_change_types || [];
                            const updated = checked
                              ? [...types, type.id]
                              : types.filter(t => t !== type.id);
                            handleSaveSettings({ allowed_change_types: updated });
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {type.label}
                            {type.safe && (
                              <Badge className="ml-2 bg-green-500/20 text-green-400 text-xs">
                                Safe
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Confidence Threshold</Label>
                  <span className="text-sm font-medium text-[var(--accent-primary)]">
                    {settings?.confidence_threshold || 80}%
                  </span>
                </div>
                <Slider
                  value={[settings?.confidence_threshold || 80]}
                  onValueChange={([value]) => handleSaveSettings({ confidence_threshold: value })}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  Only auto-apply changes when AI is at least this confident
                </p>
              </div>

              {/* Max Daily Changes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Max Daily Changes</Label>
                  <span className="text-sm font-medium text-[var(--accent-primary)]">
                    {settings?.max_daily_changes || 10}
                  </span>
                </div>
                <Slider
                  value={[settings?.max_daily_changes || 10]}
                  onValueChange={([value]) => handleSaveSettings({ max_daily_changes: value })}
                  min={1}
                  max={50}
                  step={1}
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  Limit automated changes per day for safety
                </p>
              </div>

              {/* High Traffic Threshold */}
              <div className="space-y-3">
                <Label>High Traffic Threshold (impressions/week)</Label>
                <Input
                  type="number"
                  value={settings?.high_traffic_threshold || 1000}
                  onChange={(e) => handleSaveSettings({ high_traffic_threshold: parseInt(e.target.value) })}
                  min={100}
                  max={100000}
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  Pages above this threshold require manual approval
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Notify on Apply
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Get notified when changes are auto-applied
                  </p>
                </div>
                <Switch
                  checked={settings?.notify_on_apply || false}
                  onCheckedChange={(checked) => handleSaveSettings({ notify_on_apply: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Notify on Auto-Revert
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Get notified when changes are automatically reverted
                  </p>
                </div>
                <Switch
                  checked={settings?.notify_on_revert || false}
                  onCheckedChange={(checked) => handleSaveSettings({ notify_on_revert: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QueueItem({ item, onApprove, onReject, onApplyNow, showActions }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border bg-[var(--glass-bg)] border-[var(--glass-border)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="capitalize">
              {item.change_type.replace('_', ' ')}
            </Badge>
            {item.is_high_traffic && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <TrendingUp className="h-3 w-3 mr-1" />
                High Traffic
              </Badge>
            )}
            {item.requires_approval && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                Needs Review
              </Badge>
            )}
          </div>
          
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
            {item.field}
          </p>
          
          {/* Before/After Preview */}
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-red-400 shrink-0">−</span>
              <span className="text-[var(--text-tertiary)] line-through truncate">
                {item.old_value || '(empty)'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400 shrink-0">+</span>
              <span className="text-[var(--text-primary)] truncate">
                {item.new_value}
              </span>
            </div>
          </div>

          {/* AI Confidence */}
          <div className="flex items-center gap-2 mt-2">
            <Sparkles className="h-3 w-3 text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--text-tertiary)]">
              AI Confidence: {item.ai_confidence}%
            </span>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReject}
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onApprove}
              className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={onApplyNow}
              className="h-8"
            >
              <Zap className="h-3 w-3 mr-1" />
              Apply Now
            </Button>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-[var(--text-tertiary)]">Current Value</Label>
              <p className="text-sm text-[var(--text-primary)] bg-red-500/10 p-2 rounded mt-1">
                {item.old_value || '(empty)'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-[var(--text-tertiary)]">Proposed Value</Label>
              <p className="text-sm text-[var(--text-primary)] bg-green-500/10 p-2 rounded mt-1">
                {item.new_value}
              </p>
            </div>
            {item.ai_reasoning && (
              <div>
                <Label className="text-xs text-[var(--text-tertiary)]">AI Reasoning</Label>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {item.ai_reasoning}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            {showActions && (
              <Button onClick={() => { onApplyNow(); setShowDetails(false); }}>
                <Zap className="h-4 w-4 mr-2" />
                Apply Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
