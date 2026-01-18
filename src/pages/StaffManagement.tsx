import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus, Eye, EyeOff, Trash2, CheckCircle, KeyRound, Shield, MoreHorizontal, UserX, UserCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CreateStaffFormData = z.infer<typeof createStaffSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

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

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
}

export default function StaffManagement() {
  const { data: profile } = useUserProfile();
  const { data: organization } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
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

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    reset: resetPasswordForm,
    formState: { errors: resetErrors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Fetch current staff members
  const { data: staffMembers, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-members', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      // First get profiles including is_active status
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, is_active')
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
            is_active: p.is_active ?? true,
          };
        })
      );
      
      return profilesWithRoles as StaffMember[];
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

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    if (!profile?.organization_id || !selectedStaff) return;

    setIsResettingPassword(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('reset-staff-password', {
        body: {
          userId: selectedStaff.id,
          newPassword: data.newPassword,
          organizationId: profile.organization_id,
        },
      });

      if (error) {
        console.error('Error resetting password:', error);
        toast.error(error.message || 'Failed to reset password');
        return;
      }

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`Password reset for ${selectedStaff.email}`);
      resetPasswordForm();
      setResetPasswordDialogOpen(false);
      setSelectedStaff(null);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!profile?.organization_id || !selectedStaff || !newRole) return;

    setIsUpdatingRole(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('update-staff-role', {
        body: {
          userId: selectedStaff.id,
          newRole: newRole,
          organizationId: profile.organization_id,
        },
      });

      if (error) {
        console.error('Error updating role:', error);
        toast.error(error.message || 'Failed to update role');
        return;
      }

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success(`Role updated for ${selectedStaff.email}`);
      setEditRoleDialogOpen(false);
      setSelectedStaff(null);
      setNewRole('');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsUpdatingRole(false);
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

  const openResetPasswordDialog = (staff: StaffMember) => {
    setSelectedStaff(staff);
    resetPasswordForm();
    setResetPasswordDialogOpen(true);
  };

  const openEditRoleDialog = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setNewRole(staff.role);
    setEditRoleDialogOpen(true);
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    if (!profile?.organization_id) return;

    setIsTogglingStatus(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('toggle-staff-status', {
        body: {
          userId: staff.id,
          organizationId: profile.organization_id,
          isActive: !staff.is_active,
        },
      });

      if (error) {
        console.error('Error toggling status:', error);
        toast.error(error.message || 'Failed to update status');
        return;
      }

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success(staff.is_active ? `${staff.email} has been deactivated` : `${staff.email} has been reactivated`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const staffPortalUrl = organization?.slug 
    ? `https://${organization.slug}.cinetix.app/staff`
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
                          {member.is_active ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.role !== 'cinema_admin' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openResetPasswordDialog(member)}>
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditRoleDialog(member)}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleToggleStatus(member)}
                                  disabled={isTogglingStatus}
                                >
                                  {member.is_active ? (
                                    <>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Reactivate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => deleteStaffMember(member.id, member.email)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Staff
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedStaff?.email}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReset(handleResetPassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...registerReset('newPassword')}
                  className={resetErrors.newPassword ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {resetErrors.newPassword && (
                <p className="text-sm text-destructive">{resetErrors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...registerReset('confirmPassword')}
                className={resetErrors.confirmPassword ? 'border-destructive' : ''}
              />
              {resetErrors.confirmPassword && (
                <p className="text-sm text-destructive">{resetErrors.confirmPassword.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isResettingPassword}>
                {isResettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedStaff?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Role</Label>
              <Badge variant="secondary" className="text-base py-1 px-3">
                {selectedStaff ? roleLabels[selectedStaff.role] : ''}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newRole">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a new role" />
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
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateRole} 
                disabled={isUpdatingRole || newRole === selectedStaff?.role}
              >
                {isUpdatingRole ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Update Role
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
