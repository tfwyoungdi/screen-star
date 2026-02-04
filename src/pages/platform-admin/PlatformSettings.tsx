import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Settings, Shield, Globe, Timer, CreditCard } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { Tables } from '@/integrations/supabase/types';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';
import { GeneralSettingsTab } from '@/components/platform-admin/settings/GeneralSettingsTab';
import { MaintenanceSettingsTab } from '@/components/platform-admin/settings/MaintenanceSettingsTab';
import { FeatureFlagsTab } from '@/components/platform-admin/settings/FeatureFlagsTab';
import { SLASettingsTab } from '@/components/platform-admin/settings/SLASettingsTab';
import { PaymentGatewayTab } from '@/components/platform-admin/settings/PaymentGatewayTab';

type PlatformSettings = Tables<'platform_settings'>;

export default function PlatformSettingsPage() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PlatformSettings | null;
    },
  });

  const [formData, setFormData] = useState({
    platform_name: 'CineTix',
    support_email: '',
    primary_color: '#f59e0b',
    maintenance_mode: false,
    maintenance_message: '',
    enable_custom_domains: true,
    enable_cinema_gateways: true,
    enable_promotions: true,
    enable_wallet_feature: false,
    sla_response_time_low: 72,
    sla_response_time_medium: 24,
    sla_response_time_high: 8,
    sla_response_time_urgent: 2,
    sla_escalation_enabled: true,
    sla_escalation_email: '',
    subscription_payment_gateway: 'flutterwave',
    stripe_configured: false,
    flutterwave_configured: false,
    paystack_configured: false,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        platform_name: settings.platform_name || 'CineTix',
        support_email: settings.support_email || '',
        primary_color: settings.primary_color || '#f59e0b',
        maintenance_mode: settings.maintenance_mode || false,
        maintenance_message: settings.maintenance_message || '',
        enable_custom_domains: settings.enable_custom_domains ?? true,
        enable_cinema_gateways: settings.enable_cinema_gateways ?? true,
        enable_promotions: settings.enable_promotions ?? true,
        enable_wallet_feature: settings.enable_wallet_feature ?? false,
        sla_response_time_low: (settings as any).sla_response_time_low ?? 72,
        sla_response_time_medium: (settings as any).sla_response_time_medium ?? 24,
        sla_response_time_high: (settings as any).sla_response_time_high ?? 8,
        sla_response_time_urgent: (settings as any).sla_response_time_urgent ?? 2,
        sla_escalation_enabled: (settings as any).sla_escalation_enabled ?? true,
        sla_escalation_email: (settings as any).sla_escalation_email || '',
        subscription_payment_gateway: (settings as any).subscription_payment_gateway || 'flutterwave',
        stripe_configured: (settings as any).stripe_configured ?? false,
        flutterwave_configured: (settings as any).flutterwave_configured ?? false,
        paystack_configured: (settings as any).paystack_configured ?? false,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (settings?.id) {
        const { error } = await supabase
          .from('platform_settings')
          .update(data)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Settings saved successfully');
      
      logAction({
        action: 'platform_settings_updated',
        target_type: 'platform_settings',
        details: {
          maintenance_mode: variables.maintenance_mode,
          platform_name: variables.platform_name,
          subscription_payment_gateway: variables.subscription_payment_gateway,
        },
      });
    },
    onError: (error) => {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData as any);
  };

  if (isLoading) {
    return (
      <PlatformLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-60" />
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure global platform settings
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Features</span>
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">SLA</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettingsTab formData={formData} setFormData={setFormData} />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceSettingsTab formData={formData} setFormData={setFormData} />
          </TabsContent>

          <TabsContent value="features">
            <FeatureFlagsTab formData={formData} setFormData={setFormData} />
          </TabsContent>

          <TabsContent value="sla">
            <SLASettingsTab formData={formData} setFormData={setFormData} />
          </TabsContent>

          <TabsContent value="payment">
            <PaymentGatewayTab formData={formData} setFormData={setFormData} />
          </TabsContent>
        </Tabs>
      </div>
    </PlatformLayout>
  );
}
