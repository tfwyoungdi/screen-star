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
import { Users, UserPlus, Trash2, Search, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';
import { PLATFORM_ROLE_CONFIG, type PlatformRoleType } from '@/lib/platformRoleConfig';
import { cn } from '@/lib/utils';

const PLATFORM_ROLES: PlatformRoleType[] = [
  'platform_admin',
  'platform_marketing',
  'platform_accounts',
  'platform_dev',
];

export default function PlatformUsers() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlatformRoleType>('platform_admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch all platform-level users
  const { data: platformUsers, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['platform-users'],
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
        .in('role', PLATFORM_ROLES)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Filter by search and tab
  const filteredUsers = platformUsers?.filter(u => {
    const profile = u.profiles as any;
    const matchesSearch = !searchQuery || 
      profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || u.role === activeTab;
    
    return matchesSearch && matchesTab;
  }) || [];

  // Add platform user mutation
  const addUserMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: PlatformRoleType }) => {
      // Find the user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (profileError) {
        throw new Error('User not found. They must have an existing account first.');
      }

      // Check if they already have this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .eq('role', role)
        .maybeSingle();

      if (existingRole) {
        throw new Error(`This user already has the ${PLATFORM_ROLE_CONFIG[role].label} role.`);
      }

      // Add the role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.id,
          role: role as any,
          organization_id: null,
        });

      if (error) throw error;
      return { email, name: profile.full_name, role };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success(`${data.name || data.email} is now a ${PLATFORM_ROLE_CONFIG[data.role].label}`);
      logAction({
        action: 'platform_user_added',
        target_type: 'user_role',
        details: { email: data.email, role: data.role },
      });
      setIsAddOpen(false);
      setEmail('');
      setSelectedRole('platform_admin');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove platform user mutation
  const removeUserMutation = useMutation({
    mutationFn: async ({ roleId, email, role }: { roleId: string; email: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      return { email, role };
    },
    onSuccess: ({ email, role }) => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success(`Removed ${role} access from ${email}`);
      logAction({
        action: 'platform_user_removed',
        target_type: 'user_role',
        details: { email, role },
      });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('Failed to remove user');
    },
  });

  const handleAddUser = () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    addUserMutation.mutate({ email: email.trim(), role: selectedRole });
  };

  // Calculate stats
  const stats = PLATFORM_ROLES.reduce((acc, role) => {
    acc[role] = platformUsers?.filter(u => u.role === role).length || 0;
    return acc;
  }, {} as Record<PlatformRoleType, number>);

  const totalUsers = platformUsers?.length || 0;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users & Roles</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage platform-level users and their access permissions
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
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Platform User</DialogTitle>
                  <DialogDescription>
                    Grant platform access to an existing user. Select their role to define their permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-email">User Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      The user must have an existing account in the system.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as PlatformRoleType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_ROLES.map(role => {
                          const config = PLATFORM_ROLE_CONFIG[role];
                          return (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center gap-2">
                                <config.icon className="h-4 w-4" />
                                <span>{config.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {PLATFORM_ROLE_CONFIG[selectedRole].description}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => {
                      setIsAddOpen(false);
                      setEmail('');
                      setSelectedRole('platform_admin');
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddUser} disabled={addUserMutation.isPending}>
                      {addUserMutation.isPending ? 'Adding...' : 'Add User'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats by Role */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PLATFORM_ROLES.map(role => {
            const config = PLATFORM_ROLE_CONFIG[role];
            return (
              <Card key={role}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={cn('p-3 rounded-lg', config.color.split(' ')[0])}>
                      <config.icon className={cn('h-6 w-6', config.color.split(' ')[1])} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats[role]}</p>
                      <p className="text-sm text-muted-foreground">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">All ({totalUsers})</TabsTrigger>
              {PLATFORM_ROLES.map(role => (
                <TabsTrigger key={role} value={role}>
                  {PLATFORM_ROLE_CONFIG[role].label.split(' ')[0]} ({stats[role]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          <div className="relative w-full sm:w-auto sm:min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Users</CardTitle>
            <CardDescription>
              Users with access to this platform admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const profile = user.profiles as any;
                    const roleConfig = PLATFORM_ROLE_CONFIG[user.role as PlatformRoleType];
                    
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
                            <span className="font-medium">{profile?.full_name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {profile?.email}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('gap-1', roleConfig?.color)}>
                            {roleConfig && <roleConfig.icon className="h-3 w-3" />}
                            {roleConfig?.label || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {profile?.is_active ? (
                            <Badge className="bg-green-500/10 text-green-500 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </Badge>
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
                              role: roleConfig?.label || user.role,
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
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No users found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Add users to grant platform access.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User Access</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{deleteTarget?.role}</strong> access from <strong>{deleteTarget?.email}</strong>? 
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
                      email: deleteTarget.email,
                      role: deleteTarget.role,
                    });
                  }
                }}
              >
                Remove Access
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PlatformLayout>
  );
}
