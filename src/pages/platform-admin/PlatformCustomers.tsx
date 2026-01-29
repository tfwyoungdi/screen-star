import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, Users, Mail, Phone, Building2, Calendar, DollarSign } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  organization_id: string;
  organization_name?: string;
}

export default function PlatformCustomers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCinema, setSelectedCinema] = useState<string>('all');

  // Fetch all organizations
  const { data: organizations } = useQuery({
    queryKey: ['platform-organizations-for-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all customers with organization info
  const { data: customers, isLoading } = useQuery({
    queryKey: ['platform-all-customers', selectedCinema],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select(`
          id,
          email,
          full_name,
          phone,
          loyalty_points,
          total_spent,
          total_bookings,
          first_booking_at,
          last_booking_at,
          created_at,
          organization_id,
          organizations (name)
        `)
        .order('created_at', { ascending: false });

      if (selectedCinema !== 'all') {
        query = query.eq('organization_id', selectedCinema);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        organization_name: c.organizations?.name || 'Unknown',
      })) as Customer[];
    },
  });

  // Filter customers by search query
  const filteredCustomers = customers?.filter((customer) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.full_name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      (customer.phone && customer.phone.includes(searchQuery)) ||
      (customer.organization_name && customer.organization_name.toLowerCase().includes(searchLower))
    );
  });

  // Export to TXT
  const handleExportTxt = () => {
    if (!filteredCustomers?.length) {
      toast.error('No customers to export');
      return;
    }

    const lines: string[] = [
      '='.repeat(80),
      'CINEMA CUSTOMERS EXPORT',
      `Generated: ${format(new Date(), 'PPpp')}`,
      `Total Customers: ${filteredCustomers.length}`,
      '='.repeat(80),
      '',
    ];

    filteredCustomers.forEach((customer, index) => {
      lines.push(`--- Customer ${index + 1} ---`);
      lines.push(`Name: ${customer.full_name}`);
      lines.push(`Email: ${customer.email}`);
      lines.push(`Phone: ${customer.phone || 'N/A'}`);
      lines.push(`Cinema: ${customer.organization_name}`);
      lines.push(`Loyalty Points: ${customer.loyalty_points}`);
      lines.push(`Total Spent: $${customer.total_spent.toFixed(2)}`);
      lines.push(`Total Bookings: ${customer.total_bookings}`);
      lines.push(`First Booking: ${customer.first_booking_at ? format(new Date(customer.first_booking_at), 'PPp') : 'N/A'}`);
      lines.push(`Last Booking: ${customer.last_booking_at ? format(new Date(customer.last_booking_at), 'PPp') : 'N/A'}`);
      lines.push(`Registered: ${format(new Date(customer.created_at), 'PPp')}`);
      lines.push('');
    });

    lines.push('='.repeat(80));
    lines.push('END OF EXPORT');
    lines.push('='.repeat(80));

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cinema-customers-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredCustomers.length} customers to TXT`);
  };

  // Stats
  const totalCustomers = customers?.length || 0;
  const totalRevenue = customers?.reduce((sum, c) => sum + c.total_spent, 0) || 0;
  const totalBookings = customers?.reduce((sum, c) => sum + c.total_bookings, 0) || 0;
  const avgLoyaltyPoints = totalCustomers > 0 
    ? Math.round((customers?.reduce((sum, c) => sum + c.loyalty_points, 0) || 0) / totalCustomers)
    : 0;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">All Customers</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View and export customer data across all cinemas
            </p>
          </div>
          <Button onClick={handleExportTxt} disabled={!filteredCustomers?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export TXT
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Loyalty Points</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgLoyaltyPoints.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or cinema..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCinema} onValueChange={setSelectedCinema}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Filter by Cinema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cinemas</SelectItem>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredCustomers?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No customers found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? 'Try adjusting your search criteria' : 'Customers will appear here once they register'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Cinema</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead>Last Booking</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers?.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="font-medium">{customer.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Since {format(new Date(customer.created_at), 'MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {customer.organization_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {customer.total_bookings}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${customer.total_spent.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{customer.loyalty_points}</Badge>
                        </TableCell>
                        <TableCell>
                          {customer.last_booking_at ? (
                            format(new Date(customer.last_booking_at), 'MMM d, yyyy')
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {filteredCustomers && filteredCustomers.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {filteredCustomers.length} of {totalCustomers} customers
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
