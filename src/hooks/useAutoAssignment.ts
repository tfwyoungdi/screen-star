import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminWorkload {
  userId: string;
  email: string;
  fullName: string;
  openTickets: number;
  avgResponseTime: number;
}

export function useAutoAssignment() {
  const queryClient = useQueryClient();

  // Get platform admins with their current workload
  const getAdminWorkloads = async (): Promise<AdminWorkload[]> => {
    // Get all platform admin user IDs
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'platform_admin');

    if (rolesError) throw rolesError;
    if (!adminRoles || adminRoles.length === 0) return [];

    const adminUserIds = adminRoles.map((r) => r.user_id);

    // Get profiles for admins
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', adminUserIds);

    if (profilesError) throw profilesError;

    // Get open ticket counts per admin
    const { data: ticketCounts, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('assigned_to')
      .in('assigned_to', adminUserIds)
      .in('status', ['open', 'in_progress']);

    if (ticketsError) throw ticketsError;

    // Calculate workloads
    const workloads: AdminWorkload[] = (profiles || []).map((profile) => {
      const openTickets = (ticketCounts || []).filter(
        (t) => t.assigned_to === profile.id
      ).length;

      return {
        userId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        openTickets,
        avgResponseTime: 0, // Could calculate from historical data if needed
      };
    });

    return workloads;
  };

  // Find the best admin to assign based on workload and priority
  const findBestAdmin = (workloads: AdminWorkload[], priority: string): AdminWorkload | null => {
    if (workloads.length === 0) return null;

    // Sort by open tickets (lowest first)
    const sorted = [...workloads].sort((a, b) => a.openTickets - b.openTickets);

    // For urgent/high priority, we might want to assign to available admins more aggressively
    // For now, just return the one with least workload
    return sorted[0];
  };

  const autoAssignMutation = useMutation({
    mutationFn: async ({ ticketId, priority }: { ticketId: string; priority: string }) => {
      const workloads = await getAdminWorkloads();
      const bestAdmin = findBestAdmin(workloads, priority);

      if (!bestAdmin) {
        throw new Error('No platform admins available for assignment');
      }

      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: bestAdmin.userId,
          status: 'in_progress' 
        })
        .eq('id', ticketId);

      if (error) throw error;

      return { 
        assignedTo: bestAdmin,
        ticketId 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-support-tickets'] });
      toast.success(`Ticket assigned to ${data.assignedTo.fullName}`);
    },
    onError: (error) => {
      console.error('Auto-assignment failed:', error);
      toast.error('Failed to auto-assign ticket');
    },
  });

  const bulkAutoAssignMutation = useMutation({
    mutationFn: async (tickets: Array<{ id: string; priority: string }>) => {
      const workloads = await getAdminWorkloads();
      const assignments: Array<{ ticketId: string; adminId: string }> = [];

      // Create a mutable copy of workloads to track assignments
      const mutableWorkloads = [...workloads];

      for (const ticket of tickets) {
        const bestAdmin = findBestAdmin(mutableWorkloads, ticket.priority);
        if (bestAdmin) {
          assignments.push({
            ticketId: ticket.id,
            adminId: bestAdmin.userId,
          });
          // Update the local workload count
          const adminIndex = mutableWorkloads.findIndex((w) => w.userId === bestAdmin.userId);
          if (adminIndex >= 0) {
            mutableWorkloads[adminIndex].openTickets += 1;
          }
        }
      }

      // Perform all assignments
      for (const assignment of assignments) {
        await supabase
          .from('support_tickets')
          .update({ 
            assigned_to: assignment.adminId,
            status: 'in_progress' 
          })
          .eq('id', assignment.ticketId);
      }

      return { assignedCount: assignments.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-support-tickets'] });
      toast.success(`Auto-assigned ${data.assignedCount} tickets`);
    },
    onError: (error) => {
      console.error('Bulk auto-assignment failed:', error);
      toast.error('Failed to auto-assign tickets');
    },
  });

  return {
    autoAssign: autoAssignMutation.mutate,
    bulkAutoAssign: bulkAutoAssignMutation.mutate,
    isAssigning: autoAssignMutation.isPending || bulkAutoAssignMutation.isPending,
    getAdminWorkloads,
  };
}
