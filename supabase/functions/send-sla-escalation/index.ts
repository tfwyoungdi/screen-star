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
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-label { color: #6b7280; font-weight: 500; }
    .detail-value { color: #111827; font-weight: 600; }
    .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .priority-urgent { background: #fef2f2; color: #dc2626; }
    .priority-high { background: #fff7ed; color: #ea580c; }
    .priority-medium { background: #fefce8; color: #ca8a04; }
    .priority-low { background: #f0fdf4; color: #16a34a; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⚠️ SLA Breach Alert</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">A support ticket has exceeded its response time target</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong style="color: #dc2626;">⏱️ Overdue by {{hours_overdue}} hours</strong>
        <p style="margin: 10px 0 0 0; color: #7f1d1d;">This ticket requires immediate attention to meet SLA requirements.</p>
      </div>
      
      <h2 style="color: #111827; margin-bottom: 20px;">Ticket Details</h2>
      
      <div class="detail-row">
        <span class="detail-label">Ticket ID</span>
        <span class="detail-value">{{ticket_id}}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Subject</span>
        <span class="detail-value">{{ticket_subject}}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Cinema</span>
        <span class="detail-value">{{cinema_name}}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Priority</span>
        <span class="priority-badge priority-{{priority}}">{{priority}}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Created At</span>
        <span class="detail-value">{{created_at}}</span>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #6b7280;">Please log in to the Platform Admin dashboard to respond to this ticket.</p>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated SLA escalation notification from {{platform_name}}.</p>
    </div>
  </div>
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
