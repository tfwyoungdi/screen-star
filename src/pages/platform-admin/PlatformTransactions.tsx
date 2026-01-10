import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, Building2 } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';

export default function PlatformTransactions() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['platform-transactions', statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('platform_transactions')
        .select(`
          *,
          organizations (name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['transaction-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_transactions')
        .select('gross_amount, commission_amount, net_amount, payment_status');

      if (error) throw error;

      const completed = data?.filter((t) => t.payment_status === 'completed') || [];
      const totalGross = completed.reduce((sum, t) => sum + Number(t.gross_amount), 0);
      const totalCommission = completed.reduce((sum, t) => sum + Number(t.commission_amount), 0);
      const totalNet = completed.reduce((sum, t) => sum + Number(t.net_amount), 0);
      const totalTransactions = data?.length || 0;

      return {
        totalGross,
        totalCommission,
        totalNet,
        totalTransactions,
      };
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-500', label: 'Pending' },
      completed: { color: 'bg-green-500', label: 'Completed' },
      failed: { color: 'bg-destructive', label: 'Failed' },
      refunded: { color: 'bg-blue-500', label: 'Refunded' },
    };
    const { color, label } = config[status] || { color: 'bg-muted-foreground', label: status };
    return (
      <Badge variant="outline" className="gap-1">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        {label}
      </Badge>
    );
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor all platform financial transactions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats?.totalGross?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">Gross Volume</p>
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
                  <p className="text-2xl font-bold">${stats?.totalCommission?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">Commission Earned</p>
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
                  <p className="text-2xl font-bold">${stats?.totalNet?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">Paid to Cinemas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <DollarSign className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalTransactions || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All platform financial transactions</CardDescription>
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ticket_sale">Ticket Sale</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : transactions && transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cinema</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {(tx.organizations as any)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tx.transaction_type}</Badge>
                      </TableCell>
                      <TableCell>${Number(tx.gross_amount).toFixed(2)}</TableCell>
                      <TableCell className="text-green-600">
                        +${Number(tx.commission_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>${Number(tx.net_amount).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(tx.payment_status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No transactions found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Transactions will appear here once cinemas start processing payments.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
