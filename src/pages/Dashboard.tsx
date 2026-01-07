import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOrganization, useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickAction } from '@/components/dashboard/QuickAction';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { RecentBookingsTable } from '@/components/dashboard/RecentBookingsTable';
import {
  DollarSign,
  Ticket,
  Film,
  Calendar,
  Users,
  Settings,
  TrendingUp,
  Monitor,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = ['hsl(38, 95%, 55%)', 'hsl(0, 70%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(280, 65%, 60%)'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const dateRange = 7;

  const startDate = startOfDay(subDays(new Date(), dateRange));
  const endDate = endOfDay(new Date());

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
    const day = format(new Date(booking.created_at), 'MMM d');
    acc[day] = (acc[day] || 0) + Number(booking.total_amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const dailyRevenueData = Object.entries(revenueByDay)
    .map(([day, revenue]) => ({ day, revenue }))
    .reverse();

  // Revenue by movie for chart
  const revenueByMovie = bookings?.reduce((acc, booking) => {
    const movieTitle = booking.showtimes?.movies?.title || 'Unknown';
    acc[movieTitle] = (acc[movieTitle] || 0) + Number(booking.total_amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const movieRevenueData = Object.entries(revenueByMovie)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Ticket types for pie chart
  const ticketsByType = bookedSeats?.reduce((acc, seat) => {
    const type = seat.seat_type === 'vip' ? 'VIP' : 'Standard';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const ticketTypeData = Object.entries(ticketsByType).map(([name, value]) => ({
    name,
    value,
  }));

  const recentBookings = bookings?.slice(0, 6) || [];

  return (
    <DashboardLayout>
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-72" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                Welcome back, {profile?.full_name?.split(' ')[0]}!
                <Sparkles className="h-6 w-6 text-primary" />
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's what's happening with your cinema today.
              </p>
            </div>
            <Button
              onClick={() => navigate('/sales')}
              variant="outline"
              className="gap-2 self-start"
            >
              View Full Analytics
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Today's Revenue"
              value={`$${totalRevenue.toFixed(2)}`}
              subtitle={`${totalBookings} bookings`}
              icon={DollarSign}
              variant="primary"
              trend={{ value: 12, label: 'vs last week' }}
            />
            <StatCard
              title="Tickets Sold"
              value={totalTickets}
              subtitle="Last 7 days"
              icon={Ticket}
              variant="success"
              trend={{ value: 8, label: 'vs last week' }}
            />
            <StatCard
              title="Active Movies"
              value={activeMovies}
              subtitle="Currently showing"
              icon={Film}
            />
            <StatCard
              title="Upcoming Shows"
              value={scheduledShowtimes}
              subtitle="Scheduled"
              icon={Calendar}
              variant="warning"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <ChartCard
              title="Revenue Trend"
              icon={TrendingUp}
              className="lg:col-span-2"
              actions={[
                { label: 'View Details', onClick: () => navigate('/sales') },
                { label: 'Export', onClick: () => {} },
              ]}
            >
              {dailyRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dailyRevenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(38, 95%, 55%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(38, 95%, 55%)" stopOpacity={0} />
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
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(38, 95%, 55%)"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(38, 95%, 55%)', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, fill: 'hsl(38, 95%, 55%)' }}
                      fill="url(#revenueGradient)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No revenue data yet</p>
                  </div>
                </div>
              )}
            </ChartCard>

            {/* Ticket Types Chart */}
            <ChartCard title="Ticket Types" icon={Ticket}>
              {ticketTypeData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={ticketTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {ticketTypeData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    {ticketTypeData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.name}: {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Ticket className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No ticket data</p>
                  </div>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Quick Actions & Recent Bookings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
              <div className="space-y-3">
                <QuickAction
                  title="Add New Movie"
                  description="Upload movie details and poster"
                  icon={Film}
                  onClick={() => navigate('/movies')}
                  variant="primary"
                />
                <QuickAction
                  title="Schedule Showtime"
                  description="Create new screening times"
                  icon={Calendar}
                  onClick={() => navigate('/showtimes')}
                />
                <QuickAction
                  title="Manage Staff"
                  description="Add or edit team members"
                  icon={Users}
                  onClick={() => navigate('/staff')}
                />
                <QuickAction
                  title="Cinema Settings"
                  description="Configure your cinema profile"
                  icon={Settings}
                  onClick={() => navigate('/settings')}
                />
              </div>
            </div>

            {/* Recent Bookings */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Bookings</CardTitle>
                  <CardDescription>Latest ticket purchases</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => navigate('/sales')}
                >
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <RecentBookingsTable
                  bookings={recentBookings}
                  isLoading={bookingsLoading}
                />
              </CardContent>
            </Card>
          </div>

          {/* Top Movies Chart */}
          {movieRevenueData.length > 0 && (
            <ChartCard title="Top Performing Movies" icon={Film}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={movieRevenueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => (value.length > 15 ? `${value.slice(0, 15)}...` : value)}
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
                    fill="hsl(38, 95%, 55%)"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
