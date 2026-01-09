import { useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Loader2, DollarSign, Ticket, TrendingUp, Calendar, Film, Users, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useExportReports } from '@/hooks/useExportReports';
import { DataRefreshIndicator } from '@/components/dashboard/DataRefreshIndicator';
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
} from 'recharts';

const COLORS = ['hsl(38, 95%, 55%)', 'hsl(0, 70%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(280, 65%, 60%)'];
const ITEMS_PER_PAGE = 10;

export default function SalesDashboard() {
  const { data: profile } = useUserProfile();
  const { exportToCSV, exportToPDF } = useExportReports();
  const [dateRange, setDateRange] = useState('7');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
  const endDate = endOfDay(new Date());

  // Fetch bookings for analytics
  const { data: bookings, isLoading: bookingsLoading, isRefetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['sales-bookings', profile?.organization_id, dateRange],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          showtimes (
            start_time,
            movies (title),
            screens (name)
          )
        `)
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLastUpdated(new Date());
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Fetch booked seats for ticket count
  const { data: bookedSeats } = useQuery({
    queryKey: ['sales-seats', profile?.organization_id, dateRange],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      // Get booking IDs from the date range
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

  // Reset to page 1 when date range changes
  useMemo(() => {
    setCurrentPage(1);
  }, [dateRange]);

  // Calculate metrics
  const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;
  const totalTickets = bookedSeats?.length || 0;
  const totalBookings = bookings?.length || 0;
  const avgOrderValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Pagination calculations
  const totalPages = Math.ceil(totalBookings / ITEMS_PER_PAGE);
  const paginatedBookings = useMemo(() => {
    if (!bookings) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return bookings.slice(start, start + ITEMS_PER_PAGE);
  }, [bookings, currentPage]);

  // Revenue by day
  const revenueByDay = bookings?.reduce((acc, booking) => {
    const day = format(new Date(booking.created_at), 'MMM d');
    acc[day] = (acc[day] || 0) + Number(booking.total_amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const dailyRevenueData = Object.entries(revenueByDay).map(([day, revenue]) => ({
    day,
    revenue,
  })).reverse();

  // Revenue by movie
  const revenueByMovie = bookings?.reduce((acc, booking) => {
    const movieTitle = booking.showtimes?.movies?.title || 'Unknown';
    acc[movieTitle] = (acc[movieTitle] || 0) + Number(booking.total_amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const movieRevenueData = Object.entries(revenueByMovie)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Tickets by seat type
  const ticketsBySeatType = bookedSeats?.reduce((acc, seat) => {
    const type = seat.seat_type === 'vip' ? 'VIP' : 'Standard';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const seatTypeData = Object.entries(ticketsBySeatType).map(([name, value]) => ({
    name,
    value,
  }));

  const isLoading = bookingsLoading;

  const handleRefresh = () => {
    refetch();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
            <p className="text-muted-foreground">
              Revenue reports and booking analytics
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
              onClick={() => exportToCSV(bookings || [], 'sales-report')}
              disabled={!bookings || bookings.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToPDF(bookings || [], `Sales Report - Last ${dateRange} Days`)}
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
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
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
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ${totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last {dateRange} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTickets}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {totalBookings} bookings
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Per booking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalBookings}</div>
                  <p className="text-xs text-muted-foreground">
                    Completed orders
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Daily Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyRevenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyRevenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(38, 95%, 55%)"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(38, 95%, 55%)' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No revenue data for this period
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue by Movie */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="h-5 w-5" />
                    Revenue by Movie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {movieRevenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={movieRevenueData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                        />
                        <Bar dataKey="value" fill="hsl(38, 95%, 55%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No movie data for this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Seat Types and Recent Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Seat Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Types</CardTitle>
                  <CardDescription>Standard vs VIP distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  {seatTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={seatTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {seatTypeData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No ticket data
                    </div>
                  )}
                  <div className="flex justify-center gap-4 mt-4">
                    {seatTypeData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Paginated Bookings */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>All Bookings</CardTitle>
                      <CardDescription>
                        Showing {paginatedBookings.length} of {totalBookings} bookings
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
                  {paginatedBookings.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Movie</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {booking.booking_reference}
                              </Badge>
                            </TableCell>
                            <TableCell>{booking.customer_name}</TableCell>
                            <TableCell className="max-w-[150px] truncate">
                              {booking.showtimes?.movies?.title || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(booking.created_at), 'MMM d, h:mm a')}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  booking.status === 'paid' || booking.status === 'completed'
                                    ? 'default'
                                    : booking.status === 'cancelled'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="capitalize"
                              >
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${Number(booking.total_amount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No bookings in this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
