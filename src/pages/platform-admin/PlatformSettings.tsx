import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Settings, Shield, Globe, Timer } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { Tables } from '@/integrations/supabase/types';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

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

        <div className="grid gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General
              </CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input
                    value={formData.platform_name}
                    onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })}
                    placeholder="CineTix"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      placeholder="#f59e0b"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input
                  type="email"
                  value={formData.support_email}
                  onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                  placeholder="support@cinetix.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Maintenance Mode
              </CardTitle>
              <CardDescription>Take the platform offline for maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    All cinemas will see a maintenance message
                  </p>
                </div>
                <Switch
                  checked={formData.maintenance_mode}
                  onCheckedChange={(checked) => setFormData({ ...formData, maintenance_mode: checked })}
                />
              </div>
              {formData.maintenance_mode && (
                <div className="space-y-2">
                  <Label>Maintenance Message</Label>
                  <Textarea
                    value={formData.maintenance_message}
                    onChange={(e) => setFormData({ ...formData, maintenance_message: e.target.value })}
                    placeholder="We're performing scheduled maintenance. We'll be back shortly."
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feature Flags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Custom Domains</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow cinemas to use custom domains
                  </p>
                </div>
                <Switch
                  checked={formData.enable_custom_domains}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_custom_domains: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cinema Payment Gateways</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow cinemas to use their own payment gateways
                  </p>
                </div>
                <Switch
                  checked={formData.enable_cinema_gateways}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_cinema_gateways: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Promotions & Promo Codes</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow cinemas to create promotional codes
                  </p>
                </div>
                <Switch
                  checked={formData.enable_promotions}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_promotions: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Wallet Feature (Beta)</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable customer wallet for cinema apps
                  </p>
                </div>
                <Switch
                  checked={formData.enable_wallet_feature}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_wallet_feature: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* SLA Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                SLA Response Times
              </CardTitle>
              <CardDescription>Configure target response times by priority (in hours)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Urgent (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.sla_response_time_urgent}
                    onChange={(e) => setFormData({ ...formData, sla_response_time_urgent: parseInt(e.target.value) || 2 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>High (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.sla_response_time_high}
                    onChange={(e) => setFormData({ ...formData, sla_response_time_high: parseInt(e.target.value) || 8 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medium (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.sla_response_time_medium}
                    onChange={(e) => setFormData({ ...formData, sla_response_time_medium: parseInt(e.target.value) || 24 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Low (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.sla_response_time_low}
                    onChange={(e) => setFormData({ ...formData, sla_response_time_low: parseInt(e.target.value) || 72 })}
                  />
                </div>
              </div>
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable SLA Escalation</Label>
                    <p className="text-sm text-muted-foreground">
                      Send alerts when tickets breach SLA targets
                    </p>
                  </div>
                  <Switch
                    checked={formData.sla_escalation_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, sla_escalation_enabled: checked })}
                  />
                </div>
                {formData.sla_escalation_enabled && (
                  <div className="space-y-2">
                    <Label>Escalation Email</Label>
                    <Input
                      type="email"
                      value={formData.sla_escalation_email}
                      onChange={(e) => setFormData({ ...formData, sla_escalation_email: e.target.value })}
                      placeholder="escalations@cinetix.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email address to receive SLA breach notifications
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlatformLayout>
  );
}
