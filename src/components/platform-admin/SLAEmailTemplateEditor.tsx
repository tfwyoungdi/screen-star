import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Eye, Code, RefreshCw } from 'lucide-react';
import { sanitizeEmailTemplate, getSafePreviewSandbox } from '@/lib/htmlSanitizer';

interface SLAEmailTemplateProps {
  template: {
    subject: string;
    htmlBody: string;
  };
  onSave: (template: { subject: string; htmlBody: string }) => void;
  isSaving?: boolean;
}

const DEFAULT_TEMPLATE = {
  subject: '🚨 SLA Breach: {{priority}} Priority Ticket from {{cinema_name}}',
  htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr><td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">⚠️ SLA Breach Alert</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">A support ticket has exceeded its response time target</p>
          </td></tr>
          <tr><td style="background: #ffffff; padding: 24px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 20px;">
              <tr><td style="padding: 20px;">
                <strong style="color: #dc2626;">⏱️ Overdue by {{hours_overdue}} hours</strong>
                <p style="margin: 10px 0 0 0; color: #7f1d1d; font-size: 14px;">This ticket requires immediate attention to meet SLA requirements.</p>
              </td></tr>
            </table>
            <h2 style="color: #111827; margin-bottom: 20px; font-size: 18px;">Ticket Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 500; font-size: 14px;">Ticket ID</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600; text-align: right; font-size: 14px;">{{ticket_id}}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 500; font-size: 14px;">Subject</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600; text-align: right; font-size: 14px;">{{ticket_subject}}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 500; font-size: 14px;">Cinema</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600; text-align: right; font-size: 14px;">{{cinema_name}}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 500; font-size: 14px;">Priority</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 14px;">
                  <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #fef2f2; color: #dc2626;">{{priority}}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-weight: 500; font-size: 14px;">Created At</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right; font-size: 14px;">{{created_at}}</td>
              </tr>
            </table>
            <p style="color: #6b7280; text-align: center; margin-top: 30px; font-size: 14px;">Please log in to the Platform Admin dashboard to respond to this ticket.</p>
          </td></tr>
          <tr><td align="center" style="padding: 20px;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">This is an automated SLA escalation notification from {{platform_name}}.</p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
};

const AVAILABLE_VARIABLES = [
  { name: '{{ticket_id}}', description: 'Unique ticket identifier' },
  { name: '{{ticket_subject}}', description: 'Ticket subject line' },
  { name: '{{cinema_name}}', description: 'Name of the cinema' },
  { name: '{{priority}}', description: 'Ticket priority (urgent, high, medium, low)' },
  { name: '{{created_at}}', description: 'Date and time ticket was created' },
  { name: '{{hours_overdue}}', description: 'Hours past the SLA target' },
  { name: '{{platform_name}}', description: 'Name of the platform' },
  { name: '{{escalation_email}}', description: 'Configured escalation email' },
];

export function SLAEmailTemplateEditor({ template, onSave, isSaving }: SLAEmailTemplateProps) {
  const [editedTemplate, setEditedTemplate] = useState(template);
  const [activeTab, setActiveTab] = useState('edit');

  const handleReset = () => {
    setEditedTemplate(DEFAULT_TEMPLATE);
    toast.info('Template reset to default');
  };

  const handleSave = () => {
    // SECURITY: Sanitize HTML content before saving to prevent stored XSS
    const sanitizedTemplate = {
      subject: editedTemplate.subject,
      htmlBody: sanitizeEmailTemplate(editedTemplate.htmlBody),
    };
    onSave(sanitizedTemplate);
  };

  const getPreviewHtml = () => {
    let preview = editedTemplate.htmlBody;
    preview = preview.replace(/\{\{ticket_id\}\}/g, 'abc12345');
    preview = preview.replace(/\{\{ticket_subject\}\}/g, 'Payment gateway not working');
    preview = preview.replace(/\{\{cinema_name\}\}/g, 'Grand Cinema');
    preview = preview.replace(/\{\{priority\}\}/g, 'urgent');
    preview = preview.replace(/\{\{created_at\}\}/g, 'Jan 12, 2026 3:45 PM');
    preview = preview.replace(/\{\{hours_overdue\}\}/g, '2.5');
    preview = preview.replace(/\{\{platform_name\}\}/g, 'Cinitix Platform');
    preview = preview.replace(/\{\{escalation_email\}\}/g, 'admin@cinitix.com');
    return preview;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          SLA Escalation Email Template
        </CardTitle>
        <CardDescription>
          Customize the email sent when tickets breach SLA targets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Email Subject</Label>
          <Input
            value={editedTemplate.subject}
            onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
            placeholder="SLA Breach: {{priority}} Priority Ticket"
          />
        </div>

        <div className="space-y-2">
          <Label>Available Variables</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_VARIABLES.map((variable) => (
              <Badge
                key={variable.name}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => {
                  navigator.clipboard.writeText(variable.name);
                  toast.success(`Copied ${variable.name}`);
                }}
                title={variable.description}
              >
                {variable.name}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Click to copy. Hover for description.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="gap-2">
              <Code className="h-4 w-4" />
              Edit HTML
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="space-y-2">
            <Textarea
              value={editedTemplate.htmlBody}
              onChange={(e) => setEditedTemplate({ ...editedTemplate, htmlBody: e.target.value })}
              className="font-mono text-xs min-h-[400px]"
              placeholder="Enter HTML template..."
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="border rounded-lg overflow-hidden bg-white">
              {/* SECURITY: Use sandboxed iframe to prevent XSS from template preview */}
              <iframe
                srcDoc={getPreviewHtml()}
                className="w-full h-[500px] border-0"
                title="Email Preview"
                sandbox={getSafePreviewSandbox()}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_TEMPLATE };
