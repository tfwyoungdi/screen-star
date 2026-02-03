import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { 
  Mail, 
  Users, 
  TrendingUp, 
  MessageSquare,
  BarChart3,
  Send,
  MousePointer,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

export default function PlatformMarketingDashboard() {
  // Fetch email campaign stats
  const { data: emailStats, isLoading: emailLoading } = useQuery({
    queryKey: ['platform-marketing-email-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_email_campaigns')
        .select('id, status, sent_count, opened_count, clicked_count, sent_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const totalSent = data?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
      const totalOpened = data?.reduce((sum, c) => sum + (c.opened_count || 0), 0) || 0;
      const totalClicked = data?.reduce((sum, c) => sum + (c.clicked_count || 0), 0) || 0;
      const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
      const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0';

      return {
        totalCampaigns: data?.length || 0,
        totalSent,
        totalOpened,
        totalClicked,
        openRate,
        clickRate,
        recentCampaigns: data?.slice(0, 5) || [],
      };
    },
  });

  // Fetch customer growth
  const { data: customerStats, isLoading: customerLoading } = useQuery({
    queryKey: ['platform-marketing-customer-stats'],
    queryFn: async () => {
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true });

      // Get last 30 days new customers
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: newCustomers } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      return {
        totalCustomers: totalCustomers || 0,
        newCustomers30Days: newCustomers || 0,
      };
    },
  });

  const isLoading = emailLoading || customerLoading;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor email campaigns, customer engagement, and growth metrics
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{customerStats?.totalCustomers.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">+{customerStats?.newCustomers30Days}</p>
                  )}
                  <p className="text-sm text-muted-foreground">New (30 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Eye className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{emailStats?.openRate}%</p>
                  )}
                  <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <MousePointer className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{emailStats?.clickRate}%</p>
                  )}
                  <p className="text-sm text-muted-foreground">Click Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Send className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{emailStats?.totalSent.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-cyan-500/10">
                  <Mail className="h-6 w-6 text-cyan-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{emailStats?.totalCampaigns}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Campaigns</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-pink-500/10">
                  <BarChart3 className="h-6 w-6 text-pink-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{emailStats?.totalClicked.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Quick Access
            </CardTitle>
            <CardDescription>
              Frequently used marketing features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <a href="/platform-admin/communications" className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <Mail className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Communications</h3>
                <p className="text-sm text-muted-foreground">Manage email campaigns</p>
              </a>
              <a href="/platform-admin/customers" className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <Users className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Customers</h3>
                <p className="text-sm text-muted-foreground">View customer database</p>
              </a>
              <a href="/platform-admin/reports" className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <BarChart3 className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Reports</h3>
                <p className="text-sm text-muted-foreground">Analytics and insights</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
