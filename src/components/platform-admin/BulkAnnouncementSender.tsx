import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Megaphone, Send, Eye, Code, Users, Filter, 
  Clock, CheckCircle, XCircle, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

const DEFAULT_ANNOUNCEMENT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .logo { max-height: 60px; margin-bottom: 15px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .announcement-box { background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://screen-star.lovable.app/cinitix-logo.png" alt="Cinitix Logo" class="logo" />
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
</html>`;

export function BulkAnnouncementSender() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    htmlBody: DEFAULT_ANNOUNCEMENT_TEMPLATE,
  });
  const [filters, setFilters] = useState({
    activeOnly: true,
    selectedPlans: [] as string[],
  });
  const [isSending, setIsSending] = useState(false);

  // Fetch subscription plans
  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch organizations count based on filters
  const { data: recipientCount, isLoading: isCountLoading } = useQuery({
    queryKey: ['announcement-recipients', filters],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true });

      if (filters.activeOnly) {
        query = query.eq('is_active', true);
      }

      const { count, error } = await query;
      if (error) throw error;

      // If plan filter is applied, get subscribed orgs
      if (filters.selectedPlans.length > 0) {
        const { data: subs } = await supabase
          .from('cinema_subscriptions')
          .select('organization_id')
          .in('plan_id', filters.selectedPlans)
          .eq('status', 'active');

        return subs?.length || 0;
      }

      return count || 0;
    },
  });

  // Fetch past campaigns
  const { data: campaigns, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['announcement-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_announcement_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Build final HTML with content
      const finalHtml = formData.htmlBody
        .replace(/\{\{announcement_content\}\}/g, formData.content);

      const { data, error } = await supabase.functions.invoke('send-bulk-announcement', {
        body: {
          title: formData.title,
          subject: formData.subject,
          html_body: finalHtml,
          filter_criteria: {
            is_active: filters.activeOnly,
            plan_ids: filters.selectedPlans.length > 0 ? filters.selectedPlans : undefined,
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Announcement sent to ${data.sent_count} cinemas`);
      queryClient.invalidateQueries({ queryKey: ['announcement-campaigns'] });
      logAction({
        action: 'bulk_announcement_sent',
        target_type: 'platform_announcement',
        details: {
          title: formData.title,
          recipients: data.sent_count,
        },
      });
      setIsOpen(false);
      setFormData({ title: '', subject: '', content: '', htmlBody: DEFAULT_ANNOUNCEMENT_TEMPLATE });
    },
    onError: (error) => {
      console.error('Failed to send announcement:', error);
      toast.error('Failed to send announcement');
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

  const getPreviewHtml = () => {
    return formData.htmlBody
      .replace(/\{\{cinema_name\}\}/g, 'Sample Cinema')
      .replace(/\{\{announcement_title\}\}/g, formData.title || 'Announcement Title')
      .replace(/\{\{announcement_content\}\}/g, formData.content || 'Your announcement content here...')
      .replace(/\{\{platform_name\}\}/g, 'CineTix Platform');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Bulk Announcements
          </CardTitle>
          <CardDescription>
            Send announcements to all or filtered cinemas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setIsOpen(true)} className="w-full gap-2">
            <Send className="h-4 w-4" />
            Create New Announcement
          </Button>

          {/* Past Campaigns */}
          {isCampaignsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div>
              <h4 className="font-medium mb-3">Recent Campaigns</h4>
              <ScrollArea className="h-[250px]">
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
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>
              Compose and send an announcement to your cinemas
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="recipients">Recipients</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="compose" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., New Feature Release"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Subject</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., 📢 {{announcement_title}} - {{platform_name}}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {"{{announcement_title}}"}, {"{{platform_name}}"}, {"{{cinema_name}}"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Announcement Content</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your announcement content here..."
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>HTML Template</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, htmlBody: DEFAULT_ANNOUNCEMENT_TEMPLATE })}
                    >
                      Reset to Default
                    </Button>
                  </div>
                  <Textarea
                    value={formData.htmlBody}
                    onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                    className="font-mono text-xs"
                    rows={8}
                  />
                </div>
              </TabsContent>

              <TabsContent value="recipients" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Estimated Recipients</p>
                    <p className="text-sm text-muted-foreground">Based on current filters</p>
                  </div>
                  <div className="text-3xl font-bold">
                    {isCountLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : recipientCount}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Active Cinemas Only</Label>
                      <p className="text-xs text-muted-foreground">
                        Only send to active, non-suspended cinemas
                      </p>
                    </div>
                    <Switch
                      checked={filters.activeOnly}
                      onCheckedChange={(checked) => setFilters({ ...filters, activeOnly: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Filter by Subscription Plan</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {plans?.map((plan) => (
                        <div key={plan.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={filters.selectedPlans.includes(plan.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters({
                                  ...filters,
                                  selectedPlans: [...filters.selectedPlans, plan.id],
                                });
                              } else {
                                setFilters({
                                  ...filters,
                                  selectedPlans: filters.selectedPlans.filter(id => id !== plan.id),
                                });
                              }
                            }}
                          />
                          <Label className="font-normal">{plan.name}</Label>
                        </div>
                      ))}
                    </div>
                    {filters.selectedPlans.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No plan selected - will send to all cinemas
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="border rounded-lg overflow-hidden bg-white">
                  {/* SECURITY: Use sandboxed iframe to prevent XSS from email preview */}
                  <iframe
                    srcDoc={getPreviewHtml()}
                    className="w-full h-[400px] border-0"
                    title="Email Preview"
                    sandbox="allow-same-origin"
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
                  Send to {recipientCount} Cinemas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
