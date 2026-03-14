/**
 * Exchange Badge Component
 * 
 * Displays color-coded badges for different cryptocurrency exchanges.
 * Used throughout the UI to show data sources and exchange status.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ExchangeType = 
  | 'coinbase' 
  | 'kraken' 
  | 'binance' 
  | 'bybit' 
  | 'okx' 
  | 'hyperliquid' 
  | 'mexc';

interface ExchangeConfig {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  usCompliant: boolean;
}

const EXCHANGE_CONFIGS: Record<ExchangeType, ExchangeConfig> = {
  coinbase: {
    name: 'Coinbase',
    icon: '🔵',
    color: '#0052FF',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    usCompliant: true,
  },
  kraken: {
    name: 'Kraken',
    icon: '🟣',
    color: '#5741D9',
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/30',
    usCompliant: true,
  },
  binance: {
    name: 'Binance',
    icon: '🟡',
    color: '#F3BA2F',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    usCompliant: false,
  },
  bybit: {
    name: 'Bybit',
    icon: '🟠',
    color: '#F7A600',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    usCompliant: false,
  },
  okx: {
    name: 'OKX',
    icon: '⚫',
    color: '#000000',
    bgColor: 'bg-muted/10',
    borderColor: 'border-muted/30',
    usCompliant: false,
  },
  hyperliquid: {
    name: 'Hyperliquid',
    icon: '🔷',
    color: '#00D4FF',
    bgColor: 'bg-secondary/10',
    borderColor: 'border-secondary/30',
    usCompliant: true,
  },
  mexc: {
    name: 'MEXC',
    icon: '🟢',
    color: '#00C087',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    usCompliant: false,
  },
};

interface ExchangeBadgeProps {
  exchange: ExchangeType;
  showIcon?: boolean;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ExchangeBadge({
  exchange,
  showIcon = true,
  showName = true,
  size = 'md',
  className,
}: ExchangeBadgeProps) {
  const config = EXCHANGE_CONFIGS[exchange];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.borderColor,
        sizeClasses[size],
        'font-medium',
        className
      )}
      style={{ color: config.color }}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {showName && config.name}
    </Badge>
  );
}

interface ExchangeStatusBadgeProps {
  exchange: ExchangeType;
  isConnected: boolean;
  latencyMs?: number | null;
  className?: string;
}

export function ExchangeStatusBadge({
  exchange,
  isConnected,
  latencyMs,
  className,
}: ExchangeStatusBadgeProps) {
  const config = EXCHANGE_CONFIGS[exchange];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ExchangeBadge exchange={exchange} size="sm" />
      <Badge
        variant={isConnected ? 'default' : 'destructive'}
        className="text-xs"
      >
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </Badge>
      {isConnected && latencyMs !== null && (
        <span className="text-xs text-muted-foreground">
          {latencyMs}ms
        </span>
      )}
    </div>
  );
}

interface RegulatoryWarningBadgeProps {
  exchange: ExchangeType;
  className?: string;
}

export function RegulatoryWarningBadge({
  exchange,
  className,
}: RegulatoryWarningBadgeProps) {
  const config = EXCHANGE_CONFIGS[exchange];

  if (config.usCompliant) {
    return (
      <Badge
        variant="outline"
        className={cn('bg-success/10 text-success border-success/30', className)}
      >
        ✅ US Compliant
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn('bg-warning/10 text-warning border-warning/30', className)}
    >
      ⚠️ Not available in US
    </Badge>
  );
}

export { EXCHANGE_CONFIGS };

