import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Droplets, 
  Activity,
  Search,
  RefreshCw,
  AlertTriangle,
  Plus,
  ExternalLink
} from 'lucide-react';
import { useWatchlistTokens, useTokenMetrics, TokenMetrics } from '@/hooks/useTokenMetrics';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supportedChains } from '@/lib/web3Config';

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price < 0.0001) return `$${price.toExponential(2)}`;
  if (price < 1) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(4)}`;
}

function TokenCard({ token }: { token: TokenMetrics }) {
  const concentrationRisk = token.holderConcentration > 50 ? 'high' : 
                            token.holderConcentration > 30 ? 'medium' : 'low';
  
  const openExplorer = () => {
    const explorerUrls: Record<string, string> = {
      ethereum: 'https://etherscan.io/token/',
      base: 'https://basescan.org/token/',
      arbitrum: 'https://arbiscan.io/token/',
      optimism: 'https://optimistic.etherscan.io/token/',
      polygon: 'https://polygonscan.com/token/',
    };
    const baseUrl = explorerUrls[token.chain] || explorerUrls.ethereum;
    window.open(`${baseUrl}${token.address}`, '_blank');
  };

  return (
    <Card className="glass-panel hover:border-primary/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {token.symbol}
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={openExplorer}>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </CardTitle>
            <p className="text-xs text-muted-foreground font-mono">
              {token.address.slice(0, 8)}...{token.address.slice(-6)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono font-semibold">{formatPrice(token.priceUSD)}</p>
            <Badge 
              variant={token.priceChange24h >= 0 ? 'default' : 'destructive'}
              className={cn(
                'text-xs',
                token.priceChange24h >= 0 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
              )}
            >
              {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>Market Cap</span>
            </div>
            <p className="font-mono font-medium">{formatNumber(token.marketCap)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Droplets className="h-3 w-3" />
              <span>Liquidity</span>
            </div>
            <p className="font-mono font-medium">{formatNumber(token.liquidityUSD)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>24h Volume</span>
            </div>
            <p className="font-mono font-medium">{formatNumber(token.volume24h)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Holders</span>
            </div>
            <p className="font-mono font-medium">{token.holderCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Holder Concentration
              {concentrationRisk === 'high' && (
                <AlertTriangle className="h-3 w-3 text-destructive" />
              )}
            </span>
            <span className={cn(
              'font-mono',
              concentrationRisk === 'high' && 'text-destructive',
              concentrationRisk === 'medium' && 'text-warning',
              concentrationRisk === 'low' && 'text-success',
            )}>
              {token.holderConcentration.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={token.holderConcentration} 
            className={cn(
              'h-2',
              concentrationRisk === 'high' && '[&>div]:bg-destructive',
              concentrationRisk === 'medium' && '[&>div]:bg-warning',
              concentrationRisk === 'low' && '[&>div]:bg-success',
            )}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Top Holders</p>
          <div className="space-y-1">
            {token.topHolders.slice(0, 3).map((holder, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">
                  {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                </span>
                <span className="font-mono">{holder.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TokenMonitorPanel() {
  const [chain, setChain] = useState('ethereum');
  const [searchAddress, setSearchAddress] = useState('');
  const [searchedAddress, setSearchedAddress] = useState('');
  
  const { data: watchlist, isLoading: watchlistLoading, refetch } = useWatchlistTokens(chain);
  const { data: searchResult, isLoading: searchLoading } = useTokenMetrics(searchedAddress, chain);

  const handleSearch = () => {
    if (!searchAddress.startsWith('0x') || searchAddress.length !== 42) {
      toast.error('Invalid token address');
      return;
    }
    setSearchedAddress(searchAddress);
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Refreshing token data...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            On-Chain Token Monitor
          </h2>
          <p className="text-sm text-muted-foreground">
            Track holder concentration, liquidity, and market metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={chain} onValueChange={setChain}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select chain" />
            </SelectTrigger>
            <SelectContent>
              {supportedChains.map((c) => (
                <SelectItem key={c.id} value={c.name.toLowerCase()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="glass-panel">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter token contract address (0x...)"
                className="pl-10 font-mono"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searchLoading}>
              {searchLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Result */}
      {searchResult && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Search Result</h3>
          <TokenCard token={searchResult} />
        </div>
      )}

      {/* Watchlist */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Meme Token Watchlist</h3>
          <Button variant="ghost" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Token
          </Button>
        </div>
        
        {watchlistLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="glass-panel">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                  <Skeleton className="h-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist?.map((token) => (
              <TokenCard key={token.address} token={token} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
