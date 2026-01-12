import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, CreditCard, MessageSquare, TrendingUp, AlertTriangle, Bell, Ticket, DollarSign } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { useRealtimeSupportTickets } from '@/hooks/useRealtimeSupportTickets';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

export default function PlatformDashboard() {
  // Real-time support ticket notifications
  const { newTicketsCount, resetNewTicketsCount } = useRealtimeSupportTickets({
    enabled: true,
    isPlatformAdmin: true,
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [
        { count: cinemasCount },
        { count: ticketsCount },
        { count: bookingsCount },
        { data: transactions },
        { data: subscriptions },
        { count: failedPaymentsCount },
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('platform_transactions').select('gross_amount, commission_amount'),
        supabase.from('cinema_subscriptions').select('status, plan_id'),
        supabase.from('platform_transactions').select('*', { count: 'exact', head: true }).eq('payment_status', 'failed'),
      ]);

      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.gross_amount), 0) || 0;
      const totalCommission = transactions?.reduce((sum, t) => sum + Number(t.commission_amount), 0) || 0;
      const activeSubscriptions = subscriptions?.filter((s) => s.status === 'active').length || 0;

      return {
        totalCinemas: cinemasCount || 0,
        activeSubscriptions,
        totalRevenue,
        totalCommission,
        openTickets: ticketsCount || 0,
        ticketsSold: bookingsCount || 0,
        failedPayments: failedPaymentsCount || 0,
      };
    },
  });

  // Chart data - Revenue over time
  const { data: revenueChartData } = useQuery({
    queryKey: ['platform-revenue-chart'],
    queryFn: async () => {
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return format(startOfDay(date), 'yyyy-MM-dd');
      });

      const { data } = await supabase
        .from('platform_transactions')
        .select('created_at, gross_amount, commission_amount')
        .gte('created_at', last30Days[0])
        .order('created_at');

      const dailyData = last30Days.map(date => {
        const dayTransactions = data?.filter(t => 
          format(new Date(t.created_at), 'yyyy-MM-dd') === date
        ) || [];
        return {
          date: format(new Date(date), 'MMM d'),
          revenue: dayTransactions.reduce((sum, t) => sum + Number(t.gross_amount), 0),
          commission: dayTransactions.reduce((sum, t) => sum + Number(t.commission_amount), 0),
        };
      });

      return dailyData;
    },
  });

  // Subscription plan distribution
  const { data: planDistribution } = useQuery({
    queryKey: ['platform-plan-distribution'],
    queryFn: async () => {
      const { data: subscriptions } = await supabase
        .from('cinema_subscriptions')
        .select('plan_id, subscription_plans(name)')
        .eq('status', 'active');

      const planCounts: Record<string, number> = {};
      subscriptions?.forEach((sub) => {
        const planName = (sub.subscription_plans as any)?.name || 'Unknown';
        planCounts[planName] = (planCounts[planName] || 0) + 1;
      });

      return Object.entries(planCounts).map(([name, value]) => ({ name, value }));
    },
  });

  // Tickets sold per day
  const { data: ticketsChartData } = useQuery({
    queryKey: ['platform-tickets-chart'],
    queryFn: async () => {
      const last14Days = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(new Date(), 13 - i);
        return format(startOfDay(date), 'yyyy-MM-dd');
      });

      const { data } = await supabase
        .from('bookings')
        .select('created_at')
        .gte('created_at', last14Days[0])
        .eq('status', 'confirmed');

      const dailyData = last14Days.map(date => {
        const dayBookings = data?.filter(b => 
          format(new Date(b.created_at), 'yyyy-MM-dd') === date
        ) || [];
        return {
          date: format(new Date(date), 'MMM d'),
          tickets: dayBookings.length,
        };
      });

      return dailyData;
    },
  });

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const { data: recentCinemas } = useQuery({
    queryKey: ['recent-cinemas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, created_at, is_active')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentTickets } = useQuery({
    queryKey: ['recent-tickets-platform'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id, subject, status, priority, created_at,
          organizations (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Overview of the entire cinema platform
            </p>
          </div>
          {newTicketsCount > 0 && (
            <button
              onClick={resetNewTicketsCount}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Bell className="h-4 w-4 text-primary" />
              <Badge variant="destructive">{newTicketsCount} new</Badge>
            </button>
          )}
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats?.totalCinemas}</p>
                    <p className="text-xs text-muted-foreground">Total Cinemas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CreditCard className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats?.activeSubscriptions}</p>
                    <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">${stats?.totalCommission?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Platform Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Ticket className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats?.ticketsSold?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Tickets Sold</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <MessageSquare className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats?.openTickets}</p>
                    <p className="text-xs text-muted-foreground">Support Tickets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats?.failedPayments}</p>
                    <p className="text-xs text-muted-foreground">Failed Payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Revenue Growth</CardTitle>
              <CardDescription>Platform revenue over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {revenueChartData && revenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        name="Gross Revenue"
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="commission" 
                        name="Commission"
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>No revenue data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plan Distribution</CardTitle>
              <CardDescription>Active subscriptions by plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {planDistribution && planDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {planDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>No subscription data</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tickets Sold</CardTitle>
            <CardDescription>Daily ticket sales over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {ticketsChartData && ticketsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No ticket sales data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Cinemas</CardTitle>
              <CardDescription>Newly registered cinema organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCinemas?.map((cinema) => (
                  <div key={cinema.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{cinema.name}</p>
                        <p className="text-xs text-muted-foreground">{cinema.slug}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        cinema.is_active
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {cinema.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
                {(!recentCinemas || recentCinemas.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No cinemas registered yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Support Tickets</CardTitle>
              <CardDescription>Latest tickets from all cinemas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTickets?.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          ticket.priority === 'urgent'
                            ? 'bg-destructive/10'
                            : ticket.priority === 'high'
                            ? 'bg-orange-500/10'
                            : 'bg-muted'
                        }`}
                      >
                        {ticket.priority === 'urgent' || ticket.priority === 'high' ? (
                          <AlertTriangle
                            className={`h-5 w-5 ${
                              ticket.priority === 'urgent' ? 'text-destructive' : 'text-orange-500'
                            }`}
                          />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {(ticket.organizations as any)?.name || 'Unknown Cinema'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        ticket.status === 'open'
                          ? 'bg-blue-500/10 text-blue-500'
                          : ticket.status === 'in_progress'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-green-500/10 text-green-500'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                ))}
                {(!recentTickets || recentTickets.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No support tickets yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlatformLayout>
  );
}
