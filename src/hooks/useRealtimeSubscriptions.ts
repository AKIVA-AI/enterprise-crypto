import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseRealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  invalidateQueries?: string[];
}

export function useRealtimeSubscription({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  invalidateQueries = [],
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channelName = `realtime-${table}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on<Record<string, any>>(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
        },
        (payload: any) => {
          console.log(`[Realtime] ${table}:`, payload.eventType, payload);

          // Invalidate queries
          invalidateQueries.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });

          // Call specific handlers
          if (payload.eventType === 'INSERT') {
            onInsert?.(payload);
          } else if (payload.eventType === 'UPDATE') {
            onUpdate?.(payload);
          } else if (payload.eventType === 'DELETE') {
            onDelete?.(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} subscription:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, queryClient]);
}

// Venue Health Realtime
export function useVenueHealthRealtime() {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    table: 'venue_health',
    invalidateQueries: ['venues', 'venue-health'],
    onInsert: (payload) => {
      const status = payload.new?.status;
      if (status === 'down' || status === 'degraded') {
        toast.warning(`Venue health alert: ${status.toUpperCase()}`);
      }
    },
  });

  useRealtimeSubscription({
    table: 'venues',
    invalidateQueries: ['venues'],
    onUpdate: (payload) => {
      if (payload.new?.status !== payload.old?.status) {
        const name = payload.new?.name || 'Unknown venue';
        const status = payload.new?.status;
        if (status === 'down') {
          toast.error(`🔴 ${name} is DOWN`);
        } else if (status === 'degraded') {
          toast.warning(`🟡 ${name} is DEGRADED`);
        } else if (status === 'healthy' && payload.old?.status !== 'healthy') {
          toast.success(`🟢 ${name} is back HEALTHY`);
        }
      }
    },
  });
}

// Alerts Realtime
export function useAlertsRealtime() {
  useRealtimeSubscription({
    table: 'alerts',
    event: 'INSERT',
    invalidateQueries: ['alerts', 'unread-alerts'],
    onInsert: (payload) => {
      const alert = payload.new;
      const severity = alert?.severity || 'info';
      const title = alert?.title || 'New Alert';
      
      switch (severity) {
        case 'critical':
          toast.error(`🚨 ${title}`, { duration: 10000 });
          break;
        case 'warning':
          toast.warning(title, { duration: 5000 });
          break;
        default:
          toast.info(title);
      }
    },
  });
}

// Positions Realtime
export function usePositionsRealtime() {
  useRealtimeSubscription({
    table: 'positions',
    invalidateQueries: ['positions', 'dashboard-metrics'],
  });
}

// Orders Realtime
export function useOrdersRealtime() {
  useRealtimeSubscription({
    table: 'orders',
    invalidateQueries: ['orders', 'pending-orders'],
    onInsert: (payload) => {
      const order = payload.new;
      if (order?.status === 'filled') {
        toast.success(`Order filled: ${order.instrument} ${order.side}`);
      }
    },
    onUpdate: (payload) => {
      const order = payload.new;
      const oldOrder = payload.old;
      if (order?.status === 'filled' && oldOrder?.status !== 'filled') {
        toast.success(`Order filled: ${order.instrument}`);
      } else if (order?.status === 'rejected') {
        toast.error(`Order rejected: ${order.instrument}`);
      }
    },
  });
}

// Meme Metrics Realtime
export function useMemeMetricsRealtime() {
  useRealtimeSubscription({
    table: 'meme_metrics',
    invalidateQueries: ['meme-metrics', 'meme-projects'],
    onInsert: (payload) => {
      const metrics = payload.new;
      if (metrics?.liquidity_health < 30) {
        toast.error(`⚠️ Critical liquidity on meme project`);
      }
    },
  });
}

// Books Realtime
export function useBooksRealtime() {
  useRealtimeSubscription({
    table: 'books',
    invalidateQueries: ['books', 'dashboard-metrics'],
    onUpdate: (payload) => {
      const book = payload.new;
      const oldBook = payload.old;
      if (book?.status === 'halted' && oldBook?.status !== 'halted') {
        toast.error(`📕 Book "${book.name}" HALTED`);
      } else if (book?.status === 'active' && oldBook?.status === 'halted') {
        toast.success(`📗 Book "${book.name}" resumed`);
      }
    },
  });
}

// Strategies Realtime
export function useStrategiesRealtime() {
  useRealtimeSubscription({
    table: 'strategies',
    invalidateQueries: ['strategies', 'active-strategies'],
    onUpdate: (payload) => {
      const strategy = payload.new;
      const oldStrategy = payload.old;
      if (strategy?.status !== oldStrategy?.status) {
        const statusEmoji = strategy.status === 'live' ? '🟢' : strategy.status === 'paper' ? '🟡' : '⚫';
        toast.info(`${statusEmoji} Strategy "${strategy.name}" → ${strategy.status.toUpperCase()}`);
      }
    },
  });
}

// Combined hook for dashboard
export function useDashboardRealtime() {
  useVenueHealthRealtime();
  useAlertsRealtime();
  usePositionsRealtime();
  useOrdersRealtime();
  useBooksRealtime();
  useStrategiesRealtime();
}
