import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Loader2, 
  RefreshCcw,
  Clock
} from 'lucide-react';
import SignalIcon from '@/components/ui/SignalIcon';
import { signalApi } from '@/lib/signal-api';

const PHASES = [
  { phase: 1, name: 'Discovery', status: 'discovery', steps: 8 },
  { phase: 2, name: 'Data Integration', status: 'data_integration', steps: 8 },
  { phase: 3, name: 'Intelligence', status: 'intelligence', steps: 8 },
  { phase: 4, name: 'Signal Config', status: 'signal_config', steps: 8 },
  { phase: 5, name: 'Optimization', status: 'optimization', steps: 8 },
  { phase: 6, name: 'Complete', status: 'completed', steps: 8 },
];

export default function SignalSetupProgress({ projectId }) {
  const [progress, setProgress] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProgress();
      const interval = setInterval(fetchProgress, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [projectId]);

  const fetchProgress = async () => {
    try {
      const data = await signalApi.getSetupProgress(projectId);
      setProgress(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch setup progress:', error);
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await signalApi.getSetupLogs(projectId);
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch setup logs:', error);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await signalApi.retrySetup(projectId);
      await fetchProgress();
    } catch (error) {
      console.error('Failed to retry setup:', error);
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
      </div>
    );
  }

  if (!progress) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <SignalIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--brand-primary)' }} />
          <h3 className="text-lg font-semibold mb-2">No setup in progress</h3>
          <p className="text-sm text-muted-foreground">
            Signal setup has not been started for this project.
          </p>
        </div>
      </Card>
    );
  }

  const progressPercent = Math.floor((progress.completed_steps / progress.total_steps) * 100);
  const currentPhase = PHASES.find(p => p.status === progress.status) || PHASES[0];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <SignalIcon className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Signal Setup</h2>
              <p className="text-sm text-muted-foreground">
                Autonomous configuration in progress
              </p>
            </div>
          </div>
          
          {progress.status === 'failed' && (
            <Button
              onClick={handleRetry}
              disabled={retrying}
              variant="outline"
              size="sm"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry Failed Steps
                </>
              )}
            </Button>
          )}
        </div>

        {/* Overall Progress */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {progress.completed_steps} of {progress.total_steps} steps
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressPercent}% complete</span>
            {progress.estimated_completion_at && progress.status !== 'completed' && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Est. completion: {new Date(progress.estimated_completion_at).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={
              progress.status === 'completed' ? 'success' :
              progress.status === 'failed' ? 'destructive' :
              'default'
            }
          >
            {progress.status === 'completed' ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : progress.status === 'failed' ? (
              <AlertCircle className="h-3 w-3 mr-1" />
            ) : (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            )}
            {progress.status.replace('_', ' ').toUpperCase()}
          </Badge>
          
          {progress.failed_steps.length > 0 && (
            <Badge variant="outline" className="text-amber-600">
              {progress.failed_steps.length} failed steps
            </Badge>
          )}
        </div>
      </Card>

      {/* Phase Progress */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Setup Phases</h3>
        <div className="space-y-3">
          {PHASES.map((phase) => {
            const isActive = phase.phase === progress.current_phase;
            const isCompleted = phase.phase < progress.current_phase || progress.status === 'completed';
            const isFailed = progress.status === 'failed' && isActive;

            return (
              <div
                key={phase.phase}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-accent' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                  ) : isFailed ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--brand-primary)' }} />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      isCompleted || isActive ? '' : 'text-muted-foreground'
                    }`}>
                      Phase {phase.phase}: {phase.name}
                    </span>
                    {isActive && (
                      <span className="text-xs text-muted-foreground">
                        In progress...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stats Card */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Setup Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
              {progress.pages_discovered}
            </div>
            <div className="text-xs text-muted-foreground">Pages Discovered</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
              {progress.keywords_tracked}
            </div>
            <div className="text-xs text-muted-foreground">Keywords Tracked</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
              {progress.knowledge_items_created}
            </div>
            <div className="text-xs text-muted-foreground">Knowledge Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
              {progress.faqs_generated}
            </div>
            <div className="text-xs text-muted-foreground">FAQs Generated</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
              {progress.opportunities_found}
            </div>
            <div className="text-xs text-muted-foreground">Opportunities Found</div>
          </div>
          {progress.duration_seconds && (
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
                {Math.floor(progress.duration_seconds / 60)}m
              </div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
          )}
        </div>
      </Card>

      {/* Error Card */}
      {progress.last_error && (
        <Card className="p-6 border-destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive mb-1">Last Error</h3>
              <p className="text-sm text-muted-foreground">{progress.last_error}</p>
              {progress.error_count > 1 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Total errors: {progress.error_count}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
