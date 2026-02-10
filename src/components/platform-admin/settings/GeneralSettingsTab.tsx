import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Phone, Mail } from 'lucide-react';

interface GeneralSettingsTabProps {
  formData: {
    platform_name: string;
    primary_color: string;
    support_email: string;
    contact_phone: string;
    contact_email_description: string;
    contact_phone_description: string;
  };
  setFormData: (data: any) => void;
}

export function GeneralSettingsTab({ formData, setFormData }: GeneralSettingsTabProps) {
  return (
    <div className="space-y-6">
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
                placeholder="Cinitix"
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
              placeholder="support@cinitix.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Public Contact Methods
          </CardTitle>
          <CardDescription>These appear on the public Contact Us page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email Description
              </Label>
              <Input
                value={formData.contact_email_description}
                onChange={(e) => setFormData({ ...formData, contact_email_description: e.target.value })}
                placeholder="Get help with technical issues"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+1 (800) 555-0199"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phone Description</Label>
            <Input
              value={formData.contact_phone_description}
              onChange={(e) => setFormData({ ...formData, contact_phone_description: e.target.value })}
              placeholder="Mon-Fri from 8am to 6pm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
