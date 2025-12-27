import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeftRight, 
  TrendingUp, 
  Zap, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Activity,
  DollarSign,
  Clock,
  Target,
  Play,
  Pause,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useArbitrageMonitor, useExecuteArbitrage, ArbitrageOpportunity } from '@/hooks/useCrossExchangeArbitrage';
import { VENUES } from '@/lib/tradingModes';

export default function Arbitrage() {
  const [isScanning, setIsScanning] = useState(true);
  const [minSpreadPercent, setMinSpreadPercent] = useState([0.1]);
  const [autoExecute, setAutoExecute] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);

  const { opportunities, isScanning: loading, lastScan, status, refetch } = useArbitrageMonitor(isScanning);
  const executeArbitrage = useExecuteArbitrage();

  // Auto-execute logic
  useEffect(() => {
    if (autoExecute && opportunities.length > 0) {
      const best = opportunities[0];
      if (best.costs && best.costs.netProfit > 10) { // Only if > $10 profit
        executeArbitrage.mutate(best);
        toast.info('Auto-executing arbitrage', {
          description: `${best.buyExchange} → ${best.sellExchange} for $${best.costs.netProfit.toFixed(2)}`,
        });
      }
    }
  }, [opportunities, autoExecute]);

  const handleExecute = (opportunity: ArbitrageOpportunity) => {
    executeArbitrage.mutate(opportunity);
  };

  // Calculate stats
  const totalOpportunities = opportunities.length;
  const profitableCount = opportunities.filter(o => o.costs && o.costs.netProfit > 0).length;
  const avgSpread = opportunities.length > 0 
    ? opportunities.reduce((sum, o) => sum + o.spreadPercent, 0) / opportunities.length 
    : 0;
  const totalPotentialProfit = opportunities.reduce((sum, o) => sum + (o.costs?.netProfit || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowLeftRight className="h-7 w-7 text-primary" />
              Cross-Exchange Arbitrage
            </h1>
            <p className="text-muted-foreground">
              Real-time opportunity scanning across Coinbase, Kraken, and Binance.US
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={cn(
                'gap-1',
                isScanning ? 'border-success text-success' : 'border-muted-foreground'
              )}
            >
              {isScanning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Live Scanning
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3" />
                  Paused
                </>
              )}
            </Badge>
            <Button
              variant={isScanning ? 'outline' : 'default'}
              size="sm"
              onClick={() => setIsScanning(!isScanning)}
              className="gap-1"
            >
              {isScanning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isScanning ? 'Pause' : 'Start'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Stats Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Stats */}
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Scanner Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold text-primary">{totalOpportunities}</div>
                    <div className="text-xs text-muted-foreground">Found</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold text-success">{profitableCount}</div>
                    <div className="text-xs text-muted-foreground">Profitable</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Spread</span>
                    <span className="font-mono">{avgSpread.toFixed(3)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Potential Profit</span>
                    <span className="font-mono text-success">${totalPotentialProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Scan</span>
                    <span className="font-mono text-xs">
                      {lastScan ? new Date(lastScan).toLocaleTimeString() : '--'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exchange Status */}
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Exchange Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {status?.exchanges && Object.entries(status.exchanges).map(([exchange, info]: [string, any]) => (
                  <div key={exchange} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{VENUES[exchange]?.icon}</span>
                      <span className="text-sm">{VENUES[exchange]?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {info.apiConfigured ? (
                        <Badge variant="outline" className="text-xs border-success text-success">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-warning text-warning">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Paper
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Settings */}
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Scanner Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Min Spread</Label>
                    <span className="text-sm font-mono">{minSpreadPercent[0]}%</span>
                  </div>
                  <Slider
                    value={minSpreadPercent}
                    onValueChange={setMinSpreadPercent}
                    min={0.01}
                    max={1}
                    step={0.01}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Auto-Execute</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically execute profitable trades
                    </p>
                  </div>
                  <Switch
                    checked={autoExecute}
                    onCheckedChange={setAutoExecute}
                  />
                </div>
                
                {autoExecute && (
                  <div className="p-2 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                      <div className="text-xs">
                        <p className="font-medium text-warning">Caution</p>
                        <p className="text-muted-foreground">
                          Auto-execution will place real orders when APIs are configured.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Opportunities List */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Live Opportunities
                  </span>
                  {loading && (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No profitable opportunities found</p>
                    <p className="text-sm">Scanning across exchanges...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {opportunities.map((opp) => (
                      <div
                        key={opp.id}
                        className={cn(
                          'p-4 rounded-lg border transition-all cursor-pointer',
                          selectedOpportunity?.id === opp.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                        onClick={() => setSelectedOpportunity(opp)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">
                              {opp.symbol}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="flex items-center gap-1">
                                {VENUES[opp.buyExchange]?.icon}
                                <span className="text-muted-foreground">Buy @</span>
                                <span className="font-mono text-success">${opp.buyPrice.toFixed(2)}</span>
                              </span>
                              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                              <span className="flex items-center gap-1">
                                {VENUES[opp.sellExchange]?.icon}
                                <span className="text-muted-foreground">Sell @</span>
                                <span className="font-mono text-destructive">${opp.sellPrice.toFixed(2)}</span>
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecute(opp);
                            }}
                            disabled={executeArbitrage.isPending}
                          >
                            <Zap className="h-3 w-3" />
                            Execute
                          </Button>
                        </div>

                        <div className="grid grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs">Spread</div>
                            <div className="font-mono font-medium text-primary">
                              {opp.spreadPercent.toFixed(3)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Gross Profit</div>
                            <div className="font-mono font-medium">
                              ${opp.estimatedProfit.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Fees & Costs</div>
                            <div className="font-mono font-medium text-destructive">
                              -${opp.costs?.totalCost.toFixed(2) || '0.00'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Net Profit</div>
                            <div className={cn(
                              'font-mono font-bold',
                              (opp.costs?.netProfit || 0) > 0 ? 'text-success' : 'text-destructive'
                            )}>
                              ${opp.costs?.netProfit.toFixed(2) || '0.00'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Confidence</div>
                            <Progress value={opp.confidence * 100} className="h-2 mt-1" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Execution History */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Recent Executions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <p>No executions yet</p>
                  <p className="text-xs">Executed trades will appear here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
