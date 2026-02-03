import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export default function PlatformAccountsDashboard() {
  // Fetch subscription revenue
  const { data: revenueStats, isLoading: revenueLoading } = useQuery({
    queryKey: ['platform-accounts-revenue'],
    queryFn: async () => {
      const { data: subscriptions, error } = await supabase
        .from('cinema_subscriptions')
        .select(`
          id,
          status,
          current_period_end,
          subscription_plans!inner (
            monthly_price,
            name
          )
        `);

      if (error) throw error;

      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
      const mrr = activeSubscriptions.reduce((sum, s) => {
        const plan = s.subscription_plans as any;
        return sum + (plan?.monthly_price || 0);
      }, 0);

      const arr = mrr * 12;
      
      return {
        totalSubscriptions: subscriptions?.length || 0,
        activeSubscriptions: activeSubscriptions.length,
        mrr,
        arr,
      };
    },
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['platform-accounts-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          total_amount,
          status,
          created_at,
          organizations!inner (name)
        `)
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch subscription distribution
  const { data: planDistribution, isLoading: planLoading } = useQuery({
    queryKey: ['platform-accounts-plan-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cinema_subscriptions')
        .select(`
          subscription_plans!inner (name)
        `)
        .eq('status', 'active');

      if (error) throw error;

      const distribution: Record<string, number> = {};
      data?.forEach(s => {
        const planName = (s.subscription_plans as any)?.name || 'Unknown';
        distribution[planName] = (distribution[planName] || 0) + 1;
      });

      return distribution;
    },
  });

  const isLoading = revenueLoading || transactionsLoading || planLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor revenue, subscriptions, and financial transactions
          </p>
        </div>

        {/* Revenue KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-bold">{formatCurrency(revenueStats?.mrr || 0)}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-bold">{formatCurrency(revenueStats?.arr || 0)}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Annual Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{revenueStats?.activeSubscriptions}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Active Subs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <CreditCard className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{revenueStats?.totalSubscriptions}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Subs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Plan Distribution
            </CardTitle>
            <CardDescription>
              Active subscriptions by plan type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {Object.entries(planDistribution || {}).map(([plan, count]) => (
                  <div key={plan} className="flex items-center gap-2 p-3 rounded-lg border">
                    <Badge variant="secondary">{count}</Badge>
                    <span className="font-medium">{plan}</span>
                  </div>
                ))}
                {Object.keys(planDistribution || {}).length === 0 && (
                  <p className="text-muted-foreground">No active subscriptions</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Latest booking transactions across all cinemas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions && transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Cinema</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">
                        {tx.booking_reference}
                      </TableCell>
                      <TableCell>
                        {(tx.organizations as any)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(tx.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            tx.status === 'completed' 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-blue-500/10 text-blue-500'
                          }
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>
              Frequently used financial features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <a href="/platform-admin/transactions" className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <Receipt className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">All Transactions</h3>
                <p className="text-sm text-muted-foreground">View complete history</p>
              </a>
              <a href="/platform-admin/plans" className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <CreditCard className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Subscription Plans</h3>
                <p className="text-sm text-muted-foreground">Manage pricing plans</p>
              </a>
              <a href="/platform-admin/reports" className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Financial Reports</h3>
                <p className="text-sm text-muted-foreground">Detailed analytics</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
