import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { ChartCard } from './ChartCard';
import { Globe, Users, Eye, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WebsiteStatsWidgetProps {
  organizationId: string | undefined;
  cinemaSlug: string | undefined;
}

export function WebsiteStatsWidget({ organizationId, cinemaSlug }: WebsiteStatsWidgetProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['website-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const now = new Date();
      const today = startOfDay(now);
      const last7Days = subDays(today, 7);
      const last30Days = subDays(today, 30);

      // Fetch all page views for the last 30 days
      const { data: pageViews, error } = await supabase
        .from('page_views')
        .select('id, visitor_id, created_at, page_path')
        .eq('organization_id', organizationId)
        .gte('created_at', last30Days.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const totalViews = pageViews?.length || 0;
      const todayViews = pageViews?.filter(v => 
        new Date(v.created_at) >= today
      ).length || 0;
      const last7DaysViews = pageViews?.filter(v => 
        new Date(v.created_at) >= last7Days
      ).length || 0;

      // Count unique visitors (by visitor_id)
      const uniqueVisitors = new Set(pageViews?.map(v => v.visitor_id).filter(Boolean)).size;

      // Views by day for the last 7 days
      const viewsByDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(now, i), 'EEE');
        viewsByDay[date] = 0;
      }
      
      pageViews?.filter(v => new Date(v.created_at) >= last7Days).forEach(view => {
        const day = format(new Date(view.created_at), 'EEE');
        if (viewsByDay[day] !== undefined) {
          viewsByDay[day]++;
        }
      });

      return {
        totalViews,
        todayViews,
        last7DaysViews,
        uniqueVisitors,
        viewsByDay,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <ChartCard title="Website Stats" className="lg:col-span-1">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </ChartCard>
    );
  }

  const statItems = [
    { 
      label: 'Today', 
      value: stats?.todayViews || 0, 
      icon: Eye,
      color: 'text-primary'
    },
    { 
      label: 'Last 7 Days', 
      value: stats?.last7DaysViews || 0, 
      icon: TrendingUp,
      color: 'text-emerald-500'
    },
    { 
      label: 'Total Views', 
      value: stats?.totalViews || 0, 
      icon: Globe,
      color: 'text-blue-500'
    },
    { 
      label: 'Unique Visitors', 
      value: stats?.uniqueVisitors || 0, 
      icon: Users,
      color: 'text-purple-500'
    },
  ];

  return (
    <ChartCard 
      title="Website Stats"
      className="lg:col-span-1"
      actions={cinemaSlug ? [
        { 
          label: 'View Site →', 
          onClick: () => window.open(`/cinema/${cinemaSlug}`, '_blank')
        }
      ] : undefined}
    >
      <div className="space-y-3">
        {statItems.map((item) => (
          <div 
            key={item.label} 
            className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-background ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <span className="text-lg font-semibold tabular-nums">
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
