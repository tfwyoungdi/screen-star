import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, Trash2, Search, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

export default function PlatformUsers() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);

  // Fetch platform admins only
  const { data: platformAdmins, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles!inner (
            id,
            email,
            full_name,
            avatar_url,
            is_active
          )
        `)
        .eq('role', 'platform_admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Filter by search
  const filteredAdmins = platformAdmins?.filter(u => {
    if (!searchQuery) return true;
    const profile = u.profiles as any;
    const search = searchQuery.toLowerCase();
    return (
      profile?.email?.toLowerCase().includes(search) ||
      profile?.full_name?.toLowerCase().includes(search)
    );
  }) || [];

  // Add platform admin mutation
  const addUserMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      // Find the user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (profileError) {
        throw new Error('User not found. They must have an existing account first.');
      }

      // Check if they already have platform_admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .eq('role', 'platform_admin')
        .maybeSingle();

      if (existingRole) {
        throw new Error('This user is already a Platform Admin.');
      }

      // Add the role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.id,
          role: 'platform_admin' as const,
          organization_id: null,
        });

      if (error) throw error;
      return { email, name: profile.full_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      toast.success(`${data.name || data.email} is now a Platform Admin`);
      logAction({
        action: 'platform_admin_added',
        target_type: 'user_role',
        details: { email: data.email },
      });
      setIsAddOpen(false);
      setEmail('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove platform admin mutation
  const removeUserMutation = useMutation({
    mutationFn: async ({ roleId, email }: { roleId: string; email: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      return { email };
    },
    onSuccess: ({ email }) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      toast.success(`Removed Platform Admin access from ${email}`);
      logAction({
        action: 'platform_admin_removed',
        target_type: 'user_role',
        details: { email },
      });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('Failed to remove Platform Admin');
    },
  });

  const handleAddUser = () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    addUserMutation.mutate({ email: email.trim() });
  };

  const activeCount = platformAdmins?.filter(u => (u.profiles as any)?.is_active).length || 0;
  const inactiveCount = (platformAdmins?.length || 0) - activeCount;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Admins</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage users with full platform administrative access
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Platform Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Platform Admin</DialogTitle>
                  <DialogDescription>
                    Grant full platform administrative access to an existing user. They will be able to manage all cinemas, users, and platform settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">User Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                    />
                    <p className="text-xs text-muted-foreground">
                      The user must have an existing account in the system.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => {
                      setIsAddOpen(false);
                      setEmail('');
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddUser} disabled={addUserMutation.isPending}>
                      {addUserMutation.isPending ? 'Adding...' : 'Add Admin'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{platformAdmins?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Admins</p>
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
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inactiveCount}</p>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Admins Table */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Administrators</CardTitle>
            <CardDescription>
              Users with full access to this admin dashboard and all platform features
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredAdmins.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => {
                    const profile = admin.profiles as any;
                    return (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {profile?.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.full_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{profile?.full_name || 'Unknown'}</span>
                              <Badge variant="secondary" className="gap-1">
                                <Shield className="h-3 w-3" />
                                Admin
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {profile?.email}
                        </TableCell>
                        <TableCell>
                          {profile?.is_active ? (
                            <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                          ) : (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(admin.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget({ 
                              id: admin.id, 
                              email: profile?.email 
                            })}
                            disabled={removeUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No platform admins found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Add administrators to manage the platform.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Platform Admin</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove platform admin access from <strong>{deleteTarget?.email}</strong>? 
                They will no longer be able to access this dashboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) {
                    removeUserMutation.mutate({ 
                      roleId: deleteTarget.id, 
                      email: deleteTarget.email 
                    });
                  }
                }}
              >
                Remove Admin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PlatformLayout>
  );
}
