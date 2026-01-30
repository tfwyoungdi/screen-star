import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays, addDays, isAfter, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { Building2, Eye, Ban, CheckCircle, ExternalLink, Search, UserCheck, CalendarClock, AlertTriangle, Power, CalendarIcon, Save } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { Tables } from '@/integrations/supabase/types';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';
import { useImpersonation } from '@/hooks/useImpersonation';
import { cn } from '@/lib/utils';

type Organization = Tables<'organizations'>;

interface CinemaWithSubscription extends Organization {
  subscription?: {
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    plan_name: string | null;
  } | null;
}

export default function PlatformCinemas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  const { startImpersonation } = useImpersonation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCinema, setSelectedCinema] = useState<CinemaWithSubscription | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editExpiryDate, setEditExpiryDate] = useState<Date | undefined>();
  const [isEditingDates, setIsEditingDates] = useState(false);

  const { data: cinemas, isLoading } = useQuery({
    queryKey: ['all-cinemas-with-subscriptions', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`);
      }

      const { data: orgs, error } = await query;
      if (error) throw error;

      // Fetch subscriptions for all organizations
      const { data: subscriptions } = await supabase
        .from('cinema_subscriptions')
        .select(`
          id,
          organization_id,
          status,
          current_period_start,
          current_period_end,
          subscription_plans (name)
        `);

      // Create a map for quick lookup
      const subscriptionMap = new Map();
      subscriptions?.forEach((sub: any) => {
        subscriptionMap.set(sub.organization_id, {
          id: sub.id,
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          plan_name: sub.subscription_plans?.name || null,
        });
      });

      // Combine organizations with subscriptions
      return (orgs || []).map((org) => ({
        ...org,
        subscription: subscriptionMap.get(org.id) || null,
      })) as CinemaWithSubscription[];
    },
  });

  // Get cinemas expiring within 5 days
  const expiringCinemas = cinemas?.filter((cinema) => {
    if (!cinema.subscription?.current_period_end) return false;
    const expiryDate = new Date(cinema.subscription.current_period_end);
    const now = new Date();
    const daysUntilExpiry = differenceInDays(expiryDate, now);
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 5 && cinema.subscription.status === 'active';
  }) || [];

  const suspendMutation = useMutation({
    mutationFn: async ({ id, suspend, reason }: { id: string; suspend: boolean; reason?: string }) => {
      const updates: any = {
        is_active: !suspend,
        suspended_at: suspend ? new Date().toISOString() : null,
        suspended_reason: suspend ? reason : null,
      };

      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-cinemas-with-subscriptions'] });
      toast.success(variables.suspend ? 'Cinema suspended' : 'Cinema activated successfully');
      
      // Audit log
      logAction({
        action: variables.suspend ? 'cinema_suspended' : 'cinema_activated',
        target_type: 'organization',
        target_id: variables.id,
        details: {
          cinema_name: data?.name,
          reason: variables.reason || null,
        },
      });
      
      setSelectedCinema(null);
      setSuspendReason('');
    },
    onError: (error) => {
      console.error('Failed to update cinema:', error);
      toast.error('Failed to update cinema status');
    },
  });

  // Mutation for updating subscription dates
  const updateDatesMutation = useMutation({
    mutationFn: async ({ 
      subscriptionId, 
      startDate, 
      expiryDate 
    }: { 
      subscriptionId: string; 
      startDate: string; 
      expiryDate: string;
    }) => {
      const { data, error } = await supabase
        .from('cinema_subscriptions')
        .update({
          current_period_start: startDate,
          current_period_end: expiryDate,
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-cinemas-with-subscriptions'] });
      toast.success('Subscription dates updated successfully');
      
      // Audit log
      logAction({
        action: 'subscription_dates_updated',
        target_type: 'cinema_subscription',
        target_id: data.id,
        details: {
          organization_id: data.organization_id,
          new_start_date: data.current_period_start,
          new_expiry_date: data.current_period_end,
        },
      });
      
      setIsEditingDates(false);
      // Update the selected cinema with new dates
      if (selectedCinema) {
        setSelectedCinema({
          ...selectedCinema,
          subscription: selectedCinema.subscription ? {
            ...selectedCinema.subscription,
            current_period_start: data.current_period_start,
            current_period_end: data.current_period_end,
          } : null,
        });
      }
    },
    onError: (error) => {
      console.error('Failed to update subscription dates:', error);
      toast.error('Failed to update subscription dates');
    },
  });

  const handleSuspend = (cinema: CinemaWithSubscription) => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }
    suspendMutation.mutate({ id: cinema.id, suspend: true, reason: suspendReason });
  };

  const handleEditDates = (cinema: CinemaWithSubscription) => {
    if (cinema.subscription) {
      setEditStartDate(new Date(cinema.subscription.current_period_start));
      setEditExpiryDate(new Date(cinema.subscription.current_period_end));
      setIsEditingDates(true);
    }
  };

  const handleSaveDates = () => {
    if (!selectedCinema?.subscription?.id || !editStartDate || !editExpiryDate) {
      toast.error('Please select both start and expiry dates');
      return;
    }

    if (isAfter(editStartDate, editExpiryDate)) {
      toast.error('Start date cannot be after expiry date');
      return;
    }

    updateDatesMutation.mutate({
      subscriptionId: selectedCinema.subscription.id,
      startDate: editStartDate.toISOString(),
      expiryDate: editExpiryDate.toISOString(),
    });
  };

  const handleCancelEditDates = () => {
    setIsEditingDates(false);
    setEditStartDate(undefined);
    setEditExpiryDate(undefined);
  };

  const handleReactivate = (cinema: CinemaWithSubscription) => {
    suspendMutation.mutate({ id: cinema.id, suspend: false });
  };

  const handleImpersonate = async (cinema: CinemaWithSubscription) => {
    try {
      await startImpersonation(cinema);
      
      // Log the impersonation action
      logAction({
        action: 'cinema_impersonation_started',
        target_type: 'organization',
        target_id: cinema.id,
        details: {
          cinema_name: cinema.name,
          cinema_slug: cinema.slug,
        },
      });
      
      toast.success(`Now viewing as ${cinema.name}`);
      setSelectedCinema(null);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to start impersonation. Admin privileges required.');
    }
  };

  const getSubscriptionBadge = (cinema: CinemaWithSubscription) => {
    if (!cinema.subscription) {
      return <Badge variant="outline" className="text-muted-foreground">No Subscription</Badge>;
    }

    const { status, current_period_end } = cinema.subscription;
    const expiryDate = new Date(current_period_end);
    const now = new Date();
    const daysUntilExpiry = differenceInDays(expiryDate, now);

    if (status === 'cancelled' || isBefore(expiryDate, now)) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    if (daysUntilExpiry <= 5) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
          Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
        </Badge>
      );
    }

    return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>;
  };

  const activeCinemas = cinemas?.filter((c) => c.is_active).length || 0;
  const suspendedCinemas = cinemas?.filter((c) => !c.is_active).length || 0;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cinema Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all registered cinema organizations
          </p>
        </div>

        {/* Expiring Subscriptions Alert */}
        {expiringCinemas.length > 0 && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600">Subscriptions Expiring Soon</AlertTitle>
            <AlertDescription className="text-amber-600/80">
              {expiringCinemas.length} cinema{expiringCinemas.length !== 1 ? 's have' : ' has'} subscription{expiringCinemas.length !== 1 ? 's' : ''} expiring within 5 days:
              <ul className="mt-2 space-y-1">
                {expiringCinemas.map((cinema) => {
                  const daysLeft = differenceInDays(
                    new Date(cinema.subscription!.current_period_end),
                    new Date()
                  );
                  return (
                    <li key={cinema.id} className="flex items-center gap-2">
                      <span className="font-medium">{cinema.name}</span>
                      <span className="text-sm">
                        - Expires {format(new Date(cinema.subscription!.current_period_end), 'MMM d, yyyy')} 
                        ({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{cinemas?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Cinemas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCinemas}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <Ban className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{suspendedCinemas}</p>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <CalendarClock className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{expiringCinemas.length}</p>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Cinemas</CardTitle>
                <CardDescription>Registered cinema organizations</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cinemas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : cinemas && cinemas.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cinema</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Subscribed</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cinemas.map((cinema) => (
                      <TableRow key={cinema.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {cinema.logo_url ? (
                              <img
                                src={cinema.logo_url}
                                alt={cinema.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <span className="font-medium">{cinema.name}</span>
                              <p className="text-xs text-muted-foreground">{cinema.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {cinema.subscription?.plan_name ? (
                            <Badge variant="outline">{cinema.subscription.plan_name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {cinema.subscription?.current_period_start
                            ? format(new Date(cinema.subscription.current_period_start), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {cinema.subscription?.current_period_end ? (
                            <span className={
                              differenceInDays(new Date(cinema.subscription.current_period_end), new Date()) <= 5
                                ? 'text-amber-600 font-medium'
                                : 'text-muted-foreground'
                            }>
                              {format(new Date(cinema.subscription.current_period_end), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getSubscriptionBadge(cinema)}</TableCell>
                        <TableCell>
                          {cinema.is_active ? (
                            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Suspended</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!cinema.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivate(cinema)}
                                disabled={suspendMutation.isPending}
                                className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                title="Activate Cinema"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCinema(cinema)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={`/cinema/${cinema.slug}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No cinemas found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {searchQuery ? 'Try a different search term' : 'Cinemas will appear here when registered'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cinema Detail Dialog */}
        <Dialog open={!!selectedCinema} onOpenChange={() => setSelectedCinema(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedCinema?.name}</DialogTitle>
              <DialogDescription>
                Registered: {selectedCinema && format(new Date(selectedCinema.created_at), 'MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>
            {selectedCinema && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Slug</Label>
                    <p className="font-medium">{selectedCinema.slug}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-medium">
                      {selectedCinema.is_active ? (
                        <span className="text-green-500">Active</span>
                      ) : (
                        <span className="text-destructive">Suspended</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contact Email</Label>
                    <p className="font-medium">{selectedCinema.contact_email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contact Phone</Label>
                    <p className="font-medium">{selectedCinema.contact_phone || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="font-medium">{selectedCinema.address || '-'}</p>
                  </div>
                </div>

                {/* Subscription Details */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      Subscription Details
                    </h4>
                    {selectedCinema.subscription && !isEditingDates && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDates(selectedCinema)}
                        className="gap-1"
                      >
                        <CalendarIcon className="h-3 w-3" />
                        Edit Dates
                      </Button>
                    )}
                  </div>
                  {selectedCinema.subscription ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Plan</Label>
                        <p className="font-medium">{selectedCinema.subscription.plan_name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <p className="font-medium capitalize">{selectedCinema.subscription.status}</p>
                      </div>
                      
                      {isEditingDates ? (
                        <>
                          <div className="col-span-2 border-t pt-3 mt-1">
                            <Label className="text-muted-foreground mb-2 block">Start Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !editStartDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {editStartDate ? format(editStartDate, 'MMMM d, yyyy') : 'Select start date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={editStartDate}
                                  onSelect={setEditStartDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-muted-foreground mb-2 block">Expiry Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !editExpiryDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {editExpiryDate ? format(editExpiryDate, 'MMMM d, yyyy') : 'Select expiry date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={editExpiryDate}
                                  onSelect={setEditExpiryDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="col-span-2 flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={handleSaveDates}
                              disabled={updateDatesMutation.isPending}
                              className="gap-1"
                            >
                              <Save className="h-3 w-3" />
                              {updateDatesMutation.isPending ? 'Saving...' : 'Save Dates'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEditDates}
                              disabled={updateDatesMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label className="text-muted-foreground">Subscribed Date</Label>
                            <p className="font-medium">
                              {format(new Date(selectedCinema.subscription.current_period_start), 'MMMM d, yyyy')}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Expiry Date</Label>
                            <p className={`font-medium ${
                              differenceInDays(new Date(selectedCinema.subscription.current_period_end), new Date()) <= 5
                                ? 'text-amber-600'
                                : ''
                            }`}>
                              {format(new Date(selectedCinema.subscription.current_period_end), 'MMMM d, yyyy')}
                              {differenceInDays(new Date(selectedCinema.subscription.current_period_end), new Date()) <= 5 && (
                                <span className="text-xs ml-1">
                                  ({differenceInDays(new Date(selectedCinema.subscription.current_period_end), new Date())} days left)
                                </span>
                              )}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No subscription found for this cinema.</p>
                  )}
                </div>

                {!selectedCinema.is_active && selectedCinema.suspended_reason && (
                  <div className="rounded-lg bg-destructive/10 p-4">
                    <Label className="text-destructive text-sm">Suspension Reason</Label>
                    <p className="text-sm mt-1">{selectedCinema.suspended_reason}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-4 border-t">
                  {/* Impersonation Button */}
                  {selectedCinema.is_active && (
                    <Button
                      variant="outline"
                      onClick={() => handleImpersonate(selectedCinema)}
                      className="w-full gap-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      View as Cinema Admin (Support Mode)
                    </Button>
                  )}
                  
                  <div className="flex justify-end gap-3">
                    {selectedCinema.is_active ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="gap-2">
                            <Ban className="h-4 w-4" />
                            Suspend Cinema
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Suspend {selectedCinema.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will prevent the cinema from accessing their dashboard and public website.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-2 py-4">
                            <Label>Reason for suspension *</Label>
                            <Textarea
                              value={suspendReason}
                              onChange={(e) => setSuspendReason(e.target.value)}
                              placeholder="Enter the reason for suspension..."
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleSuspend(selectedCinema)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Suspend
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        onClick={() => handleReactivate(selectedCinema)}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                        disabled={suspendMutation.isPending}
                      >
                        <Power className="h-4 w-4" />
                        Activate Cinema
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PlatformLayout>
  );
}
