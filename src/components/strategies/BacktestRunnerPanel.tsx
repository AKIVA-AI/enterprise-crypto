import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Pause, Square, Loader2, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRunBacktest, BacktestRequest, BacktestSummary } from '@/hooks/useBacktestResults';

// Backtest status types
export type BacktestStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled';

interface BacktestRunnerPanelProps {
  onBacktestComplete?: (result: BacktestSummary) => void;
  onBacktestStart?: (config: BacktestRequest) => void;
  className?: string;
  initialConfig?: BacktestRequest;
}

// Mock progress simulation (in real app, this would come from WebSocket or polling)
const useBacktestProgress = (isRunning: boolean) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<BacktestStatus>('idle');
  const [currentStep, setCurrentStep] = useState('');

  React.useEffect(() => {
    if (isRunning) {
      setStatus('running');
      setProgress(0);
      
      const steps = [
        { progress: 10, step: 'Initializing backtest engine...' },
        { progress: 25, step: 'Loading market data...' },
        { progress: 40, step: 'Calculating indicators...' },
        { progress: 60, step: 'Executing strategy...' },
        { progress: 80, step: 'Calculating performance metrics...' },
        { progress: 95, step: 'Generating report...' },
        { progress: 100, step: 'Complete!' },
      ];

      let currentStepIndex = 0;
      const interval = setInterval(() => {
        if (currentStepIndex < steps.length) {
          const step = steps[currentStepIndex];
          setProgress(step.progress);
          setCurrentStep(step.step);
          currentStepIndex++;
        } else {
          clearInterval(interval);
          setStatus('completed');
        }
      }, 800);

      return () => clearInterval(interval);
    } else {
      setStatus('idle');
      setProgress(0);
      setCurrentStep('');
    }
  }, [isRunning]);

  return { progress, status, currentStep };
};

export function BacktestRunnerPanel({
  onBacktestComplete,
  onBacktestStart,
  className,
  initialConfig,
}: BacktestRunnerPanelProps) {
  const [config, setConfig] = useState<BacktestRequest | null>(initialConfig || null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<BacktestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = useRunBacktest();
  const { progress, status, currentStep } = useBacktestProgress(isRunning);

  const handleRunBacktest = useCallback(async () => {
    if (!config) {
      setError('No configuration provided');
      return;
    }

    setError(null);
    setIsRunning(true);
    
    // Notify parent that backtest is starting
    onBacktestStart?.(config);

    try {
      const result = await runBacktest.mutateAsync(config);
      setLastResult(result);
      onBacktestComplete?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsRunning(false);
    }
  }, [config, runBacktest, onBacktestStart, onBacktestComplete]);

  const handleCancel = useCallback(() => {
    setIsRunning(false);
    setError('Backtest cancelled by user');
  }, []);

  const handleReset = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return 'Running...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className={cn('glass-panel', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Backtest Runner
          <div className="group relative">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div className="absolute right-0 top-6 w-64 p-3 bg-popover border rounded-md shadow-md text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
              Execute your strategy backtest with real-time progress tracking and detailed performance analysis.
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          Run your strategy backtest and monitor execution progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Summary */}
        {config && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Configuration Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Strategy:</span>
                <div className="font-medium">{config.strategyName}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Instruments:</span>
                <div className="font-medium">{config.instruments.join(', ')}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Timeframe:</span>
                <div className="font-medium">{config.timeframe}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Capital:</span>
                <div className="font-medium">${config.initialCapital?.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
            <Badge variant="outline" className={cn('text-xs', getStatusColor())}>
              {status}
            </Badge>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {status === 'running' ? (
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                <Square className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            ) : (
              <Button 
                onClick={handleRunBacktest} 
                disabled={!config || isRunning}
                className="min-w-[120px]"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Backtest
                  </>
                )}
              </Button>
            )}
            
            {lastResult && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{currentStep}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Result */}
        {lastResult && status === 'completed' && (
          <Alert className="border-green-500/20 bg-green-500/5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              <div className="space-y-1">
                <p className="font-medium">Backtest completed successfully!</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                  <div>
                    <span className="text-muted-foreground">Final Equity:</span>
                    <div className="font-medium">${lastResult.finalEquity.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Return:</span>
                    <div className="font-medium text-green-600">
                      {(lastResult.totalReturn * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sharpe Ratio:</span>
                    <div className="font-medium">{lastResult.sharpeRatio.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Trades:</span>
                    <div className="font-medium">{lastResult.totalTrades}</div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* No Configuration State */}
        {!config && !lastResult && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No configuration provided</p>
            <p className="text-sm">
              Configure your strategy parameters above to run a backtest
            </p>
          </div>
        )}

        {/* Execution Details */}
        {isRunning && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">Execution Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Processing market data</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Estimated time: 2-3 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span>Calculating indicators</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Import Activity icon
import { Activity } from 'lucide-react';

export default BacktestRunnerPanel;
