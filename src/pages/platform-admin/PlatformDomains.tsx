import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Globe, Search, AlertTriangle, CheckCircle, RefreshCw, Plus, Trash2, AlertCircle, ShieldCheck, ShieldX, Clock } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

interface DomainRecord {
  id: string;
  domain: string;
  domain_type: string;
  dns_verified: boolean | null;
  ssl_status: string | null;
  error_message: string | null;
  last_checked_at: string | null;
  created_at: string;
  organization_id: string;
  organizations: { name: string; slug: string } | null;
}

interface HealthAlert {
  type: 'ssl_expiring' | 'dns_issue' | 'not_checked' | 'error';
  severity: 'warning' | 'error' | 'info';
  message: string;
  domain: DomainRecord;
}

export default function PlatformDomains() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState({ domain: '', organizationId: '', domainType: 'custom' });

  // Fetch domains
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
      return data as DomainRecord[];
    },
  });

  // Fetch organizations for the add dialog
  const { data: organizations } = useQuery({
    queryKey: ['platform-organizations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Calculate health alerts
  const healthAlerts: HealthAlert[] = domains?.reduce((alerts: HealthAlert[], domain) => {
    // Check for DNS issues
    if (domain.error_message) {
      alerts.push({
        type: 'error',
        severity: 'error',
        message: domain.error_message,
        domain,
      });
    }

    // Check for pending DNS
    if (!domain.dns_verified && !domain.error_message) {
      const daysSinceCreated = differenceInDays(new Date(), new Date(domain.created_at));
      if (daysSinceCreated > 2) {
        alerts.push({
          type: 'dns_issue',
          severity: 'warning',
          message: `DNS not verified after ${daysSinceCreated} days`,
          domain,
        });
      }
    }

    // Check for domains not checked recently
    if (domain.last_checked_at) {
      const daysSinceChecked = differenceInDays(new Date(), new Date(domain.last_checked_at));
      if (daysSinceChecked > 7) {
        alerts.push({
          type: 'not_checked',
          severity: 'info',
          message: `Not verified in ${daysSinceChecked} days`,
          domain,
        });
      }
    } else if (domain.dns_verified) {
      alerts.push({
        type: 'not_checked',
        severity: 'info',
        message: 'Never verified',
        domain,
      });
    }

    // Check SSL status
    if (domain.ssl_status === 'pending') {
      alerts.push({
        type: 'ssl_expiring',
        severity: 'warning',
        message: 'SSL certificate pending',
        domain,
      });
    } else if (domain.ssl_status === 'expired' || domain.ssl_status === 'error') {
      alerts.push({
        type: 'ssl_expiring',
        severity: 'error',
        message: 'SSL certificate issue',
        domain,
      });
    }

    return alerts;
  }, []) || [];

  // Verify domain mutation (calls edge function)
  const verifyMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const domain = domains?.find(d => d.id === domainId);
      if (!domain) throw new Error('Domain not found');

      // Call the verify-domain edge function
      const { data: verifyResult, error: fnError } = await supabase.functions.invoke('verify-domain', {
        body: { domain: domain.domain },
      });

      if (fnError) throw fnError;

      // Update the domain record with results
      const { data, error } = await supabase
        .from('domain_records')
        .update({
          last_checked_at: new Date().toISOString(),
          dns_verified: verifyResult?.verified || false,
          ssl_status: verifyResult?.ssl?.valid ? 'active' : 'pending',
          error_message: verifyResult?.verified ? null : (verifyResult?.message || 'Verification failed'),
        })
        .eq('id', domainId)
        .select()
        .single();

      if (error) throw error;
      return { domain: data, verifyResult };
    },
    onSuccess: ({ domain, verifyResult }) => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      if (verifyResult?.verified) {
        toast.success(`Domain ${domain.domain} verified successfully`);
      } else {
        toast.warning(`Domain ${domain.domain}: ${verifyResult?.message || 'Verification pending'}`);
      }
      logAction({
        action: 'domain_verified',
        target_type: 'domain_record',
        target_id: domain.id,
        details: { domain: domain.domain, result: verifyResult },
      });
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });

  // Bulk verify mutation
  const bulkVerifyMutation = useMutation({
    mutationFn: async (domainIds: string[]) => {
      const results = await Promise.allSettled(
        domainIds.map(id => verifyMutation.mutateAsync(id))
      );
      return results;
    },
    onSuccess: (results) => {
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      toast.success(`Verified ${succeeded} domains${failed > 0 ? `, ${failed} failed` : ''}`);
      setSelectedDomains([]);
    },
  });

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async (data: { domain: string; organizationId: string; domainType: string }) => {
      const { data: result, error } = await supabase
        .from('domain_records')
        .insert({
          domain: data.domain.toLowerCase().trim(),
          organization_id: data.organizationId,
          domain_type: data.domainType,
          dns_verified: false,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast.success(`Domain ${data.domain} added successfully`);
      setAddDialogOpen(false);
      setNewDomain({ domain: '', organizationId: '', domainType: 'custom' });
      logAction({
        action: 'domain_added',
        target_type: 'domain_record',
        target_id: data.id,
        details: { domain: data.domain },
      });
    },
    onError: (error) => {
      toast.error(`Failed to add domain: ${error.message}`);
    },
  });

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const domain = domains?.find(d => d.id === domainId);
      const { error } = await supabase
        .from('domain_records')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
      return domain;
    },
    onSuccess: (domain) => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast.success(`Domain ${domain?.domain} deleted`);
      logAction({
        action: 'domain_deleted',
        target_type: 'domain_record',
        target_id: domain?.id || '',
        details: { domain: domain?.domain },
      });
    },
    onError: () => {
      toast.error('Failed to delete domain');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (domainIds: string[]) => {
      const { error } = await supabase
        .from('domain_records')
        .delete()
        .in('id', domainIds);

      if (error) throw error;
      return domainIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast.success(`Deleted ${count} domains`);
      setSelectedDomains([]);
      logAction({
        action: 'domains_bulk_deleted',
        target_type: 'domain_record',
        target_id: 'bulk',
        details: { count },
      });
    },
    onError: () => {
      toast.error('Failed to delete domains');
    },
  });

  const verifiedCount = domains?.filter((d) => d.dns_verified).length || 0;
  const pendingCount = domains?.filter((d) => !d.dns_verified && !d.error_message).length || 0;
  const errorCount = domains?.filter((d) => d.error_message).length || 0;

  const toggleSelectAll = () => {
    if (selectedDomains.length === domains?.length) {
      setSelectedDomains([]);
    } else {
      setSelectedDomains(domains?.map(d => d.id) || []);
    }
  };

  const toggleSelectDomain = (domainId: string) => {
    setSelectedDomains(prev =>
      prev.includes(domainId)
        ? prev.filter(id => id !== domainId)
        : [...prev, domainId]
    );
  };

  const getStatusBadge = (domain: DomainRecord) => {
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
      return (
        <Badge className="bg-green-500/10 text-green-500 gap-1">
          <ShieldCheck className="h-3 w-3" />
          Active
        </Badge>
      );
    }
    if (status === 'pending') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    }
    if (status === 'expired' || status === 'error') {
      return (
        <Badge variant="destructive" className="gap-1">
          <ShieldX className="h-3 w-3" />
          {status === 'expired' ? 'Expired' : 'Error'}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <ShieldX className="h-3 w-3" />
        None
      </Badge>
    );
  };

  const getAlertSeverityIcon = (severity: HealthAlert['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Websites & Domains</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage custom domains and subdomains for all cinemas
            </p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Domain</DialogTitle>
                <DialogDescription>
                  Manually add a custom domain for a cinema. The cinema will need to configure DNS records.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Input
                    placeholder="tickets.example.com"
                    value={newDomain.domain}
                    onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cinema</Label>
                  <Select
                    value={newDomain.organizationId}
                    onValueChange={(value) => setNewDomain({ ...newDomain, organizationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cinema" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Domain Type</Label>
                  <Select
                    value={newDomain.domainType}
                    onValueChange={(value) => setNewDomain({ ...newDomain, domainType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Domain</SelectItem>
                      <SelectItem value="subdomain">Subdomain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addDomainMutation.mutate(newDomain)}
                  disabled={!newDomain.domain || !newDomain.organizationId || addDomainMutation.isPending}
                >
                  {addDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

        {/* Health Alerts */}
        {healthAlerts.length > 0 && (
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Domain Health Alerts ({healthAlerts.length})
              </CardTitle>
              <CardDescription>Issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {healthAlerts.slice(0, 10).map((alert, idx) => (
                  <div
                    key={`${alert.domain.id}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border"
                  >
                    <div className="flex items-center gap-3">
                      {getAlertSeverityIcon(alert.severity)}
                      <div>
                        <p className="text-sm font-medium">{alert.domain.domain}</p>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => verifyMutation.mutate(alert.domain.id)}
                      disabled={verifyMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {healthAlerts.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{healthAlerts.length - 10} more alerts
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

            {/* Bulk Actions */}
            {selectedDomains.length > 0 && (
              <div className="flex items-center gap-3 mt-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedDomains.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkVerifyMutation.mutate(selectedDomains)}
                  disabled={bulkVerifyMutation.isPending}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Verify All
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1">
                      <Trash2 className="h-3 w-3" />
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedDomains.length} domains?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove these domain records. The cinemas will lose their custom domain configurations.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => bulkDeleteMutation.mutate(selectedDomains)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDomains([])}>
                  Clear
                </Button>
              </div>
            )}
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDomains.length === domains.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
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
                      <TableCell>
                        <Checkbox
                          checked={selectedDomains.includes(domain.id)}
                          onCheckedChange={() => toggleSelectDomain(domain.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{domain.domain}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {domain.organizations?.name || 'Unknown'}
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
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete domain?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the domain record for "{domain.domain}". The cinema will need to reconfigure their domain settings.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDomainMutation.mutate(domain.id)}
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
                <Button className="mt-4 gap-2" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Domain
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
