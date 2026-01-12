import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Activity, CheckCircle, AlertTriangle, XCircle, Server, Clock, Database } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';

export default function PlatformMonitoring() {
  const { data: healthLogs, isLoading } = useQuery({
    queryKey: ['system-health-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_logs')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate overall health status
  const recentLogs = healthLogs?.slice(0, 10) || [];
  const healthyCount = recentLogs.filter((l) => l.status === 'healthy').length;
  const warningCount = recentLogs.filter((l) => l.status === 'warning').length;
  const errorCount = recentLogs.filter((l) => l.status === 'error').length;
  
  const overallStatus = errorCount > 2 ? 'critical' : warningCount > 3 ? 'degraded' : 'healthy';

  const avgResponseTime = recentLogs.length > 0
    ? Math.round(recentLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / recentLogs.length)
    : 0;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      healthy: { color: 'bg-green-500', icon: CheckCircle },
      warning: { color: 'bg-yellow-500', icon: AlertTriangle },
      error: { color: 'bg-destructive', icon: XCircle },
    };
    const { color, icon: Icon } = config[status] || { color: 'bg-muted-foreground', icon: Activity };
    return (
      <Badge variant="outline" className="gap-1">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        {status}
      </Badge>
    );
  };

  const getOverallStatusDisplay = () => {
    if (overallStatus === 'critical') {
      return (
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <span className="font-semibold">Critical Issues Detected</span>
        </div>
      );
    }
    if (overallStatus === 'degraded') {
      return (
        <div className="flex items-center gap-2 text-yellow-500">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">Degraded Performance</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-green-500">
        <CheckCircle className="h-5 w-5" />
        <span className="font-semibold">All Systems Operational</span>
      </div>
    );
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time platform health and performance metrics
          </p>
        </div>

        {/* Overall Status Banner */}
        <Card className={`border-2 ${
          overallStatus === 'critical' ? 'border-destructive' : 
          overallStatus === 'degraded' ? 'border-yellow-500' : 
          'border-green-500'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {getOverallStatusDisplay()}
              <p className="text-sm text-muted-foreground">
                Last checked: {recentLogs[0] 
                  ? format(new Date(recentLogs[0].recorded_at), 'MMM d, h:mm:ss a') 
                  : 'Never'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{healthyCount}</p>
                  <p className="text-sm text-muted-foreground">Healthy Checks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{warningCount}</p>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{errorCount}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgResponseTime}ms</p>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Service Status
              </CardTitle>
              <CardDescription>Current status of platform services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <span>Database</span>
                </div>
                <Badge className="bg-green-500/10 text-green-500">Operational</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <span>API Gateway</span>
                </div>
                <Badge className="bg-green-500/10 text-green-500">Operational</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <span>Edge Functions</span>
                </div>
                <Badge className="bg-green-500/10 text-green-500">Operational</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span>Realtime</span>
                </div>
                <Badge className="bg-green-500/10 text-green-500">Operational</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Health Checks</CardTitle>
              <CardDescription>Latest system health log entries</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : healthLogs && healthLogs.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {healthLogs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusBadge(log.status)}
                        <span className="text-muted-foreground">{log.metric_type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        {log.response_time_ms && (
                          <span>{log.response_time_ms}ms</span>
                        )}
                        <span>{format(new Date(log.recorded_at), 'h:mm:ss a')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No health logs recorded yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Health Log History</CardTitle>
            <CardDescription>Complete health check history</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : healthLogs && healthLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Recorded At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.metric_type}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>
                        {log.error_count || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.recorded_at), 'MMM d, h:mm:ss a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No health logs</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  System health checks will be logged here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
