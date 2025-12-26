import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PositionManagementPanel } from '@/components/positions/PositionManagementPanel';
import { useOrders } from '@/hooks/useOrders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crosshair, AlertOctagon, XCircle, RefreshCw, TrendingUp, TrendingDown, Activity, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function Execution() {
  const { data: orders = [] } = useOrders();
  const [killSwitchActive, setKillSwitchActive] = useState(false);

  const pendingOrders = orders.filter(o => o.status === 'open');

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crosshair className="h-7 w-7 text-primary" />
              Execution Console
            </h1>
            <p className="text-muted-foreground">Real-time positions, orders, and execution controls</p>
          </div>
          <Button
            variant={killSwitchActive ? 'default' : 'destructive'}
            className={cn('gap-2', killSwitchActive && 'bg-success hover:bg-success/90')}
            onClick={() => setKillSwitchActive(!killSwitchActive)}
          >
            <AlertOctagon className="h-4 w-4" />
            {killSwitchActive ? 'Resume Trading' : 'Kill Switch'}
          </Button>
        </div>

        {killSwitchActive && (
          <div className="glass-panel rounded-xl p-4 border-warning/50 bg-warning/10">
            <div className="flex items-center gap-3">
              <AlertOctagon className="h-6 w-6 text-warning" />
              <div>
                <p className="font-semibold text-warning">Kill Switch Active</p>
                <p className="text-sm text-muted-foreground">All trading operations suspended. New orders blocked.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs for Positions and Orders */}
        <Tabs defaultValue="positions" className="space-y-4">
          <TabsList className="glass-panel">
            <TabsTrigger value="positions" className="gap-2">
              <Activity className="h-4 w-4" />
              Positions
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Orders ({pendingOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positions">
            <PositionManagementPanel />
          </TabsContent>

          <TabsContent value="orders">
            {/* Orders table */}
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Orders</h3>
                <Badge variant="outline">{orders.length} total</Badge>
              </div>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No orders</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full data-grid">
                    <thead>
                      <tr className="text-muted-foreground text-left">
                        <th className="pb-3 font-medium">Instrument</th>
                        <th className="pb-3 font-medium">Side</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Size</th>
                        <th className="pb-3 font-medium text-right">Price</th>
                        <th className="pb-3 font-medium text-right">Filled</th>
                        <th className="pb-3 font-medium text-right">Age</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-t border-border/50 hover:bg-muted/30">
                          <td className="py-3 font-medium">{order.instrument}</td>
                          <td className="py-3">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              order.side === 'buy' ? 'bg-trading-long/20 text-trading-long' : 'bg-trading-short/20 text-trading-short'
                            )}>
                              {order.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3">
                            <Badge variant={
                              order.status === 'filled' ? 'success' : 
                              order.status === 'open' ? 'warning' : 
                              'destructive'
                            }>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right font-mono">{Number(order.size).toLocaleString()}</td>
                          <td className="py-3 text-right font-mono">${order.price ? Number(order.price).toLocaleString() : 'Market'}</td>
                          <td className="py-3 text-right font-mono">{Number(order.filled_size)}/{Number(order.size)}</td>
                          <td className="py-3 text-right text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: false })}
                          </td>
                          <td className="py-3 text-right">
                            {order.status === 'open' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-trading-short hover:text-trading-short">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
