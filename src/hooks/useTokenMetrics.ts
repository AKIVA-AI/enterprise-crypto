import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TokenMetrics {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  holderCount: number;
  topHolders: Array<{
    address: string;
    balance: string;
    percentage: number;
  }>;
  holderConcentration: number;
  liquidityUSD: number;
  volume24h: number;
  priceUSD: number;
  priceChange24h: number;
  marketCap: number;
  chain: string;
}

export function useTokenMetrics(tokenAddress: string, chain: string = 'ethereum') {
  return useQuery({
    queryKey: ['token-metrics', tokenAddress, chain],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('token-metrics', {
        body: { action: 'single', tokenAddress, chain }
      });
      
      if (error) throw error;
      return data as TokenMetrics;
    },
    enabled: !!tokenAddress,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useWatchlistTokens(chain: string = 'ethereum') {
  return useQuery({
    queryKey: ['token-watchlist', chain],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('token-metrics', {
        body: { action: 'watchlist', chain }
      });
      
      if (error) throw error;
      return data as TokenMetrics[];
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useBatchTokenMetrics(addresses: string[], chain: string = 'ethereum') {
  return useQuery({
    queryKey: ['token-batch', addresses, chain],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('token-metrics', {
        body: { action: 'batch', tokenAddresses: addresses, chain }
      });
      
      if (error) throw error;
      return data as TokenMetrics[];
    },
    enabled: addresses.length > 0,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tokenAddress, chain }: { tokenAddress: string; chain: string }) => {
      // In production, save to database
      const { data, error } = await supabase.functions.invoke('token-metrics', {
        body: { action: 'single', tokenAddress, chain }
      });
      
      if (error) throw error;
      return data as TokenMetrics;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-watchlist'] });
    },
  });
}
