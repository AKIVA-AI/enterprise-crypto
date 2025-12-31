import { useTradingMode } from '@/contexts/TradingModeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  Globe, 
  Flag, 
  ArrowLeftRight,
  Percent,
  TrendingUp,
  Shield,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArbitrageFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  usAvailable: boolean;
  intlAvailable: boolean;
  venues: string[];
}

const ARBITRAGE_FEATURES: ArbitrageFeature[] = [
  {
    id: 'cex-spot',
    name: 'CEX Spot Arbitrage',
    description: 'Cross-exchange price differences on spot markets',
    icon: <ArrowLeftRight className="h-4 w-4" />,
    usAvailable: true,
    intlAvailable: true,
    venues: ['Coinbase', 'Kraken', 'Binance.US'],
  },
  {
    id: 'funding-rate',
    name: 'Funding Rate Arbitrage',
    description: 'Spot vs perpetual funding rate capture',
    icon: <Percent className="h-4 w-4" />,
    usAvailable: false,
    intlAvailable: true,
    venues: ['Hyperliquid', 'Binance', 'dYdX'],
  },
  {
    id: 'basis-trade',
    name: 'Basis Trading',
    description: 'Spot vs futures premium capture',
    icon: <TrendingUp className="h-4 w-4" />,
    usAvailable: false,
    intlAvailable: true,
    venues: ['OKX', 'Bybit', 'Binance'],
  },
];

export function ModeAwareArbitrageInfo() {
  const { mode, toggleMode, modeConfig, detectedRegion, isAutoDetected } = useTradingMode();
  
  const isUSMode = mode === 'us';
  
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isUSMode ? (
              <Flag className="h-4 w-4 text-blue-500" />
            ) : (
              <Globe className="h-4 w-4 text-green-500" />
            )}
            Trading Mode
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs',
              isUSMode ? 'border-blue-500/50 text-blue-500' : 'border-green-500/50 text-green-500'
            )}
          >
            {modeConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="text-xs">
            {isAutoDetected ? (
              <span className="text-muted-foreground">
                Auto-detected: {detectedRegion?.country || 'Unknown'}
              </span>
            ) : (
              <span className="text-muted-foreground">Manual override</span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleMode}
            className="text-xs h-7"
          >
            Switch to {isUSMode ? 'International' : 'US'} Mode
          </Button>
        </div>

        {/* Feature Availability */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Available Strategies
          </div>
          {ARBITRAGE_FEATURES.map((feature) => {
            const isAvailable = isUSMode ? feature.usAvailable : feature.intlAvailable;
            return (
              <div 
                key={feature.id}
                className={cn(
                  'flex items-center justify-between p-2 rounded-lg',
                  isAvailable ? 'bg-success/10' : 'bg-muted/30 opacity-60'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'p-1 rounded',
                    isAvailable ? 'text-success' : 'text-muted-foreground'
                  )}>
                    {feature.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{feature.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {isAvailable ? feature.venues.join(', ') : 'Not available in this mode'}
                    </div>
                  </div>
                </div>
                {isAvailable ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {/* US Mode Notice */}
        {isUSMode && (
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-blue-500">US Compliant Mode</p>
                <p className="text-muted-foreground">
                  Using only SEC/CFTC compliant exchanges. Perpetuals and margin trading disabled.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* International Mode Notice */}
        {!isUSMode && (
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-green-500">International Mode</p>
                <p className="text-muted-foreground">
                  All strategies available including perpetuals and funding rate arbitrage.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
