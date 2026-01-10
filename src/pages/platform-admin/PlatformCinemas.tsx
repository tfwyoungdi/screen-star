import { useState } from 'react';
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
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Building2, Eye, Ban, CheckCircle, ExternalLink, Search } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { Tables } from '@/integrations/supabase/types';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

type Organization = Tables<'organizations'>;

export default function PlatformCinemas() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCinema, setSelectedCinema] = useState<Organization | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const { data: cinemas, isLoading } = useQuery({
    queryKey: ['all-cinemas', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Organization[];
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['all-cinemas'] });
      toast.success(variables.suspend ? 'Cinema suspended' : 'Cinema reactivated');
      
      // Audit log
      logAction({
        action: variables.suspend ? 'cinema_suspended' : 'cinema_reactivated',
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

  const handleSuspend = (cinema: Organization) => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }
    suspendMutation.mutate({ id: cinema.id, suspend: true, reason: suspendReason });
  };

  const handleReactivate = (cinema: Organization) => {
    suspendMutation.mutate({ id: cinema.id, suspend: false });
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cinema</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
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
                          <span className="font-medium">{cinema.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cinema.slug}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cinema.contact_email || '-'}
                      </TableCell>
                      <TableCell>
                        {cinema.is_active ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Suspended</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(cinema.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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

                {!selectedCinema.is_active && selectedCinema.suspended_reason && (
                  <div className="rounded-lg bg-destructive/10 p-4">
                    <Label className="text-destructive text-sm">Suspension Reason</Label>
                    <p className="text-sm mt-1">{selectedCinema.suspended_reason}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
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
                      className="gap-2"
                      disabled={suspendMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Reactivate Cinema
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PlatformLayout>
  );
}
