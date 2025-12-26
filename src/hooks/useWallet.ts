import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { useCallback } from 'react';
import { formatEther, parseEther } from 'viem';
import { toast } from 'sonner';
import { supportedChains } from '@/lib/web3Config';

export function useWallet() {
  const { address, isConnected, isConnecting, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const { data: balance } = useBalance({
    address: address,
  });

  const connectWallet = useCallback(async (connectorId?: string) => {
    try {
      const selectedConnector = connectorId 
        ? connectors.find(c => c.id === connectorId) 
        : connectors[0];
      
      if (selectedConnector) {
        connect({ connector: selectedConnector });
      }
    } catch (error) {
      toast.error('Failed to connect wallet');
      console.error('Wallet connection error:', error);
    }
  }, [connect, connectors]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    toast.success('Wallet disconnected');
  }, [disconnect]);

  const switchNetwork = useCallback((targetChainId: number) => {
    try {
      switchChain({ chainId: targetChainId });
    } catch (error) {
      toast.error('Failed to switch network');
      console.error('Network switch error:', error);
    }
  }, [switchChain]);

  const currentChain = supportedChains.find(c => c.id === chainId);

  const formattedBalance = balance 
    ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ${balance.symbol}`
    : null;

  const shortenedAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return {
    address,
    shortenedAddress,
    isConnected,
    isConnecting: isConnecting || isPending,
    connector,
    connectors,
    balance: formattedBalance,
    rawBalance: balance?.value,
    chainId,
    currentChain,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    formatEther,
    parseEther,
  };
}
