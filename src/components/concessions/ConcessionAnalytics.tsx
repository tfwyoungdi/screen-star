import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, ShoppingBag, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DATE_RANGE_OPTIONS, DateRangeValue, getDateRange, getDateRangeLabel } from '@/lib/dateRanges';

interface ConcessionAnalyticsProps {
  organizationId: string;
  currencySymbol?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ConcessionAnalytics({ organizationId, currencySymbol = '$' }: ConcessionAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRangeValue>('today');
  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['concession-analytics', organizationId, dateRange],
    queryFn: async () => {
      // First get bookings in the date range
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (bookingsError) throw bookingsError;

      const bookingIds = bookings?.map(b => b.id) || [];
      
      if (bookingIds.length === 0) {
        return {
          topItems: [],
          categoryData: [],
          totalRevenue: 0,
          totalQuantity: 0,
          avgOrderValue: 0,
          bestSeller: 'N/A',
        };
      }

      // Get all booking concessions with item details for those bookings
      const { data: concessions, error } = await supabase
        .from('booking_concessions')
        .select(`
          quantity,
          unit_price,
          concession_items!inner (
            id,
            name,
            category,
            organization_id
          )
        `)
        .in('booking_id', bookingIds)
        .eq('concession_items.organization_id', organizationId);

      if (error) throw error;

      // Process data for analytics
      const itemSales: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {};
      const categorySales: Record<string, { quantity: number; revenue: number }> = {};

      concessions?.forEach((c: any) => {
        const itemId = c.concession_items.id;
        const itemName = c.concession_items.name;
        const category = c.concession_items.category;
        const qty = c.quantity;
        const rev = c.quantity * c.unit_price;

        // Item sales
        if (!itemSales[itemId]) {
          itemSales[itemId] = { name: itemName, category, quantity: 0, revenue: 0 };
        }
        itemSales[itemId].quantity += qty;
        itemSales[itemId].revenue += rev;

        // Category sales
        if (!categorySales[category]) {
          categorySales[category] = { quantity: 0, revenue: 0 };
        }
        categorySales[category].quantity += qty;
        categorySales[category].revenue += rev;
      });

      const topItems = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      const categoryData = Object.entries(categorySales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      const totalRevenue = Object.values(itemSales).reduce((sum, item) => sum + item.revenue, 0);
      const totalQuantity = Object.values(itemSales).reduce((sum, item) => sum + item.quantity, 0);
      const avgOrderValue = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

      return {
        topItems,
        categoryData,
        totalRevenue,
        totalQuantity,
        avgOrderValue,
        bestSeller: topItems[0]?.name || 'N/A',
      };
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeValue)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{salesData?.totalRevenue.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">{getDateRangeLabel(dateRange)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData?.totalQuantity || 0}</div>
            <p className="text-xs text-muted-foreground">Total units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Item Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{salesData?.avgOrderValue.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">Per item sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Best Seller</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{salesData?.bestSeller}</div>
            <p className="text-xs text-muted-foreground">Most popular item</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
            <CardDescription>Quantity sold by item</CardDescription>
          </CardHeader>
          <CardContent>
            {salesData?.topItems && salesData.topItems.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData.topItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Revenue distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {salesData?.categoryData && salesData.categoryData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={salesData.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="revenue"
                      nameKey="name"
                      paddingAngle={2}
                    >
                      {salesData.categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center">
                  {salesData.categoryData.map((cat, index) => (
                    <Badge key={cat.name} variant="outline" className="capitalize">
                      <span
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {cat.name}: {currencySymbol}{cat.revenue.toFixed(2)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}