import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { 
  Code, 
  Server, 
  Activity, 
  AlertTriangle,
  Database,
  Globe,
  Shield,
  Bug,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function PlatformDevDashboard() {
  // Fetch domain status
  const { data: domainStats, isLoading: domainLoading } = useQuery({
    queryKey: ['platform-dev-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domain_records')
        .select('id, domain, dns_verified, ssl_status, error_message, last_checked_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const verified = data?.filter(d => d.dns_verified).length || 0;
      const issues = data?.filter(d => !d.dns_verified || d.ssl_status !== 'active').length || 0;

      return {
        total: data?.length || 0,
        verified,
        issues,
        records: data?.slice(0, 10) || [],
      };
    },
  });

  // Fetch system health metrics
  const { data: systemHealth, isLoading: systemLoading } = useQuery({
    queryKey: ['platform-dev-health'],
    queryFn: async () => {
      // Get counts from various tables as a health check
      const [orgs, bookings, users] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      return {
        organizations: orgs.count || 0,
        bookings: bookings.count || 0,
        users: users.count || 0,
        status: 'healthy',
      };
    },
  });

  // Fetch recent audit logs for debugging
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['platform-dev-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_logs')
        .select(`
          id,
          action,
          target_type,
          details,
          created_at,
          profiles!inner (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const isLoading = domainLoading || systemLoading || auditLoading;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Developer Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor system health, domains, and technical operations
          </p>
        </div>

        {/* System Health */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Activity className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold capitalize">{systemHealth?.status || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">System Status</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{systemHealth?.organizations}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Organizations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Globe className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{domainStats?.verified}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Verified Domains</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{domainStats?.issues}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Domain Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Domain Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domain Status
            </CardTitle>
            <CardDescription>
              Custom domain verification and SSL status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {domainLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : domainStats?.records && domainStats.records.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>DNS</TableHead>
                    <TableHead>SSL</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domainStats.records.map(domain => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-mono text-sm">
                        {domain.domain}
                      </TableCell>
                      <TableCell>
                        {domain.dns_verified ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            domain.ssl_status === 'active' 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-orange-500/10 text-orange-500'
                          }
                        >
                          {domain.ssl_status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {domain.last_checked_at 
                          ? format(new Date(domain.last_checked_at), 'MMM d, HH:mm')
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-destructive text-sm max-w-[200px] truncate">
                        {domain.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No domain records found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recent Audit Logs
            </CardTitle>
            <CardDescription>
              System actions for debugging and monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.target_type}
                      </TableCell>
                      <TableCell>
                        {(log.profiles as any)?.full_name || (log.profiles as any)?.email || 'System'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>
              Developer tools and monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <a href="/platform-admin/monitoring" className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <Activity className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Monitoring</h3>
                <p className="text-sm text-muted-foreground">System health checks</p>
              </a>
              <a href="/platform-admin/domains" className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <Globe className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Domains</h3>
                <p className="text-sm text-muted-foreground">Manage custom domains</p>
              </a>
              <a href="/platform-admin/audit-logs" className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <Shield className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Audit Logs</h3>
                <p className="text-sm text-muted-foreground">Complete activity log</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
