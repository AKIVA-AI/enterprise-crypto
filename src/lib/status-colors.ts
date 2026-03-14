/**
 * Semantic color tokens for the trading platform.
 *
 * Replaces hardcoded Tailwind color utilities (bg-green-500, text-red-600, etc.)
 * with semantic names that survive theme changes and keep the palette consistent.
 *
 * Usage:
 *   import { sentiment, riskLevel, statusBadge } from '@/lib/status-colors';
 *   <span className={sentiment('positive')}>+12.5%</span>
 *   <Badge className={riskLevel('high').badge}>HIGH</Badge>
 */

// ── Performance / P&L sentiment ──────────────────────────────────────
export type Sentiment = 'positive' | 'negative' | 'neutral';

const sentimentMap: Record<Sentiment, string> = {
  positive: 'text-success',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
};

/** Returns a text color class for financial performance values. */
export function sentiment(s: Sentiment): string {
  return sentimentMap[s];
}

/** Convenience: pick positive/negative based on a number. */
export function sentimentByValue(v: number): string {
  if (v > 0) return sentimentMap.positive;
  if (v < 0) return sentimentMap.negative;
  return sentimentMap.neutral;
}

// ── Risk severity ────────────────────────────────────────────────────
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

interface RiskStyle {
  text: string;
  bg: string;
  badge: string;
  border: string;
  icon: string;
}

const riskStyles: Record<RiskSeverity, RiskStyle> = {
  low: {
    text: 'text-success',
    bg: 'bg-success/10',
    badge: 'bg-success/20 text-success border-success/30',
    border: 'border-success/30',
    icon: 'text-success',
  },
  medium: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    badge: 'bg-warning/20 text-warning border-warning/30',
    border: 'border-warning/30',
    icon: 'text-warning',
  },
  high: {
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    badge: 'bg-destructive/20 text-destructive border-destructive/30',
    border: 'border-destructive/30',
    icon: 'text-destructive',
  },
  critical: {
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    badge: 'bg-destructive/20 text-destructive border-destructive/30',
    border: 'border-destructive/30',
    icon: 'text-destructive animate-pulse',
  },
};

/** Returns a full style object for a risk severity level. */
export function riskLevel(severity: RiskSeverity): RiskStyle {
  return riskStyles[severity];
}

/** Convenience: map a numeric score (0-100) to a risk severity. */
export function riskFromScore(score: number): RiskSeverity {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ── Status indicators ────────────────────────────────────────────────
export type Status = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusStyle {
  text: string;
  bg: string;
  badge: string;
  border: string;
  container: string;
}

const statusStyles: Record<Status, StatusStyle> = {
  success: {
    text: 'text-success',
    bg: 'bg-success/10',
    badge: 'bg-success/20 text-success border-success/30',
    border: 'border-success/30',
    container: 'bg-success/5 border-success/20',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    badge: 'bg-warning/20 text-warning border-warning/30',
    border: 'border-warning/30',
    container: 'bg-warning/5 border-warning/20',
  },
  error: {
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    badge: 'bg-destructive/20 text-destructive border-destructive/30',
    border: 'border-destructive/30',
    container: 'bg-destructive/5 border-destructive/20',
  },
  info: {
    text: 'text-primary',
    bg: 'bg-primary/10',
    badge: 'bg-primary/20 text-primary border-primary/30',
    border: 'border-primary/30',
    container: 'bg-primary/5 border-primary/20',
  },
  neutral: {
    text: 'text-muted-foreground',
    bg: 'bg-muted/10',
    badge: 'bg-muted/20 text-muted-foreground border-muted/30',
    border: 'border-muted/30',
    container: 'bg-muted/5 border-muted/20',
  },
};

/** Returns a full style object for a status indicator. */
export function statusColor(s: Status): StatusStyle {
  return statusStyles[s];
}

// ── Trading mode ─────────────────────────────────────────────────────
export type TradingMode = 'us' | 'international';

interface ModeStyle {
  text: string;
  bg: string;
  border: string;
  badge: string;
  container: string;
}

const modeStyles: Record<TradingMode, ModeStyle> = {
  us: {
    text: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    badge: 'border-primary/30 text-primary',
    container: 'bg-primary/5 border-primary/20',
  },
  international: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    badge: 'border-warning/30 text-warning',
    container: 'bg-warning/5 border-warning/20',
  },
};

/** Returns a style object for trading regulatory mode. */
export function tradingMode(mode: TradingMode): ModeStyle {
  return modeStyles[mode];
}

// ── Market direction ─────────────────────────────────────────────────
export type Direction = 'bullish' | 'bearish' | 'neutral';

const directionMap: Record<Direction, string> = {
  bullish: 'text-success',
  bearish: 'text-destructive',
  neutral: 'text-muted-foreground',
};

/** Returns a text color class for market direction. */
export function directionColor(d: Direction): string {
  return directionMap[d];
}

// ── Strategy categories ──────────────────────────────────────────────
export type StrategyCategory =
  | 'trend'
  | 'mean-reversion'
  | 'arbitrage'
  | 'momentum'
  | 'volatility'
  | 'statistical'
  | 'market-making'
  | 'factor';

const categoryStyles: Record<StrategyCategory, string> = {
  'trend': 'bg-primary/20 text-primary border-primary/30',
  'mean-reversion': 'bg-accent/20 text-accent-foreground border-accent/30',
  'arbitrage': 'bg-success/20 text-success border-success/30',
  'momentum': 'bg-warning/20 text-warning border-warning/30',
  'volatility': 'bg-destructive/20 text-destructive border-destructive/30',
  'statistical': 'bg-secondary/20 text-secondary-foreground border-secondary/30',
  'market-making': 'bg-warning/20 text-warning border-warning/30',
  'factor': 'bg-primary/20 text-primary border-primary/30',
};

/** Returns badge classes for a strategy category. */
export function categoryBadge(cat: StrategyCategory): string {
  return categoryStyles[cat];
}

// ── Difficulty ───────────────────────────────────────────────────────
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

const difficultyStyles: Record<Difficulty, string> = {
  beginner: 'bg-success/10 text-success',
  intermediate: 'bg-warning/10 text-warning',
  advanced: 'bg-destructive/10 text-destructive',
};

/** Returns badge classes for strategy difficulty. */
export function difficultyBadge(d: Difficulty): string {
  return difficultyStyles[d];
}

// ── Exchange identity ────────────────────────────────────────────────
export type Exchange =
  | 'coinbase'
  | 'kraken'
  | 'binance'
  | 'bybit'
  | 'okx'
  | 'hyperliquid'
  | 'mexc'
  | 'default';

const exchangeStyles: Record<Exchange, string> = {
  coinbase: 'bg-primary/10 border-primary/30',
  kraken: 'bg-accent/10 border-accent/30',
  binance: 'bg-warning/10 border-warning/30',
  bybit: 'bg-warning/10 border-warning/30',
  okx: 'bg-muted/10 border-muted/30',
  hyperliquid: 'bg-secondary/10 border-secondary/30',
  mexc: 'bg-success/10 border-success/30',
  default: 'bg-muted/10 border-muted/30',
};

/** Returns container classes for an exchange badge. */
export function exchangeBadge(ex: Exchange): string {
  return exchangeStyles[ex] ?? exchangeStyles.default;
}

// ── Notification channel ─────────────────────────────────────────────
export type NotificationChannel = 'telegram' | 'discord' | 'slack' | 'webhook';

const channelStyles: Record<NotificationChannel, string> = {
  telegram: 'bg-primary/20 text-primary',
  discord: 'bg-primary/20 text-primary',
  slack: 'bg-accent/20 text-accent-foreground',
  webhook: 'bg-muted/20 text-muted-foreground',
};

/** Returns badge classes for a notification channel type. */
export function channelBadge(ch: NotificationChannel): string {
  return channelStyles[ch] ?? channelStyles.webhook;
}
