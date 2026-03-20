import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdvancedRiskDashboard from './AdvancedRiskDashboard';

// Mock scrollIntoView for Radix UI Select
Element.prototype.scrollIntoView = vi.fn();

// Mock layout components to avoid nested dependencies
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: any) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('@/components/layout/TopBar', () => ({
  TopBar: () => <div data-testid="topbar">TopBar</div>
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/risk' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    },
    signOut: vi.fn()
  })
}));

// Mock useTradingMode
vi.mock('@/hooks/useTradingMode', () => ({
  useTradingMode: () => ({
    mode: 'live',
    modeConfig: { label: 'Live Trading', icon: 'Globe' },
    detectedRegion: 'US',
    isAutoDetected: true,
    setMode: vi.fn(),
    toggleMode: vi.fn(),
    resetToAutoDetect: vi.fn(),
    availableVenues: [],
    canTrade: () => true,
    isLoading: false
  })
}));

// Mock Wagmi
vi.mock('wagmi', () => ({
  createConfig: vi.fn(() => ({})),
  http: vi.fn(),
  useConfig: () => ({}),
  useAccount: () => ({ address: undefined, isConnected: false }),
  useConnect: () => ({ connect: vi.fn(), connectors: [] }),
  useDisconnect: () => ({ disconnect: vi.fn() })
}));

// Mock hooks
vi.mock('@/hooks/useBooks', () => ({
  useBooks: () => ({
    data: [
      { id: 'book-1', name: 'Main Book', is_active: true },
      { id: 'book-2', name: 'Test Book', is_active: true }
    ],
    isLoading: false
  })
}));

vi.mock('@/contexts/AICopilotContext', () => ({
  useAICopilot: () => ({
    isEnabled: false,
    suggestions: [],
    isLoading: false
  })
}));

// Mock Radix UI Select Portal to render inline
vi.mock('@radix-ui/react-select', async () => {
  const actual = await vi.importActual<typeof import('@radix-ui/react-select')>('@radix-ui/react-select');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('AdvancedRiskDashboard', () => {
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

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AdvancedRiskDashboard />
      </QueryClientProvider>
    );
  };

  describe('Book Selection', () => {
    it('should render book selector combobox', () => {
      renderDashboard();
      // The combobox exists even after auto-selection
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have a combobox that auto-selects first book', async () => {
      renderDashboard();

      // After auto-selection, the combobox shows the first book name
      await waitFor(() => {
        const combobox = screen.getByRole('combobox');
        expect(combobox).toHaveTextContent('Main Book');
      });
    });

    it('should select default book on load', async () => {
      renderDashboard();

      // The useEffect auto-selects the first book
      await waitFor(() => {
        const selectTrigger = screen.getByRole('combobox');
        expect(selectTrigger).toHaveTextContent('Main Book');
      });
    });
  });

  describe('VaR Display', () => {
    it('should show VaR metrics', async () => {
      renderDashboard();

      // Wait for book auto-selection and tab render
      await waitFor(() => {
        expect(screen.getByText(/VaR \(95%\)/i)).toBeInTheDocument();
      });
    });

    it('should display VaR value', async () => {
      renderDashboard();

      await waitFor(() => {
        // When backend is not available, shows -0.0%
        expect(screen.getByText(/-0\.0%/)).toBeInTheDocument();
      });
    });

    it('should render VaR Analysis tab trigger', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /VaR Analysis/i })).toBeInTheDocument();
      });
    });
  });

  describe('Stress Testing', () => {
    it('should render Stress Testing tab trigger', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Stress Testing/i })).toBeInTheDocument();
      });
    });

    it('should show stress test alerts metric on overview', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Stress Test Alerts')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should have refresh button', () => {
      renderDashboard();
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });

    it('should be clickable and not error when clicked', async () => {
      renderDashboard();

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      // Should not throw when clicked
      expect(() => fireEvent.click(refreshButton)).not.toThrow();
    });
  });

  describe('Tab Navigation', () => {
    it('should show all risk tabs', async () => {
      renderDashboard();

      // Wait for book auto-selection which makes tabs render
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: /VaR Analysis/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Stress Testing/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Risk Attribution/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Liquidity Risk/i })).toBeInTheDocument();
    });

    it('should have Overview tab active by default', async () => {
      renderDashboard();

      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /Overview/i });
        expect(overviewTab).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('Empty State', () => {
    it('should render the main layout with risk management header', () => {
      renderDashboard();
      expect(screen.getByText('Advanced Risk Management')).toBeInTheDocument();
    });
  });

  describe('Risk Metrics Overview', () => {
    it('should display key risk metrics', async () => {
      renderDashboard();

      // Wait for book auto-selection
      await waitFor(() => {
        expect(screen.getByText(/VaR \(95%\)/i)).toBeInTheDocument();
        expect(screen.getByText(/1-day loss at 95% confidence/i)).toBeInTheDocument();
      });
    });

    it('should show risk metrics in correct format', async () => {
      renderDashboard();

      await waitFor(() => {
        // VaR should be shown as percentage (0.0% when no backend data)
        expect(screen.getByText(/-0\.0%/)).toBeInTheDocument();
      });
    });
  });
});
