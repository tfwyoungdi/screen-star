import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface CashierReconciliationTabProps {
  organizationId: string;
  currency?: string | null;
  dateRange: string;
}

interface ShiftWithProfile {
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
  actualSales: number;
  actualTransactions: number;
}

type SortField = 'date' | 'cashier' | 'variance' | 'sales';
type SortDirection = 'asc' | 'desc';
type VarianceFilter = 'all' | 'balanced' | 'over' | 'short';

export function CashierReconciliationTab({ organizationId, currency, dateRange }: CashierReconciliationTabProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [varianceFilter, setVarianceFilter] = useState<VarianceFilter>('all');

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (dateRange === 'today') {
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    } else if (dateRange === 'yesterday') {
      const yesterday = subDays(now, 1);
      return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) };
    } else {
      const days = parseInt(dateRange);
      return { startDate: startOfDay(subDays(now, days)), endDate: endOfDay(now) };
    }
  }, [dateRange]);

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['cashier-reconciliation', organizationId, dateRange],
    queryFn: async () => {
      // Fetch closed shifts within date range
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'closed')
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString())
        .order('started_at', { ascending: false });

      if (shiftsError) throw shiftsError;

      // Fetch profiles
      const userIds = [...new Set(shiftsData.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch actual sales from bookings for each shift
      const shiftIds = shiftsData.map(s => s.id);
      const { data: shiftBookings } = await supabase
        .from('bookings')
        .select('id, shift_id, total_amount, status')
        .in('shift_id', shiftIds)
        .in('status', ['confirmed', 'paid', 'completed', 'activated']);

      // Build metrics map
      const shiftMetrics = new Map<string, { totalSales: number; transactions: number }>();
      shiftIds.forEach(shiftId => {
        const bookings = shiftBookings?.filter(b => b.shift_id === shiftId) || [];
        shiftMetrics.set(shiftId, {
          totalSales: bookings.reduce((sum, b) => sum + Number(b.total_amount), 0),
          transactions: bookings.length,
        });
      });

      return shiftsData.map(shift => {
        const metrics = shiftMetrics.get(shift.id);
        return {
          ...shift,
          profile: profileMap.get(shift.user_id),
          actualSales: metrics?.totalSales || 0,
          actualTransactions: metrics?.transactions || 0,
        };
      }) as ShiftWithProfile[];
    },
    enabled: !!organizationId,
  });

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!shifts) return { totalShifts: 0, balancedShifts: 0, totalVariance: 0, overShifts: 0, shortShifts: 0 };

    return shifts.reduce((acc, shift) => {
      acc.totalShifts++;
      const variance = shift.cash_difference || 0;
      acc.totalVariance += variance;

      if (Math.abs(variance) < 1) {
        acc.balancedShifts++;
      } else if (variance > 0) {
        acc.overShifts++;
      } else {
        acc.shortShifts++;
      }

      return acc;
    }, { totalShifts: 0, balancedShifts: 0, totalVariance: 0, overShifts: 0, shortShifts: 0 });
  }, [shifts]);

  // Filter and sort shifts
  const filteredAndSortedShifts = useMemo(() => {
    if (!shifts) return [];

    let filtered = shifts.filter(shift => {
      const variance = shift.cash_difference || 0;
      switch (varianceFilter) {
        case 'balanced':
          return Math.abs(variance) < 1;
        case 'over':
          return variance >= 1;
        case 'short':
          return variance <= -1;
        default:
          return true;
      }
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
          break;
        case 'cashier':
          comparison = (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '');
          break;
        case 'variance':
          comparison = (a.cash_difference || 0) - (b.cash_difference || 0);
          break;
        case 'sales':
          comparison = a.actualSales - b.actualSales;
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [shifts, varianceFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getVarianceIcon = (variance: number) => {
    if (Math.abs(variance) < 1) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-blue-500" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getVarianceBadge = (variance: number) => {
    if (Math.abs(variance) < 1) {
      return <Badge variant="outline" className="text-green-600 border-green-300">Balanced</Badge>;
    }
    if (variance > 0) {
      return <Badge variant="outline" className="text-blue-600 border-blue-300">Over</Badge>;
    }
    return <Badge variant="destructive">Short</Badge>;
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '-';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShifts}</div>
            <p className="text-xs text-muted-foreground">Closed shifts in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balanced Shifts</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.balancedShifts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalShifts > 0 ? Math.round((stats.balancedShifts / stats.totalShifts) * 100) : 0}% accuracy rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cash Variance</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", stats.totalVariance < 0 ? "text-destructive" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.totalVariance > 0 ? "text-blue-600" : stats.totalVariance < 0 ? "text-destructive" : ""
            )}>
              {formatCurrency(stats.totalVariance, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overShifts} over, {stats.shortShifts} short
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Short Shifts</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.shortShifts}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Shift Reconciliation
              </CardTitle>
              <CardDescription>Review cashier shift variances and cash handling</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={varianceFilter} onValueChange={(v) => setVarianceFilter(v as VarianceFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="over">Over</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedShifts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shifts found for the selected criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort('date')} className="gap-1 -ml-3">
                        Date
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort('cashier')} className="gap-1 -ml-3">
                        Cashier
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleSort('sales')} className="gap-1 -mr-3">
                        Sales
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleSort('variance')} className="gap-1 -mr-3">
                        Variance
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedShifts.map((shift) => {
                    const variance = shift.cash_difference || 0;
                    const expectedCash = (shift.opening_cash || 0) + (shift.total_cash_sales || shift.actualSales);

                    return (
                      <TableRow key={shift.id}>
                        <TableCell>
                          <div className="font-medium">{format(new Date(shift.started_at), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(shift.started_at), 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{shift.profile?.full_name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{shift.profile?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDuration(shift.started_at, shift.ended_at)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(shift.opening_cash, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(shift.actualSales, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(expectedCash, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(shift.closing_cash || 0, currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {getVarianceIcon(variance)}
                            <span className={cn(
                              "font-mono font-medium",
                              variance > 0 ? "text-blue-600" : variance < 0 ? "text-destructive" : "text-green-600"
                            )}>
                              {variance >= 0 ? '+' : ''}{formatCurrency(variance, currency)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getVarianceBadge(variance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
