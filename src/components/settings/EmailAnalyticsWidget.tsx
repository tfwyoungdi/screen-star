import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MousePointerClick, Eye, TrendingUp, BarChart3 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface EmailAnalytics {
  id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  opened_count: number;
  clicked_at: string | null;
  clicked_count: number;
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  booking_confirmation: "Booking Confirmation",
  showtime_reminder: "Showtime Reminder",
  cancellation_confirmation: "Cancellation",
  application_confirmation: "Application",
  contact_notification: "Contact Notification",
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function EmailAnalyticsWidget() {
  const { user } = useAuth();

  const { data: organization } = useQuery({
    queryKey: ["organization", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.organization_id) return null;

      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();

      return data;
    },
    enabled: !!user,
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["email-analytics", organization?.id],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("email_analytics")
        .select("*")
        .eq("organization_id", organization!.id)
        .gte("sent_at", thirtyDaysAgo)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data as EmailAnalytics[];
    },
    enabled: !!organization?.id,
  });

  // Calculate metrics
  const totalSent = analytics?.length || 0;
  const totalOpened = analytics?.filter((a) => a.opened_at).length || 0;
  const totalClicked = analytics?.filter((a) => a.clicked_at).length || 0;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : "0";

  // Group by email type
  const typeStats = analytics?.reduce(
    (acc, a) => {
      const type = a.email_type;
      if (!acc[type]) {
        acc[type] = { sent: 0, opened: 0, clicked: 0 };
      }
      acc[type].sent++;
      if (a.opened_at) acc[type].opened++;
      if (a.clicked_at) acc[type].clicked++;
      return acc;
    },
    {} as Record<string, { sent: number; opened: number; clicked: number }>
  );

  // Prepare chart data
  const pieData = Object.entries(typeStats || {}).map(([type, stats]) => ({
    name: EMAIL_TYPE_LABELS[type] || type,
    value: stats.sent,
  }));

  const barData = Object.entries(typeStats || {}).map(([type, stats]) => ({
    name: EMAIL_TYPE_LABELS[type] || type,
    sent: stats.sent,
    opened: stats.opened,
    clicked: stats.clicked,
    openRate: stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : 0,
  }));

  // Daily send data for the last 7 days
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const daySent = analytics?.filter((a) => {
      const sentDate = new Date(a.sent_at);
      return sentDate >= dayStart && sentDate <= dayEnd;
    }).length || 0;

    const dayOpened = analytics?.filter((a) => {
      if (!a.opened_at) return false;
      const sentDate = new Date(a.sent_at);
      return sentDate >= dayStart && sentDate <= dayEnd;
    }).length || 0;

    return {
      date: format(date, "MMM d"),
      sent: daySent,
      opened: dayOpened,
    };
  });

  if (isLoading || !organization) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Email Analytics
        </CardTitle>
        <CardDescription>Track email performance over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <Mail className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{totalSent}</p>
            <p className="text-xs text-muted-foreground">Emails Sent</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <Eye className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{totalOpened}</p>
            <p className="text-xs text-muted-foreground">Opened</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-primary">{openRate}%</p>
            <p className="text-xs text-muted-foreground">Open Rate</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <MousePointerClick className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{clickRate}%</p>
            <p className="text-xs text-muted-foreground">Click Rate</p>
          </div>
        </div>

        <Tabs defaultValue="trends">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="types">By Type</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="pt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="sent" name="Sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="opened" name="Opened" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="types" className="pt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {barData.map((item) => (
                  <div key={item.name} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.sent} sent</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{item.opened} opened</span>
                      <span>{item.openRate}% rate</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="pt-4">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {analytics?.slice(0, 20).map((email) => (
                <div key={email.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground">{email.recipient_email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {email.opened_at && (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <Eye className="h-3 w-3" />
                        Opened
                      </span>
                    )}
                    {email.clicked_at && (
                      <span className="flex items-center gap-1 text-xs text-blue-500">
                        <MousePointerClick className="h-3 w-3" />
                        Clicked
                      </span>
                    )}
                    {!email.opened_at && (
                      <span className="text-xs text-muted-foreground">Sent</span>
                    )}
                  </div>
                </div>
              ))}
              {(!analytics || analytics.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No emails sent yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
