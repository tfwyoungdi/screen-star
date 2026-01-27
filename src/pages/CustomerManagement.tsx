import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay } from 'date-fns';
import {
  Search,
  Users,
  Star,
  TrendingUp,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Ticket,
  Award,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { CustomerEmailBlast } from '@/components/customers/CustomerEmailBlast';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  loyalty_points: number;
  total_spent: number;
  total_bookings: number;
  first_booking_at: string | null;
  last_booking_at: string | null;
  created_at: string;
}

const DATE_FILTERS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
  { label: '90d', value: 90 },
  { label: '6mo', value: 183 },
  { label: '1yr', value: 365 },
  { label: 'All', value: null },
];

export default function CustomerManagement() {
  const { data: profile } = useUserProfile();
  const { getEffectiveOrganizationId } = useImpersonation();
  const effectiveOrgId = getEffectiveOrganizationId(profile?.organization_id);
  const { organization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dateRange, setDateRange] = useState<number | null>(30);
  const startDate = dateRange ? startOfDay(subDays(new Date(), dateRange)) : null;

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', effectiveOrgId, dateRange],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      let query = supabase
        .from('customers')
        .select('*')
        .eq('organization_id', effectiveOrgId);
      
      if (startDate) {
        query = query.gte('last_booking_at', startDate.toISOString());
      }
      
      const { data, error } = await query.order('total_spent', { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!effectiveOrgId,
  });

  const { data: customerBookings } = useQuery({
    queryKey: ['customer-bookings', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          showtimes (
            start_time,
            movies (title),
            screens (name)
          )
        `)
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer,
  });

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCustomers = customers?.length || 0;
  const totalLoyaltyPoints = customers?.reduce((sum, c) => sum + c.loyalty_points, 0) || 0;
  const totalRevenue = customers?.reduce((sum, c) => sum + Number(c.total_spent), 0) || 0;
  const avgSpendPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  const getLoyaltyTier = (points: number) => {
    if (points >= 1000) return { name: 'Gold', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    if (points >= 500) return { name: 'Silver', color: 'bg-slate-400/10 text-slate-600 border-slate-400/20' };
    if (points >= 100) return { name: 'Bronze', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
    return { name: 'Member', color: 'bg-muted text-muted-foreground border-border' };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage customer profiles, loyalty points, and booking history
            </p>
          </div>
        </div>


        {/* Email Campaigns */}
        {effectiveOrgId && organization && (
          <CustomerEmailBlast
            organizationId={effectiveOrgId}
            cinemaName={organization.name}
            cinemaLogoUrl={organization.logo_url}
            customerCount={totalCustomers}
          />
        )}

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Customers Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Spent</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Bookings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const tier = getLoyaltyTier(customer.loyalty_points);
                  return (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {customer.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{customer.full_name}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{customer.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm">{customer.email}</p>
                        {customer.phone && (
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tier.color}>
                          {tier.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {customer.loyalty_points.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <span className="text-primary font-semibold">
                          ${Number(customer.total_spent).toFixed(0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        {customer.total_bookings}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted/50 rounded-full mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No customers yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Customers will appear here once they make bookings
            </p>
          </div>
        )}

        {/* Customer Detail Dialog */}
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {selectedCustomer.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedCustomer.full_name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {selectedCustomer.email}
                      </span>
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {selectedCustomer.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={getLoyaltyTier(selectedCustomer.loyalty_points).color}
                  >
                    <Award className="h-3 w-3 mr-1" />
                    {getLoyaltyTier(selectedCustomer.loyalty_points).name}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Loyalty Points</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedCustomer.loyalty_points.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">
                      ${Number(selectedCustomer.total_spent).toFixed(0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Bookings</p>
                    <p className="text-2xl font-bold">{selectedCustomer.total_bookings}</p>
                  </div>
                </div>

                {/* Booking History */}
                <div>
                  <h4 className="font-semibold mb-3">Recent Bookings</h4>
                  {customerBookings && customerBookings.length > 0 ? (
                    <div className="space-y-2">
                      {customerBookings.map((booking: any) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {booking.showtimes?.movies?.title || 'Unknown Movie'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(booking.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">
                              ${Number(booking.total_amount).toFixed(2)}
                            </p>
                            <Badge
                              variant="outline"
                              className={
                                booking.status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : 'bg-muted'
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No booking history</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
