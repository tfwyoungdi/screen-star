import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useOrganization } from '@/hooks/useOrganization';
import { getCurrencySymbol, formatCurrency } from '@/lib/currency';
import { DATE_RANGE_OPTIONS, DateRangeValue, getDateRange, getDateRangeLabel } from '@/lib/dateRanges';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useExportReports } from '@/hooks/useExportReports';
import { OnlineActivationStats } from '@/components/boxoffice/OnlineActivationStats';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  format,
  eachDayOfInterval,
  getHours,
} from 'date-fns';
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Download,
  BarChart3,
  Clock,
  Armchair,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

export default function AnalyticsDashboard() {
  const { data: profile } = useUserProfile();
  const { getEffectiveOrganizationId } = useImpersonation();
  const { organization } = useOrganization();
  const effectiveOrgId = getEffectiveOrganizationId(profile?.organization_id);
  const [dateRange, setDateRange] = useState<DateRangeValue>('7');
  const { exportToCSV, exportToPDF } = useExportReports();
  const currencySymbol = getCurrencySymbol(organization?.currency);

  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch all bookings for analytics
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['analytics-bookings', effectiveOrgId, dateRange],
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
          )
        `)
        .eq('organization_id', effectiveOrgId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch booked seats for heatmap
  const { data: bookedSeats } = useQuery({
    queryKey: ['analytics-seats', effectiveOrgId, bookings],
    queryFn: async () => {
      if (!bookings || bookings.length === 0) return [];
      const bookingIds = bookings.map((b) => b.id);
      const { data, error } = await supabase
        .from('booked_seats')
        .select('*')
        .in('booking_id', bookingIds);

      if (error) throw error;
      return data;
    },
    enabled: !!bookings && bookings.length > 0,
  });

  // Calculate metrics - only count confirmed/paid/completed bookings for revenue
  const completedStatuses = ['confirmed', 'paid', 'completed'];
  const revenueBookings = bookings?.filter(b => completedStatuses.includes(b.status?.toLowerCase() || '')) || [];
  const totalRevenue = revenueBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const totalBookings = bookings?.length || 0;
  const totalSeats = bookedSeats?.length || 0;
  const avgTicketPrice = totalSeats > 0 ? totalRevenue / totalSeats : 0;

  // Revenue by day (only completed bookings)
  const revenueByDay = useMemo(() => {
    if (!revenueBookings.length) return [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.map((day) => {
      const dayBookings = revenueBookings.filter(
        (b) =>
          format(new Date(b.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      const revenue = dayBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
      return {
        date: format(day, 'MMM d'),
        revenue,
        bookings: dayBookings.length,
      };
    });
  }, [revenueBookings, startDate, endDate]);

  // Peak hours analysis
  const peakHours = useMemo(() => {
    if (!bookings) return [];
    const hourCounts: Record<number, { count: number; revenue: number }> = {};
    
    bookings.forEach((booking) => {
      const hour = getHours(new Date(booking.created_at));
      if (!hourCounts[hour]) {
        hourCounts[hour] = { count: 0, revenue: 0 };
      }
      hourCounts[hour].count++;
      hourCounts[hour].revenue += Number(booking.total_amount);
    });

    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      bookings: hourCounts[i]?.count || 0,
      revenue: hourCounts[i]?.revenue || 0,
    }));
  }, [bookings]);

  // Revenue by movie (only completed bookings)
  const revenueByMovie = useMemo(() => {
    if (!revenueBookings.length) return [];
    const movieRevenue: Record<string, number> = {};
    
    revenueBookings.forEach((booking) => {
      const title = booking.showtimes?.movies?.title || 'Unknown';
      movieRevenue[title] = (movieRevenue[title] || 0) + Number(booking.total_amount);
    });

    return Object.entries(movieRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [revenueBookings]);

  // Seat heatmap data
  const seatHeatmap = useMemo(() => {
    if (!bookedSeats) return [];
    const seatCounts: Record<string, number> = {};
    
    bookedSeats.forEach((seat) => {
      const key = `${seat.row_label}-${seat.seat_number}`;
      seatCounts[key] = (seatCounts[key] || 0) + 1;
    });

    return Object.entries(seatCounts).map(([key, count]) => {
      const [row, seat] = key.split('-');
      return {
        row: row.charCodeAt(0) - 64, // A=1, B=2, etc.
        seat: parseInt(seat),
        count,
      };
    });
  }, [bookedSeats]);

  // Revenue forecast (simple linear projection)
  const revenueForecast = useMemo(() => {
    if (!revenueByDay || revenueByDay.length < 7) return [];
    
    const lastWeek = revenueByDay.slice(-7);
    const avgDaily = lastWeek.reduce((sum, d) => sum + d.revenue, 0) / 7;
    
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      forecast.push({
        date: format(date, 'MMM d'),
        projected: Math.round(avgDaily * (1 + Math.random() * 0.1 - 0.05)),
        isProjected: true,
      });
    }
    
    return [...revenueByDay.slice(-7).map((d) => ({ ...d, isProjected: false })), ...forecast];
  }, [revenueByDay]);

  // Export handlers
  const handleExportCSV = () => {
    if (!bookings) return;
    exportToCSV(bookings, 'analytics-report');
  };

  const handleExportPDF = () => {
    if (!bookings) return;
    exportToPDF(bookings, `Analytics Report - ${getDateRangeLabel(dateRange)}`);
  };

  const loading = bookingsLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Revenue forecasting, peak hours, and seat popularity insights
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeValue)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Revenue"
                value={Math.round(totalRevenue)}
                prefix={currencySymbol}
                icon={DollarSign}
                variant="primary"
              />
              <StatCard
                title="Total Bookings"
                value={totalBookings}
                icon={Calendar}
              />
              <StatCard
                title="Tickets Sold"
                value={totalSeats}
                icon={Users}
              />
              <StatCard
                title="Avg. Ticket Price"
                value={Math.round(avgTicketPrice)}
                prefix={currencySymbol}
                icon={TrendingUp}
              />
            </div>

            {/* Revenue Trend & Forecast */}
            <ChartCard title="Revenue Trend & 7-Day Forecast">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueForecast}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${currencySymbol}${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${currencySymbol}${value.toFixed(0)}`,
                      name === 'projected' ? 'Forecast' : 'Revenue',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#projectedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Peak Hours & Movie Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Peak Booking Hours" className="lg:col-span-1">
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Booking activity by hour of day</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={peakHours}>
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={2}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [value, 'Bookings']}
                    />
                    <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                      {peakHours.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.bookings > 5
                              ? 'hsl(var(--primary))'
                              : 'hsl(var(--muted-foreground))'
                          }
                          fillOpacity={Math.max(0.3, entry.bookings / 10)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Revenue by Movie">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueByMovie} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${currencySymbol}${v}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${currencySymbol}${value.toFixed(0)}`, 'Revenue']}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[0, 8, 8, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Seat Heatmap */}
            <ChartCard title="Seat Popularity Heatmap">
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <Armchair className="h-4 w-4" />
                <span>Most frequently booked seats (darker = more popular)</span>
              </div>
              {seatHeatmap.length > 0 ? (
                <div className="overflow-x-auto pb-4">
                  <div className="min-w-[600px]">
                    <div className="flex justify-center mb-4">
                      <div className="bg-muted px-8 py-2 rounded text-sm font-medium text-muted-foreground">
                        SCREEN
                      </div>
                    </div>
                    <div className="space-y-1">
                      {Array.from({ length: 10 }, (_, rowIndex) => {
                        const rowLabel = String.fromCharCode(65 + rowIndex);
                        return (
                          <div key={rowLabel} className="flex items-center gap-1 justify-center">
                            <span className="w-6 text-xs font-medium text-muted-foreground">
                              {rowLabel}
                            </span>
                            {Array.from({ length: 12 }, (_, seatIndex) => {
                              const seatData = seatHeatmap.find(
                                (s) => s.row === rowIndex + 1 && s.seat === seatIndex + 1
                              );
                              const intensity = seatData
                                ? Math.min(1, seatData.count / 5)
                                : 0;
                              return (
                                <div
                                  key={seatIndex}
                                  className="w-8 h-6 rounded-t-lg border border-border flex items-center justify-center text-[10px]"
                                  style={{
                                    backgroundColor: intensity > 0
                                      ? `hsl(var(--primary) / ${0.2 + intensity * 0.8})`
                                      : 'hsl(var(--muted))',
                                  }}
                                  title={`${rowLabel}${seatIndex + 1}: ${seatData?.count || 0} bookings`}
                                >
                                  {seatData?.count || ''}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Armchair className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No seat data available</p>
                </div>
              )}
            </ChartCard>

            {/* Online Ticket Activation Stats */}
            {effectiveOrgId && (
              <OnlineActivationStats organizationId={effectiveOrgId} />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
