import { useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  Loader2, DollarSign, Ticket, TrendingUp, Calendar, 
  Download, FileText, ChevronLeft, ChevronRight, 
  CreditCard, Banknote, Receipt, PieChart as PieChartIcon,
  ArrowUpRight, ArrowDownRight, Users
} from 'lucide-react';
import { getCurrencySymbol, formatCurrency } from '@/lib/currency';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountantLayout } from '@/components/layout/AccountantLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useImpersonation } from '@/hooks/useImpersonation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useExportReports } from '@/hooks/useExportReports';
import { DataRefreshIndicator } from '@/components/dashboard/DataRefreshIndicator';
import { StaffRevenueTab } from '@/components/accountant/StaffRevenueTab';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(38, 95%, 55%)', 'hsl(0, 70%, 50%)', 'hsl(200, 70%, 50%)'];
const ITEMS_PER_PAGE = 15;

export default function AccountantDashboard() {
  const { data: profile } = useUserProfile();
  const { getEffectiveOrganizationId } = useImpersonation();
  const { organization } = useOrganization();
  const effectiveOrgId = getEffectiveOrganizationId(profile?.organization_id);
  const { exportToCSV, exportToPDF } = useExportReports();
  const [dateRange, setDateRange] = useState('today');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const currencySymbol = getCurrencySymbol(organization?.currency);

  // Calculate date range based on selection
  const { startDate, endDate, prevStartDate, prevEndDate } = useMemo(() => {
    const now = new Date();
    if (dateRange === 'today') {
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        prevStartDate: startOfDay(subDays(now, 1)),
        prevEndDate: endOfDay(subDays(now, 1)),
      };
    } else if (dateRange === 'yesterday') {
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        prevStartDate: startOfDay(subDays(now, 2)),
        prevEndDate: endOfDay(subDays(now, 2)),
      };
    } else {
      const days = parseInt(dateRange);
      const start = startOfDay(subDays(now, days));
      return {
        startDate: start,
        endDate: endOfDay(now),
        prevStartDate: startOfDay(subDays(start, days)),
        prevEndDate: startOfDay(subDays(now, days)),
      };
    }
  }, [dateRange]);

  // Fetch current period bookings
  const { data: bookings, isLoading: bookingsLoading, isRefetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['accountant-bookings', effectiveOrgId, dateRange],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          showtimes (
            start_time,
            movies (title),
            screens (name)
          ),
          promo_codes (code, discount_type, discount_value)
        `)
        .eq('organization_id', effectiveOrgId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLastUpdated(new Date());
      return data;
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch previous period bookings for comparison
  const { data: prevBookings } = useQuery({
    queryKey: ['accountant-prev-bookings', effectiveOrgId, dateRange],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('id, total_amount, status, created_at')
        .eq('organization_id', effectiveOrgId)
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', prevEndDate.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch booked seats for ticket count
  const { data: bookedSeats } = useQuery({
    queryKey: ['accountant-seats', effectiveOrgId, dateRange],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const bookingIds = bookings?.map(b => b.id) || [];
      if (bookingIds.length === 0) return [];

      const { data, error } = await supabase
        .from('booked_seats')
        .select('*')
        .in('booking_id', bookingIds);

      if (error) throw error;
      return data;
    },
    enabled: !!bookings && bookings.length > 0,
  });

  // Fetch concession sales
  const { data: concessionSales } = useQuery({
    queryKey: ['accountant-concessions', effectiveOrgId, dateRange],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const bookingIds = bookings?.filter(b => ['confirmed', 'paid', 'completed'].includes(b.status?.toLowerCase() || '')).map(b => b.id) || [];
      if (bookingIds.length === 0) return [];

      const { data, error } = await supabase
        .from('booking_concessions')
        .select(`
          *,
          concession_items (name, category)
        `)
        .in('booking_id', bookingIds);

      if (error) throw error;
      return data;
    },
    enabled: !!bookings && bookings.length > 0,
  });

  // Reset to page 1 when date range changes
  useMemo(() => {
    setCurrentPage(1);
  }, [dateRange]);

  // Calculate metrics
  const completedStatuses = ['confirmed', 'paid', 'completed'];
  const revenueBookings = bookings?.filter(b => completedStatuses.includes(b.status?.toLowerCase() || '')) || [];
  const prevRevenueBookings = prevBookings?.filter(b => completedStatuses.includes(b.status?.toLowerCase() || '')) || [];

  const totalRevenue = revenueBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const prevTotalRevenue = prevRevenueBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

  const totalTickets = bookedSeats?.length || 0;
  const totalBookings = bookings?.length || 0;
  const completedBookingsCount = revenueBookings.length;
  const prevCompletedBookingsCount = prevRevenueBookings.length;
  const bookingsChange = prevCompletedBookingsCount > 0 ? ((completedBookingsCount - prevCompletedBookingsCount) / prevCompletedBookingsCount) * 100 : 0;

  const avgOrderValue = completedBookingsCount > 0 ? totalRevenue / completedBookingsCount : 0;
  const prevAvgOrderValue = prevCompletedBookingsCount > 0 ? prevTotalRevenue / prevCompletedBookingsCount : 0;
  const aovChange = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : 0;

  // Discounts given
  const totalDiscounts = revenueBookings.reduce((sum, b) => sum + Number(b.discount_amount || 0), 0);

  // Concession revenue
  const concessionRevenue = concessionSales?.reduce((sum, c) => sum + (Number(c.unit_price) * c.quantity), 0) || 0;

  // Ticket revenue (total minus concessions)
  const ticketRevenue = totalRevenue - concessionRevenue;

  // Cancelled/refunded bookings
  const cancelledBookings = bookings?.filter(b => b.status?.toLowerCase() === 'cancelled') || [];
  const cancelledCount = cancelledBookings.length;
  const cancelledAmount = cancelledBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);

  // Pending bookings
  const pendingBookings = bookings?.filter(b => b.status?.toLowerCase() === 'pending') || [];
  const pendingCount = pendingBookings.length;
  const pendingAmount = pendingBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);

  // Pagination
  const totalPages = Math.ceil(totalBookings / ITEMS_PER_PAGE);
  const paginatedBookings = useMemo(() => {
    if (!bookings) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return bookings.slice(start, start + ITEMS_PER_PAGE);
  }, [bookings, currentPage]);

  // Revenue by day
  const revenueByDay = revenueBookings.reduce((acc, booking) => {
    const day = format(new Date(booking.created_at), 'MMM d');
    acc[day] = (acc[day] || 0) + Number(booking.total_amount);
    return acc;
  }, {} as Record<string, number>);

  const dailyRevenueData = Object.entries(revenueByDay).map(([day, revenue]) => ({
    day,
    revenue,
  })).reverse();

  // Revenue breakdown (tickets vs concessions)
  const revenueBreakdown = [
    { name: 'Ticket Sales', value: ticketRevenue },
    { name: 'Concessions', value: concessionRevenue },
  ].filter(item => item.value > 0);

  // Status breakdown
  const statusBreakdown = bookings?.reduce((acc, booking) => {
    const status = booking.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const statusData = Object.entries(statusBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const isLoading = bookingsLoading;

  const handleRefresh = () => {
    refetch();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <AccountantLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accountant Dashboard</h1>
            <p className="text-muted-foreground">
              Financial reporting and transaction management
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DataRefreshIndicator
              lastUpdated={lastUpdated}
              isRefetching={isRefetching}
              onRefresh={handleRefresh}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(bookings || [], 'financial-report')}
              disabled={!bookings || bookings.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToPDF(bookings || [], `Financial Report - Last ${dateRange} Days`)}
              disabled={!bookings || bookings.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="staff">
                <Users className="h-4 w-4 mr-1" />
                Staff Revenue
              </TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Financial Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {currencySymbol}{Math.round(totalRevenue).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {revenueChange >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {Math.abs(revenueChange).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">vs previous period</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {currencySymbol}{avgOrderValue.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {aovChange >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={aovChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {Math.abs(aovChange).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">vs previous</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Discounts Given</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">
                      -{currencySymbol}{Math.round(totalDiscounts).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From promo codes
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-500">
                      {currencySymbol}{Math.round(pendingAmount).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pendingCount} pending bookings
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Revenue Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Revenue Trend
                    </CardTitle>
                    <CardDescription>Daily revenue over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dailyRevenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={dailyRevenueData}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${currencySymbol}${Math.round(value).toLocaleString()}`, 'Revenue']}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(142, 76%, 36%)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No revenue data for this period
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Revenue Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      Revenue Breakdown
                    </CardTitle>
                    <CardDescription>Tickets vs Concessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {revenueBreakdown.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={revenueBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {revenueBreakdown.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value: number) => [`${currencySymbol}${Math.round(value).toLocaleString()}`, '']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-4">
                          {revenueBreakdown.map((item, index) => (
                            <div key={item.name} className="text-center">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-sm font-medium">{item.name}</span>
                              </div>
                              <p className="text-lg font-bold mt-1">
                                {currencySymbol}{Math.round(item.value).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        No revenue data
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ticket Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {currencySymbol}{Math.round(ticketRevenue).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {totalTickets} tickets sold
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Concession Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {currencySymbol}{Math.round(concessionRevenue).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {concessionSales?.length || 0} items sold
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Cancelled/Refunded</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      {currencySymbol}{Math.round(cancelledAmount).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cancelledCount} cancelled bookings
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="staff" className="space-y-6">
              {effectiveOrgId && (
                <StaffRevenueTab
                  organizationId={effectiveOrgId}
                  currency={organization?.currency}
                  dateRange={dateRange}
                />
              )}
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              {/* Transaction Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>All Transactions</CardTitle>
                      <CardDescription>
                        Showing {paginatedBookings.length} of {totalBookings} transactions
                      </CardDescription>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Movie</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-sm">
                            {booking.booking_reference}
                          </TableCell>
                          <TableCell>
                            {format(new Date(booking.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{booking.customer_name}</p>
                              <p className="text-xs text-muted-foreground">{booking.customer_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {booking.showtimes?.movies?.title || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {booking.discount_amount && booking.discount_amount > 0 ? (
                              <span className="text-amber-600">
                                -{currencySymbol}{Number(booking.discount_amount).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(booking.status)}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {currencySymbol}{Number(booking.total_amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {paginatedBookings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reconciliation" className="space-y-6">
              {/* Reconciliation Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Gross Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {currencySymbol}{Math.round(totalRevenue + totalDiscounts).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Before discounts</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">
                      -{currencySymbol}{Math.round(totalDiscounts).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Promo codes applied</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {currencySymbol}{Math.round(totalRevenue).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">After discounts</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Cancellations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      -{currencySymbol}{Math.round(cancelledAmount).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{cancelledCount} transactions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Status Distribution</CardTitle>
                  <CardDescription>Breakdown of all booking statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={statusData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="space-y-4">
                        {statusData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Badge variant={getStatusBadgeVariant(item.name.toLowerCase())}>
                                {item.name}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{item.value}</p>
                              <p className="text-xs text-muted-foreground">
                                {((item.value / totalBookings) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No transaction data
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AccountantLayout>
  );
}
