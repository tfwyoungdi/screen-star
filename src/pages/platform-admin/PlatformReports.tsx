import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  DollarSign, 
  Ticket,
  Building2,
  Users 
} from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';

export default function PlatformReports() {
  const [period, setPeriod] = useState<string>('30days');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case '7days':
        return { start: subDays(now, 7), end: now };
      case '30days':
        return { start: subDays(now, 30), end: now };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const { start, end } = getDateRange();

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['platform-revenue-report', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_transactions')
        .select('gross_amount, commission_amount, net_amount, created_at, organization_id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('payment_status', 'completed');

      if (error) throw error;

      const totalGross = data?.reduce((sum, t) => sum + Number(t.gross_amount), 0) || 0;
      const totalCommission = data?.reduce((sum, t) => sum + Number(t.commission_amount), 0) || 0;
      const totalNet = data?.reduce((sum, t) => sum + Number(t.net_amount), 0) || 0;
      const uniqueCinemas = new Set(data?.map((t) => t.organization_id)).size;

      return {
        totalGross,
        totalCommission,
        totalNet,
        transactionCount: data?.length || 0,
        uniqueCinemas,
      };
    },
  });

  const { data: cinemaStats, isLoading: cinemaLoading } = useQuery({
    queryKey: ['platform-cinema-stats', period],
    queryFn: async () => {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (orgsError) throw orgsError;

      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('id', { count: 'exact' });

      return {
        newCinemas: orgs?.length || 0,
        totalCinemas: allOrgs?.length || 0,
      };
    },
  });

  const { data: topCinemas, isLoading: topLoading } = useQuery({
    queryKey: ['platform-top-cinemas', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_transactions')
        .select(`
          organization_id,
          gross_amount,
          commission_amount,
          organizations (name)
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('payment_status', 'completed');

      if (error) throw error;

      // Aggregate by cinema
      const cinemaRevenue: Record<string, { name: string; gross: number; commission: number; count: number }> = {};
      data?.forEach((t) => {
        const id = t.organization_id;
        if (!cinemaRevenue[id]) {
          cinemaRevenue[id] = {
            name: (t.organizations as any)?.name || 'Unknown',
            gross: 0,
            commission: 0,
            count: 0,
          };
        }
        cinemaRevenue[id].gross += Number(t.gross_amount);
        cinemaRevenue[id].commission += Number(t.commission_amount);
        cinemaRevenue[id].count += 1;
      });

      return Object.entries(cinemaRevenue)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.gross - a.gross)
        .slice(0, 10);
    },
  });

  const handleExport = (type: 'csv' | 'pdf') => {
    if (!topCinemas || topCinemas.length === 0) {
      toast.error('No data to export');
      return;
    }

    if (type === 'csv') {
      const headers = ['Cinema', 'Gross Revenue', 'Platform Commission', 'Transactions'];
      const rows = topCinemas.map((c) => [
        c.name,
        c.gross.toFixed(2),
        c.commission.toFixed(2),
        c.count,
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } else {
      toast.info('PDF export coming soon');
    }
  };

  const isLoading = revenueLoading || cinemaLoading || topLoading;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Platform performance and business metrics
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Revenue</p>
                    <p className="text-2xl font-bold mt-1">
                      ${revenueData?.totalGross.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm text-green-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>Platform revenue</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Commission Earned</p>
                    <p className="text-2xl font-bold mt-1">
                      ${revenueData?.totalCommission.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
                  <span>From {revenueData?.transactionCount} transactions</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Cinemas</p>
                    <p className="text-2xl font-bold mt-1">{revenueData?.uniqueCinemas}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Building2 className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
                  <span>With transactions in period</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">New Cinemas</p>
                    <p className="text-2xl font-bold mt-1">{cinemaStats?.newCinemas}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
                  <span>Registered in period</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Cinemas Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Performing Cinemas
            </CardTitle>
            <CardDescription>Ranked by gross revenue for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {topLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : topCinemas && topCinemas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Cinema</TableHead>
                    <TableHead>Gross Revenue</TableHead>
                    <TableHead>Platform Commission</TableHead>
                    <TableHead>Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCinemas.map((cinema, index) => (
                    <TableRow key={cinema.id}>
                      <TableCell>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                          index === 1 ? 'bg-muted text-muted-foreground' :
                          index === 2 ? 'bg-orange-500/20 text-orange-600' :
                          'bg-muted/50 text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{cinema.name}</TableCell>
                      <TableCell>${cinema.gross.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">
                        +${cinema.commission.toLocaleString()}
                      </TableCell>
                      <TableCell>{cinema.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No data for this period</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Revenue data will appear here once transactions are recorded.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
