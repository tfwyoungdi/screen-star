import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ScrollText, Search, Shield, Activity, User } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  cinema_suspended: { label: 'Cinema Suspended', color: 'bg-destructive' },
  cinema_reactivated: { label: 'Cinema Reactivated', color: 'bg-green-500' },
  plan_created: { label: 'Plan Created', color: 'bg-blue-500' },
  plan_updated: { label: 'Plan Updated', color: 'bg-yellow-500' },
  ticket_status_updated: { label: 'Ticket Updated', color: 'bg-purple-500' },
  platform_settings_updated: { label: 'Settings Updated', color: 'bg-orange-500' },
  platform_user_added: { label: 'Admin Added', color: 'bg-green-500' },
  platform_user_removed: { label: 'Admin Removed', color: 'bg-destructive' },
  domain_verified: { label: 'Domain Verified', color: 'bg-blue-500' },
};

export default function PlatformAuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['platform-audit-logs', searchQuery, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('platform_audit_logs')
        .select(`
          *,
          profiles:admin_user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const adminName = (log.profiles as any)?.full_name?.toLowerCase() || '';
    const adminEmail = (log.profiles as any)?.email?.toLowerCase() || '';
    const action = log.action.toLowerCase();
    return adminName.includes(search) || adminEmail.includes(search) || action.includes(search);
  });

  const uniqueActions = [...new Set(logs?.map((l) => l.action) || [])];

  const getActionBadge = (action: string) => {
    const config = ACTION_LABELS[action] || { label: action.replace(/_/g, ' '), color: 'bg-muted-foreground' };
    return (
      <Badge variant="outline" className="gap-1">
        <span className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete history of all platform admin actions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <ScrollText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{logs?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueActions.length}</p>
                  <p className="text-sm text-muted-foreground">Action Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <User className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(logs?.map((l) => l.admin_user_id)).size || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Activity Log
                </CardTitle>
                <CardDescription>All actions performed by platform administrators</CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {ACTION_LABELS[action]?.label || action.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
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
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const admin = log.profiles as any;
                    const details = log.details as any;
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{admin?.full_name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{admin?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.target_type ? (
                            <span className="text-xs">
                              {log.target_type}
                              {log.target_id && ` #${log.target_id.slice(0, 8)}...`}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {details ? (
                            <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {Object.entries(details)
                                .filter(([_, v]) => v !== null)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <ScrollText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No audit logs found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Admin actions will be recorded here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
