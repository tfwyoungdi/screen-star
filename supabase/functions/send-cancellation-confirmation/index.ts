import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancellationRequest {
  organizationId: string;
  customerName: string;
  customerEmail: string;
  cinemaName: string;
  movieTitle: string;
  showtime: string;
  screenName: string;
  seats: string[];
  refundAmount: number;
  bookingReference: string;
  cancellationReason?: string;
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <h1 style="color: #ef4444; margin: 0 0 20px 0; font-size: 28px; text-align: center;">🎬 Booking Cancelled</h1>
    <p style="color: #f5f5f0; font-size: 16px; text-align: center;">Hi {{customer_name}}, your booking has been cancelled.</p>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #888; font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase;">Cancelled Booking Reference</p>
      <p style="color: #ef4444; font-size: 28px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px; text-decoration: line-through;">{{booking_reference}}</p>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 10px 0; color: #888; font-size: 14px;">Cinema</td><td style="padding: 10px 0; color: #f5f5f0; font-size: 14px; text-align: right;">{{cinema_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Movie</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{movie_title}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Date & Time</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{showtime}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Screen</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">{{screen_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Seats</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px; text-align: right; text-decoration: line-through;">{{seats}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Refund Amount</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #22c55e; font-size: 18px; text-align: right; font-weight: bold;">{{refund_amount}}</td></tr>
      </table>
    </div>
    <div style="background-color: #22c55e20; border: 1px solid #22c55e40; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="color: #22c55e; font-size: 14px; margin: 0; text-align: center;">
        💰 Your refund of {{refund_amount}} will be processed within 5-10 business days.
      </p>
    </div>
    <p style="color: #888; font-size: 14px; text-align: center; line-height: 1.6;">If you have any questions about your refund, please contact us.</p>
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; text-align: center;">We hope to see you again soon at {{cinema_name}}!</p>
  </div>
</body>
</html>`;

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return result;
}

function addTrackingPixel(html: string, trackingUrl: string): string {
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
  return html.replace("</body>", `${trackingPixel}</body>`);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-cancellation-confirmation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      organizationId, 
      customerName, 
      customerEmail, 
      cinemaName, 
      movieTitle, 
      showtime, 
      screenName, 
      seats, 
      refundAmount, 
      bookingReference,
      cancellationReason 
    }: CancellationRequest = await req.json();
    
    console.log(`Sending cancellation confirmation to ${customerEmail} for ${bookingReference}`);

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) throw new Error("ZEPTOMAIL_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate tracking ID
    const trackingId = crypto.randomUUID();

    let subject = "Booking Cancellation Confirmation - {{booking_reference}}";
    let htmlBody = DEFAULT_HTML;

    // Check for custom template
    const { data: template } = await supabase
      .from("email_templates")
      .select("subject, html_body, is_active")
      .eq("organization_id", organizationId)
      .eq("template_type", "cancellation_confirmation")
      .single();

    if (template?.is_active) {
      subject = template.subject;
      htmlBody = template.html_body;
    }

    const variables = {
      customer_name: customerName,
      booking_reference: bookingReference,
      movie_title: movieTitle,
      showtime: showtime,
      screen_name: screenName,
      seats: seats.join(", "),
      refund_amount: `$${refundAmount.toFixed(2)}`,
      cinema_name: cinemaName,
      cancellation_reason: cancellationReason || "Customer request",
    };

    let finalHtml = replaceVariables(htmlBody, variables);
    
    // Add tracking pixel
    const trackingUrl = `${supabaseUrl}/functions/v1/track-email?t=${trackingId}&a=open`;
    finalHtml = addTrackingPixel(finalHtml, trackingUrl);

    const emailBody = {
      from: { address: "noreply@cinetix.com", name: "CineTix" },
      to: [{ email_address: { address: customerEmail, name: customerName } }],
      subject: replaceVariables(subject, variables),
      htmlbody: finalHtml,
    };

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": ZEPTOMAIL_API_KEY },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to send email");

    // Record analytics
    await supabase.from("email_analytics").insert({
      organization_id: organizationId,
      email_type: "cancellation_confirmation",
      recipient_email: customerEmail,
      subject: replaceVariables(subject, variables),
      tracking_id: trackingId,
    });

    console.log("Cancellation confirmation email sent successfully");
    return new Response(JSON.stringify({ success: true, result }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error sending cancellation confirmation:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
