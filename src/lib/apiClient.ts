/**
 * API Client for the Enterprise Trading Platform Backend
 * 
 * Provides typed access to:
 * - Trading API (orders, positions)
 * - Market Data API (prices, orderbook)
 * - Arbitrage API (opportunities, funding rates)
 * - Strategies API (FreqTrade strategies)
 * - Risk API (metrics, kill switch)
 * - Agents API (status, control)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ============ Trading API ============

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  status: string;
}

export const tradingApi = {
  getPositions: () => apiRequest<Position[]>('/trading/positions'),
  getOrders: () => apiRequest<Order[]>('/trading/orders'),
  placeOrder: (order: Omit<Order, 'id' | 'status'>) => 
    apiRequest<Order>('/trading/orders', { method: 'POST', body: JSON.stringify(order) }),
  cancelOrder: (orderId: string) => 
    apiRequest<void>(`/trading/orders/${orderId}`, { method: 'DELETE' }),
};

// ============ Market Data API ============

export interface Ticker {
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const marketApi = {
  getTicker: (symbol: string) => apiRequest<Ticker>(`/market/ticker/${symbol}`),
  getCandles: (symbol: string, timeframe: string = '1h', limit: number = 100) =>
    apiRequest<Candle[]>(`/market/candles/${symbol}?timeframe=${timeframe}&limit=${limit}`),
  getOrderbook: (symbol: string) => apiRequest<{ bids: number[][]; asks: number[][] }>(`/market/orderbook/${symbol}`),
};

// ============ Arbitrage API ============

export interface ArbitrageOpportunity {
  type: string;
  symbol: string;
  profit_bps: number;
  details: Record<string, unknown>;
}

export interface FundingRate {
  symbol: string;
  exchange: string;
  rate: number;
  next_funding: string;
}

export const arbitrageApi = {
  getStatus: () => apiRequest<{ running: boolean; strategies: string[] }>('/arbitrage/status'),
  getOpportunities: () => apiRequest<ArbitrageOpportunity[]>('/arbitrage/opportunities'),
  getFundingRates: () => apiRequest<FundingRate[]>('/arbitrage/funding-rates'),
  start: () => apiRequest<void>('/arbitrage/start', { method: 'POST' }),
  stop: () => apiRequest<void>('/arbitrage/stop', { method: 'POST' }),
};

// ============ Strategies API ============

export interface Strategy {
  name: string;
  description: string;
  timeframe: string;
  indicators: string[];
  status: 'active' | 'inactive';
  performance?: {
    total_trades: number;
    win_rate: number;
    profit_factor: number;
  };
}

export interface BacktestResult {
  strategy: string;
  start_date: string;
  end_date: string;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  trades: number;
}

export const strategiesApi = {
  list: () => apiRequest<Strategy[]>('/strategies/'),
  get: (name: string) => apiRequest<Strategy>(`/strategies/${name}`),
  backtest: (config: { strategy: string; start_date: string; end_date: string; pairs: string[] }) =>
    apiRequest<BacktestResult>('/strategies/backtest', { method: 'POST', body: JSON.stringify(config) }),
  getSignal: (name: string, pair: string) =>
    apiRequest<{ signal: string; confidence: number }>(`/strategies/signal?strategy=${name}&pair=${pair}`),
};

// ============ Risk API ============

export interface RiskMetrics {
  portfolio_var: number;
  max_drawdown: number;
  sharpe_ratio: number;
  exposure: number;
}

export const riskApi = {
  getMetrics: () => apiRequest<RiskMetrics>('/risk/metrics'),
  getKillSwitch: () => apiRequest<{ active: boolean; reason?: string }>('/risk/kill-switch'),
  activateKillSwitch: (reason: string) =>
    apiRequest<void>('/risk/kill-switch/activate', { method: 'POST', body: JSON.stringify({ reason }) }),
  deactivateKillSwitch: () =>
    apiRequest<void>('/risk/kill-switch/deactivate', { method: 'POST' }),
};

// ============ Agents API ============

export interface AgentStatus {
  agent_id: string;
  agent_type: string;
  status: 'running' | 'stopped' | 'error';
  metrics: {
    messages_processed: number;
    signals_generated: number;
    errors: number;
    uptime_seconds: number;
  };
}

export const agentsApi = {
  getStatus: () => apiRequest<{ agents: AgentStatus[] }>('/agents/status'),
  start: (agentId: string) => apiRequest<void>(`/agents/${agentId}/start`, { method: 'POST' }),
  stop: (agentId: string) => apiRequest<void>(`/agents/${agentId}/stop`, { method: 'POST' }),
  restart: (agentId: string) => apiRequest<void>(`/agents/${agentId}/restart`, { method: 'POST' }),
};

// ============ WebSocket Connection ============

export function createWebSocket(stream: string): WebSocket {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
  return new WebSocket(`${wsUrl}/stream/${stream}`);
}

