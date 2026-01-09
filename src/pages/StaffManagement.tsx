import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus, Eye, EyeOff, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile, useOrganization } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const createStaffSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  role: z.enum(['box_office', 'gate_staff', 'manager', 'accountant'] as const),
});

type CreateStaffFormData = z.infer<typeof createStaffSchema>;

const roleLabels: Record<string, string> = {
  box_office: 'Box Office',
  gate_staff: 'Gate Staff',
  manager: 'Manager',
  accountant: 'Accountant',
  cinema_admin: 'Cinema Admin',
};

const roleDescriptions: Record<string, string> = {
  box_office: 'Can sell tickets and manage bookings',
  gate_staff: 'Can scan and validate tickets',
  manager: 'Can view reports and manage shows',
  accountant: 'Can view financial reports',
};

export default function StaffManagement() {
  const { data: profile } = useUserProfile();
  const { data: organization } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffFormData>({
    resolver: zodResolver(createStaffSchema),
  });

  // Fetch current staff members
  const { data: staffMembers, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-members', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      // First get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('organization_id', profile.organization_id);

      if (profilesError) throw profilesError;
      
      // Then get roles for each profile
      const profilesWithRoles = await Promise.all(
        profiles.map(async (p) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', p.id)
            .eq('organization_id', profile.organization_id);
          
          return {
            ...p,
            role: roles?.[0]?.role || 'unknown',
          };
        })
      );
      
      return profilesWithRoles;
    },
    enabled: !!profile?.organization_id,
  });

  const onSubmit = async (data: CreateStaffFormData) => {
    if (!profile?.organization_id || !organization) return;

    try {
      const { data: result, error } = await supabase.functions.invoke('create-staff-account', {
        body: {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          role: data.role,
          organizationId: profile.organization_id,
        },
      });

      if (error) {
        console.error('Error creating staff:', error);
        toast.error(error.message || 'Failed to create staff account');
        return;
      }

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success(`Staff account created for ${data.email}`);
      reset();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creating staff account:', error);
      toast.error('Failed to create staff account');
    }
  };

  const deleteStaffMember = async (userId: string, email: string) => {
    // Note: This only removes from organization, doesn't delete the auth user
    // Full deletion would require admin API
    try {
      // Remove role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', profile?.organization_id);

      if (roleError) throw roleError;

      // Deactivate profile (set organization_id to null)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: null, is_active: false })
        .eq('id', userId);

      if (profileError) throw profileError;

      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success(`Removed ${email} from staff`);
    } catch (error) {
      console.error('Error removing staff member:', error);
      toast.error('Failed to remove staff member');
    }
  };

  const staffPortalUrl = organization?.slug 
    ? `${window.location.origin}/cinema/${organization.slug}/staff`
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-muted-foreground">
              Create and manage your cinema staff accounts
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Staff Account</DialogTitle>
                <DialogDescription>
                  Create a new staff account for your cinema
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    {...register('fullName')}
                    className={errors.fullName ? 'border-destructive' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="staff@example.com"
                    {...register('email')}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password')}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select onValueChange={(value) => setValue('role', value as CreateStaffFormData['role'])}>
                    <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleDescriptions).map(([role, description]) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex flex-col">
                            <span>{roleLabels[role]}</span>
                            <span className="text-xs text-muted-foreground">{description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Staff Portal URL */}
        {staffPortalUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Staff Login Portal</CardTitle>
              <CardDescription>
                Share this URL with your staff members so they can log in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm break-all">
                  {staffPortalUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(staffPortalUrl);
                    toast.success('Copied to clipboard');
                  }}
                >
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {staffLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Current Staff</CardTitle>
              <CardDescription>
                Active staff members in your cinema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {staffMembers && staffMembers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {roleLabels[member.role] || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.role !== 'cinema_admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteStaffMember(member.id, member.email)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No staff members yet. Add your first team member!
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
