import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supportedChains } from '@/lib/web3Config';

export function WalletButton() {
  const {
    address,
    shortenedAddress,
    isConnected,
    isConnecting,
    connectors,
    balance,
    currentChain,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  } = useWallet();

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  const openExplorer = () => {
    if (address && currentChain) {
      const explorerUrls: Record<number, string> = {
        1: 'https://etherscan.io',
        8453: 'https://basescan.org',
        42161: 'https://arbiscan.io',
        10: 'https://optimistic.etherscan.io',
        137: 'https://polygonscan.com',
      };
      const baseUrl = explorerUrls[currentChain.id] || 'https://etherscan.io';
      window.open(`${baseUrl}/address/${address}`, '_blank');
    }
  };

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="gap-2"
            disabled={isConnecting}
          >
            <Wallet className="h-4 w-4" />
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Select Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.id}
              onClick={() => connectWallet(connector.id)}
              className="gap-2 cursor-pointer"
            >
              <Wallet className="h-4 w-4" />
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="font-mono text-sm">{shortenedAddress}</span>
            {currentChain && (
              <Badge variant="secondary" className="text-xs">
                {currentChain.name}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="font-mono text-sm">{shortenedAddress}</span>
          {balance && (
            <span className="text-xs text-muted-foreground font-mono">{balance}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Network</DropdownMenuLabel>
        {supportedChains.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => switchNetwork(chain.id)}
            className={cn(
              "gap-2 cursor-pointer",
              currentChain?.id === chain.id && "bg-muted"
            )}
          >
            <span className={cn(
              "h-2 w-2 rounded-full",
              currentChain?.id === chain.id ? "bg-success" : "bg-muted-foreground"
            )} />
            {chain.name}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={copyAddress} className="gap-2 cursor-pointer">
          <Copy className="h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={openExplorer} className="gap-2 cursor-pointer">
          <ExternalLink className="h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={disconnectWallet} 
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
