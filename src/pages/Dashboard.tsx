import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOrganization, useUserProfile } from '@/hooks/useUserProfile';
import { useRealtimeBookings, useRealtimeShowtimes, useRealtimeMovies } from '@/hooks/useRealtimeDashboard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickAction } from '@/components/dashboard/QuickAction';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { RecentBookingsTable } from '@/components/dashboard/RecentBookingsTable';
import { WelcomeTour, useTour } from '@/components/dashboard/WelcomeTour';
import {
  DollarSign,
  Ticket,
  Film,
  Calendar,
  Users,
  Settings,
  TrendingUp,
  ArrowRight,
  Zap,
  Plus,
  Radio,
  HelpCircle,
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
} from 'recharts';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const CHART_COLORS = {
  primary: 'hsl(25, 95%, 53%)',
  secondary: 'hsl(173, 58%, 39%)',
  tertiary: 'hsl(197, 71%, 52%)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { showTour, setShowTour } = useTour();
  const dateRange = 7;

  const startDate = startOfDay(subDays(new Date(), dateRange));
  const endDate = endOfDay(new Date());

  // Real-time subscriptions
  const { newBookingsCount, resetNewBookingsCount } = useRealtimeBookings({
    organizationId: profile?.organization_id,
    enabled: !!profile?.organization_id,
  });
  useRealtimeShowtimes({
    organizationId: profile?.organization_id,
    enabled: !!profile?.organization_id,
  });
  useRealtimeMovies({
    organizationId: profile?.organization_id,
    enabled: !!profile?.organization_id,
  });

  // Fetch bookings for analytics
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['dashboard-bookings', profile?.organization_id],
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
      resetNewBookingsCount();
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Fetch movies count
  const { data: movies } = useQuery({
    queryKey: ['dashboard-movies', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('movies')
        .select('id, title')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Fetch upcoming showtimes
  const { data: upcomingShowtimes } = useQuery({
    queryKey: ['dashboard-showtimes', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('showtimes')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .gte('start_time', new Date().toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Fetch booked seats count
  const { data: bookedSeats } = useQuery({
    queryKey: ['dashboard-seats', profile?.organization_id, bookings],
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

  const loading = orgLoading || profileLoading;

  // Calculate metrics
  const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;
  const totalTickets = bookedSeats?.length || 0;
  const totalBookings = bookings?.length || 0;
  const activeMovies = movies?.length || 0;
  const scheduledShowtimes = upcomingShowtimes?.length || 0;

  // Revenue by day for chart
  const revenueByDay = bookings?.reduce((acc, booking) => {
    const day = format(new Date(booking.created_at), 'EEE');
    acc[day] = (acc[day] || 0) + Number(booking.total_amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const dailyRevenueData = Object.entries(revenueByDay)
    .map(([day, revenue]) => ({ day, revenue }))
    .slice(-7);

  // Revenue by movie for chart
  const revenueByMovie = bookings?.reduce((acc, booking) => {
    const movieTitle = booking.showtimes?.movies?.title || 'Unknown';
    acc[movieTitle] = (acc[movieTitle] || 0) + Number(booking.total_amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const movieRevenueData = Object.entries(revenueByMovie)
    .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const recentBookings = bookings?.slice(0, 5) || [];
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <DashboardLayout>
      {/* Welcome Tour */}
      {showTour && <WelcomeTour onComplete={() => setShowTour(false)} />}

      {loading ? (
        <div className="space-y-8">
          <Skeleton className="h-12 w-80" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground" data-tour="dashboard">
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}
                </h1>
                <Badge variant="secondary" className="hidden sm:flex gap-1 text-xs font-medium">
                  <Zap className="h-3 w-3" />
                  Pro Plan
                </Badge>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Radio className="h-3 w-3 animate-pulse" />
                  <span className="text-xs font-medium">Live</span>
                </div>
              </div>
              <p className="text-muted-foreground">
                Here's what's happening with your cinema today
                {newBookingsCount > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    • {newBookingsCount} new booking{newBookingsCount > 1 ? 's' : ''}!
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      localStorage.removeItem('cinetix_tour_completed');
                      setShowTour(true);
                    }}
                    className="text-muted-foreground"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restart tour</TooltipContent>
              </UITooltip>
              <Button variant="outline" onClick={() => navigate('/sales')} className="gap-2">
                View Analytics
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button onClick={() => navigate('/movies')} className="gap-2" data-tour="movies">
                <Plus className="h-4 w-4" />
                Add Movie
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={`$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle={`${totalBookings} orders this week`}
              icon={DollarSign}
              variant="primary"
              trend={{ value: 12.5, label: 'vs last week' }}
            />
            <StatCard
              title="Tickets Sold"
              value={totalTickets.toLocaleString()}
              subtitle="Last 7 days"
              icon={Ticket}
              variant="success"
              trend={{ value: 8.2, label: 'vs last week' }}
            />
            <StatCard
              title="Active Movies"
              value={activeMovies}
              subtitle="Currently showing"
              icon={Film}
              variant="info"
            />
            <StatCard
              title="Upcoming Shows"
              value={scheduledShowtimes}
              subtitle="Scheduled screenings"
              icon={Calendar}
              variant="warning"
            />
          </div>

          {/* Charts & Quick Actions Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <ChartCard
              title="Revenue Overview"
              subtitle="Last 7 days performance"
              icon={TrendingUp}
              className="lg:col-span-2"
              actions={[
                { label: 'View Details', onClick: () => navigate('/sales') },
                { label: 'Export Data', onClick: () => {} },
              ]}
            >
              {dailyRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyRevenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-lg)',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-center">
                  <div className="p-4 rounded-full bg-secondary mb-4">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">No revenue data yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Revenue will appear here once you start selling tickets
                  </p>
                </div>
              )}
            </ChartCard>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Quick Actions</h2>
              </div>
              <div className="space-y-2">
                <QuickAction
                  title="Add New Movie"
                  description="Upload poster and details"
                  icon={Film}
                  onClick={() => navigate('/movies')}
                  variant="gradient"
                />
                <div data-tour="showtimes">
                  <QuickAction
                    title="Schedule Showtime"
                    description="Create new screening"
                    icon={Calendar}
                    onClick={() => navigate('/showtimes')}
                    variant="primary"
                  />
                </div>
                <div data-tour="staff">
                  <QuickAction
                    title="Manage Staff"
                    description="Add team members"
                    icon={Users}
                    onClick={() => navigate('/staff')}
                  />
                </div>
                <div data-tour="settings">
                  <QuickAction
                    title="Settings"
                    description="Configure your cinema"
                    icon={Settings}
                    onClick={() => navigate('/settings')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Movies Chart */}
            <ChartCard
              title="Top Performing Movies"
              subtitle="By revenue this week"
              icon={Film}
              className="lg:col-span-1"
            >
              {movieRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={movieRevenueData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                    />
                    <Bar
                      dataKey="value"
                      fill={CHART_COLORS.primary}
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex flex-col items-center justify-center text-center">
                  <Film className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No movie data yet</p>
                </div>
              )}
            </ChartCard>

            {/* Recent Bookings */}
            <ChartCard
              title="Recent Bookings"
              subtitle="Latest ticket purchases"
              icon={Ticket}
              className="lg:col-span-2"
              actions={[
                { label: 'View All', onClick: () => navigate('/sales') },
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
