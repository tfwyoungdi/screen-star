import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Mail, Eye, MousePointer, TrendingUp, Send } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export function PlatformEmailAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['platform-email-analytics'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data, error } = await supabase
        .from('platform_email_analytics')
        .select('*')
        .gte('sent_at', thirtyDaysAgo)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEmails = analytics?.length || 0;
  const openedEmails = analytics?.filter(e => e.opened_at)?.length || 0;
  const clickedEmails = analytics?.filter(e => e.clicked_at)?.length || 0;
  const openRate = totalEmails > 0 ? ((openedEmails / totalEmails) * 100).toFixed(1) : '0';
  const clickRate = openedEmails > 0 ? ((clickedEmails / openedEmails) * 100).toFixed(1) : '0';

  // Group by email type
  const byType = analytics?.reduce((acc, email) => {
    acc[email.email_type] = (acc[email.email_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const typeData = Object.entries(byType).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value,
  }));

  // Group by day for the last 7 days
  const dailyData = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayEmails = analytics?.filter(e => {
      const sentDate = new Date(e.sent_at);
      return sentDate >= dayStart && sentDate <= dayEnd;
    }) || [];

    dailyData.push({
      date: format(date, 'EEE'),
      sent: dayEmails.length,
      opened: dayEmails.filter(e => e.opened_at).length,
    });
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Platform Email Analytics
        </CardTitle>
        <CardDescription>
          Email performance metrics for the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Send className="h-4 w-4" />
              Total Sent
            </div>
            <p className="text-2xl font-bold mt-1">{totalEmails}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Eye className="h-4 w-4" />
              Opened
            </div>
            <p className="text-2xl font-bold mt-1">{openedEmails}</p>
            <Badge variant="secondary" className="mt-1">{openRate}%</Badge>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MousePointer className="h-4 w-4" />
              Clicked
            </div>
            <p className="text-2xl font-bold mt-1">{clickedEmails}</p>
            <Badge variant="secondary" className="mt-1">{clickRate}%</Badge>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Engagement
            </div>
            <p className="text-2xl font-bold mt-1">{openRate}%</p>
            <span className="text-xs text-muted-foreground">Open Rate</span>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Activity */}
          <div>
            <h4 className="font-medium mb-4">Daily Activity (Last 7 Days)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill="hsl(var(--chart-2))" name="Opened" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By Type */}
          <div>
            <h4 className="font-medium mb-4">Emails by Type</h4>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {typeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No email data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Emails */}
        {analytics && analytics.length > 0 && (
          <div>
            <h4 className="font-medium mb-4">Recent Emails</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {analytics.slice(0, 10).map((email) => (
                <div 
                  key={email.id} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground">{email.recipient_email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="outline" className="text-xs">
                      {email.email_type.replace(/_/g, ' ')}
                    </Badge>
                    {email.clicked_at ? (
                      <Badge className="bg-green-500/10 text-green-600 text-xs">Clicked</Badge>
                    ) : email.opened_at ? (
                      <Badge className="bg-blue-500/10 text-blue-600 text-xs">Opened</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Sent</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
