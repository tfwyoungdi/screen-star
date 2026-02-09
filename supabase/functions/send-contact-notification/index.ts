import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactNotificationRequest {
  organizationId: string;
  cinemaName: string;
  adminEmail: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}

const DEFAULT_SUBJECT = "New Contact Form Submission: {{subject}}";
const DEFAULT_HTML_BODY = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #121212; border-radius: 12px; border: 1px solid #2a2a2a;">
          <tr><td style="padding: 24px 20px;">
            <h1 style="color: #D4AF37; margin: 0 0 20px 0; font-size: 24px; text-align: center;">📬 New Contact Message</h1>
            <p style="color: #888; font-size: 14px; text-align: center; margin-bottom: 30px;">
              You've received a new message from your cinema's contact form.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 8px; margin-bottom: 20px;">
              <tr><td style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px; width: 100px;">From</td>
                    <td style="padding: 10px 0; color: #f5f5f0; font-size: 14px;">{{sender_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Email</td>
                    <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px; word-break: break-all;">
                      <a href="mailto:{{sender_email}}" style="color: #D4AF37; text-decoration: none;">{{sender_email}}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Subject</td>
                    <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; font-weight: bold;">{{subject}}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 8px; margin-bottom: 20px;">
              <tr><td style="padding: 20px;">
                <p style="color: #888; font-size: 12px; text-transform: uppercase; margin: 0 0 10px 0;">Message</p>
                <p style="color: #f5f5f0; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">{{message}}</p>
              </td></tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-top: 10px;">
                <a href="mailto:{{sender_email}}?subject=Re: {{subject}}" 
                   style="display: inline-block; background-color: #D4AF37; color: #000; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; min-width: 44px;">
                  Reply to {{sender_name}}
                </a>
              </td></tr>
            </table>
            <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
            <p style="color: #666; font-size: 12px; text-align: center;">
              This notification was sent from the {{cinema_name}} contact form.
            </p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value);
  });
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-contact-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      organizationId,
      cinemaName,
      adminEmail,
      senderName,
      senderEmail,
      subject,
      message,
    }: ContactNotificationRequest = await req.json();
    
    console.log(`Sending contact notification to ${adminEmail} from ${senderEmail}`);

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    // Initialize Supabase client to fetch custom template
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch custom template if exists
    let emailSubject = DEFAULT_SUBJECT;
    let htmlBody = DEFAULT_HTML_BODY;

    const { data: template } = await supabase
      .from("email_templates")
      .select("subject, html_body, is_active")
      .eq("organization_id", organizationId)
      .eq("template_type", "contact_notification")
      .single();

    if (template && template.is_active) {
      console.log("Using custom email template");
      emailSubject = template.subject;
      htmlBody = template.html_body;
    } else {
      console.log("Using default email template");
    }

    // Replace variables
    const variables = {
      sender_name: senderName,
      sender_email: senderEmail,
      subject: subject,
      message: message,
      cinema_name: cinemaName,
    };

    const finalSubject = replaceVariables(emailSubject, variables);
    const finalHtmlBody = replaceVariables(htmlBody, variables);

    const emailBody = {
      from: {
        address: "noreply@cinitix.com",
        name: "Cinitix Notifications"
      },
      to: [
        {
          email_address: {
            address: adminEmail,
            name: cinemaName
          }
        }
      ],
      subject: finalSubject,
      htmlbody: finalHtmlBody
    };

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": ZEPTOMAIL_API_KEY,
      },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("ZeptoMail error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Contact notification email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending contact notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
