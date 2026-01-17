import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Globe, Search, Shield, AlertTriangle, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

export default function PlatformDomains() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: domains, isLoading } = useQuery({
    queryKey: ['platform-domains', searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('domain_records')
        .select(`
          *,
          organizations (name, slug)
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('domain', `%${searchQuery}%`);
      }
      if (statusFilter === 'verified') {
        query = query.eq('dns_verified', true);
      } else if (statusFilter === 'pending') {
        query = query.eq('dns_verified', false);
      } else if (statusFilter === 'error') {
        query = query.not('error_message', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase
        .from('domain_records')
        .update({ 
          last_checked_at: new Date().toISOString(),
          dns_verified: true,
          error_message: null 
        })
        .eq('id', domainId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast.success('Domain verification updated');
      logAction({
        action: 'domain_verified',
        target_type: 'domain_record',
        target_id: data.id,
        details: { domain: data.domain },
      });
    },
    onError: () => {
      toast.error('Failed to verify domain');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (domain: { id: string; domain: string; organization_id: string }) => {
      // Delete the domain record
      const { error } = await supabase
        .from('domain_records')
        .delete()
        .eq('id', domain.id);
      if (error) throw error;
      
      // Also clear the custom_domain from the organization
      await supabase
        .from('organizations')
        .update({ custom_domain: null })
        .eq('id', domain.organization_id);
      
      return domain;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast.success(`Domain "${data.domain}" deleted successfully`);
      logAction({
        action: 'domain_deleted',
        target_type: 'domain_record',
        target_id: data.id,
        details: { domain: data.domain },
      });
    },
    onError: () => {
      toast.error('Failed to delete domain');
    },
  });

  const verifiedCount = domains?.filter((d) => d.dns_verified).length || 0;
  const pendingCount = domains?.filter((d) => !d.dns_verified && !d.error_message).length || 0;
  const errorCount = domains?.filter((d) => d.error_message).length || 0;

  const getStatusBadge = (domain: any) => {
    if (domain.error_message) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Error
        </Badge>
      );
    }
    if (domain.dns_verified) {
      return (
        <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 gap-1">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <RefreshCw className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const getSSLBadge = (status: string | null) => {
    if (status === 'active') {
      return <Badge className="bg-green-500/10 text-green-500">SSL Active</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="secondary">SSL Pending</Badge>;
    }
    return <Badge variant="outline">No SSL</Badge>;
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Websites & Domains</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage custom domains and subdomains for all cinemas
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{domains?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Domains</p>
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
                  <p className="text-2xl font-bold">{verifiedCount}</p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <RefreshCw className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{errorCount}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Domain Records</CardTitle>
                <CardDescription>All registered custom domains and subdomains</CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search domains..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
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
            ) : domains && domains.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Cinema</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>DNS Status</TableHead>
                    <TableHead>SSL</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">{domain.domain}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {(domain.organizations as any)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{domain.domain_type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(domain)}</TableCell>
                      <TableCell>{getSSLBadge(domain.ssl_status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {domain.last_checked_at
                          ? format(new Date(domain.last_checked_at), 'MMM d, h:mm a')
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => verifyMutation.mutate(domain.id)}
                            disabled={verifyMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{domain.domain}</strong>? This will remove the custom domain configuration for {(domain.organizations as any)?.name || 'this cinema'}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate({
                                    id: domain.id,
                                    domain: domain.domain,
                                    organization_id: domain.organization_id,
                                  })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No domains found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Custom domains will appear here when cinemas configure them.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
