import { createConfig, http } from 'wagmi';
import { mainnet, base, arbitrum, optimism, polygon } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// WalletConnect Project ID - this is a publishable key
const projectId = 'c4f79cc821944d9680842e34466bfb';

export const wagmiConfig = createConfig({
  chains: [mainnet, base, arbitrum, optimism, polygon],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'Trading Platform' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
  },
});

export const supportedChains = [
  { id: mainnet.id, name: 'Ethereum', symbol: 'ETH' },
  { id: base.id, name: 'Base', symbol: 'ETH' },
  { id: arbitrum.id, name: 'Arbitrum', symbol: 'ETH' },
  { id: optimism.id, name: 'Optimism', symbol: 'ETH' },
  { id: polygon.id, name: 'Polygon', symbol: 'MATIC' },
];
