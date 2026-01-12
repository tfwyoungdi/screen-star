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
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, Key, Trash2 } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

const PLATFORM_ROLES = [
  { value: 'platform_admin', label: 'Platform Admin', description: 'Full access to all platform features' },
];

export default function PlatformUsers() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('platform_admin');

  // Fetch platform admins (users with platform_admin role)
  const { data: platformUsers, isLoading } = useQuery({
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
        .eq('role', 'platform_admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // First, find the user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError) {
        throw new Error('User not found. They must sign up first.');
      }

      // Check if they already have this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .eq('role', 'platform_admin')
        .maybeSingle();

      if (existingRole) {
        throw new Error('User already has this role');
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
      return { email, role };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success(`Added ${data.email} as platform admin`);
      logAction({
        action: 'platform_user_added',
        target_type: 'user_role',
        details: { email: data.email, role: data.role },
      });
      setIsAddOpen(false);
      setEmail('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      return roleId;
    },
    onSuccess: (roleId) => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success('Platform admin removed');
      logAction({
        action: 'platform_user_removed',
        target_type: 'user_role',
        target_id: roleId,
      });
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

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users & Roles</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage platform administrators and their permissions
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Platform Admin</DialogTitle>
                <DialogDescription>
                  Grant platform admin access to an existing user.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>User Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    The user must have an existing account.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex flex-col">
                            <span>{role.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {role.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{platformUsers?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {platformUsers?.filter((u) => (u.profiles as any)?.is_active).length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Key className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">1</p>
                  <p className="text-sm text-muted-foreground">Roles Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Administrators</CardTitle>
            <CardDescription>Users with access to this admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : platformUsers && platformUsers.length > 0 ? (
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
                  {platformUsers.map((user) => {
                    const profile = user.profiles as any;
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
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Platform Admin
                          </Badge>
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
                            onClick={() => {
                              if (confirm('Remove this admin? This action cannot be undone.')) {
                                removeUserMutation.mutate(user.id);
                              }
                            }}
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
                <h3 className="text-lg font-medium">No platform admins</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Add administrators to manage the platform.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
