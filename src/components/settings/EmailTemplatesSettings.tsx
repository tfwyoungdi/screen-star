import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail, FileText, Save, RotateCcw, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EmailTemplate {
  id?: string;
  organization_id: string;
  template_type: string;
  subject: string;
  html_body: string;
  is_active: boolean;
}

const DEFAULT_TEMPLATES: Record<string, { subject: string; html_body: string }> = {
  application_confirmation: {
    subject: "Thank You for Your Application - {{cinema_name}}",
    html_body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">🎬 Application Received!</h1>
    </div>
    
    <p style="color: #f5f5f0; font-size: 16px; line-height: 1.6;">Dear {{applicant_name}},</p>
    
    <p style="color: #888; font-size: 14px; line-height: 1.6;">
      Thank you for applying for the <strong style="color: #D4AF37;">{{job_title}}</strong> position at {{cinema_name}}.
    </p>
    
    <p style="color: #888; font-size: 14px; line-height: 1.6;">
      We have received your application and will review it carefully. If your qualifications match our requirements, we will contact you to schedule an interview.
    </p>
    
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #888; font-size: 12px; margin: 0;">Application Reference</p>
      <p style="color: #D4AF37; font-size: 18px; font-weight: bold; margin: 5px 0 0 0;">{{job_title}} - {{department}}</p>
    </div>
    
    <p style="color: #888; font-size: 14px; line-height: 1.6;">
      Best regards,<br>
      <strong style="color: #f5f5f0;">The {{cinema_name}} Team</strong>
    </p>
    
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    
    <p style="color: #666; font-size: 12px; text-align: center;">
      This is an automated message. Please do not reply directly to this email.
    </p>
  </div>
</body>
</html>`,
  },
  contact_notification: {
    subject: "New Contact Form Submission: {{subject}}",
    html_body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">📬 New Contact Message</h1>
    </div>
    
    <p style="color: #888; font-size: 14px; text-align: center; margin-bottom: 30px;">
      You've received a new message from your cinema's contact form.
    </p>
    
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #888; font-size: 14px; width: 100px;">From</td>
          <td style="padding: 10px 0; color: #f5f5f0; font-size: 14px;">{{sender_name}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Email</td>
          <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px;">
            <a href="mailto:{{sender_email}}" style="color: #D4AF37; text-decoration: none;">{{sender_email}}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Subject</td>
          <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; font-weight: bold;">{{subject}}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="color: #888; font-size: 12px; text-transform: uppercase; margin: 0 0 10px 0;">Message</p>
      <p style="color: #f5f5f0; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">{{message}}</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="mailto:{{sender_email}}?subject=Re: {{subject}}" 
         style="display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        Reply to {{sender_name}}
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    
    <p style="color: #666; font-size: 12px; text-align: center;">
      This notification was sent from the {{cinema_name}} contact form.
    </p>
  </div>
</body>
</html>`,
  },
};

const TEMPLATE_INFO = {
  application_confirmation: {
    name: "Application Confirmation",
    description: "Sent to applicants when they submit a job application",
    icon: FileText,
    variables: ["{{applicant_name}}", "{{job_title}}", "{{department}}", "{{cinema_name}}"],
  },
  contact_notification: {
    name: "Contact Notification",
    description: "Sent to admin when someone submits the contact form",
    icon: Mail,
    variables: ["{{sender_name}}", "{{sender_email}}", "{{subject}}", "{{message}}", "{{cinema_name}}"],
  },
};

export default function EmailTemplatesSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("application_confirmation");
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [previewHtml, setPreviewHtml] = useState("");

  const { data: organization } = useQuery({
    queryKey: ["organization", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.organization_id) return null;

      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();

      return data;
    },
    enabled: !!user,
  });

  const { data: savedTemplates, isLoading } = useQuery({
    queryKey: ["email-templates", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("organization_id", organization!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });

  useEffect(() => {
    if (organization?.id) {
      const templateMap: Record<string, EmailTemplate> = {};
      
      Object.keys(DEFAULT_TEMPLATES).forEach((type) => {
        const saved = savedTemplates?.find((t) => t.template_type === type);
        if (saved) {
          templateMap[type] = saved as EmailTemplate;
        } else {
          templateMap[type] = {
            organization_id: organization.id,
            template_type: type,
            subject: DEFAULT_TEMPLATES[type].subject,
            html_body: DEFAULT_TEMPLATES[type].html_body,
            is_active: true,
          };
        }
      });
      
      setTemplates(templateMap);
    }
  }, [organization?.id, savedTemplates]);

  const saveMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      if (template.id) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            subject: template.subject,
            html_body: template.html_body,
            is_active: template.is_active,
          })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({
          organization_id: template.organization_id,
          template_type: template.template_type,
          subject: template.subject,
          html_body: template.html_body,
          is_active: template.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save template: " + error.message);
    },
  });

  const handleTemplateChange = (type: string, field: keyof EmailTemplate, value: string | boolean) => {
    setTemplates((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const handleSave = (type: string) => {
    saveMutation.mutate(templates[type]);
  };

  const handleReset = (type: string) => {
    setTemplates((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        subject: DEFAULT_TEMPLATES[type].subject,
        html_body: DEFAULT_TEMPLATES[type].html_body,
      },
    }));
    toast.info("Template reset to default");
  };

  const generatePreview = (type: string) => {
    const template = templates[type];
    if (!template) return;

    let html = template.html_body;
    const sampleData: Record<string, string> = {
      "{{applicant_name}}": "John Doe",
      "{{job_title}}": "Cinema Attendant",
      "{{department}}": "Operations",
      "{{cinema_name}}": organization?.name || "Cinema Name",
      "{{sender_name}}": "Jane Smith",
      "{{sender_email}}": "jane@example.com",
      "{{subject}}": "Question about showtimes",
      "{{message}}": "Hello, I wanted to ask about the showtimes for this weekend. Do you have any late night shows available?",
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
    });

    setPreviewHtml(html);
  };

  if (isLoading || !organization) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Templates
        </CardTitle>
        <CardDescription>
          Customize the email templates sent to applicants and for contact notifications.
          Use variables like {"{{applicant_name}}"} to personalize messages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="application_confirmation">
              <FileText className="h-4 w-4 mr-2" />
              Application Confirmation
            </TabsTrigger>
            <TabsTrigger value="contact_notification">
              <Mail className="h-4 w-4 mr-2" />
              Contact Notification
            </TabsTrigger>
          </TabsList>

          {Object.entries(TEMPLATE_INFO).map(([type, info]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">{info.name}</h4>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${type}-active`} className="text-sm">Active</Label>
                  <Switch
                    id={`${type}-active`}
                    checked={templates[type]?.is_active ?? true}
                    onCheckedChange={(checked) => handleTemplateChange(type, "is_active", checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${type}-subject`}>Email Subject</Label>
                <Input
                  id={`${type}-subject`}
                  value={templates[type]?.subject || ""}
                  onChange={(e) => handleTemplateChange(type, "subject", e.target.value)}
                  placeholder="Enter email subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${type}-body`}>Email Body (HTML)</Label>
                <Textarea
                  id={`${type}-body`}
                  value={templates[type]?.html_body || ""}
                  onChange={(e) => handleTemplateChange(type, "html_body", e.target.value)}
                  placeholder="Enter HTML email body..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Available Variables</h4>
                <div className="flex flex-wrap gap-2">
                  {info.variables.map((variable) => (
                    <code
                      key={variable}
                      className="px-2 py-1 bg-background rounded text-xs cursor-pointer hover:bg-primary/10"
                      onClick={() => navigator.clipboard.writeText(variable)}
                      title="Click to copy"
                    >
                      {variable}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handleReset(type)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => generatePreview(type)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>Email Preview</DialogTitle>
                    </DialogHeader>
                    <div
                      className="border rounded-lg overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </DialogContent>
                </Dialog>
                <Button onClick={() => handleSave(type)} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
