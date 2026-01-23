import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Mail,
  Send,
  Users,
  Eye,
  MousePointer,
  Clock,
  FileText,
  Sparkles,
  Gift,
  Film,
  Megaphone,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface CustomerEmailBlastProps {
  organizationId: string;
  cinemaName: string;
  customerCount: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  subject: string;
  html: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'new_movie',
    name: 'New Movie Announcement',
    description: 'Announce a new movie release',
    icon: <Film className="h-5 w-5" />,
    subject: '🎬 Now Showing: {{movie_title}} at {{cinema_name}}!',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎬 New Movie Alert!</h1>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size: 18px; color: #374151;">Hi {{customer_name}},</p>
    <p style="color: #6b7280; line-height: 1.6;">We're excited to announce a brand new movie is now showing at {{cinema_name}}!</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
      <h2 style="color: #1f2937; margin: 0 0 10px 0;">{{movie_title}}</h2>
      <p style="color: #6b7280; margin: 0;">Now showing in all screens</p>
    </div>
    <p style="color: #6b7280; line-height: 1.6;">Don't miss out on this cinematic experience. Book your tickets now and get the best seats!</p>
    <a href="#" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">Book Now</a>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">See you at the movies!<br><strong>{{cinema_name}}</strong></p>
  </div>
</body>
</html>`,
  },
  {
    id: 'special_offer',
    name: 'Special Offer',
    description: 'Share discounts and promotions',
    icon: <Gift className="h-5 w-5" />,
    subject: '🎁 Exclusive Offer Just for You, {{customer_name}}!',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎁 Special Offer!</h1>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size: 18px; color: #374151;">Hi {{customer_name}},</p>
    <p style="color: #6b7280; line-height: 1.6;">As a valued customer of {{cinema_name}}, we have an exclusive offer just for you!</p>
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px dashed #f59e0b;">
      <p style="color: #92400e; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Limited Time Offer</p>
      <h2 style="color: #b45309; margin: 0; font-size: 32px;">20% OFF</h2>
      <p style="color: #92400e; margin: 10px 0 0 0;">Your next movie ticket!</p>
    </div>
    <p style="color: #6b7280; line-height: 1.6;">Use this exclusive discount on your next visit. Hurry, this offer won't last forever!</p>
    <a href="#" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">Claim Offer</a>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">Happy movie watching!<br><strong>{{cinema_name}}</strong></p>
  </div>
</body>
</html>`,
  },
  {
    id: 'general_update',
    name: 'General Update',
    description: 'Share news and updates',
    icon: <Megaphone className="h-5 w-5" />,
    subject: '📢 Important Update from {{cinema_name}}',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">📢 Important Update</h1>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size: 18px; color: #374151;">Dear {{customer_name}},</p>
    <p style="color: #6b7280; line-height: 1.6;">We have some exciting news to share with you from {{cinema_name}}!</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <p style="color: #374151; line-height: 1.8; margin: 0;">
        [Your update message here]
      </p>
    </div>
    <p style="color: #6b7280; line-height: 1.6;">Thank you for being part of our cinema family. We look forward to seeing you soon!</p>
    <a href="#" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">Learn More</a>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">Best regards,<br><strong>{{cinema_name}}</strong></p>
  </div>
</body>
</html>`,
  },
  {
    id: 'loyalty_reward',
    name: 'Loyalty Reward',
    description: 'Reward your loyal customers',
    icon: <Sparkles className="h-5 w-5" />,
    subject: '⭐ {{customer_name}}, You\'ve Earned a Reward!',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⭐ Loyalty Reward!</h1>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size: 18px; color: #374151;">Congratulations {{customer_name}}! 🎉</p>
    <p style="color: #6b7280; line-height: 1.6;">Your loyalty to {{cinema_name}} has earned you a special reward!</p>
    <div style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center;">
      <p style="color: #7c3aed; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your Reward</p>
      <h2 style="color: #5b21b6; margin: 0; font-size: 24px;">🍿 Free Popcorn</h2>
      <p style="color: #7c3aed; margin: 10px 0 0 0;">On your next visit!</p>
    </div>
    <p style="color: #6b7280; line-height: 1.6;">Simply show this email at the concession stand to claim your reward. Thank you for being an amazing customer!</p>
    <a href="#" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">View My Rewards</a>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">With appreciation,<br><strong>{{cinema_name}}</strong></p>
  </div>
</body>
</html>`,
  },
];

export function CustomerEmailBlast({ organizationId, cinemaName, customerCount }: CustomerEmailBlastProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [movieTitle, setMovieTitle] = useState('');

  // Fetch past campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['customer-campaigns', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_email_campaigns')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch email analytics for campaigns
  const { data: emailAnalytics } = useQuery({
    queryKey: ['customer-email-analytics', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_analytics')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('email_type', 'customer_announcement')
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Create campaign record first
      const { data: campaign, error: campaignError } = await supabase
        .from('customer_email_campaigns')
        .insert({
          organization_id: organizationId,
          template_type: selectedTemplate,
          subject,
          html_body: htmlBody,
          status: 'pending',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Invoke edge function
      const { data, error } = await supabase.functions.invoke('send-customer-announcement', {
        body: {
          campaign_id: campaign.id,
          organization_id: organizationId,
          subject,
          html_body: htmlBody,
          cinema_name: cinemaName,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Emails sent successfully!`, {
        description: `${data.sent_count} of ${data.total_recipients} emails delivered`,
      });
      queryClient.invalidateQueries({ queryKey: ['customer-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['customer-email-analytics'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to send emails', {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setSelectedTemplate('');
    setSubject('');
    setHtmlBody('');
    setMovieTitle('');
    setActiveTab('templates');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(template.subject.replace(/\{\{cinema_name\}\}/g, cinemaName));
      setHtmlBody(template.html.replace(/\{\{cinema_name\}\}/g, cinemaName));
      setActiveTab('customize');
    }
  };

  const updateHtmlWithMovieTitle = (title: string) => {
    setMovieTitle(title);
    if (selectedTemplate === 'new_movie') {
      const template = EMAIL_TEMPLATES.find((t) => t.id === 'new_movie');
      if (template) {
        setSubject(template.subject.replace(/\{\{movie_title\}\}/g, title).replace(/\{\{cinema_name\}\}/g, cinemaName));
        setHtmlBody(template.html.replace(/\{\{movie_title\}\}/g, title).replace(/\{\{cinema_name\}\}/g, cinemaName));
      }
    }
  };

  const getPreviewHtml = () => {
    return htmlBody
      .replace(/\{\{customer_name\}\}/g, 'John Doe')
      .replace(/\{\{cinema_name\}\}/g, cinemaName)
      .replace(/\{\{movie_title\}\}/g, movieTitle || 'The Amazing Movie');
  };

  // Calculate analytics
  const totalSent = emailAnalytics?.length || 0;
  const totalOpened = emailAnalytics?.filter((e) => e.opened_at).length || 0;
  const totalClicked = emailAnalytics?.filter((e) => e.clicked_at).length || 0;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0';

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Campaigns
              </CardTitle>
              <CardDescription className="mt-1">
                Send announcements to all your customers
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Send className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Analytics Summary */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-foreground">{totalSent}</p>
              <p className="text-xs text-muted-foreground">Emails Sent</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-foreground">{totalOpened}</p>
              <p className="text-xs text-muted-foreground">Opened</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-primary">{openRate}%</p>
              <p className="text-xs text-muted-foreground">Open Rate</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-primary">{clickRate}%</p>
              <p className="text-xs text-muted-foreground">Click Rate</p>
            </div>
          </div>

          {/* Recent Campaigns */}
          {campaignsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="space-y-2">
              {campaigns.slice(0, 5).map((campaign: any) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{campaign.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.sent_at
                          ? format(new Date(campaign.sent_at), 'MMM d, yyyy h:mm a')
                          : 'Draft'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{campaign.sent_count || 0} sent</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {campaign.opened_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointer className="h-3 w-3" />
                          {campaign.clicked_count || 0}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        campaign.status === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : campaign.status === 'sending'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-muted'
                      }
                    >
                      {campaign.status === 'sent' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {campaign.status === 'sending' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No campaigns sent yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Email Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Email to Customers
            </DialogTitle>
            <DialogDescription>
              Create and send an email announcement to all {customerCount} customers
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates" className="gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="customize" disabled={!selectedTemplate} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Customize
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={!htmlBody} className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                {EMAIL_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:border-primary/50 hover:bg-muted/50 ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {template.icon}
                      </div>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="customize" className="mt-4 space-y-4">
              {selectedTemplate === 'new_movie' && (
                <div className="space-y-2">
                  <Label>Movie Title</Label>
                  <Input
                    placeholder="Enter movie title..."
                    value={movieTitle}
                    onChange={(e) => updateHtmlWithMovieTitle(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  placeholder="Email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{customer_name}}'} to personalize
                </p>
              </div>
              <div className="space-y-2">
                <Label>Email Content (HTML)</Label>
                <Textarea
                  placeholder="HTML content..."
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {'{{customer_name}}'}, {'{{cinema_name}}'}, {'{{movie_title}}'}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg overflow-hidden bg-muted/30">
                <div className="p-3 border-b bg-muted/50">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Subject:</span>{' '}
                    <span className="font-medium">
                      {subject.replace(/\{\{customer_name\}\}/g, 'John Doe')}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    To: {customerCount} customers
                  </p>
                </div>
                <iframe
                  srcDoc={getPreviewHtml()}
                  className="w-full h-[400px] bg-white"
                  title="Email Preview"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={!subject || !htmlBody || sendMutation.isPending}
              className="gap-2"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to {customerCount} customers
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
