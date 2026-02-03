import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, Key, Trash2, Building2, UserCheck, Search, RefreshCw } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_CONFIG: Record<AppRole, { label: string; color: string; icon: typeof Shield }> = {
  platform_admin: { label: 'Platform Admin', color: 'bg-purple-500/10 text-purple-500', icon: Shield },
  cinema_admin: { label: 'Cinema Admin', color: 'bg-blue-500/10 text-blue-500', icon: Building2 },
  manager: { label: 'Manager', color: 'bg-green-500/10 text-green-500', icon: UserCheck },
  supervisor: { label: 'Supervisor', color: 'bg-amber-500/10 text-amber-500', icon: Users },
  box_office: { label: 'Box Office', color: 'bg-cyan-500/10 text-cyan-500', icon: Users },
  gate_staff: { label: 'Gate Staff', color: 'bg-slate-500/10 text-slate-500', icon: Users },
  accountant: { label: 'Accountant', color: 'bg-emerald-500/10 text-emerald-500', icon: Users },
};

export default function PlatformUsers() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string; role: AppRole } | null>(null);
  const [activeTab, setActiveTab] = useState<'platform' | 'cinema'>('platform');

  // Fetch all user roles with profiles
  const { data: allUserRoles, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          organization_id,
          created_at,
          profiles!inner (
            id,
            email,
            full_name,
            avatar_url,
            is_active
          ),
          organizations (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Filter users based on tab and search
  const platformUsers = allUserRoles?.filter(u => u.role === 'platform_admin') || [];
  const cinemaUsers = allUserRoles?.filter(u => u.role !== 'platform_admin') || [];

  const filteredPlatformUsers = platformUsers.filter(u => {
    if (!searchQuery) return true;
    const profile = u.profiles as any;
    const search = searchQuery.toLowerCase();
    return (
      profile?.email?.toLowerCase().includes(search) ||
      profile?.full_name?.toLowerCase().includes(search)
    );
  });

  const filteredCinemaUsers = cinemaUsers.filter(u => {
    if (!searchQuery) return true;
    const profile = u.profiles as any;
    const org = u.organizations as any;
    const search = searchQuery.toLowerCase();
    return (
      profile?.email?.toLowerCase().includes(search) ||
      profile?.full_name?.toLowerCase().includes(search) ||
      org?.name?.toLowerCase().includes(search)
    );
  });

  // Add platform admin mutation
  const addUserMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      // First, find the user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (profileError) {
        throw new Error('User not found. They must sign up first.');
      }

      // Check if they already have platform_admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .eq('role', 'platform_admin')
        .maybeSingle();

      if (existingRole) {
        throw new Error('User already has Platform Admin role');
      }

      // Add the role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.id,
          role: 'platform_admin' as AppRole,
          organization_id: null,
        });

      if (error) throw error;
      return { email };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      toast.success(`Added ${data.email} as Platform Admin`);
      logAction({
        action: 'platform_user_added',
        target_type: 'user_role',
        details: { email: data.email, role: 'platform_admin' },
      });
      setIsAddOpen(false);
      setEmail('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove role mutation
  const removeUserMutation = useMutation({
    mutationFn: async ({ roleId, email, role }: { roleId: string; email: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      return { roleId, email, role };
    },
    onSuccess: ({ email, role }) => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      toast.success(`Removed ${ROLE_CONFIG[role].label} role from ${email}`);
      logAction({
        action: 'platform_user_removed',
        target_type: 'user_role',
        details: { email, role },
      });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('Failed to remove user role');
    },
  });

  const handleAddUser = () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    addUserMutation.mutate({ email: email.trim() });
  };

  // Role stats
  const roleStats = {
    total: allUserRoles?.length || 0,
    platformAdmins: platformUsers.length,
    cinemaAdmins: allUserRoles?.filter(u => u.role === 'cinema_admin').length || 0,
    managers: allUserRoles?.filter(u => u.role === 'manager').length || 0,
    staff: allUserRoles?.filter(u => ['box_office', 'gate_staff', 'accountant', 'supervisor'].includes(u.role)).length || 0,
    active: allUserRoles?.filter(u => (u.profiles as any)?.is_active).length || 0,
  };

  const renderUserRow = (user: any) => {
    const profile = user.profiles as any;
    const org = user.organizations as any;
    const roleConfig = ROLE_CONFIG[user.role as AppRole];

    return (
      <TableRow key={user.id}>
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
            <div>
              <p className="font-medium">{profile?.full_name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge className={`gap-1 ${roleConfig.color}`}>
            <roleConfig.icon className="h-3 w-3" />
            {roleConfig.label}
          </Badge>
        </TableCell>
        <TableCell>
          {org ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{org.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          {profile?.is_active ? (
            <Badge className="bg-green-500/10 text-green-500">Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {format(new Date(user.created_at), 'MMM d, yyyy')}
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget({ 
              id: user.id, 
              email: profile?.email, 
              role: user.role 
            })}
            disabled={removeUserMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users & Roles</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage platform administrators and view all cinema staff
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
                    Grant platform admin access to an existing user. They will have full access to manage all cinemas.
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
                    />
                    <p className="text-xs text-muted-foreground">
                      The user must have an existing account in the system.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{roleStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Shield className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{roleStats.platformAdmins}</p>
                  <p className="text-xs text-muted-foreground">Platform Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{roleStats.cinemaAdmins}</p>
                  <p className="text-xs text-muted-foreground">Cinema Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <UserCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{roleStats.managers}</p>
                  <p className="text-xs text-muted-foreground">Managers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Key className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{roleStats.staff}</p>
                  <p className="text-xs text-muted-foreground">Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{roleStats.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or cinema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs for Platform vs Cinema users */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'platform' | 'cinema')}>
          <TabsList>
            <TabsTrigger value="platform" className="gap-2">
              <Shield className="h-4 w-4" />
              Platform Admins ({platformUsers.length})
            </TabsTrigger>
            <TabsTrigger value="cinema" className="gap-2">
              <Building2 className="h-4 w-4" />
              Cinema Staff ({cinemaUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Administrators</CardTitle>
                <CardDescription>Users with full access to this admin dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : filteredPlatformUsers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlatformUsers.map(renderUserRow)}
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
          </TabsContent>

          <TabsContent value="cinema" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Cinema Staff</CardTitle>
                <CardDescription>All users across cinema organizations</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : filteredCinemaUsers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCinemaUsers.map(renderUserRow)}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No cinema staff found</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {searchQuery ? 'Try adjusting your search' : 'Cinema staff will appear here when created.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the <strong>{deleteTarget && ROLE_CONFIG[deleteTarget.role].label}</strong> role 
                from <strong>{deleteTarget?.email}</strong>? This action cannot be undone.
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
                      email: deleteTarget.email,
                      role: deleteTarget.role 
                    });
                  }
                }}
              >
                Remove Role
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PlatformLayout>
  );
}
