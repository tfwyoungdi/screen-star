import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  CalendarIcon,
  Trash2,
  Wand2,
} from 'lucide-react';

interface Movie {
  id: string;
  title: string;
  poster_url: string | null;
}

interface CustomerEmailBlastProps {
  organizationId: string;
  cinemaName: string;
  cinemaLogoUrl: string | null;
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

// Function to generate email templates with dynamic logo
// Using a neutral dark header (#1f2937) ensures logo visibility regardless of logo colors
const generateEmailTemplates = (logoUrl: string | null): EmailTemplate[] => {
  const logoHtml = logoUrl 
    ? `<img src="${logoUrl}" alt="Cinema Logo" style="max-width: 150px; max-height: 70px; margin-bottom: 15px;" />`
    : '';

  // Neutral dark header background that works with any logo color
  const headerBg = '#1f2937';

  return [
    {
      id: 'new_movie',
      name: 'New Movie Announcement',
      description: 'Announce a new movie release',
      icon: <Film className="h-5 w-5" />,
      subject: 'Now Showing: {{movie_title}} at {{cinema_name}}!',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr><td style="background: ${headerBg}; padding: 24px 20px; border-radius: 16px 16px 0 0; text-align: center;">
            ${logoHtml}
            <h1 style="color: white; margin: 0; font-size: 24px;">New Movie Alert!</h1>
          </td></tr>
          <tr><td style="background: white; padding: 24px 20px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #374151;">Hi {{customer_name}},</p>
            <p style="color: #6b7280; line-height: 1.6;">We're excited to announce a brand new movie is now showing at {{cinema_name}}!</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; border-radius: 12px; margin: 20px 0;">
              <tr><td align="center" style="padding: 20px;">
                {{movie_poster}}
                <h2 style="color: #1f2937; margin: 10px 0; font-size: 20px;">{{movie_title}}</h2>
                <p style="color: #6b7280; margin: 10px 0 0 0;">{{movie_description}}</p>
              </td></tr>
            </table>
            <p style="color: #6b7280; line-height: 1.6;">Don't miss out on this cinematic experience. Book your tickets now and get the best seats!</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-top: 20px;">
                <a href="#" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; min-width: 44px;">Book Now</a>
              </td></tr>
            </table>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">See you at the movies!<br><strong>{{cinema_name}}</strong></p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    {
      id: 'special_offer',
      name: 'Special Offer',
      description: 'Share discounts and promotions',
      icon: <Gift className="h-5 w-5" />,
      subject: '🎁 {{offer_title}} - Exclusive for {{customer_name}}!',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr><td style="background: ${headerBg}; padding: 24px 20px; border-radius: 16px 16px 0 0; text-align: center;">
            ${logoHtml}
            <h1 style="color: white; margin: 0; font-size: 24px;">🎁 Special Offer!</h1>
          </td></tr>
          <tr><td style="background: white; padding: 24px 20px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #374151;">Hi {{customer_name}},</p>
            <p style="color: #6b7280; line-height: 1.6;">As a valued customer of {{cinema_name}}, we have an exclusive offer just for you!</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; margin: 20px 0; border: 2px dashed #f59e0b;">
              <tr><td align="center" style="padding: 25px;">
                <p style="color: #92400e; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Limited Time Offer</p>
                <h2 style="color: #b45309; margin: 0; font-size: 26px;">{{offer_title}}</h2>
                <p style="color: #92400e; margin: 10px 0 0 0;">{{discount_text}}</p>
                <p style="color: #78350f; font-size: 13px; margin: 15px 0 0 0; font-weight: 600;">{{offer_validity}}</p>
              </td></tr>
            </table>
            <p style="color: #6b7280; line-height: 1.6;">{{offer_details}}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-top: 20px;">
                <a href="#" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; min-width: 44px;">Claim Offer</a>
              </td></tr>
            </table>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">Happy movie watching!<br><strong>{{cinema_name}}</strong></p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    {
      id: 'general_update',
      name: 'General Update',
      description: 'Share news and updates',
      icon: <Megaphone className="h-5 w-5" />,
      subject: '📢 {{update_title}} - {{cinema_name}}',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr><td style="background: ${headerBg}; padding: 24px 20px; border-radius: 16px 16px 0 0; text-align: center;">
            ${logoHtml}
            <h1 style="color: white; margin: 0; font-size: 24px;">📢 {{update_title}}</h1>
          </td></tr>
          <tr><td style="background: white; padding: 24px 20px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #374151;">Dear {{customer_name}},</p>
            <p style="color: #6b7280; line-height: 1.6;">We have some exciting news to share with you from {{cinema_name}}!</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; border-radius: 12px; margin: 20px 0;">
              <tr><td style="padding: 20px;">
                <p style="color: #374151; line-height: 1.8; margin: 0;">{{update_message}}</p>
              </td></tr>
            </table>
            <p style="color: #6b7280; line-height: 1.6;">Thank you for being part of our cinema family. We look forward to seeing you soon!</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-top: 20px;">
                <a href="#" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; min-width: 44px;">Learn More</a>
              </td></tr>
            </table>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">Best regards,<br><strong>{{cinema_name}}</strong></p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    {
      id: 'loyalty_reward',
      name: 'Loyalty Reward',
      description: 'Reward your loyal customers',
      icon: <Sparkles className="h-5 w-5" />,
      subject: '⭐ {{customer_name}}, You\'ve Earned: {{reward_name}}!',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr><td style="background: ${headerBg}; padding: 24px 20px; border-radius: 16px 16px 0 0; text-align: center;">
            ${logoHtml}
            <h1 style="color: white; margin: 0; font-size: 24px;">⭐ Loyalty Reward!</h1>
          </td></tr>
          <tr><td style="background: white; padding: 24px 20px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #374151;">Congratulations {{customer_name}}! 🎉</p>
            <p style="color: #6b7280; line-height: 1.6;">Your loyalty to {{cinema_name}} has earned you a special reward!</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border-radius: 12px; margin: 20px 0;">
              <tr><td align="center" style="padding: 25px;">
                <p style="color: #7c3aed; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your Reward</p>
                <h2 style="color: #5b21b6; margin: 0; font-size: 22px;">{{reward_name}}</h2>
                <p style="color: #7c3aed; margin: 10px 0 0 0;">{{reward_description}}</p>
              </td></tr>
            </table>
            <p style="color: #6b7280; line-height: 1.6;">{{reward_instructions}}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-top: 20px;">
                <a href="#" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; min-width: 44px;">View My Rewards</a>
              </td></tr>
            </table>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">With appreciation,<br><strong>{{cinema_name}}</strong></p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
  ];
};

export function CustomerEmailBlast({ organizationId, cinemaName, cinemaLogoUrl, customerCount }: CustomerEmailBlastProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieDescription, setMovieDescription] = useState<string>('');
  
  // Special offer fields
  const [offerTitle, setOfferTitle] = useState<string>('');
  const [discountText, setDiscountText] = useState<string>('');
  const [offerDetails, setOfferDetails] = useState<string>('');
  const [offerStartDate, setOfferStartDate] = useState<Date | undefined>(undefined);
  const [offerEndDate, setOfferEndDate] = useState<Date | undefined>(undefined);
  
  // General update fields
  const [updateTitle, setUpdateTitle] = useState<string>('');
  const [updateMessage, setUpdateMessage] = useState<string>('');
  
  // Loyalty reward fields
  const [rewardName, setRewardName] = useState<string>('');
  const [rewardDescription, setRewardDescription] = useState<string>('');
  const [rewardInstructions, setRewardInstructions] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState<string | null>(null);
  // Generate templates with cinema logo
  const emailTemplates = generateEmailTemplates(cinemaLogoUrl);

  // Fetch movies for selection
  const { data: movies } = useQuery({
    queryKey: ['movies-for-email', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('id, title, poster_url')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return data as Movie[];
    },
    enabled: !!organizationId,
  });

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

  const deleteMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('customer_email_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Campaign deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['customer-campaigns'] });
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    },
    onError: (error: any) => {
      toast.error('Failed to delete campaign', {
        description: error.message,
      });
    },
  });

  const handleDeleteClick = (campaignId: string) => {
    setCampaignToDelete(campaignId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (campaignToDelete) {
      deleteMutation.mutate(campaignToDelete);
    }
  };

  const resetForm = () => {
    setSelectedTemplate('');
    setSubject('');
    setHtmlBody('');
    setSelectedMovieId('');
    setSelectedMovie(null);
    setMovieDescription('');
    setOfferTitle('');
    setDiscountText('');
    setOfferDetails('');
    setOfferStartDate(undefined);
    setOfferEndDate(undefined);
    setUpdateTitle('');
    setUpdateMessage('');
    setRewardName('');
    setRewardDescription('');
    setRewardInstructions('');
    setActiveTab('templates');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(template.subject.replace(/\{\{cinema_name\}\}/g, cinemaName));
      setHtmlBody(template.html.replace(/\{\{cinema_name\}\}/g, cinemaName));
      setActiveTab('customize');
    }
  };

  const handleMovieSelect = (movieId: string) => {
    const movie = movies?.find((m) => m.id === movieId);
    if (movie) {
      setSelectedMovieId(movieId);
      setSelectedMovie(movie);
      updateNewMovieTemplate(movie, movieDescription);
    }
  };

  const updateNewMovieTemplate = (movie: Movie, description: string) => {
    const template = emailTemplates.find((t) => t.id === 'new_movie');
    if (template) {
      const posterHtml = movie.poster_url
        ? `<img src="${movie.poster_url}" alt="${movie.title}" style="max-width: 300px; width: 100%; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />`
        : '';
      
      setSubject(template.subject.replace(/\{\{movie_title\}\}/g, movie.title).replace(/\{\{cinema_name\}\}/g, cinemaName));
      setHtmlBody(
        template.html
          .replace(/\{\{movie_title\}\}/g, movie.title)
          .replace(/\{\{cinema_name\}\}/g, cinemaName)
          .replace(/\{\{movie_poster\}\}/g, posterHtml)
          .replace(/\{\{movie_description\}\}/g, description || 'Now showing in all screens')
      );
    }
  };

  const handleDescriptionChange = (description: string) => {
    setMovieDescription(description);
    if (selectedTemplate === 'new_movie' && selectedMovie) {
      updateNewMovieTemplate(selectedMovie, description);
    }
  };

  const getOfferValidityText = (startDate?: Date, endDate?: Date) => {
    if (startDate && endDate) {
      return `Valid from ${format(startDate, 'MMM d, yyyy')} to ${format(endDate, 'MMM d, yyyy')}`;
    } else if (startDate) {
      return `Valid from ${format(startDate, 'MMM d, yyyy')}`;
    } else if (endDate) {
      return `Valid until ${format(endDate, 'MMM d, yyyy')}`;
    }
    return '';
  };

  const updateSpecialOfferTemplate = (title: string, discount: string, details: string, startDate?: Date, endDate?: Date) => {
    const template = emailTemplates.find((t) => t.id === 'special_offer');
    if (template) {
      const validityText = getOfferValidityText(startDate, endDate);
      
      setSubject(
        template.subject
          .replace(/\{\{offer_title\}\}/g, title || 'Special Offer')
          .replace(/\{\{cinema_name\}\}/g, cinemaName)
      );
      setHtmlBody(
        template.html
          .replace(/\{\{cinema_name\}\}/g, cinemaName)
          .replace(/\{\{offer_title\}\}/g, title || 'Special Offer')
          .replace(/\{\{discount_text\}\}/g, discount || 'Your next movie ticket!')
          .replace(/\{\{offer_details\}\}/g, details || 'Use this exclusive discount on your next visit. Hurry, this offer won\'t last forever!')
          .replace(/\{\{offer_validity\}\}/g, validityText)
      );
    }
  };

  const updateGeneralUpdateTemplate = (title: string, message: string) => {
    const template = emailTemplates.find((t) => t.id === 'general_update');
    if (template) {
      setSubject(
        template.subject
          .replace(/\{\{update_title\}\}/g, title || 'Important Update')
          .replace(/\{\{cinema_name\}\}/g, cinemaName)
      );
      setHtmlBody(
        template.html
          .replace(/\{\{cinema_name\}\}/g, cinemaName)
          .replace(/\{\{update_title\}\}/g, title || 'Important Update')
          .replace(/\{\{update_message\}\}/g, message || 'We have exciting news to share with you!')
      );
    }
  };

  const updateLoyaltyRewardTemplate = (name: string, description: string, instructions: string) => {
    const template = emailTemplates.find((t) => t.id === 'loyalty_reward');
    if (template) {
      setSubject(
        template.subject
          .replace(/\{\{reward_name\}\}/g, name || 'Special Reward')
          .replace(/\{\{cinema_name\}\}/g, cinemaName)
      );
      setHtmlBody(
        template.html
          .replace(/\{\{cinema_name\}\}/g, cinemaName)
          .replace(/\{\{reward_name\}\}/g, name || '🍿 Special Reward')
          .replace(/\{\{reward_description\}\}/g, description || 'On your next visit!')
          .replace(/\{\{reward_instructions\}\}/g, instructions || 'Simply show this email at the concession stand to claim your reward. Thank you for being an amazing customer!')
      );
    }
  };

  const generateWithAI = async (
    type: 'subject' | 'content',
    field?: string
  ) => {
    const loadingKey = field || type;
    setIsGeneratingAI(loadingKey);

    try {
      const context: Record<string, string> = {};
      
      if (selectedTemplate === 'new_movie' && selectedMovie) {
        context.movieTitle = selectedMovie.title;
      } else if (selectedTemplate === 'special_offer') {
        context.offerTitle = offerTitle;
      } else if (selectedTemplate === 'general_update') {
        context.updateTitle = updateTitle;
      } else if (selectedTemplate === 'loyalty_reward') {
        context.rewardName = rewardName;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email-content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type,
            templateType: selectedTemplate,
            cinemaName,
            organizationId,
            context,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to generate content');
      }

      const result = await response.json();

      if (type === 'subject' && result.subject) {
        setSubject(result.subject);
        toast.success('Subject line generated!');
      } else if (type === 'content' && result.content) {
        // Apply content based on the current template and field
        if (selectedTemplate === 'new_movie') {
          setMovieDescription(result.content);
          if (selectedMovie) {
            updateNewMovieTemplate(selectedMovie, result.content);
          }
        } else if (selectedTemplate === 'special_offer') {
          setOfferDetails(result.content);
          updateSpecialOfferTemplate(offerTitle, discountText, result.content, offerStartDate, offerEndDate);
        } else if (selectedTemplate === 'general_update') {
          setUpdateMessage(result.content);
          updateGeneralUpdateTemplate(updateTitle, result.content);
        } else if (selectedTemplate === 'loyalty_reward') {
          setRewardInstructions(result.content);
          updateLoyaltyRewardTemplate(rewardName, rewardDescription, result.content);
        }
        toast.success('Content generated!');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate content', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsGeneratingAI(null);
    }
  };

  const getPreviewHtml = () => {
    let preview = htmlBody.replace(/\{\{customer_name\}\}/g, 'John Doe').replace(/\{\{cinema_name\}\}/g, cinemaName);
    
    if (selectedTemplate === 'new_movie') {
      const movieTitle = selectedMovie?.title || 'The Amazing Movie';
      const posterHtml = selectedMovie?.poster_url
        ? `<img src="${selectedMovie.poster_url}" alt="${movieTitle}" style="max-width: 300px; width: 100%; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />`
        : '';
      preview = preview
        .replace(/\{\{movie_title\}\}/g, movieTitle)
        .replace(/\{\{movie_poster\}\}/g, posterHtml)
        .replace(/\{\{movie_description\}\}/g, movieDescription || 'Now showing in all screens');
    } else if (selectedTemplate === 'special_offer') {
      const validityText = getOfferValidityText(offerStartDate, offerEndDate);
      preview = preview
        .replace(/\{\{offer_title\}\}/g, offerTitle || '20% OFF')
        .replace(/\{\{discount_text\}\}/g, discountText || 'Your next movie ticket!')
        .replace(/\{\{offer_details\}\}/g, offerDetails || 'Use this exclusive discount on your next visit. Hurry, this offer won\'t last forever!')
        .replace(/\{\{offer_validity\}\}/g, validityText);
    } else if (selectedTemplate === 'general_update') {
      preview = preview
        .replace(/\{\{update_title\}\}/g, updateTitle || 'Important Update')
        .replace(/\{\{update_message\}\}/g, updateMessage || 'We have exciting news to share with you!');
    } else if (selectedTemplate === 'loyalty_reward') {
      preview = preview
        .replace(/\{\{reward_name\}\}/g, rewardName || '🍿 Free Popcorn')
        .replace(/\{\{reward_description\}\}/g, rewardDescription || 'On your next visit!')
        .replace(/\{\{reward_instructions\}\}/g, rewardInstructions || 'Simply show this email at the concession stand to claim your reward. Thank you for being an amazing customer!');
    }
    
    return preview;
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteClick(campaign.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                {emailTemplates.map((template) => (
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
              {/* New Movie Announcement Fields */}
              {selectedTemplate === 'new_movie' && (
                <>
                  <div className="space-y-2">
                    <Label>Select Movie *</Label>
                    <Select value={selectedMovieId} onValueChange={handleMovieSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a movie..." />
                      </SelectTrigger>
                      <SelectContent>
                        {movies?.map((movie) => (
                          <SelectItem key={movie.id} value={movie.id}>
                            <div className="flex items-center gap-2">
                              {movie.poster_url && (
                                <img 
                                  src={movie.poster_url} 
                                  alt={movie.title} 
                                  className="w-6 h-8 object-cover rounded"
                                />
                              )}
                              <span>{movie.title}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {movies?.length === 0 && (
                      <p className="text-xs text-destructive">No active movies found. Add movies first.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Movie Description</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={!selectedMovie || isGeneratingAI === 'movieDescription'}
                        onClick={() => generateWithAI('content', 'movieDescription')}
                      >
                        {isGeneratingAI === 'movieDescription' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        Generate with AI
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Enter a brief description about this movie (e.g., genre, stars, synopsis)..."
                      value={movieDescription}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      This description will appear below the movie title in the email
                    </p>
                  </div>
                </>
              )}

              {/* Special Offer Fields */}
              {selectedTemplate === 'special_offer' && (
                <>
                  <div className="space-y-2">
                    <Label>Offer Title *</Label>
                    <Input
                      placeholder="e.g., 20% OFF, Buy 1 Get 1 Free, Half Price Tuesday..."
                      value={offerTitle}
                      onChange={(e) => {
                        setOfferTitle(e.target.value);
                        updateSpecialOfferTemplate(e.target.value, discountText, offerDetails, offerStartDate, offerEndDate);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      The main offer headline (appears prominently in the email)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Details</Label>
                    <Input
                      placeholder="e.g., Your next movie ticket!, On all screenings, Valid this weekend..."
                      value={discountText}
                      onChange={(e) => {
                        setDiscountText(e.target.value);
                        updateSpecialOfferTemplate(offerTitle, e.target.value, offerDetails, offerStartDate, offerEndDate);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Short text below the offer title
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !offerStartDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {offerStartDate ? format(offerStartDate, "PPP") : <span>Pick start date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={offerStartDate}
                            onSelect={(date) => {
                              setOfferStartDate(date);
                              updateSpecialOfferTemplate(offerTitle, discountText, offerDetails, date, offerEndDate);
                            }}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-muted-foreground">
                        When the offer starts
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !offerEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {offerEndDate ? format(offerEndDate, "PPP") : <span>Pick end date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={offerEndDate}
                            onSelect={(date) => {
                              setOfferEndDate(date);
                              updateSpecialOfferTemplate(offerTitle, discountText, offerDetails, offerStartDate, date);
                            }}
                            disabled={(date) => offerStartDate ? date < offerStartDate : false}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-muted-foreground">
                        When the offer expires
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Offer Description</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={!offerTitle || isGeneratingAI === 'offerDetails'}
                        onClick={() => generateWithAI('content', 'offerDetails')}
                      >
                        {isGeneratingAI === 'offerDetails' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        Generate with AI
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Describe how customers can use this offer, any terms & conditions..."
                      value={offerDetails}
                      onChange={(e) => {
                        setOfferDetails(e.target.value);
                        updateSpecialOfferTemplate(offerTitle, discountText, e.target.value, offerStartDate, offerEndDate);
                      }}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Additional details about the offer
                    </p>
                  </div>
                </>
              )}

              {/* General Update Fields */}
              {selectedTemplate === 'general_update' && (
                <>
                  <div className="space-y-2">
                    <Label>Update Title *</Label>
                    <Input
                      placeholder="e.g., New Opening Hours, Renovations Complete, Special Event..."
                      value={updateTitle}
                      onChange={(e) => {
                        setUpdateTitle(e.target.value);
                        updateGeneralUpdateTemplate(e.target.value, updateMessage);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      The headline for your announcement
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Update Message *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={!updateTitle || isGeneratingAI === 'updateMessage'}
                        onClick={() => generateWithAI('content', 'updateMessage')}
                      >
                        {isGeneratingAI === 'updateMessage' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        Generate with AI
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Write your announcement message here..."
                      value={updateMessage}
                      onChange={(e) => {
                        setUpdateMessage(e.target.value);
                        updateGeneralUpdateTemplate(updateTitle, e.target.value);
                      }}
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      The main content of your update
                    </p>
                  </div>
                </>
              )}

              {/* Loyalty Reward Fields */}
              {selectedTemplate === 'loyalty_reward' && (
                <>
                  <div className="space-y-2">
                    <Label>Reward Name *</Label>
                    <Input
                      placeholder="e.g., 🍿 Free Popcorn, 🎟️ Free Ticket, 🥤 Free Drink..."
                      value={rewardName}
                      onChange={(e) => {
                        setRewardName(e.target.value);
                        updateLoyaltyRewardTemplate(e.target.value, rewardDescription, rewardInstructions);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      The name of the reward being offered
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Reward Description</Label>
                    <Input
                      placeholder="e.g., On your next visit!, Valid for 30 days..."
                      value={rewardDescription}
                      onChange={(e) => {
                        setRewardDescription(e.target.value);
                        updateLoyaltyRewardTemplate(rewardName, e.target.value, rewardInstructions);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Short text below the reward name
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Redemption Instructions</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={!rewardName || isGeneratingAI === 'rewardInstructions'}
                        onClick={() => generateWithAI('content', 'rewardInstructions')}
                      >
                        {isGeneratingAI === 'rewardInstructions' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        Generate with AI
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Explain how customers can redeem this reward..."
                      value={rewardInstructions}
                      onChange={(e) => {
                        setRewardInstructions(e.target.value);
                        updateLoyaltyRewardTemplate(rewardName, rewardDescription, e.target.value);
                      }}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Instructions for claiming the reward
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subject Line</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={isGeneratingAI === 'subject'}
                    onClick={() => generateWithAI('subject')}
                  >
                    {isGeneratingAI === 'subject' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                    Generate with AI
                  </Button>
                </div>
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
                  className="min-h-[200px] font-mono text-sm"
                />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this email campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
