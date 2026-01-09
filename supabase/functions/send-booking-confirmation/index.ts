import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  organizationId: string;
  customerName: string;
  customerEmail: string;
  cinemaName: string;
  movieTitle: string;
  showtime: string;
  screenName: string;
  seats: string[];
  totalAmount: number;
  bookingReference: string;
  qrCodeData: string;
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <h1 style="color: #D4AF37; margin: 0 0 20px 0; font-size: 28px; text-align: center;">🎬 Booking Confirmed!</h1>
    <p style="color: #f5f5f0; font-size: 16px; text-align: center;">Hi {{customer_name}}, your booking is confirmed!</p>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #D4AF37; font-size: 14px; margin: 0;">Booking Reference</p>
      <p style="color: #f5f5f0; font-size: 28px; font-weight: bold; margin: 0; font-family: monospace;">{{booking_reference}}</p>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 10px 0; color: #888;">Cinema</td><td style="padding: 10px 0; color: #f5f5f0; text-align: right;">{{cinema_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888;">Movie</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; text-align: right; font-weight: bold;">{{movie_title}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888;">Date & Time</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; text-align: right;">{{showtime}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888;">Screen</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; text-align: right;">{{screen_name}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888;">Seats</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; text-align: right; font-weight: bold;">{{seats}}</td></tr>
        <tr><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888;">Total</td><td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #22c55e; font-size: 18px; text-align: right; font-weight: bold;">{{total_amount}}</td></tr>
      </table>
    </div>
    <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; text-align: center;">Thank you for booking with {{cinema_name}}!</p>
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-booking-confirmation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, customerName, customerEmail, cinemaName, movieTitle, showtime, screenName, seats, totalAmount, bookingReference, qrCodeData }: BookingConfirmationRequest = await req.json();
    
    console.log(`Sending booking confirmation to ${customerEmail} for ${movieTitle}`);

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) throw new Error("ZEPTOMAIL_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let subject = "Your Booking Confirmation - {{movie_title}}";
    let htmlBody = DEFAULT_HTML;

    const { data: template } = await supabase
      .from("email_templates")
      .select("subject, html_body, is_active")
      .eq("organization_id", organizationId)
      .eq("template_type", "booking_confirmation")
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
      total_amount: `$${totalAmount.toFixed(2)}`,
      cinema_name: cinemaName,
    };

    const emailBody = {
      from: { address: "noreply@cinetix.com", name: "CineTix" },
      to: [{ email_address: { address: customerEmail, name: customerName } }],
      subject: replaceVariables(subject, variables),
      htmlbody: replaceVariables(htmlBody, variables),
    };

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": ZEPTOMAIL_API_KEY },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to send email");

    console.log("Booking confirmation email sent successfully");
    return new Response(JSON.stringify({ success: true, result }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error sending booking confirmation:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
