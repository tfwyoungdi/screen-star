import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, DollarSign, Clock, History, X, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCurrencySymbol } from '@/lib/currency';

interface StaffRevenueTabProps {
  organizationId: string;
  currency?: string | null;
  dateRange: string;
}

interface StaffMember {
  user_id: string;
  full_name: string;
  email: string;
  totalRevenue: number;
  totalTransactions: number;
  shifts: Array<{
    id: string;
    started_at: string;
    ended_at: string | null;
    status: string;
    revenue: number;
    transactions: number;
  }>;
}

export function StaffRevenueTab({ organizationId, currency, dateRange }: StaffRevenueTabProps) {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const currencySymbol = getCurrencySymbol(currency);

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

  // Fetch shifts with staff info for the period
  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['staff-shifts', organizationId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          id,
          user_id,
          started_at,
          ended_at,
          status,
          total_transactions,
          total_cash_sales,
          total_card_sales
        `)
        .eq('organization_id', organizationId)
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch profiles for staff names
  const { data: profiles } = useQuery({
    queryKey: ['staff-profiles', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch bookings linked to shifts for accurate revenue
  const { data: shiftBookings } = useQuery({
    queryKey: ['shift-bookings', organizationId, dateRange],
    queryFn: async () => {
      if (!shiftsData || shiftsData.length === 0) return [];
      
      const shiftIds = shiftsData.map(s => s.id);
      const { data, error } = await supabase
        .from('bookings')
        .select('id, shift_id, total_amount, status')
        .eq('organization_id', organizationId)
        .in('shift_id', shiftIds)
        .in('status', ['confirmed', 'paid', 'completed', 'activated']);

      if (error) throw error;
      return data;
    },
    enabled: !!shiftsData && shiftsData.length > 0,
  });

  // Fetch staff history (all-time) when a staff is selected
  const { data: staffHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['staff-history', selectedStaff?.user_id],
    queryFn: async () => {
      if (!selectedStaff) return null;

      // Get all shifts for this staff member
      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, started_at, ended_at, status, total_transactions')
        .eq('organization_id', organizationId)
        .eq('user_id', selectedStaff.user_id)
        .order('started_at', { ascending: false })
        .limit(50);

      if (shiftsError) throw shiftsError;

      // Get bookings for these shifts
      const shiftIds = allShifts?.map(s => s.id) || [];
      let bookingsData: any[] = [];
      
      if (shiftIds.length > 0) {
        const { data, error } = await supabase
          .from('bookings')
          .select('id, shift_id, total_amount, status, created_at')
          .in('shift_id', shiftIds)
          .in('status', ['paid', 'confirmed', 'completed']);

        if (error) throw error;
        bookingsData = data || [];
      }

      // Calculate revenue per shift
      const shiftsWithRevenue = allShifts?.map(shift => {
        const shiftBookingsFiltered = bookingsData.filter(b => b.shift_id === shift.id);
        const revenue = shiftBookingsFiltered.reduce((sum, b) => sum + Number(b.total_amount), 0);
        return {
          ...shift,
          revenue,
          transactions: shiftBookingsFiltered.length,
        };
      }) || [];

      const totalRevenue = shiftsWithRevenue.reduce((sum, s) => sum + s.revenue, 0);
      const totalShifts = shiftsWithRevenue.length;
      const avgPerShift = totalShifts > 0 ? totalRevenue / totalShifts : 0;

      return {
        shifts: shiftsWithRevenue,
        totalRevenue,
        totalShifts,
        avgPerShift,
      };
    },
    enabled: !!selectedStaff,
  });

  // Aggregate staff revenue data
  const staffRevenue = useMemo(() => {
    if (!shiftsData || !profiles) return [];

    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const staffMap = new Map<string, StaffMember>();

    // Process shifts and calculate revenue from bookings
    shiftsData.forEach(shift => {
      const profile = profileMap.get(shift.user_id);
      if (!profile) return;

      // Calculate revenue from bookings linked to this shift
      // Status filtering is already done in the query
      const shiftBookingsFiltered = shiftBookings?.filter(b => b.shift_id === shift.id) || [];
      const shiftRevenue = shiftBookingsFiltered.reduce((sum, b) => sum + Number(b.total_amount), 0);
      const transactionCount = shiftBookingsFiltered.length;

      if (!staffMap.has(shift.user_id)) {
        staffMap.set(shift.user_id, {
          user_id: shift.user_id,
          full_name: profile.full_name,
          email: profile.email,
          totalRevenue: 0,
          totalTransactions: 0,
          shifts: [],
        });
      }

      const staff = staffMap.get(shift.user_id)!;
      staff.totalRevenue += shiftRevenue;
      staff.totalTransactions += transactionCount;
      staff.shifts.push({
        id: shift.id,
        started_at: shift.started_at,
        ended_at: shift.ended_at,
        status: shift.status,
        revenue: shiftRevenue,
        transactions: transactionCount,
      });
    });

    return Array.from(staffMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [shiftsData, profiles, shiftBookings]);

  const totalDayRevenue = staffRevenue.reduce((sum, s) => sum + s.totalRevenue, 0);

  if (shiftsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Staff on Duty</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffRevenue.length}</div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Staff Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {currencySymbol}{Math.round(totalDayRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From {staffRevenue.reduce((sum, s) => sum + s.totalTransactions, 0)} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg per Staff</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}{staffRevenue.length > 0 ? Math.round(totalDayRevenue / staffRevenue.length).toLocaleString() : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Average revenue per staff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Revenue Breakdown</CardTitle>
          <CardDescription>
            Click on a staff member to view their full history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staffRevenue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff activity found for this period
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="text-right">Shifts</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffRevenue.map((staff) => (
                  <TableRow 
                    key={staff.user_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedStaff(staff)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{staff.full_name}</div>
                          <div className="text-xs text-muted-foreground">{staff.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{staff.shifts.length}</TableCell>
                    <TableCell className="text-right">{staff.totalTransactions}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {currencySymbol}{Math.round(staff.totalRevenue).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {totalDayRevenue > 0 ? ((staff.totalRevenue / totalDayRevenue) * 100).toFixed(1) : 0}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Staff History Sheet */}
      <Sheet open={!!selectedStaff} onOpenChange={(open) => !open && setSelectedStaff(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedStaff?.full_name}
            </SheetTitle>
            <SheetDescription>{selectedStaff?.email}</SheetDescription>
          </SheetHeader>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : staffHistory ? (
            <div className="mt-6 space-y-6">
              {/* Overall Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Total Revenue</div>
                    <div className="text-lg font-bold text-primary">
                      {currencySymbol}{Math.round(staffHistory.totalRevenue).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Total Shifts</div>
                    <div className="text-lg font-bold">{staffHistory.totalShifts}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Avg/Shift</div>
                    <div className="text-lg font-bold">
                      {currencySymbol}{Math.round(staffHistory.avgPerShift).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Shift History */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Shift History (Last 50)
                </h4>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {staffHistory.shifts.map((shift) => (
                      <Card key={shift.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {format(new Date(shift.started_at), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(shift.started_at), 'h:mm a')}
                              {shift.ended_at && ` - ${format(new Date(shift.ended_at), 'h:mm a')}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-primary">
                              {currencySymbol}{Math.round(shift.revenue).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {shift.transactions} sales
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {staffHistory.shifts.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No shift history found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
