/**
 * Hook for Arbitrage Engine
 * 
 * Provides access to the multi-strategy arbitrage engine:
 * - Engine status and control
 * - Real-time opportunities
 * - Funding rates
 * - Performance metrics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { arbitrageApi, ArbitrageOpportunity, FundingRate } from '@/lib/apiClient';

export function useArbitrageStatus() {
  return useQuery({
    queryKey: ['arbitrage-status'],
    queryFn: async () => {
      const response = await arbitrageApi.getStatus();
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useArbitrageOpportunities() {
  return useQuery({
    queryKey: ['arbitrage-opportunities'],
    queryFn: async () => {
      const response = await arbitrageApi.getOpportunities();
      if (response.error) throw new Error(response.error);
      return response.data || [];
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

export function useFundingRates() {
  return useQuery({
    queryKey: ['funding-rates'],
    queryFn: async () => {
      const response = await arbitrageApi.getFundingRates();
      if (response.error) throw new Error(response.error);
      return response.data || [];
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000,
  });
}

export function useArbitrageControl() {
  const queryClient = useQueryClient();
  
  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await arbitrageApi.start();
      if (response.error) throw new Error(response.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arbitrage-status'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const response = await arbitrageApi.stop();
      if (response.error) throw new Error(response.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arbitrage-status'] });
    },
  });

  return {
    start: startMutation.mutate,
    stop: stopMutation.mutate,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}

// Arbitrage strategy information
export const ARBITRAGE_STRATEGIES = [
  {
    id: 'funding_rate',
    name: 'Funding Rate Arbitrage',
    description: 'Capture funding rate differentials between perpetual futures',
    expectedReturn: '8-15% annual',
    risk: 'LOW',
    minCapital: 10000,
  },
  {
    id: 'cross_exchange',
    name: 'Cross-Exchange Arbitrage',
    description: 'Exploit price discrepancies across different exchanges',
    expectedReturn: '5-12% annual',
    risk: 'LOW',
    minCapital: 25000,
  },
  {
    id: 'statistical',
    name: 'Statistical Arbitrage',
    description: 'Pairs trading based on statistical relationships',
    expectedReturn: '10-20% annual',
    risk: 'MEDIUM',
    minCapital: 50000,
  },
  {
    id: 'triangular',
    name: 'Triangular Arbitrage',
    description: 'Exploit pricing inefficiencies in currency triangles',
    expectedReturn: '3-8% annual',
    risk: 'LOW',
    minCapital: 100000,
  },
];

