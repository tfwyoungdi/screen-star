import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, CreditCard, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';

export default function PlatformDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [
        { count: cinemasCount },
        { count: ticketsCount },
        { data: transactions },
        { data: subscriptions },
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
        supabase.from('platform_transactions').select('gross_amount, commission_amount'),
        supabase.from('cinema_subscriptions').select('status'),
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
      };
    },
  });

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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of the entire cinema platform
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalCinemas}</p>
                    <p className="text-sm text-muted-foreground">Total Cinemas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <CreditCard className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.activeSubscriptions}</p>
                    <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">${stats?.totalCommission?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Platform Commission</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <MessageSquare className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.openTickets}</p>
                    <p className="text-sm text-muted-foreground">Support Tickets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
