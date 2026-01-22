// src/components/seo/SEOSprints.jsx
// Weekly sprint goals with progress tracking
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Target,
  Trophy,
  Flame,
  Calendar,
  Plus,
  Check,
  ChevronRight,
  Sparkles,
  Loader2,
  Edit2,
  Trash2,
  Clock,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import portalApi from '@/lib/portal-api';

// Goal type icons and colors
const GOAL_TYPE_CONFIG = {
  title_optimization: { icon: Edit2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  meta_description: { icon: Edit2, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  content_update: { icon: Zap, color: 'text-green-400', bg: 'bg-green-500/20' },
  backlink: { icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  technical: { icon: Target, color: 'text-red-400', bg: 'bg-red-500/20' },
  keyword: { icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
};

function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    label: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  };
}

export default function SEOSprints({ projectId }) {
  const [currentSprint, setCurrentSprint] = useState(null);
  const [pastSprints, setPastSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewSprintModal, setShowNewSprintModal] = useState(false);
  const [suggestedGoals, setSuggestedGoals] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch sprints
  const fetchSprints = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const [current, past] = await Promise.all([
        portalApi.seo.getCurrentSprint(projectId),
        portalApi.seo.getSprints(projectId, { limit: 5 }),
      ]);
      setCurrentSprint(current);
      setPastSprints(past.filter(s => s.id !== current?.id));
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  // Fetch AI-suggested goals for new sprint
  const fetchSuggestedGoals = async () => {
    setLoadingSuggestions(true);
    try {
      const goals = await portalApi.seo.getSuggestedGoals(projectId);
      setSuggestedGoals(goals);
    } catch (error) {
      console.error('Failed to fetch suggested goals:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Create new sprint
  const handleCreateSprint = async (goals) => {
    setCreating(true);
    try {
      const week = getWeekDates();
      const sprint = await portalApi.seo.createSprint(projectId, {
        name: `Week of ${week.label}`,
        week_start: week.start,
        week_end: week.end,
        goals,
        status: 'active',
      });
      setCurrentSprint(sprint);
      setShowNewSprintModal(false);
    } catch (error) {
      console.error('Failed to create sprint:', error);
    } finally {
      setCreating(false);
    }
  };

  // Complete a goal
  const handleCompleteGoal = async (goalId) => {
    if (!currentSprint) return;
    
    try {
      const updated = await portalApi.seo.completeSprintGoal(projectId, currentSprint.id, goalId);
      setCurrentSprint(updated);
    } catch (error) {
      console.error('Failed to complete goal:', error);
    }
  };

  // Update goal progress
  const handleUpdateProgress = async (goalId, value) => {
    if (!currentSprint) return;
    
    try {
      const updated = await portalApi.seo.updateGoalProgress(projectId, currentSprint.id, goalId, value);
      setCurrentSprint(updated);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            SEO Sprints
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Set weekly goals and track your SEO progress
          </p>
        </div>
        {!currentSprint && (
          <Button
            onClick={() => {
              setShowNewSprintModal(true);
              fetchSuggestedGoals();
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Sprint
          </Button>
        )}
      </div>

      {/* Current Sprint */}
      {currentSprint ? (
        <CurrentSprintCard
          sprint={currentSprint}
          onCompleteGoal={handleCompleteGoal}
          onUpdateProgress={handleUpdateProgress}
        />
      ) : (
        <NoSprintCard onStart={() => {
          setShowNewSprintModal(true);
          fetchSuggestedGoals();
        }} />
      )}

      {/* Sprint History */}
      {pastSprints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Past Sprints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastSprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      sprint.progress_percent === 100 ? 'bg-green-500/20' : 'bg-[var(--surface-elevated)]'
                    )}>
                      {sprint.progress_percent === 100 ? (
                        <Trophy className="h-4 w-4 text-green-400" />
                      ) : (
                        <Target className="h-4 w-4 text-[var(--text-tertiary)]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {sprint.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {sprint.completed_goals}/{sprint.total_goals} goals completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={sprint.progress_percent} className="w-20 h-2" />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      {sprint.progress_percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Sprint Modal */}
      <NewSprintModal
        open={showNewSprintModal}
        onClose={() => setShowNewSprintModal(false)}
        suggestedGoals={suggestedGoals}
        loadingSuggestions={loadingSuggestions}
        onCreate={handleCreateSprint}
        creating={creating}
      />
    </div>
  );
}

function CurrentSprintCard({ sprint, onCompleteGoal, onUpdateProgress }) {
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(sprint.week_end) - new Date()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <Card className="border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-400" />
              {sprint.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3" />
              {daysLeft} days remaining
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[var(--accent-primary)]">
              {sprint.progress_percent}%
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {sprint.completed_goals}/{sprint.total_goals} goals
            </p>
          </div>
        </div>
        <Progress value={sprint.progress_percent} className="h-2 mt-4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sprint.goals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onComplete={() => onCompleteGoal(goal.id)}
              onUpdateProgress={(value) => onUpdateProgress(goal.id, value)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GoalItem({ goal, onComplete, onUpdateProgress }) {
  const config = GOAL_TYPE_CONFIG[goal.type] || GOAL_TYPE_CONFIG.technical;
  const Icon = config.icon;
  const progress = Math.round((goal.current_value / goal.target_value) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        goal.completed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--accent-primary)]/30'
      )}
    >
      <button
        onClick={onComplete}
        disabled={goal.completed}
        className={cn(
          'p-2 rounded-lg transition-all',
          goal.completed
            ? 'bg-green-500/20 cursor-default'
            : `${config.bg} hover:scale-105`
        )}
      >
        {goal.completed ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Icon className={cn('h-4 w-4', config.color)} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium',
          goal.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'
        )}>
          {goal.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
            {goal.current_value}/{goal.target_value}
          </span>
        </div>
      </div>

      {!goal.completed && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdateProgress(goal.current_value + 1)}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function NoSprintCard({ onStart }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <Target className="h-12 w-12 mx-auto mb-4 text-[var(--accent-primary)] opacity-50" />
        <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
          No Active Sprint
        </h3>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Start a weekly sprint to set goals and track your SEO progress.
          AI will suggest goals based on your opportunities.
        </p>
        <Button onClick={onStart}>
          <Sparkles className="h-4 w-4 mr-2" />
          Start This Week's Sprint
        </Button>
      </CardContent>
    </Card>
  );
}

function NewSprintModal({ open, onClose, suggestedGoals, loadingSuggestions, onCreate, creating }) {
  const [goals, setGoals] = useState([]);
  const week = getWeekDates();

  // Initialize with suggested goals
  useEffect(() => {
    if (suggestedGoals.length > 0) {
      setGoals(suggestedGoals);
    }
  }, [suggestedGoals]);

  const toggleGoal = (goalId) => {
    setGoals(goals.map(g => 
      g.id === goalId ? { ...g, selected: !g.selected } : g
    ));
  };

  const handleCreate = () => {
    const selectedGoals = goals.filter(g => g.selected !== false).map(({ selected, ...g }) => g);
    onCreate(selectedGoals);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            Start New Sprint
          </DialogTitle>
          <DialogDescription>
            {week.label} • Set your SEO goals for this week
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
              <span className="ml-2 text-sm text-[var(--text-secondary)]">
                AI is suggesting goals...
              </span>
            </div>
          ) : goals.length === 0 ? (
            <p className="text-center py-8 text-[var(--text-tertiary)]">
              No goals suggested. Add custom goals to get started.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                <Sparkles className="h-3 w-3 inline mr-1" />
                AI-suggested goals based on your opportunities:
              </p>
              {goals.map((goal) => {
                const config = GOAL_TYPE_CONFIG[goal.type] || GOAL_TYPE_CONFIG.technical;
                const Icon = config.icon;
                const isSelected = goal.selected !== false;

                return (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                      isSelected
                        ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30'
                        : 'bg-[var(--glass-bg)] border-[var(--glass-border)] opacity-50'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg', config.bg)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {goal.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Target: {goal.target_value}
                      </p>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      isSelected
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                        : 'border-[var(--glass-border)]'
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || goals.filter(g => g.selected !== false).length === 0}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Flame className="h-4 w-4 mr-2" />
                Start Sprint
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
