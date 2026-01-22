import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Ticket, TrendingUp, Film, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface PromoCodeAnalyticsProps {
  organizationId: string | undefined;
}

interface PromoCodeStats {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  current_uses: number;
}

interface BookingWithPromo {
  id: string;
  promo_code_id: string;
  discount_amount: number;
  total_amount: number;
  showtimes: {
    movie_id: string;
    movies: {
      title: string;
    };
  } | null;
}

export function PromoCodeAnalytics({ organizationId }: PromoCodeAnalyticsProps) {
  // Fetch promo codes with usage data
  const { data: promoCodes, isLoading: codesLoading } = useQuery({
    queryKey: ['promo-codes-analytics', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, current_uses')
        .eq('organization_id', organizationId)
        .order('current_uses', { ascending: false });
      if (error) throw error;
      return data as PromoCodeStats[];
    },
    enabled: !!organizationId,
  });

  // Fetch bookings with promo codes to calculate total discounts and revenue by movie
  const { data: bookingsWithPromos, isLoading: bookingsLoading } = useQuery({
    queryKey: ['promo-bookings-analytics', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          promo_code_id,
          discount_amount,
          total_amount,
          showtimes (
            movie_id,
            movies (
              title
            )
          )
        `)
        .eq('organization_id', organizationId)
        .not('promo_code_id', 'is', null);
      if (error) throw error;
      return data as BookingWithPromo[];
    },
    enabled: !!organizationId,
  });

  const isLoading = codesLoading || bookingsLoading;

  // Calculate metrics
  const totalRedemptions = promoCodes?.reduce((sum, p) => sum + p.current_uses, 0) || 0;
  const totalDiscountsGiven = bookingsWithPromos?.reduce((sum, b) => sum + (b.discount_amount || 0), 0) || 0;
  const totalRevenueWithPromos = bookingsWithPromos?.reduce((sum, b) => sum + b.total_amount, 0) || 0;
  const avgDiscountPerBooking = bookingsWithPromos?.length ? totalDiscountsGiven / bookingsWithPromos.length : 0;

  // Top promo codes by usage
  const topPromoCodes = (promoCodes || [])
    .filter(p => p.current_uses > 0)
    .slice(0, 5)
    .map(p => ({
      name: p.code,
      uses: p.current_uses,
      type: p.discount_type,
      value: p.discount_value,
    }));

  // Revenue impact by movie
  const revenueByMovie = (bookingsWithPromos || []).reduce((acc, booking) => {
    const movieTitle = booking.showtimes?.movies?.title || 'Unknown';
    if (!acc[movieTitle]) {
      acc[movieTitle] = { discounts: 0, revenue: 0, bookings: 0 };
    }
    acc[movieTitle].discounts += booking.discount_amount || 0;
    acc[movieTitle].revenue += booking.total_amount;
    acc[movieTitle].bookings += 1;
    return acc;
  }, {} as Record<string, { discounts: number; revenue: number; bookings: number }>);

  const movieRevenueData = Object.entries(revenueByMovie)
    .map(([name, data]) => ({
      name: name.length > 15 ? name.slice(0, 15) + '...' : name,
      discounts: data.discounts,
      revenue: data.revenue,
      bookings: data.bookings,
    }))
    .sort((a, b) => b.discounts - a.discounts)
    .slice(0, 5);

  // Discount type distribution
  const discountTypeData = (promoCodes || []).reduce((acc, code) => {
    const type = code.discount_type === 'percentage' ? 'Percentage' : 'Fixed';
    const existing = acc.find(a => a.name === type);
    if (existing) {
      existing.value += code.current_uses;
    } else {
      acc.push({ name: type, value: code.current_uses });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Total Redemptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRedemptions}</div>
            <p className="text-xs text-muted-foreground">All-time promo uses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Discounts Given
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${totalDiscountsGiven.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Value of all discounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue with Promos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalRevenueWithPromos.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From promo bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Avg Discount per Booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgDiscountPerBooking.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per promo booking</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Promo Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Most Used Promo Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {topPromoCodes.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topPromoCodes} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} uses (${props.payload.type === 'percentage' ? `${props.payload.value}%` : `$${props.payload.value}`})`,
                      'Usage'
                    ]}
                  />
                  <Bar dataKey="uses" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No promo codes have been used yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discount Impact by Movie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Film className="h-5 w-5" />
              Discounts by Movie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {movieRevenueData.length > 0 ? (
              <div className="space-y-3">
                {movieRevenueData.map((movie, index) => (
                  <div key={movie.name} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{movie.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {movie.bookings} booking{movie.bookings !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="text-destructive">-${movie.discounts.toFixed(2)} discounts</span>
                        <span className="text-primary">${movie.revenue.toFixed(2)} revenue</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No promo bookings by movie yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discount Type Distribution */}
      {discountTypeData.some(d => d.value > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Discount Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8">
              <ResponsiveContainer width={200} height={150}>
                <PieChart>
                  <Pie
                    data={discountTypeData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {discountTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {discountTypeData.filter(d => d.value > 0).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <span className="text-sm">{entry.name}: {entry.value} uses</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
