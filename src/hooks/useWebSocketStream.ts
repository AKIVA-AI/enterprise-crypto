import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface WebSocketMessage {
  type: string;
  channel: string;
  data: any;
  timestamp: string;
}

interface UseWebSocketStreamOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocketStream({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
}: UseWebSocketStreamOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!url) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to:', url);
        setIsConnected(true);
        setReconnectAttempts(0);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        onDisconnect?.();
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        onError?.(error);
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
    }
  }, [url, onConnect, onDisconnect, onError, onMessage, reconnectAttempts, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setReconnectAttempts(0);
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [url]);

  return {
    isConnected,
    lastMessage,
    reconnectAttempts,
    send,
    connect,
    disconnect,
  };
}

// Trading data stream hook
export function useTradingDataStream(backendUrl: string | null) {
  const queryClient = useQueryClient();
  const wsUrl = backendUrl ? `${backendUrl.replace('http', 'ws')}/ws/stream` : '';

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.channel) {
      case 'positions':
        queryClient.setQueryData(['positions'], (old: any) => {
          if (!old) return [message.data];
          const index = old.findIndex((p: any) => p.id === message.data.id);
          if (index >= 0) {
            const updated = [...old];
            updated[index] = message.data;
            return updated;
          }
          return [...old, message.data];
        });
        break;

      case 'orders':
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        if (message.data.status === 'filled') {
          toast.success(`Order filled: ${message.data.instrument} ${message.data.side}`);
        }
        break;

      case 'venue_health':
        queryClient.setQueryData(['venues'], (old: any) => {
          if (!old) return old;
          return old.map((v: any) => 
            v.id === message.data.venue_id 
              ? { ...v, status: message.data.status, latency_ms: message.data.latency_ms }
              : v
          );
        });
        
        if (message.data.status === 'offline') {
          toast.error(`🔴 ${message.data.name} is OFFLINE`);
        } else if (message.data.status === 'degraded') {
          toast.warning(`🟡 ${message.data.name} is DEGRADED`);
        }
        break;

      case 'alerts':
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
        const severity = message.data.severity;
        if (severity === 'critical') {
          toast.error(`🚨 ${message.data.title}`, { duration: 10000 });
        } else if (severity === 'warning') {
          toast.warning(message.data.title);
        }
        break;

      case 'strategy_signals':
        queryClient.invalidateQueries({ queryKey: ['strategy-signals'] });
        break;

      case 'trade_intents':
        queryClient.invalidateQueries({ queryKey: ['trade-intents'] });
        break;

      case 'engine_status':
        queryClient.setQueryData(['engine-status', backendUrl], message.data);
        break;

      default:
        console.log('[Stream] Unknown channel:', message.channel);
    }
  }, [queryClient, backendUrl]);

  const { isConnected, lastMessage, reconnectAttempts, send } = useWebSocketStream({
    url: wsUrl,
    onMessage: handleMessage,
    onConnect: () => {
      toast.success('Live data stream connected');
      // Subscribe to all channels
      send({ type: 'subscribe', channels: ['positions', 'orders', 'venue_health', 'alerts', 'engine_status'] });
    },
    onDisconnect: () => {
      if (wsUrl) {
        toast.warning('Live data stream disconnected');
      }
    },
  });

  return {
    isConnected,
    lastMessage,
    reconnectAttempts,
    subscribe: (channels: string[]) => send({ type: 'subscribe', channels }),
    unsubscribe: (channels: string[]) => send({ type: 'unsubscribe', channels }),
  };
}

// Price ticker stream
export function usePriceTickerStream(backendUrl: string | null, instruments: string[]) {
  const [prices, setPrices] = useState<Record<string, { bid: number; ask: number; last: number }>>({});
  
  const wsUrl = backendUrl ? `${backendUrl.replace('http', 'ws')}/ws/prices` : '';

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.channel === 'price_tick') {
      setPrices((prev) => ({
        ...prev,
        [message.data.instrument]: {
          bid: message.data.bid,
          ask: message.data.ask,
          last: message.data.last,
        },
      }));
    }
  }, []);

  const { isConnected, send } = useWebSocketStream({
    url: wsUrl,
    onMessage: handleMessage,
    onConnect: () => {
      if (instruments.length > 0) {
        send({ type: 'subscribe', instruments });
      }
    },
  });

  useEffect(() => {
    if (isConnected && instruments.length > 0) {
      send({ type: 'subscribe', instruments });
    }
  }, [instruments, isConnected, send]);

  return { prices, isConnected };
}
