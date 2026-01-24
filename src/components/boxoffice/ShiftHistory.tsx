import { useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { 
  History, Clock, DollarSign, CreditCard, TrendingUp, User, 
  Calendar, ChevronDown, ChevronUp, Ticket, ShoppingBag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface ShiftHistoryProps {
  organizationId: string;
}

interface ShiftRecord {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_difference: number | null;
  total_cash_sales: number | null;
  total_card_sales: number | null;
  total_transactions: number | null;
  notes: string | null;
  profile?: {
    full_name: string;
    email: string;
  };
  // Computed metrics
  ticketsSold?: number;
  concessionsSold?: number;
  avgTransactionValue?: number;
}

export function ShiftHistory({ organizationId }: ShiftHistoryProps) {
  const [dateRange, setDateRange] = useState('7days');
  const [expandedShift, setExpandedShift] = useState<string | null>(null);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case '7days':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case '30days':
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case '90days':
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      default:
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
    }
  };

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shift-history', organizationId, dateRange],
    queryFn: async () => {
      const dateFilter = getDateFilter();
      
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('started_at', dateFilter)
        .order('started_at', { ascending: false });

      if (shiftsError) throw shiftsError;

      // Fetch profiles for each shift
      const userIds = [...new Set(shiftsData.map(s => s.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch shift performance metrics (tickets and concessions sold per shift)
      const shiftIds = shiftsData.map(s => s.id);
      
      // Get bookings linked to each shift
      const { data: shiftBookings } = await supabase
        .from('bookings')
        .select('id, shift_id, total_amount')
        .in('shift_id', shiftIds)
        .in('status', ['confirmed', 'paid', 'completed']);
      
      // Get tickets (booked seats) for those bookings
      const bookingIds = shiftBookings?.map(b => b.id) || [];
      const { data: bookedSeats } = await supabase
        .from('booked_seats')
        .select('booking_id')
        .in('booking_id', bookingIds);
      
      // Get concessions for those bookings
      const { data: concessions } = await supabase
        .from('booking_concessions')
        .select('booking_id, quantity')
        .in('booking_id', bookingIds);
      
      // Build metrics map per shift
      const shiftMetrics = new Map<string, { tickets: number; concessions: number }>();
      
      shiftIds.forEach(shiftId => {
        const shiftBookingIds = shiftBookings?.filter(b => b.shift_id === shiftId).map(b => b.id) || [];
        const ticketCount = bookedSeats?.filter(s => shiftBookingIds.includes(s.booking_id)).length || 0;
        const concessionCount = concessions?.filter(c => shiftBookingIds.includes(c.booking_id))
          .reduce((sum, c) => sum + c.quantity, 0) || 0;
        
        shiftMetrics.set(shiftId, { tickets: ticketCount, concessions: concessionCount });
      });

      return shiftsData.map(shift => {
        const totalSales = (shift.total_cash_sales || 0) + (shift.total_card_sales || 0);
        const transactions = shift.total_transactions || 0;
        const metrics = shiftMetrics.get(shift.id);
        
        return {
          ...shift,
          profile: profileMap.get(shift.user_id),
          ticketsSold: metrics?.tickets || 0,
          concessionsSold: metrics?.concessions || 0,
          avgTransactionValue: transactions > 0 ? totalSales / transactions : 0,
        };
      }) as ShiftRecord[];
    },
    enabled: !!organizationId,
  });

  // Calculate summary stats
  const stats = shifts?.reduce((acc, shift) => {
    if (shift.status === 'closed') {
      acc.totalShifts++;
      acc.totalCashSales += shift.total_cash_sales || 0;
      acc.totalCardSales += shift.total_card_sales || 0;
      acc.totalTransactions += shift.total_transactions || 0;
      acc.totalDifference += shift.cash_difference || 0;
      acc.totalTickets += shift.ticketsSold || 0;
      acc.totalConcessions += shift.concessionsSold || 0;
    }
    return acc;
  }, {
    totalShifts: 0,
    totalCashSales: 0,
    totalCardSales: 0,
    totalTransactions: 0,
    totalDifference: 0,
    totalTickets: 0,
    totalConcessions: 0,
  }) || { totalShifts: 0, totalCashSales: 0, totalCardSales: 0, totalTransactions: 0, totalDifference: 0, totalTickets: 0, totalConcessions: 0 };

  const avgTransactionValue = stats.totalTransactions > 0 
    ? (stats.totalCashSales + stats.totalCardSales) / stats.totalTransactions 
    : 0;

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'In progress';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Shift History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Total Shifts
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalShifts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Cash Sales
            </div>
            <p className="text-2xl font-bold mt-1">${stats.totalCashSales.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CreditCard className="h-4 w-4" />
              Card Sales
            </div>
            <p className="text-2xl font-bold mt-1">${stats.totalCardSales.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Avg Transaction
            </div>
            <p className="text-2xl font-bold mt-1">${avgTransactionValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Ticket className="h-4 w-4" />
              Tickets Sold
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalTickets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ShoppingBag className="h-4 w-4" />
              Concessions Sold
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalConcessions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Variance Card */}
      <Card className="max-w-xs">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <DollarSign className="h-4 w-4" />
            Cash Variance
          </div>
          <p className={`text-2xl font-bold mt-1 ${
            stats.totalDifference > 0 ? 'text-primary' : 
            stats.totalDifference < 0 ? 'text-destructive' : ''
          }`}>
            ${stats.totalDifference.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Shift History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Shift History
            </CardTitle>
            <CardDescription>View past shifts and performance</CardDescription>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!shifts || shifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shifts found for the selected period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shifts.map((shift) => (
                <Collapsible
                  key={shift.id}
                  open={expandedShift === shift.id}
                  onOpenChange={(open) => setExpandedShift(open ? shift.id : null)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {shift.profile?.full_name || 'Unknown'}
                            </span>
                          </div>
                          <Badge variant={shift.status === 'active' ? 'default' : 'secondary'}>
                            {shift.status === 'active' ? 'Active' : 'Closed'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(shift.started_at), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(shift.started_at), 'h:mm a')}
                          </span>
                          <span className="font-medium text-foreground">
                            ${((shift.total_cash_sales || 0) + (shift.total_card_sales || 0)).toFixed(2)}
                          </span>
                          {expandedShift === shift.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 pt-0 border-t bg-muted/30">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Duration</p>
                            <p className="font-medium">{formatDuration(shift.started_at, shift.ended_at)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Opening Cash</p>
                            <p className="font-medium">${shift.opening_cash.toFixed(2)}</p>
                          </div>
                          {shift.status === 'closed' && (
                            <>
                              <div>
                                <p className="text-sm text-muted-foreground">Closing Cash</p>
                                <p className="font-medium">${(shift.closing_cash || 0).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Cash Variance</p>
                                <p className={`font-medium ${
                                  (shift.cash_difference || 0) > 0 ? 'text-green-600' : 
                                  (shift.cash_difference || 0) < 0 ? 'text-destructive' : ''
                                }`}>
                                  ${(shift.cash_difference || 0).toFixed(2)}
                                </p>
                              </div>
                            </>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground">Cash Sales</p>
                            <p className="font-medium">${(shift.total_cash_sales || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Card Sales</p>
                            <p className="font-medium">${(shift.total_card_sales || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Transactions</p>
                            <p className="font-medium">{shift.total_transactions || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Transaction</p>
                            <p className="font-medium">${(shift.avgTransactionValue || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Tickets Sold</p>
                            <p className="font-medium">{shift.ticketsSold || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Concessions Sold</p>
                            <p className="font-medium">{shift.concessionsSold || 0}</p>
                          </div>
                          {shift.notes && (
                            <div className="md:col-span-2 lg:col-span-4">
                              <p className="text-sm text-muted-foreground">Notes</p>
                              <p className="font-medium">{shift.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
