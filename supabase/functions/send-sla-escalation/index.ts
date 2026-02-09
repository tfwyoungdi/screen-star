import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SLAEscalationRequest {
  ticketId: string;
  ticketSubject: string;
  cinemaName: string;
  priority: string;
  createdAt: string;
  escalationEmail: string;
  hoursOverdue: number;
}

const DEFAULT_SUBJECT = '🚨 SLA Breach: {{priority}} Priority Ticket from {{cinema_name}}';

const DEFAULT_HTML_BODY = `
<!DOCTYPE html>
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
</html>
`;

const replaceVariables = (
  template: string,
  variables: Record<string, string>
): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      ticketId, 
      ticketSubject, 
      cinemaName, 
      priority, 
      createdAt, 
      escalationEmail,
      hoursOverdue 
    }: SLAEscalationRequest = await req.json();

    console.log("Sending SLA escalation email for ticket:", ticketId);

    const apiKey = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!apiKey) {
      console.error("ZEPTOMAIL_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch custom template from platform settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: platformSettings } = await supabase
      .from("platform_settings")
      .select("sla_email_subject, sla_email_html_body, platform_name")
      .limit(1)
      .maybeSingle();

    const emailSubjectTemplate = platformSettings?.sla_email_subject || DEFAULT_SUBJECT;
    const emailHtmlTemplate = platformSettings?.sla_email_html_body || DEFAULT_HTML_BODY;
    const platformName = platformSettings?.platform_name || "Cinema Platform";

    const createdDate = new Date(createdAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Variable replacements
    const variables: Record<string, string> = {
      ticket_id: ticketId.slice(0, 8) + "...",
      ticket_subject: ticketSubject,
      cinema_name: cinemaName,
      priority: priority,
      created_at: createdDate,
      hours_overdue: hoursOverdue.toFixed(1),
      platform_name: platformName,
      escalation_email: escalationEmail,
    };

    const emailSubject = replaceVariables(emailSubjectTemplate, variables);
    const emailBody = replaceVariables(emailHtmlTemplate, variables);

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { address: "noreply@zeptomail.net", name: platformName },
        to: [{ email_address: { address: escalationEmail } }],
        subject: emailSubject,
        htmlbody: emailBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ZeptoMail API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("SLA escalation email sent successfully");
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error sending SLA escalation:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
