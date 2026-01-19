import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOrganization, useUserProfile } from '@/hooks/useUserProfile';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useRealtimeBookings, useRealtimeShowtimes, useRealtimeMovies } from '@/hooks/useRealtimeDashboard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickAction } from '@/components/dashboard/QuickAction';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { RecentBookingsTable } from '@/components/dashboard/RecentBookingsTable';
import { BookingStatusChart } from '@/components/dashboard/BookingStatusChart';
import { WebsiteStatsWidget } from '@/components/dashboard/WebsiteStatsWidget';
import { LowStockWidget } from '@/components/dashboard/LowStockWidget';
import { WelcomeTour, useTour } from '@/components/dashboard/WelcomeTour';
import { DataRefreshIndicator } from '@/components/dashboard/DataRefreshIndicator';
import {
  DollarSign,
  Ticket,
  Film,
  Calendar,
  Users,
  Settings,
  TrendingUp,
  Plus,
} from 'lucide-react';
import {
  XAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { isImpersonating, impersonatedOrganization, getEffectiveOrganizationId } = useImpersonation();
  const { showTour, setShowTour } = useTour();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const dateRange = 7;

  // Use impersonated org if in impersonation mode, otherwise use real org
  const effectiveOrgId = getEffectiveOrganizationId(profile?.organization_id);
  const effectiveOrg = isImpersonating ? impersonatedOrganization : organization;

  const startDate = startOfDay(subDays(new Date(), dateRange));
  const endDate = endOfDay(new Date());
  
  // Previous period for trend calculation
  const prevStartDate = startOfDay(subDays(new Date(), dateRange * 2));
  const prevEndDate = endOfDay(subDays(new Date(), dateRange + 1));

  // Real-time subscriptions
  const { newBookingsCount, resetNewBookingsCount } = useRealtimeBookings({
    organizationId: effectiveOrgId,
    enabled: !!effectiveOrgId && !isImpersonating, // Disable realtime in impersonation mode
  });
  useRealtimeShowtimes({
    organizationId: effectiveOrgId,
    enabled: !!effectiveOrgId && !isImpersonating,
  });
  useRealtimeMovies({
    organizationId: effectiveOrgId,
    enabled: !!effectiveOrgId && !isImpersonating,
  });

  // Fetch bookings for analytics
  const { data: bookings, isLoading: bookingsLoading, isRefetching, refetch } = useQuery({
    queryKey: ['dashboard-bookings', effectiveOrgId],
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!isImpersonating) resetNewBookingsCount();
      setLastUpdated(new Date());
      return data;
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch previous period bookings for trend calculation
  const { data: prevBookings } = useQuery({
    queryKey: ['dashboard-prev-bookings', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('id, total_amount')
        .eq('organization_id', effectiveOrgId)
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch movies count
  const { data: movies } = useQuery({
    queryKey: ['dashboard-movies', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('movies')
        .select('id, title')
        .eq('organization_id', effectiveOrgId)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch upcoming showtimes
  const { data: upcomingShowtimes } = useQuery({
    queryKey: ['dashboard-showtimes', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('showtimes')
        .select('id')
        .eq('organization_id', effectiveOrgId)
        .gte('start_time', new Date().toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch booked seats count
  const { data: bookedSeats } = useQuery({
    queryKey: ['dashboard-seats', effectiveOrgId, bookings],
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

  // Fetch previous period seats for trend
  const { data: prevBookedSeats } = useQuery({
    queryKey: ['dashboard-prev-seats', effectiveOrgId, prevBookings],
    queryFn: async () => {
      if (!prevBookings || prevBookings.length === 0) return [];
      const bookingIds = prevBookings.map((b) => b.id);
      const { data, error } = await supabase
        .from('booked_seats')
        .select('id')
        .in('booking_id', bookingIds);

      if (error) throw error;
      return data;
    },
    enabled: !!prevBookings && prevBookings.length > 0,
  });

  const loading = orgLoading || profileLoading;

  // Calculate metrics - only count confirmed/paid/completed bookings for revenue
  const completedStatuses = ['confirmed', 'paid', 'completed'];
  const revenueBookings = bookings?.filter(b => completedStatuses.includes(b.status?.toLowerCase() || '')) || [];
  const totalRevenue = revenueBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const totalTickets = bookedSeats?.length || 0;
  const totalBookings = bookings?.length || 0;
  const activeMovies = movies?.length || 0;
  const scheduledShowtimes = upcomingShowtimes?.length || 0;

  // Calculate previous period metrics for trends - filter by completed status
  const prevRevenueBookings = prevBookings?.filter(b => {
    // For prev bookings we only have id and total_amount, assume all are valid for comparison
    return true;
  }) || [];
  const prevTotalRevenue = prevRevenueBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const prevTotalTickets = prevBookedSeats?.length || 0;

  // Calculate trend percentages
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueTrend = calculateTrend(totalRevenue, prevTotalRevenue);
  const ticketsTrend = calculateTrend(totalTickets, prevTotalTickets);

  // Revenue by day for chart (only completed bookings)
  const revenueByDay = revenueBookings.reduce((acc, booking) => {
    const day = format(new Date(booking.created_at), 'EEE');
    acc[day] = (acc[day] || 0) + Number(booking.total_amount);
    return acc;
  }, {} as Record<string, number>);

  const dailyRevenueData = Object.entries(revenueByDay)
    .map(([day, revenue]) => ({ day, revenue }))
    .slice(-7);

  // Revenue by movie for chart (only completed bookings)
  const revenueByMovie = revenueBookings.reduce((acc, booking) => {
    const movieTitle = booking.showtimes?.movies?.title || 'Unknown';
    acc[movieTitle] = (acc[movieTitle] || 0) + Number(booking.total_amount);
    return acc;
  }, {} as Record<string, number>);

  const movieRevenueData = Object.entries(revenueByMovie)
    .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Booking status distribution
  const bookingStatusData = bookings?.reduce(
    (acc, booking) => {
      const status = booking.status?.toLowerCase() || 'pending';
      if (status === 'paid' || status === 'confirmed' || status === 'completed') {
        acc.completed++;
      } else if (status === 'cancelled') {
        acc.cancelled++;
      } else {
        acc.pending++;
      }
      return acc;
    },
    { completed: 0, pending: 0, cancelled: 0 }
  ) || { completed: 0, pending: 0, cancelled: 0 };

  const recentBookings = bookings?.slice(0, 5) || [];
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <DashboardLayout>
      {/* Welcome Tour */}
      {showTour && <WelcomeTour onComplete={() => setShowTour(false)} />}

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-60" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-tour="dashboard">
                Dashboard
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Plan, prioritize, and accomplish your tasks with ease.
                {newBookingsCount > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    • {newBookingsCount} new booking{newBookingsCount > 1 ? 's' : ''}!
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DataRefreshIndicator
                lastUpdated={lastUpdated}
                isRefetching={isRefetching}
                onRefresh={() => refetch()}
              />
              <Button onClick={() => navigate('/movies')} className="gap-2" data-tour="movies">
                <Plus className="h-4 w-4" />
                Add Movie
              </Button>
              <Button variant="outline" onClick={() => navigate('/sales')}>
                Import Data
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={Math.round(totalRevenue)}
              prefix="$"
              icon={DollarSign}
              variant="primary"
              trend={revenueTrend !== 0 ? { 
                value: Math.round(revenueTrend * 10) / 10, 
                label: `vs previous ${dateRange} days` 
              } : undefined}
            />
            <StatCard
              title="Tickets Sold"
              value={totalTickets}
              icon={Ticket}
              trend={ticketsTrend !== 0 ? { 
                value: Math.round(ticketsTrend * 10) / 10, 
                label: `vs previous ${dateRange} days` 
              } : undefined}
            />
            <StatCard
              title="Active Movies"
              value={activeMovies}
              icon={Film}
              subtitle="Currently showing"
            />
            <StatCard
              title="Upcoming Shows"
              value={scheduledShowtimes}
              icon={Calendar}
              subtitle="On Schedule"
            />
          </div>

          {/* Charts & Widgets Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Website Stats Widget */}
            <WebsiteStatsWidget 
              organizationId={effectiveOrgId} 
              cinemaSlug={effectiveOrg?.slug}
            />
            {/* Project Analytics Chart */}
            <ChartCard
              title="Project Analytics"
              className="lg:col-span-1"
            >
              {dailyRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyRevenueData} barGap={8}>
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(0)}`, 'Revenue']}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--primary))"
                      radius={[20, 20, 20, 20]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                </div>
              )}
            </ChartCard>

            {/* Booking Status Donut Chart */}
            <ChartCard
              title="Booking Status"
              className="lg:col-span-1"
            >
              <BookingStatusChart data={bookingStatusData} />
            </ChartCard>

            {/* Quick Links */}
            <ChartCard
              title="Quick Actions"
              actionLabel="New"
              onActionClick={() => navigate('/movies')}
              className="lg:col-span-1"
            >
              <div className="space-y-1">
                <QuickAction
                  title="Movies"
                  icon={Film}
                  onClick={() => navigate('/movies')}
                  variant="primary"
                />
                <QuickAction
                  title="Showtimes"
                  icon={Calendar}
                  onClick={() => navigate('/showtimes')}
                />
                <div data-tour="staff">
                  <QuickAction
                    title="Staff"
                    icon={Users}
                    onClick={() => navigate('/staff')}
                  />
                </div>
                <div data-tour="settings">
                  <QuickAction
                    title="Settings"
                    icon={Settings}
                    onClick={() => navigate('/settings')}
                  />
                </div>
              </div>
            </ChartCard>

            {/* Low Stock Widget */}
            <LowStockWidget organizationId={effectiveOrgId} />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Top Movies */}
            <ChartCard
              title="Top Movies"
              className="lg:col-span-1"
            >
              {movieRevenueData.length > 0 ? (
                <div className="space-y-3">
                  {movieRevenueData.map((movie, index) => (
                    <div key={movie.name} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Film className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{movie.name}</p>
                        <p className="text-xs text-muted-foreground">${movie.value.toFixed(0)} revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <Film className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No movie data yet</p>
                </div>
              )}
            </ChartCard>

            {/* Recent Bookings */}
            <ChartCard
              title="Recent Bookings"
              className="lg:col-span-2"
              actions={[
                { label: 'View All →', onClick: () => navigate('/sales') },
              ]}
            >
              <div data-tour="sales">
                <RecentBookingsTable
                  bookings={recentBookings}
                  isLoading={bookingsLoading}
                />
              </div>
            </ChartCard>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
