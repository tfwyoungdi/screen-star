import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Mail, Send, Eye, Users, Clock, Loader2, 
  Save, Plus, FileText, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

interface CustomerEmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CUSTOMER_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .message-box { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">{{email_title}}</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <div class="message-box">
        {{email_content}}
      </div>
      <p>Thank you for being a valued customer!</p>
    </div>
    <div class="footer">{{platform_name}}</div>
  </div>
</body>
</html>`;

interface PlatformCustomerEmailSenderProps {
  customers: Array<{
    id: string;
    email: string;
    full_name: string;
    organization_id: string;
    organization_name?: string;
  }>;
  selectedCinema: string;
}

export function PlatformCustomerEmailSender({ customers, selectedCinema }: PlatformCustomerEmailSenderProps) {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    htmlBody: DEFAULT_CUSTOMER_TEMPLATE,
  });
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    subject: '',
    htmlBody: DEFAULT_CUSTOMER_TEMPLATE,
  });
  const [isSending, setIsSending] = useState(false);

  // Fetch saved templates
  const { data: templates, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ['platform-customer-email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_customer_email_templates' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as CustomerEmailTemplate[];
    },
  });

  // Fetch past campaigns
  const { data: campaigns, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['platform-customer-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_customer_email_campaigns' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('platform_customer_email_templates' as any)
        .insert({
          name: templateFormData.name,
          subject: templateFormData.subject,
          html_body: templateFormData.htmlBody,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Template saved successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-customer-email-templates'] });
      setIsTemplateDialogOpen(false);
      setTemplateFormData({ name: '', subject: '', htmlBody: DEFAULT_CUSTOMER_TEMPLATE });
    },
    onError: (error) => {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('platform_customer_email_templates' as any)
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['platform-customer-email-templates'] });
    },
    onError: (error) => {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    },
  });

  // Send email mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      const finalHtml = formData.htmlBody
        .replace(/\{\{email_title\}\}/g, formData.title)
        .replace(/\{\{email_content\}\}/g, formData.content);

      const { data, error } = await supabase.functions.invoke('send-platform-customer-email', {
        body: {
          title: formData.title,
          subject: formData.subject,
          html_body: finalHtml,
          customer_emails: customers.map(c => ({
            email: c.email,
            name: c.full_name,
            organization_id: c.organization_id,
          })),
          filter_cinema: selectedCinema !== 'all' ? selectedCinema : undefined,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Email sent to ${data.sent_count} customers`);
      queryClient.invalidateQueries({ queryKey: ['platform-customer-campaigns'] });
      logAction({
        action: 'platform_customer_email_sent',
        target_type: 'platform_customer_email',
        details: {
          title: formData.title,
          recipients: data.sent_count,
        },
      });
      setIsOpen(false);
      setFormData({ title: '', subject: '', content: '', htmlBody: DEFAULT_CUSTOMER_TEMPLATE });
    },
    onError: (error) => {
      console.error('Failed to send email:', error);
      toast.error('Failed to send email');
    },
  });

  const handleSend = async () => {
    if (!formData.title || !formData.subject || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      await sendMutation.mutateAsync();
    } finally {
      setIsSending(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        subject: template.subject,
        htmlBody: template.html_body,
      });
    }
  };

  const getPreviewHtml = () => {
    return formData.htmlBody
      .replace(/\{\{customer_name\}\}/g, 'John Doe')
      .replace(/\{\{email_title\}\}/g, formData.title || 'Email Title')
      .replace(/\{\{email_content\}\}/g, formData.content || 'Your message content here...')
      .replace(/\{\{platform_name\}\}/g, 'CineTix Platform');
  };

  const recipientCount = customers.length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email All Customers
          </CardTitle>
          <CardDescription>
            Send bulk emails to customers with templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => setIsOpen(true)} className="flex-1 gap-2">
              <Send className="h-4 w-4" />
              Compose Email
            </Button>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </div>

          {/* Saved Templates */}
          {isTemplatesLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : templates && templates.length > 0 ? (
            <div>
              <h4 className="font-medium mb-2 text-sm">Saved Templates</h4>
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{template.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Past Campaigns */}
          {isCampaignsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div>
              <h4 className="font-medium mb-2 text-sm">Recent Campaigns</h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {campaigns.map((campaign: any) => (
                    <div
                      key={campaign.id}
                      className="p-3 border rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{campaign.title}</p>
                        <Badge
                          variant={campaign.status === 'sent' ? 'default' : 'secondary'}
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign.sent_count}/{campaign.total_recipients}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {campaign.opened_count || 0} opened
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {campaign.sent_at 
                            ? format(new Date(campaign.sent_at), 'MMM d, h:mm a')
                            : 'Not sent'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No campaigns sent yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Compose Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Compose Customer Email</DialogTitle>
            <DialogDescription>
              Send email to {recipientCount} customer{recipientCount !== 1 ? 's' : ''}
              {selectedCinema !== 'all' ? ' (filtered)' : ' across all cinemas'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="template">Template</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="compose" className="space-y-4 mt-4">
                {templates && templates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Use Template</Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Email Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Special Offer for You!"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Subject</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., 🎬 {{email_title}} - Don't Miss Out!"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {"{{email_title}}"}, {"{{customer_name}}"}, {"{{platform_name}}"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Email Content</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your email content here..."
                    rows={6}
                  />
                </div>
              </TabsContent>

              <TabsContent value="template" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>HTML Template</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, htmlBody: DEFAULT_CUSTOMER_TEMPLATE })}
                    >
                      Reset to Default
                    </Button>
                  </div>
                  <Textarea
                    value={formData.htmlBody}
                    onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                    className="font-mono text-xs"
                    rows={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: {"{{customer_name}}"}, {"{{email_title}}"}, {"{{email_content}}"}, {"{{platform_name}}"}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={getPreviewHtml()}
                    className="w-full h-[400px] border-0"
                    title="Email Preview"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || !formData.title || !formData.subject || !formData.content}
              className="gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to {recipientCount} Customers
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Save a reusable email template for future campaigns
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                placeholder="e.g., Welcome Email"
              />
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={templateFormData.subject}
                onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                placeholder="e.g., Welcome to {{platform_name}}!"
              />
            </div>

            <div className="space-y-2">
              <Label>HTML Template</Label>
              <Textarea
                value={templateFormData.htmlBody}
                onChange={(e) => setTemplateFormData({ ...templateFormData, htmlBody: e.target.value })}
                className="font-mono text-xs"
                rows={12}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveTemplateMutation.mutate()}
              disabled={!templateFormData.name || !templateFormData.subject}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
