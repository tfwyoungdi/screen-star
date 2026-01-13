import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { SLAIndicator } from '@/components/platform-admin/SLAIndicator';
import { format, differenceInHours, differenceInMinutes, subDays } from 'date-fns';
import {
  Timer,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Target,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function PlatformSLA() {
  // Fetch SLA settings
  const { data: slaSettings } = useQuery({
    queryKey: ['platform-sla-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('sla_response_time_low, sla_response_time_medium, sla_response_time_high, sla_response_time_urgent')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? {
        low: (data as any).sla_response_time_low || 72,
        medium: (data as any).sla_response_time_medium || 24,
        high: (data as any).sla_response_time_high || 8,
        urgent: (data as any).sla_response_time_urgent || 2,
      } : { low: 72, medium: 24, high: 8, urgent: 2 };
    },
  });

  // Fetch all tickets for SLA analysis
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['sla-tickets-analysis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          organizations (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate SLA metrics
  const getSLATargetHours = (priority: string) => {
    if (!slaSettings) return 24;
    const targets: Record<string, number> = {
      urgent: slaSettings.urgent,
      high: slaSettings.high,
      medium: slaSettings.medium,
      low: slaSettings.low,
    };
    return targets[priority] || 24;
  };

  const calculateMetrics = () => {
    if (!tickets || tickets.length === 0) {
      return {
        totalTickets: 0,
        resolvedTickets: 0,
        breachedTickets: 0,
        atRiskTickets: 0,
        avgResponseTime: 0,
        complianceRate: 100,
        ticketsAtRisk: [],
      };
    }

    let resolvedWithinSLA = 0;
    let breachedCount = 0;
    let totalResponseTime = 0;
    let respondedCount = 0;
    const atRiskList: any[] = [];

    const now = new Date();

    tickets.forEach((ticket: any) => {
      const createdAt = new Date(ticket.created_at);
      const targetHours = getSLATargetHours(ticket.priority);
      const firstResponseAt = ticket.first_response_at ? new Date(ticket.first_response_at) : null;

      if (firstResponseAt) {
        const responseHours = differenceInHours(firstResponseAt, createdAt);
        totalResponseTime += responseHours;
        respondedCount++;

        if (responseHours <= targetHours) {
          resolvedWithinSLA++;
        } else {
          breachedCount++;
        }
      } else if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
        const hoursElapsed = differenceInHours(now, createdAt);
        const percentUsed = (hoursElapsed / targetHours) * 100;

        if (hoursElapsed > targetHours) {
          breachedCount++;
        } else if (percentUsed >= 75) {
          atRiskList.push({
            ...ticket,
            hoursRemaining: targetHours - hoursElapsed,
            percentUsed,
          });
        }
      }
    });

    const resolvedTickets = tickets.filter(
      (t: any) => t.status === 'resolved' || t.status === 'closed'
    ).length;

    const complianceRate = respondedCount > 0 
      ? Math.round((resolvedWithinSLA / respondedCount) * 100) 
      : 100;

    return {
      totalTickets: tickets.length,
      resolvedTickets,
      breachedTickets: breachedCount,
      atRiskTickets: atRiskList.length,
      avgResponseTime: respondedCount > 0 ? Math.round(totalResponseTime / respondedCount) : 0,
      complianceRate,
      ticketsAtRisk: atRiskList.sort((a, b) => a.hoursRemaining - b.hoursRemaining).slice(0, 10),
    };
  };

  const metrics = calculateMetrics();

  // Prepare chart data
  const getComplianceChartData = () => {
    if (!tickets) return [];
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'MMM d'),
        dateObj: date,
        compliant: 0,
        breached: 0,
        total: 0,
      };
    });

    tickets.forEach((ticket: any) => {
      const createdAt = new Date(ticket.created_at);
      const dayIndex = last7Days.findIndex(
        d => format(d.dateObj, 'yyyy-MM-dd') === format(createdAt, 'yyyy-MM-dd')
      );

      if (dayIndex !== -1) {
        last7Days[dayIndex].total++;
        const targetHours = getSLATargetHours(ticket.priority);
        const firstResponseAt = ticket.first_response_at ? new Date(ticket.first_response_at) : null;

        if (firstResponseAt) {
          const responseHours = differenceInHours(firstResponseAt, createdAt);
          if (responseHours <= targetHours) {
            last7Days[dayIndex].compliant++;
          } else {
            last7Days[dayIndex].breached++;
          }
        }
      }
    });

    return last7Days;
  };

  const getPriorityDistribution = () => {
    if (!tickets) return [];
    
    const distribution = { urgent: 0, high: 0, medium: 0, low: 0 };
    tickets.forEach((ticket: any) => {
      if (distribution[ticket.priority as keyof typeof distribution] !== undefined) {
        distribution[ticket.priority as keyof typeof distribution]++;
      }
    });

    return [
      { name: 'Urgent', value: distribution.urgent, color: '#dc2626' },
      { name: 'High', value: distribution.high, color: '#ea580c' },
      { name: 'Medium', value: distribution.medium, color: '#ca8a04' },
      { name: 'Low', value: distribution.low, color: '#16a34a' },
    ].filter(d => d.value > 0);
  };

  const complianceData = getComplianceChartData();
  const priorityData = getPriorityDistribution();

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SLA Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor SLA compliance, response times, and at-risk tickets
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.complianceRate}%</p>
                  <p className="text-xs text-muted-foreground">SLA Compliance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.avgResponseTime}h</p>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.atRiskTickets}</p>
                  <p className="text-xs text-muted-foreground">At Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Timer className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.breachedTickets}</p>
                  <p className="text-xs text-muted-foreground">SLA Breached</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compliance Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                SLA Compliance Trend (Last 7 Days)
              </CardTitle>
              <CardDescription>Daily ticket compliance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={complianceData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="compliant"
                      stackId="1"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                      name="Compliant"
                    />
                    <Area
                      type="monotone"
                      dataKey="breached"
                      stackId="1"
                      stroke="hsl(var(--destructive))"
                      fill="hsl(var(--destructive))"
                      fillOpacity={0.6}
                      name="Breached"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Priority Distribution
              </CardTitle>
              <CardDescription>Tickets by priority level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No ticket data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* At-Risk Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Tickets At Risk
            </CardTitle>
            <CardDescription>
              Tickets approaching their SLA deadline (75%+ time elapsed)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : metrics.ticketsAtRisk.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cinema</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Time Remaining</TableHead>
                    <TableHead>SLA Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.ticketsAtRisk.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">
                        {ticket.organizations?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            ticket.priority === 'urgent'
                              ? 'bg-destructive/10 text-destructive'
                              : ticket.priority === 'high'
                              ? 'bg-orange-500/10 text-orange-600'
                              : ticket.priority === 'medium'
                              ? 'bg-yellow-500/10 text-yellow-600'
                              : 'bg-muted'
                          }
                        >
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-orange-600 font-medium">
                          {ticket.hoursRemaining.toFixed(1)}h remaining
                        </span>
                      </TableCell>
                      <TableCell>
                        <SLAIndicator
                          createdAt={ticket.created_at}
                          priority={ticket.priority}
                          firstResponseAt={ticket.first_response_at}
                          status={ticket.status}
                          slaSettings={slaSettings}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium">All Clear!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  No tickets are currently at risk of breaching SLA.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SLA Targets Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Current SLA Targets</CardTitle>
            <CardDescription>Response time targets by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive">Urgent</p>
                <p className="text-2xl font-bold">{slaSettings?.urgent || 2}h</p>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm font-medium text-orange-600">High</p>
                <p className="text-2xl font-bold">{slaSettings?.high || 8}h</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm font-medium text-yellow-600">Medium</p>
                <p className="text-2xl font-bold">{slaSettings?.medium || 24}h</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm font-medium text-green-600">Low</p>
                <p className="text-2xl font-bold">{slaSettings?.low || 72}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
