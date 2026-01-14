import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Mail, Eye, Code, RefreshCw, AlertTriangle, UserPlus, 
  CreditCard, Building2, Bell, ShieldCheck, Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  isActive: boolean;
}

export interface PlatformEmailTemplates {
  sla_escalation: EmailTemplate;
  welcome_cinema: EmailTemplate;
  subscription_activated: EmailTemplate;
  subscription_expiring: EmailTemplate;
  payment_failed: EmailTemplate;
  platform_announcement: EmailTemplate;
}

interface TemplateInfo {
  key: keyof PlatformEmailTemplates;
  name: string;
  description: string;
  icon: React.ReactNode;
  variables: { name: string; description: string }[];
}

const TEMPLATE_INFO: TemplateInfo[] = [
  {
    key: 'sla_escalation',
    name: 'SLA Escalation',
    description: 'Sent when support tickets breach SLA targets',
    icon: <AlertTriangle className="h-4 w-4" />,
    variables: [
      { name: '{{ticket_id}}', description: 'Unique ticket identifier' },
      { name: '{{ticket_subject}}', description: 'Ticket subject line' },
      { name: '{{cinema_name}}', description: 'Name of the cinema' },
      { name: '{{priority}}', description: 'Ticket priority level' },
      { name: '{{created_at}}', description: 'Date ticket was created' },
      { name: '{{hours_overdue}}', description: 'Hours past SLA target' },
      { name: '{{platform_name}}', description: 'Platform name' },
    ],
  },
  {
    key: 'welcome_cinema',
    name: 'Welcome Cinema',
    description: 'Sent when a new cinema signs up',
    icon: <Building2 className="h-4 w-4" />,
    variables: [
      { name: '{{cinema_name}}', description: 'Name of the cinema' },
      { name: '{{admin_name}}', description: 'Cinema admin full name' },
      { name: '{{admin_email}}', description: 'Cinema admin email' },
      { name: '{{plan_name}}', description: 'Subscription plan name' },
      { name: '{{dashboard_url}}', description: 'Link to cinema dashboard' },
      { name: '{{platform_name}}', description: 'Platform name' },
    ],
  },
  {
    key: 'subscription_activated',
    name: 'Subscription Activated',
    description: 'Sent when a subscription is activated or renewed',
    icon: <ShieldCheck className="h-4 w-4" />,
    variables: [
      { name: '{{cinema_name}}', description: 'Name of the cinema' },
      { name: '{{plan_name}}', description: 'Subscription plan name' },
      { name: '{{billing_period}}', description: 'Monthly or yearly' },
      { name: '{{next_billing_date}}', description: 'Next billing date' },
      { name: '{{amount}}', description: 'Subscription amount' },
      { name: '{{platform_name}}', description: 'Platform name' },
    ],
  },
  {
    key: 'subscription_expiring',
    name: 'Subscription Expiring',
    description: 'Sent before subscription expires',
    icon: <Bell className="h-4 w-4" />,
    variables: [
      { name: '{{cinema_name}}', description: 'Name of the cinema' },
      { name: '{{plan_name}}', description: 'Current plan name' },
      { name: '{{expiry_date}}', description: 'Subscription expiry date' },
      { name: '{{days_remaining}}', description: 'Days until expiry' },
      { name: '{{renewal_url}}', description: 'Link to renew subscription' },
      { name: '{{platform_name}}', description: 'Platform name' },
    ],
  },
  {
    key: 'payment_failed',
    name: 'Payment Failed',
    description: 'Sent when a subscription payment fails',
    icon: <CreditCard className="h-4 w-4" />,
    variables: [
      { name: '{{cinema_name}}', description: 'Name of the cinema' },
      { name: '{{plan_name}}', description: 'Subscription plan name' },
      { name: '{{amount}}', description: 'Failed payment amount' },
      { name: '{{failure_reason}}', description: 'Reason for failure' },
      { name: '{{retry_date}}', description: 'Next retry date' },
      { name: '{{update_payment_url}}', description: 'Link to update payment' },
      { name: '{{platform_name}}', description: 'Platform name' },
    ],
  },
  {
    key: 'platform_announcement',
    name: 'Platform Announcement',
    description: 'General announcements to all cinemas',
    icon: <UserPlus className="h-4 w-4" />,
    variables: [
      { name: '{{cinema_name}}', description: 'Name of the cinema' },
      { name: '{{announcement_title}}', description: 'Announcement title' },
      { name: '{{announcement_content}}', description: 'Main content' },
      { name: '{{platform_name}}', description: 'Platform name' },
    ],
  },
];

const DEFAULT_TEMPLATES: PlatformEmailTemplates = {
  sla_escalation: {
    subject: '🚨 SLA Breach: {{priority}} Priority Ticket from {{cinema_name}}',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⚠️ SLA Breach Alert</h1>
      <p style="margin: 10px 0 0 0;">A support ticket has exceeded its response time target</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong style="color: #dc2626;">⏱️ Overdue by {{hours_overdue}} hours</strong>
      </div>
      <div class="detail-row"><strong>Ticket ID:</strong> {{ticket_id}}</div>
      <div class="detail-row"><strong>Subject:</strong> {{ticket_subject}}</div>
      <div class="detail-row"><strong>Cinema:</strong> {{cinema_name}}</div>
      <div class="detail-row"><strong>Priority:</strong> {{priority}}</div>
      <div class="detail-row"><strong>Created:</strong> {{created_at}}</div>
    </div>
    <div class="footer">Automated notification from {{platform_name}}</div>
  </div>
</body>
</html>`,
    isActive: true,
  },
  welcome_cinema: {
    subject: '🎬 Welcome to {{platform_name}}, {{cinema_name}}!',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .feature-box { background: #fffbeb; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎉 Welcome Aboard!</h1>
      <p style="margin: 10px 0 0 0;">Your cinema is now live on {{platform_name}}</p>
    </div>
    <div class="content">
      <p>Hi {{admin_name}},</p>
      <p>Thank you for choosing {{platform_name}}! Your cinema <strong>{{cinema_name}}</strong> is now set up with the <strong>{{plan_name}}</strong> plan.</p>
      <h3>What's Next?</h3>
      <div class="feature-box">✨ Add your movies and showtimes</div>
      <div class="feature-box">🎫 Configure your screens and seating</div>
      <div class="feature-box">🍿 Set up your concessions menu</div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_url}}" class="cta-button">Go to Dashboard</a>
      </div>
    </div>
    <div class="footer">{{platform_name}} - Cinema Management Made Simple</div>
  </div>
</body>
</html>`,
    isActive: true,
  },
  subscription_activated: {
    subject: '✅ Subscription Activated - {{plan_name}} Plan',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; text-align: center; }
    .detail-row { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Subscription Activated</h1>
    </div>
    <div class="content">
      <div class="success-box">
        <h2 style="color: #16a34a; margin: 0;">You're all set!</h2>
        <p>Your {{plan_name}} subscription is now active.</p>
      </div>
      <h3>Subscription Details</h3>
      <div class="detail-row"><strong>Cinema:</strong> {{cinema_name}}</div>
      <div class="detail-row"><strong>Plan:</strong> {{plan_name}}</div>
      <div class="detail-row"><strong>Billing:</strong> {{billing_period}}</div>
      <div class="detail-row"><strong>Amount:</strong> {{amount}}</div>
      <div class="detail-row"><strong>Next Billing:</strong> {{next_billing_date}}</div>
    </div>
    <div class="footer">{{platform_name}}</div>
  </div>
</body>
</html>`,
    isActive: true,
  },
  subscription_expiring: {
    subject: '⏰ Your {{plan_name}} Subscription Expires in {{days_remaining}} Days',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .warning-box { background: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 8px; text-align: center; }
    .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⏰ Subscription Expiring Soon</h1>
    </div>
    <div class="content">
      <div class="warning-box">
        <h2 style="color: #d97706; margin: 0;">{{days_remaining}} Days Remaining</h2>
        <p>Your subscription expires on {{expiry_date}}</p>
      </div>
      <p>Hi there,</p>
      <p>Your <strong>{{plan_name}}</strong> subscription for <strong>{{cinema_name}}</strong> will expire soon. Renew now to avoid any service interruption.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{renewal_url}}" class="cta-button">Renew Subscription</a>
      </div>
    </div>
    <div class="footer">{{platform_name}}</div>
  </div>
</body>
</html>`,
    isActive: true,
  },
  payment_failed: {
    subject: '❌ Payment Failed for {{cinema_name}}',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; }
    .cta-button { display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .detail-row { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">❌ Payment Failed</h1>
    </div>
    <div class="content">
      <div class="error-box">
        <strong style="color: #dc2626;">We couldn't process your payment</strong>
        <p style="margin: 10px 0 0 0;">{{failure_reason}}</p>
      </div>
      <h3>Payment Details</h3>
      <div class="detail-row"><strong>Cinema:</strong> {{cinema_name}}</div>
      <div class="detail-row"><strong>Plan:</strong> {{plan_name}}</div>
      <div class="detail-row"><strong>Amount:</strong> {{amount}}</div>
      <div class="detail-row"><strong>Next Retry:</strong> {{retry_date}}</div>
      <p>Please update your payment method to avoid service interruption.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{update_payment_url}}" class="cta-button">Update Payment Method</a>
      </div>
    </div>
    <div class="footer">{{platform_name}}</div>
  </div>
</body>
</html>`,
    isActive: true,
  },
  platform_announcement: {
    subject: '📢 {{announcement_title}} - {{platform_name}}',
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .announcement-box { background: #eef2ff; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📢 {{announcement_title}}</h1>
    </div>
    <div class="content">
      <p>Hi {{cinema_name}},</p>
      <div class="announcement-box">
        {{announcement_content}}
      </div>
      <p>If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">{{platform_name}}</div>
  </div>
</body>
</html>`,
    isActive: true,
  },
};

const getSampleData = (templateKey: keyof PlatformEmailTemplates): Record<string, string> => {
  const base = {
    platform_name: 'CineTix Platform',
  };
  
  switch (templateKey) {
    case 'sla_escalation':
      return {
        ...base,
        ticket_id: 'TKT-12345',
        ticket_subject: 'Payment gateway not working',
        cinema_name: 'Grand Cinema',
        priority: 'urgent',
        created_at: 'Jan 14, 2026 3:45 PM',
        hours_overdue: '2.5',
      };
    case 'welcome_cinema':
      return {
        ...base,
        cinema_name: 'Starlight Theatre',
        admin_name: 'John Smith',
        admin_email: 'john@starlighttheatre.com',
        plan_name: 'Pro',
        dashboard_url: 'https://app.cinetix.com/dashboard',
      };
    case 'subscription_activated':
      return {
        ...base,
        cinema_name: 'Galaxy Cinema',
        plan_name: 'Enterprise',
        billing_period: 'Yearly',
        next_billing_date: 'Jan 14, 2027',
        amount: '$999/year',
      };
    case 'subscription_expiring':
      return {
        ...base,
        cinema_name: 'Metro Movies',
        plan_name: 'Pro',
        expiry_date: 'Jan 21, 2026',
        days_remaining: '7',
        renewal_url: 'https://app.cinetix.com/billing',
      };
    case 'payment_failed':
      return {
        ...base,
        cinema_name: 'Cinema Central',
        plan_name: 'Pro',
        amount: '$49.99',
        failure_reason: 'Card declined - insufficient funds',
        retry_date: 'Jan 17, 2026',
        update_payment_url: 'https://app.cinetix.com/billing',
      };
    case 'platform_announcement':
      return {
        ...base,
        cinema_name: 'Your Cinema',
        announcement_title: 'New Feature Release',
        announcement_content: 'We are excited to announce our new mobile app integration! You can now manage your cinema on the go.',
      };
    default:
      return base;
  }
};

interface PlatformEmailTemplatesEditorProps {
  templates: PlatformEmailTemplates;
  onSave: (templates: PlatformEmailTemplates) => void;
  isSaving?: boolean;
}

export function PlatformEmailTemplatesEditor({ templates, onSave, isSaving }: PlatformEmailTemplatesEditorProps) {
  const [editedTemplates, setEditedTemplates] = useState<PlatformEmailTemplates>(templates);
  const [activeTemplate, setActiveTemplate] = useState<keyof PlatformEmailTemplates>('sla_escalation');
  const [activeTab, setActiveTab] = useState('edit');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    setEditedTemplates(templates);
  }, [templates]);

  const currentTemplateInfo = TEMPLATE_INFO.find(t => t.key === activeTemplate)!;
  const currentTemplate = editedTemplates[activeTemplate];

  const handleTemplateChange = (field: keyof EmailTemplate, value: string | boolean) => {
    setEditedTemplates(prev => ({
      ...prev,
      [activeTemplate]: {
        ...prev[activeTemplate],
        [field]: value,
      },
    }));
  };

  const handleReset = () => {
    setEditedTemplates(prev => ({
      ...prev,
      [activeTemplate]: DEFAULT_TEMPLATES[activeTemplate],
    }));
    toast.info('Template reset to default');
  };

  const handleSave = () => {
    onSave(editedTemplates);
  };

  const getPreviewHtml = () => {
    let preview = currentTemplate.htmlBody;
    const sampleData = getSampleData(activeTemplate);
    
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    
    return preview;
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('No email found for current user');
        return;
      }

      let previewSubject = currentTemplate.subject;
      const sampleData = getSampleData(activeTemplate);
      Object.entries(sampleData).forEach(([key, value]) => {
        previewSubject = previewSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });

      const { error } = await supabase.functions.invoke('send-test-email', {
        body: {
          to: user.email,
          subject: `[TEST] ${previewSubject}`,
          html: getPreviewHtml(),
        },
      });

      if (error) throw error;
      toast.success(`Test email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Platform Email Templates
        </CardTitle>
        <CardDescription>
          Customize email templates for platform communications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          {/* Template Sidebar */}
          <ScrollArea className="h-[600px] w-64 border rounded-lg">
            <div className="p-2 space-y-1">
              {TEMPLATE_INFO.map((template) => {
                const isActive = activeTemplate === template.key;
                const templateData = editedTemplates[template.key];
                return (
                  <button
                    key={template.key}
                    onClick={() => setActiveTemplate(template.key)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {template.icon}
                      <span className="font-medium text-sm">{template.name}</span>
                    </div>
                    <p className={`text-xs mt-1 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {template.description}
                    </p>
                    <div className="mt-2">
                      <Badge 
                        variant={templateData.isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {templateData.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Template Editor */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{currentTemplateInfo.name}</h3>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={currentTemplate.isActive}
                    onCheckedChange={(checked) => handleTemplateChange('isActive', checked)}
                  />
                  <Label className="text-sm text-muted-foreground">
                    {currentTemplate.isActive ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {isSendingTest ? 'Sending...' : 'Send Test'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input
                value={currentTemplate.subject}
                onChange={(e) => handleTemplateChange('subject', e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>

            <div className="space-y-2">
              <Label>Available Variables</Label>
              <div className="flex flex-wrap gap-2">
                {currentTemplateInfo.variables.map((variable) => (
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
              <TabsContent value="edit">
                <Textarea
                  value={currentTemplate.htmlBody}
                  onChange={(e) => handleTemplateChange('htmlBody', e.target.value)}
                  className="font-mono text-xs min-h-[350px]"
                  placeholder="Enter HTML template..."
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={getPreviewHtml()}
                    className="w-full h-[350px] border-0"
                    title="Email Preview"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reset to Default
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save All Templates'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_TEMPLATES, TEMPLATE_INFO };
