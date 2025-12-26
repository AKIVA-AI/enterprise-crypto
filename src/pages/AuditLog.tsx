import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Clock, 
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  BookOpen,
  Zap,
  DollarSign,
  Power,
  CalendarIcon,
  X,
  Wifi,
} from 'lucide-react';
import { format, formatDistanceToNow, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

type AuditEvent = {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  user_id: string | null;
  user_email: string | null;
  book_id: string | null;
  severity: 'info' | 'warning' | 'critical';
  before_state: any;
  after_state: any;
  ip_address: string | null;
  created_at: string;
};

const actionIcons: Record<string, any> = {
  'book.freeze': Power,
  'book.unfreeze': Power,
  'capital.reallocate': DollarSign,
  'strategy.toggle': Zap,
  'kill_switch.activate': AlertTriangle,
  'kill_switch.deactivate': AlertTriangle,
  'meme.approve': BookOpen,
  'meme.reject': BookOpen,
  default: History,
};

const severityStyles = {
  info: 'bg-primary/10 text-primary border-primary/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function AuditLog() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isLive, setIsLive] = useState(true);

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-events', severityFilter, resourceFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter as 'info' | 'warning' | 'critical');
      }

      if (resourceFilter !== 'all') {
        query = query.eq('resource_type', resourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditEvent[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel('audit-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_events' },
        (payload) => {
          toast.info('New audit event', {
            description: (payload.new as AuditEvent).action,
          });
          queryClient.invalidateQueries({ queryKey: ['audit-events'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive, queryClient]);

  // Get unique resource types
  const resourceTypes = [...new Set(events.map(e => e.resource_type))];

  // Filter events
  const filteredEvents = events.filter(event => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        event.action.toLowerCase().includes(searchLower) ||
        event.resource_type.toLowerCase().includes(searchLower) ||
        event.user_email?.toLowerCase().includes(searchLower) ||
        event.resource_id?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Date range filter
    if (dateRange?.from) {
      const eventDate = new Date(event.created_at);
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      if (!isWithinInterval(eventDate, { start: from, end: to })) return false;
    }

    return true;
  });

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Action', 'Resource', 'User', 'Severity', 'IP Address'].join(','),
      ...filteredEvents.map(e => [
        e.created_at,
        e.action,
        `${e.resource_type}:${e.resource_id || 'N/A'}`,
        e.user_email || 'System',
        e.severity,
        e.ip_address || 'N/A',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const clearDateFilter = () => setDateRange(undefined);

  // Render JSON diff with syntax highlighting
  const renderJsonDiff = (before: any, after: any) => {
    const beforeStr = before ? JSON.stringify(before, null, 2) : null;
    const afterStr = after ? JSON.stringify(after, null, 2) : null;

    return (
      <div className="grid grid-cols-2 gap-4 mt-3">
        {beforeStr && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-destructive">Before</p>
            <pre className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs font-mono overflow-x-auto max-h-[200px]">
              {beforeStr}
            </pre>
          </div>
        )}
        {afterStr && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-success">After</p>
            <pre className="p-3 rounded-lg bg-success/5 border border-success/20 text-xs font-mono overflow-x-auto max-h-[200px]">
              {afterStr}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-7 w-7 text-primary" />
              Audit Log
            </h1>
            <p className="text-muted-foreground">Review privileged actions and system changes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isLive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className={cn('gap-2', isLive && 'bg-success hover:bg-success/90')}
            >
              <Wifi className={cn('h-4 w-4', isLive && 'animate-pulse')} />
              {isLive ? 'Live' : 'Paused'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(
                    'w-[240px] justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, yyyy')
                      )
                    ) : (
                      'Date range'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border shadow-lg" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {dateRange && (
                <Button variant="ghost" size="icon" onClick={clearDateFilter}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg">
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg">
                  <SelectItem value="all">All Resources</SelectItem>
                  {resourceTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-mono font-bold">{filteredEvents.length}</p>
                <p className="text-xs text-muted-foreground">Filtered Events</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-mono font-bold">
                  {filteredEvents.filter(e => e.severity === 'critical').length}
                </p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Shield className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-mono font-bold">
                  {filteredEvents.filter(e => e.severity === 'warning').length}
                </p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-mono font-bold">
                  {new Set(filteredEvents.map(e => e.user_id).filter(Boolean)).size}
                </p>
                <p className="text-xs text-muted-foreground">Unique Users</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              Recent Events
              {isLive && (
                <Badge variant="outline" className="gap-1 border-success/50 text-success">
                  <Wifi className="h-3 w-3 animate-pulse" />
                  Live updates
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading events...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No audit events found</p>
                {dateRange && (
                  <p className="text-sm mt-1">Try adjusting your date range filter</p>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-border">
                  {filteredEvents.map((event) => {
                    const IconComponent = actionIcons[event.action] || actionIcons.default;
                    const isExpanded = expandedEvents.has(event.id);
                    const hasStateChanges = event.before_state || event.after_state;
                    
                    return (
                      <Collapsible
                        key={event.id}
                        open={isExpanded}
                        onOpenChange={() => hasStateChanges && toggleExpanded(event.id)}
                      >
                        <div className="p-4 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={cn(
                              "p-2 rounded-lg border",
                              severityStyles[event.severity]
                            )}>
                              <IconComponent className="h-4 w-4" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{event.action}</span>
                                <Badge variant="outline" className="text-xs">
                                  {event.resource_type}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", severityStyles[event.severity])}
                                >
                                  {event.severity}
                                </Badge>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                {event.user_email && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {event.user_email}
                                  </span>
                                )}
                                {event.resource_id && (
                                  <span className="font-mono text-xs">
                                    ID: {event.resource_id.slice(0, 8)}...
                                  </span>
                                )}
                                {event.ip_address && (
                                  <span className="font-mono text-xs">
                                    IP: {event.ip_address}
                                  </span>
                                )}
                              </div>

                              {/* Expandable State Changes */}
                              <CollapsibleContent>
                                {hasStateChanges && renderJsonDiff(event.before_state, event.after_state)}
                              </CollapsibleContent>
                            </div>

                            {/* Expand button & Timestamp */}
                            <div className="flex items-start gap-3 flex-shrink-0">
                              {hasStateChanges && (
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              )}
                              <div className="text-right text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                                </div>
                                <div className="text-xs font-mono mt-1">
                                  {format(new Date(event.created_at), 'MMM d, HH:mm')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
