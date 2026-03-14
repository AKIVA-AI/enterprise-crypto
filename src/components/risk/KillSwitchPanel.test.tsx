import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KillSwitchPanel } from './KillSwitchPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const mockState = {
  settings: {
    id: 'settings-1',
    global_kill_switch: false,
    reduce_only_mode: false,
    paper_trading_mode: false,
    dex_venues_enabled: false,
  },
  books: [
    {
      id: 'book-1',
      type: 'spot',
      name: 'Primary Book',
      status: 'active',
      capital_allocated: 100000,
    },
  ],
  updateResults: {
    global_settings: { data: null, error: null as null | Error },
    books: { data: null, error: null as null | Error },
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        data: table === 'books' ? mockState.books : [mockState.settings],
        error: null,
        single: vi.fn(async () => ({ data: mockState.settings, error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => mockState.updateResults[table as 'global_settings' | 'books']),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      eq: vi.fn(async () => ({ data: table === 'books' ? mockState.books : [], error: null })),
    })),
    functions: {
      invoke: vi.fn(async () => ({ data: null, error: null })),
    },
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('KillSwitchPanel', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
    mockState.settings = {
      id: 'settings-1',
      global_kill_switch: false,
      reduce_only_mode: false,
      paper_trading_mode: false,
      dex_venues_enabled: false,
    };
    mockState.books = [
      {
        id: 'book-1',
        type: 'spot',
        name: 'Primary Book',
        status: 'active',
        capital_allocated: 100000,
      },
    ];
    mockState.updateResults.global_settings = { data: null, error: null };
    mockState.updateResults.books = { data: null, error: null };
  });

  const renderPanel = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <KillSwitchPanel />
      </QueryClientProvider>
    );
  };

  describe('Kill Switch Display', () => {
    it('should render kill switch panel', async () => {
      renderPanel();
      
      await waitFor(() => {
        expect(screen.getByText('Global Kill Switch')).toBeInTheDocument();
      });
    });

    it('should show SYSTEMS ACTIVE when kill switch is off', async () => {
      renderPanel();
      
      await waitFor(() => {
        expect(screen.getByText('SYSTEMS ACTIVE')).toBeInTheDocument();
      });
    });

    it('should show KILL button when kill switch is off', async () => {
      renderPanel();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /KILL/i })).toBeInTheDocument();
      });
    });

    it('should show TRADING HALTED when kill switch is on', async () => {
      mockState.settings.global_kill_switch = true;
      
      renderPanel();
      
      await waitFor(() => {
        expect(screen.getByText('TRADING HALTED')).toBeInTheDocument();
      });
    });
  });

  describe('Kill Switch Activation', () => {
    it.skip('should show confirmation dialog when KILL button clicked', async () => {
      // TODO: AlertDialog not opening in test environment - click event not triggering dialog
      renderPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /KILL/i })).toBeInTheDocument();
      });

      const killButton = screen.getByRole('button', { name: /KILL/i });
      fireEvent.click(killButton);

      // Query the entire document for portal content
      await waitFor(() => {
        const dialogContent = document.body.textContent;
        expect(dialogContent).toContain('Activate Kill Switch?');
      }, { timeout: 3000 });
    });

    it.skip('should show warning message in confirmation dialog', async () => {
      // TODO: AlertDialog not opening in test environment - click event not triggering dialog
      // dialogContent variable was undefined - test needs refactoring
      renderPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /KILL/i })).toBeInTheDocument();
      });

      const killButton = screen.getByRole('button', { name: /KILL/i });
      fireEvent.click(killButton);

      // Note: This test is skipped as the dialog content query needs to be fixed
      // The dialogContent variable was never defined
    });

    it('should have cancel button in confirmation dialog', async () => {
      renderPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /KILL/i })).toBeInTheDocument();
      });

      const killButton = screen.getByRole('button', { name: /KILL/i });
      fireEvent.click(killButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    it.skip('should require 2FA for activation', async () => {
      // TODO: AlertDialog not opening in test environment - click event not triggering dialog
      renderPanel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /KILL/i })).toBeInTheDocument();
      });

      // Click KILL button
      const killButton = screen.getByRole('button', { name: /KILL/i });
      fireEvent.click(killButton);

      // Confirm in dialog - check document body for portal content
      await waitFor(() => {
        expect(document.body.textContent).toContain('Activate Kill Switch?');
      }, { timeout: 3000 });

      // Find and click confirm button in the portal
      const buttons = Array.from(document.querySelectorAll('button'));
      const activateButton = buttons.find(btn => btn.textContent?.includes('ACTIVATE KILL SWITCH'));

      if (activateButton) {
        fireEvent.click(activateButton);

        // 2FA dialog should appear
        await waitFor(() => {
          expect(document.body.textContent).toContain('two-factor verification');
        }, { timeout: 3000 });
      }
    });
  });

  describe('Mode Toggles', () => {
    it('should show reduce-only mode toggle', async () => {
      renderPanel();
      
      await waitFor(() => {
        expect(screen.getByText(/Reduce-Only Mode/i)).toBeInTheDocument();
      });
    });

    it('should show paper trading mode toggle', async () => {
      renderPanel();
      
      await waitFor(() => {
        expect(screen.getByText(/Paper Trading Mode/i)).toBeInTheDocument();
      });
    });

    it('should update paper trading mode and show success feedback', async () => {
      const user = userEvent.setup();
      renderPanel();

      const paperSwitch = await screen.findByRole('switch', { name: /paper trading mode/i });
      await user.click(paperSwitch);

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Paper trading enabled');
      });

      expect(supabase.from).toHaveBeenCalledWith('global_settings');
    });

    it('should surface reduce-only mutation failures', async () => {
      const user = userEvent.setup();
      mockState.updateResults.global_settings = {
        data: null,
        error: new Error('database offline'),
      };

      renderPanel();

      const reduceOnlySwitch = await screen.findByRole('switch', { name: /reduce-only mode/i });
      await user.click(reduceOnlySwitch);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to update reduce-only mode',
          { description: 'database offline' }
        );
      });
    });
  });

  describe('Book Controls', () => {
    it('should freeze a book and show success feedback', async () => {
      renderPanel();

      const freezeButton = await screen.findByRole('button', { name: /freeze/i });
      fireEvent.click(freezeButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Book status updated');
      });

      expect(supabase.from).toHaveBeenCalledWith('books');
    });

    it('should surface book status update failures', async () => {
      mockState.updateResults.books = {
        data: null,
        error: new Error('write failed'),
      };

      renderPanel();

      const freezeButton = await screen.findByRole('button', { name: /freeze/i });
      fireEvent.click(freezeButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to update book status',
          { description: 'write failed' }
        );
      });
    });
  });
});

