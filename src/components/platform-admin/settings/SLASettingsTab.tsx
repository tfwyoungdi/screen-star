import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Timer } from 'lucide-react';

interface SLASettingsTabProps {
  formData: {
    sla_response_time_low: number;
    sla_response_time_medium: number;
    sla_response_time_high: number;
    sla_response_time_urgent: number;
    sla_escalation_enabled: boolean;
    sla_escalation_email: string;
  };
  setFormData: (data: any) => void;
}

export function SLASettingsTab({ formData, setFormData }: SLASettingsTabProps) {
  return (
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
  );
}
