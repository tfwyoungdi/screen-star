import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Shield } from 'lucide-react';

interface MaintenanceSettingsTabProps {
  formData: {
    maintenance_mode: boolean;
    maintenance_message: string;
  };
  setFormData: (data: any) => void;
}

export function MaintenanceSettingsTab({ formData, setFormData }: MaintenanceSettingsTabProps) {
  return (
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
  );
}
