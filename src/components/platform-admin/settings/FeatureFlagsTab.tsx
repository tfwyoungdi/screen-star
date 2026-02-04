import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe } from 'lucide-react';

interface FeatureFlagsTabProps {
  formData: {
    enable_custom_domains: boolean;
    enable_cinema_gateways: boolean;
    enable_promotions: boolean;
    enable_wallet_feature: boolean;
  };
  setFormData: (data: any) => void;
}

export function FeatureFlagsTab({ formData, setFormData }: FeatureFlagsTabProps) {
  return (
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
  );
}
