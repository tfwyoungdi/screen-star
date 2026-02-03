import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/currency';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOrganization } from '@/hooks/useUserProfile';
import { useImpersonation } from '@/hooks/useImpersonation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Users,
  DollarSign,
  Popcorn,
  Lightbulb,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Target,
  Calendar,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface AttendancePrediction {
  predictions: { date: string; predictedBookings: number; confidence: string; reason?: string }[];
  weeklyTotal: number;
  trend: string;
  trendPercentage: number;
  peakDay: string;
  recommendations: string[];
}

interface RevenuePrediction {
  predictions: { date: string; predictedRevenue: number; confidence: string }[];
  weeklyTotal: number;
  monthlyProjection: number;
  trend: string;
  trendPercentage: number;
  revenueOpportunities: string[];
  riskFactors: string[];
}

interface BusinessInsights {
  performanceScore: number;
  performanceLabel: string;
  keyInsights: { title: string; description: string; impact: string; actionable: boolean }[];
  growthOpportunities: string[];
  riskAlerts: string[];
  competitiveAdvantages: string[];
  suggestedActions: { action: string; expectedImpact: string; difficulty: string; timeframe: string }[];
}

const fetchPrediction = async (organizationId: string, type: string) => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-predictions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        organizationId,
        predictionType: type,
        daysAhead: 7,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch predictions');
  }

  return response.json();
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const ConfidenceBadge = ({ confidence }: { confidence: string }) => {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    high: 'default',
    medium: 'secondary',
    low: 'outline',
  };
  return (
    <Badge variant={variants[confidence] || 'outline'} className="text-xs">
      {confidence}
    </Badge>
  );
};

const ImpactBadge = ({ impact }: { impact: string }) => {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[impact] || colors.medium}`}>
      {impact}
    </span>
  );
};

const DifficultyBadge = ({ difficulty }: { difficulty: string }) => {
  const colors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[difficulty] || colors.medium}`}>
      {difficulty}
    </span>
  );
};

export default function PredictiveAnalytics() {
  const [activeTab, setActiveTab] = useState('attendance');
  const { data: organization } = useOrganization();
  const { isImpersonating, impersonatedOrganization } = useImpersonation();
  
  const effectiveOrg = isImpersonating ? impersonatedOrganization : organization;
  const organizationId = effectiveOrg?.id;

  const {
    data: attendanceData,
    isLoading: loadingAttendance,
    refetch: refetchAttendance,
    isFetching: fetchingAttendance,
  } = useQuery<AttendancePrediction>({
    queryKey: ['predictions', organizationId, 'attendance'],
    queryFn: () => fetchPrediction(organizationId!, 'attendance'),
    enabled: !!organizationId && activeTab === 'attendance',
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });

  const {
    data: revenueData,
    isLoading: loadingRevenue,
    refetch: refetchRevenue,
    isFetching: fetchingRevenue,
  } = useQuery<RevenuePrediction>({
    queryKey: ['predictions', organizationId, 'revenue'],
    queryFn: () => fetchPrediction(organizationId!, 'revenue'),
    enabled: !!organizationId && activeTab === 'revenue',
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const {
    data: insightsData,
    isLoading: loadingInsights,
    refetch: refetchInsights,
    isFetching: fetchingInsights,
  } = useQuery<BusinessInsights>({
    queryKey: ['predictions', organizationId, 'insights'],
    queryFn: () => fetchPrediction(organizationId!, 'insights'),
    enabled: !!organizationId && activeTab === 'insights',
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const handleRefresh = () => {
    if (activeTab === 'attendance') refetchAttendance();
    else if (activeTab === 'revenue') refetchRevenue();
    else if (activeTab === 'insights') refetchInsights();
    toast.success('Refreshing predictions...');
  };

  const isLoading = loadingAttendance || loadingRevenue || loadingInsights;
  const isFetching = fetchingAttendance || fetchingRevenue || fetchingInsights;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">AI Predictive Analytics</h1>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI-Powered
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Forecast attendance, revenue, and get actionable business insights
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={isFetching} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="attendance" className="gap-2">
              <Users className="h-4 w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="revenue" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Attendance Predictions */}
          <TabsContent value="attendance" className="space-y-6">
            {loadingAttendance || fetchingAttendance ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : attendanceData ? (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Weekly Forecast</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold">{attendanceData.weeklyTotal}</span>
                        <span className="text-muted-foreground">tickets</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Trend</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={attendanceData.trend} />
                        <span className="text-2xl font-bold">
                          {attendanceData.trendPercentage > 0 ? '+' : ''}
                          {attendanceData.trendPercentage}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Peak Day</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span className="text-xl font-bold">{attendanceData.peakDay}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Daily Average</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-2xl font-bold">
                        {Math.round(attendanceData.weeklyTotal / 7)}
                      </span>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>7-Day Attendance Forecast</CardTitle>
                    <CardDescription>Predicted ticket sales based on historical patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={attendanceData.predictions}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'short' })}
                            className="text-xs"
                          />
                          <YAxis className="text-xs" />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium">
                                    {new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                  </p>
                                  <p className="text-primary font-bold">{data.predictedBookings} tickets</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <ConfidenceBadge confidence={data.confidence} />
                                  </div>
                                  {data.reason && <p className="text-xs text-muted-foreground mt-1">{data.reason}</p>}
                                </div>
                              );
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="predictedBookings"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary) / 0.2)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {attendanceData.recommendations?.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No attendance data available. Try refreshing.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Revenue Predictions */}
          <TabsContent value="revenue" className="space-y-6">
            {loadingRevenue || fetchingRevenue ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : revenueData ? (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Weekly Forecast</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-3xl font-bold">{formatCurrency(revenueData.weeklyTotal || 0, organization?.currency)}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Monthly Projection</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-2xl font-bold">{formatCurrency(revenueData.monthlyProjection || 0, organization?.currency)}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Trend</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={revenueData.trend} />
                        <span className="text-2xl font-bold">
                          {revenueData.trendPercentage > 0 ? '+' : ''}
                          {revenueData.trendPercentage}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Daily Average</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-2xl font-bold">
                        {formatCurrency(Math.round((revenueData.weeklyTotal || 0) / 7), organization?.currency)}
                      </span>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>7-Day Revenue Forecast</CardTitle>
                    <CardDescription>Projected revenue based on booking patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData.predictions}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'short' })}
                          />
                          <YAxis tickFormatter={(val) => `$${val}`} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium">
                                    {new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                  </p>
                                  <p className="text-primary font-bold">{formatCurrency(data.predictedRevenue || 0, organization?.currency)}</p>
                                  <ConfidenceBadge confidence={data.confidence} />
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="predictedRevenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Opportunities & Risks */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <ArrowUpRight className="h-5 w-5" />
                        Revenue Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {revenueData.revenueOpportunities?.map((opp, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        Risk Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {revenueData.riskFactors?.map((risk, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No revenue data available. Try refreshing.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Business Insights */}
          <TabsContent value="insights" className="space-y-6">
            {loadingInsights || fetchingInsights ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : insightsData ? (
              <>
                {/* Performance Score */}
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle>Overall Performance Score</CardTitle>
                    <CardDescription>AI-calculated based on your booking and revenue data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className="relative h-32 w-32">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="10"
                            fill="none"
                            className="text-muted"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="10"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(insightsData.performanceScore / 100) * 283} 283`}
                            className="text-primary transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-bold">{insightsData.performanceScore}</span>
                        </div>
                      </div>
                      <div>
                        <Badge
                          variant={
                            insightsData.performanceLabel === 'Excellent'
                              ? 'default'
                              : insightsData.performanceLabel === 'Good'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-lg px-4 py-1"
                        >
                          {insightsData.performanceLabel}
                        </Badge>
                        <p className="text-muted-foreground mt-2 max-w-md">
                          Your cinema is performing{' '}
                          {insightsData.performanceScore >= 80
                            ? 'exceptionally well'
                            : insightsData.performanceScore >= 60
                            ? 'solidly'
                            : 'below potential'}
                          . See below for actionable insights.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insightsData.keyInsights?.map((insight, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{insight.title}</h4>
                            <ImpactBadge impact={insight.impact} />
                          </div>
                          <p className="text-muted-foreground text-sm">{insight.description}</p>
                          {insight.actionable && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Actionable
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Suggested Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Suggested Actions
                    </CardTitle>
                    <CardDescription>Prioritized steps to improve performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insightsData.suggestedActions?.map((action, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">{action.action}</h4>
                              <p className="text-muted-foreground text-sm mt-1">{action.expectedImpact}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <DifficultyBadge difficulty={action.difficulty} />
                              <span className="text-xs text-muted-foreground">{action.timeframe}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Growth & Risks */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <ArrowUpRight className="h-5 w-5" />
                        Growth Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {insightsData.growthOpportunities?.map((opp, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        Risk Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {insightsData.riskAlerts?.map((risk, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No insights data available. Try refreshing.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
