import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock as any;

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];
  takeRecords = vi.fn(() => []);
}
global.IntersectionObserver = IntersectionObserverMock as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock useLivePriceFeed hook
vi.mock('@/hooks/useLivePriceFeed', () => ({
  useLivePriceFeed: () => ({
    prices: new Map([
      ['BTC-USDT', {
        symbol: 'BTC-USDT',
        price: 50000,
        change24h: 2.5,
        volume24h: 1000000,
        high24h: 51000,
        low24h: 49000,
        bid: 49999,
        ask: 50001,
        timestamp: Date.now()
      }],
      ['ETH-USDT', {
        symbol: 'ETH-USDT',
        price: 3000,
        change24h: 1.5,
        volume24h: 500000,
        high24h: 3100,
        low24h: 2900,
        bid: 2999,
        ask: 3001,
        timestamp: Date.now()
      }]
    ]),
    isConnected: true,
    isConnecting: false,
    connectionError: null,
    reconnectAttempts: 0,
    latencyMs: 50,
    lastConnectedAt: Date.now(),
    usingFallback: false,
    dataSource: 'mock',
    apiLatency: 0,
    getPrice: (symbol: string) => 50000,
    getAllPrices: () => new Map(),
    connect: vi.fn(),
    forceRefresh: vi.fn(),
    disconnect: vi.fn(),
    resetReconnect: vi.fn()
  })
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

