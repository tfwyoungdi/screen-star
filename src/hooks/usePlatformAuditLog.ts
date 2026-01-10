import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AuditLogEntry {
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
}

export function usePlatformAuditLog() {
  const { user } = useAuth();

  const logMutation = useMutation({
    mutationFn: async (entry: AuditLogEntry) => {
      if (!user?.id) return;

      const { error } = await supabase.from('platform_audit_logs').insert({
        admin_user_id: user.id,
        action: entry.action,
        target_type: entry.target_type || null,
        target_id: entry.target_id || null,
        details: entry.details || {},
        user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('Failed to log audit entry:', error);
        // Don't throw - audit logging should not block the main action
      }
    },
  });

  const logAction = (entry: AuditLogEntry) => {
    logMutation.mutate(entry);
  };

  return { logAction };
}
