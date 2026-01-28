import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, User, CheckCircle2, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface OnlineActivationStatsProps {
  organizationId: string;
  compact?: boolean;
}

interface StaffActivation {
  user_id: string;
  full_name: string;
  count: number;
}

export function OnlineActivationStats({ organizationId, compact = false }: OnlineActivationStatsProps) {
  const [dateRange, setDateRange] = useState('7days');

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return startOfDay(now).toISOString();
      case '7days':
        return subDays(now, 7).toISOString();
      case '30days':
        return subDays(now, 30).toISOString();
      default:
        return subDays(now, 7).toISOString();
    }
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['online-activation-stats', organizationId, dateRange],
    queryFn: async () => {
      const dateFilter = getDateFilter();

      // Fetch activated bookings with activator info
      const { data: activations, error } = await supabase
        .from('bookings')
        .select('id, activated_by, activated_at, total_amount')
        .eq('organization_id', organizationId)
        .eq('status', 'activated')
        .not('activated_by', 'is', null)
        .gte('activated_at', dateFilter);

      if (error) throw error;

      // Get unique staff IDs who activated tickets
      const staffIds = [...new Set(activations?.map(a => a.activated_by).filter(Boolean))] as string[];

      // Fetch staff profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Build per-staff stats
      const staffStats = new Map<string, { count: number; name: string }>();
      
      activations?.forEach(activation => {
        if (activation.activated_by) {
          const existing = staffStats.get(activation.activated_by);
          if (existing) {
            existing.count++;
          } else {
            staffStats.set(activation.activated_by, {
              count: 1,
              name: profileMap.get(activation.activated_by) || 'Unknown',
            });
          }
        }
      });

      const byStaff: StaffActivation[] = Array.from(staffStats.entries())
        .map(([user_id, data]) => ({
          user_id,
          full_name: data.name,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        total: activations?.length || 0,
        totalRevenue: activations?.reduce((sum, a) => sum + Number(a.total_amount || 0), 0) || 0,
        byStaff,
      };
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-24 w-full" />
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>Online Ticket Activations</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Globe className="h-4 w-4" />
              Online Activations
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[110px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-2xl font-bold">{stats?.total || 0}</p>
          {stats?.byStaff && stats.byStaff.length > 0 && (
            <div className="mt-3 space-y-1">
              {stats.byStaff.slice(0, 3).map((staff) => (
                <div key={staff.user_id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{staff.full_name}</span>
                  <Badge variant="secondary" className="text-xs">{staff.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Online Ticket Activations
          </CardTitle>
          <CardDescription>Tickets activated at box office from online purchases</CardDescription>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Total Activated
            </div>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Revenue Activated
            </div>
            <p className="text-2xl font-bold">${(stats?.totalRevenue || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Per-Staff Breakdown */}
        {stats?.byStaff && stats.byStaff.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Activations by Staff
            </h4>
            <div className="space-y-2">
              {stats.byStaff.map((staff, index) => (
                <div 
                  key={staff.user_id} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <span className="font-medium">{staff.full_name}</span>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {staff.count} ticket{staff.count !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activations in this period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
