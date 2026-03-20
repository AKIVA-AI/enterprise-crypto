import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TradeTicket } from './TradeTicket';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'books') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: [{
                id: 'book-123',
                name: 'Test Book',
                capital_allocated: 100000,
                status: 'healthy'
              }],
              error: null
            }))
          }))
        };
      }
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'order-123', status: 'submitted' },
              error: null
            }))
          }))
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      };
    }),
    functions: {
      invoke: vi.fn(() => Promise.resolve({
        data: { success: true, orderId: 'test-order-123' },
        error: null
      }))
    }
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

// Override useLivePriceFeed mock to return proper LivePrice objects
vi.mock('@/hooks/useLivePriceFeed', () => ({
  useLivePriceFeed: () => ({
    prices: new Map([
      ['BTC-USDT', { price: 50000, change24h: 2.5, timestamp: Date.now() }],
    ]),
    isConnected: true,
    getPrice: (symbol: string) => {
      if (symbol === 'BTC-USDT') {
        return { price: 50000, change24h: 2.5, volume24h: 1000000, timestamp: Date.now() };
      }
      return undefined;
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })
}));

// Mock Radix UI AlertDialog Portal to render inline
vi.mock('@radix-ui/react-alert-dialog', async () => {
  const actual = await vi.importActual<typeof import('@radix-ui/react-alert-dialog')>('@radix-ui/react-alert-dialog');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock Radix UI Select Portal to render inline
vi.mock('@radix-ui/react-select', async () => {
  const actual = await vi.importActual<typeof import('@radix-ui/react-select')>('@radix-ui/react-select');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('TradeTicket', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const renderTradeTicket = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TradeTicket {...props} />
      </QueryClientProvider>
    );
  };

  describe('Order Entry Validation', () => {
    it('should render trade ticket with default values', () => {
      renderTradeTicket();
      // Check for side selector button (just "BUY")
      const sideButtons = screen.getAllByRole('button', { name: /BUY/i });
      expect(sideButtons.length).toBeGreaterThan(0);
      expect(screen.getByText(/Market/i)).toBeInTheDocument();
    });

    it('should require book selection before submitting', async () => {
      renderTradeTicket();

      // Submit button should have size in text (e.g., "BUY 0.1 BTC")
      const submitButton = screen.getByRole('button', { name: /BUY.*BTC/i });
      expect(submitButton).toBeDisabled();
    });

    it('should require positive size', async () => {
      renderTradeTicket({ defaultBookId: 'book-123' });

      const sizeInput = screen.getByLabelText(/Size/i);
      fireEvent.change(sizeInput, { target: { value: '0' } });

      // Submit button should have size in text
      const submitButton = screen.getByRole('button', { name: /BUY.*BTC/i });
      expect(submitButton).toBeDisabled();
    });

    it('should require price for limit orders', async () => {
      renderTradeTicket({ defaultBookId: 'book-123' });

      // Switch to limit order - use getByRole to be more specific
      const limitButton = screen.getByRole('button', { name: /^Limit$/i });
      fireEvent.click(limitButton);

      // Price field should be visible
      expect(screen.getByLabelText(/Price/i)).toBeInTheDocument();
    });
  });

  describe('Order Submission', () => {
    it('should submit market order successfully', async () => {
      const onClose = vi.fn();
      renderTradeTicket({ defaultBookId: 'book-123', onClose });

      // Set a small size so notional stays under risk limit
      // Default risk = 1% of 100000 = 1000. Price ~50000. Size 0.01 => notional = 500 < 1000
      const sizeInput = screen.getByLabelText(/Size/i);
      fireEvent.change(sizeInput, { target: { value: '0.01' } });

      // Submit - look for button with size in text
      const submitButton = screen.getByRole('button', { name: /BUY 0\.01/i });
      fireEvent.click(submitButton);

      // Confirmation dialog should appear - click confirm button
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Confirm BUY/i });
        expect(confirmButton).toBeInTheDocument();
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should submit limit order with price', async () => {
      const onClose = vi.fn();
      renderTradeTicket({ defaultBookId: 'book-123', onClose });

      // Switch to limit order
      const limitButton = screen.getByRole('button', { name: /^Limit$/i });
      fireEvent.click(limitButton);

      // Wait for price input to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Price/i)).toBeInTheDocument();
      });

      // Set small size and price so notional stays under risk limit
      // Risk limit = 1% of 100000 = 1000. Size 0.01 * price 50000 = 500 < 1000
      const sizeInput = screen.getByLabelText(/Size/i);
      const priceInput = screen.getByLabelText(/Price/i);
      fireEvent.change(sizeInput, { target: { value: '0.01' } });
      fireEvent.change(priceInput, { target: { value: '50000' } });

      // Submit - look for button with size in text
      const submitButton = screen.getByRole('button', { name: /BUY 0\.01/i });
      fireEvent.click(submitButton);

      // Confirmation dialog should appear - click confirm button
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Confirm BUY/i });
        expect(confirmButton).toBeInTheDocument();
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should handle sell orders', async () => {
      renderTradeTicket({ defaultBookId: 'book-123' });

      // Switch to sell
      const sellButton = screen.getAllByRole('button', { name: /SELL/i })[0];
      fireEvent.click(sellButton);

      // Set size
      const sizeInput = screen.getByLabelText(/Size/i);
      fireEvent.change(sizeInput, { target: { value: '0.5' } });

      // Submit button should show SELL with size
      expect(screen.getByRole('button', { name: /SELL 0\.5/i })).toBeInTheDocument();
    });
  });

  describe('Risk Warnings', () => {
    it('should show warning when risk exceeds limit', async () => {
      renderTradeTicket({ defaultBookId: 'book-123' });

      // Set a very large size to exceed risk limit
      // Default risk is 1% of 100000 = 1000. Price is ~50000 from mock.
      // size * 50000 > 1000 => size > 0.02
      // With default 0.1, notional = 5000 which already exceeds 1000 at 1%
      // But the component shows "Exceeds risk limit" text inline
      const sizeInput = screen.getByLabelText(/Size/i);
      fireEvent.change(sizeInput, { target: { value: '100' } });

      // Risk warning should appear as inline text in the order summary
      await waitFor(() => {
        expect(screen.getByText(/Exceeds risk limit/i)).toBeInTheDocument();
      });
    });
  });
});
