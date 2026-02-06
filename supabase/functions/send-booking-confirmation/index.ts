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
    <p style="color: #22c55e; font-size: 14px; text-align: center; background-color: #1a1a1a; padding: 10px; border-radius: 8px;">📎 Your ticket is attached as a PDF - save it to your device!</p>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="color: #D4AF37; font-size: 14px; margin: 0 0 15px 0; text-transform: uppercase;">Your Ticket QR Code</p>
      <img src="{{qr_code_url}}" alt="Booking QR Code" style="width: 180px; height: 180px; margin: 0 auto; display: block; border-radius: 8px; background: white; padding: 10px;" />
      <p style="color: #888; font-size: 12px; margin: 15px 0 0 0;">Scan this code at the entrance</p>
    </div>
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
    <p style="color: #888; font-size: 14px; text-align: center;">Please arrive at least 15 minutes before the showtime. Present your QR code at the entrance.</p>
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

async function generateTicketPDF(
  cinemaName: string,
  movieTitle: string,
  showtime: string,
  screenName: string,
  seats: string[],
  totalAmount: number,
  bookingReference: string,
  customerName: string,
  qrCodeData: string
): Promise<string> {
  // Fetch QR code as base64
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData || bookingReference)}&format=png`;
  let qrCodeBase64 = "";
  
  try {
    const qrResponse = await fetch(qrCodeUrl);
    const qrBuffer = await qrResponse.arrayBuffer();
    qrCodeBase64 = btoa(String.fromCharCode(...new Uint8Array(qrBuffer)));
  } catch (e) {
    console.error("Failed to fetch QR code:", e);
  }

  // Generate SVG-based PDF content (simple but effective)
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#16213e"/>
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="400" height="600" fill="url(#bg)"/>
      
      <!-- Header -->
      <rect x="0" y="0" width="400" height="80" fill="#D4AF37"/>
      <text x="200" y="35" text-anchor="middle" fill="#1a1a2e" font-family="Arial, sans-serif" font-size="14" font-weight="bold">🎬 CINEMA TICKET</text>
      <text x="200" y="60" text-anchor="middle" fill="#1a1a2e" font-family="Arial, sans-serif" font-size="18" font-weight="bold">${escapeXml(cinemaName)}</text>
      
      <!-- Movie Title -->
      <text x="200" y="120" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${escapeXml(movieTitle)}</text>
      
      <!-- Booking Reference -->
      <rect x="50" y="140" width="300" height="40" fill="#2a2a4a" rx="8"/>
      <text x="200" y="155" text-anchor="middle" fill="#D4AF37" font-family="Arial, sans-serif" font-size="10">BOOKING REFERENCE</text>
      <text x="200" y="172" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="16" font-weight="bold">${escapeXml(bookingReference)}</text>
      
      <!-- Details -->
      <text x="50" y="210" fill="#888888" font-family="Arial, sans-serif" font-size="11">Guest Name</text>
      <text x="350" y="210" text-anchor="end" fill="#ffffff" font-family="Arial, sans-serif" font-size="12">${escapeXml(customerName)}</text>
      
      <line x1="50" y1="220" x2="350" y2="220" stroke="#333355" stroke-width="1"/>
      
      <text x="50" y="245" fill="#888888" font-family="Arial, sans-serif" font-size="11">Date &amp; Time</text>
      <text x="350" y="245" text-anchor="end" fill="#ffffff" font-family="Arial, sans-serif" font-size="12">${escapeXml(showtime)}</text>
      
      <line x1="50" y1="255" x2="350" y2="255" stroke="#333355" stroke-width="1"/>
      
      <text x="50" y="280" fill="#888888" font-family="Arial, sans-serif" font-size="11">Screen</text>
      <text x="350" y="280" text-anchor="end" fill="#ffffff" font-family="Arial, sans-serif" font-size="12">${escapeXml(screenName)}</text>
      
      <line x1="50" y1="290" x2="350" y2="290" stroke="#333355" stroke-width="1"/>
      
      <text x="50" y="315" fill="#888888" font-family="Arial, sans-serif" font-size="11">Seats</text>
      <text x="350" y="315" text-anchor="end" fill="#D4AF37" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${escapeXml(seats.join(", "))}</text>
      
      <line x1="50" y1="325" x2="350" y2="325" stroke="#333355" stroke-width="1"/>
      
      <text x="50" y="350" fill="#888888" font-family="Arial, sans-serif" font-size="11">Total Paid</text>
      <text x="350" y="350" text-anchor="end" fill="#22c55e" font-family="Arial, sans-serif" font-size="16" font-weight="bold">$${totalAmount.toFixed(2)}</text>
      
      <!-- Dotted line separator -->
      <line x1="20" y1="380" x2="380" y2="380" stroke="#444466" stroke-width="2" stroke-dasharray="8,4"/>
      
      <!-- QR Code placeholder area -->
      <rect x="125" y="400" width="150" height="150" fill="#ffffff" rx="8"/>
      ${qrCodeBase64 ? `<image x="130" y="405" width="140" height="140" href="data:image/png;base64,${qrCodeBase64}"/>` : `<text x="200" y="480" text-anchor="middle" fill="#333" font-family="Arial, sans-serif" font-size="10">QR Code</text>`}
      
      <!-- Footer -->
      <text x="200" y="570" text-anchor="middle" fill="#666666" font-family="Arial, sans-serif" font-size="10">Scan QR code at entrance • Arrive 15 min early</text>
      <text x="200" y="590" text-anchor="middle" fill="#444444" font-family="Arial, sans-serif" font-size="9">Powered by Cinitix</text>
    </svg>
  `;

  // Convert SVG to base64
  const svgBase64 = btoa(unescape(encodeURIComponent(svgContent)));
  return svgBase64;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

    // Generate QR code URL for email
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeData || bookingReference)}`;

    const variables = {
      customer_name: customerName,
      booking_reference: bookingReference,
      movie_title: movieTitle,
      showtime: showtime,
      screen_name: screenName,
      seats: seats.join(", "),
      total_amount: `$${totalAmount.toFixed(2)}`,
      cinema_name: cinemaName,
      qr_code_url: qrCodeUrl,
    };

    // Generate PDF ticket as SVG (base64)
    console.log("Generating PDF ticket...");
    const ticketSvgBase64 = await generateTicketPDF(
      cinemaName,
      movieTitle,
      showtime,
      screenName,
      seats,
      totalAmount,
      bookingReference,
      customerName,
      qrCodeData || bookingReference
    );
    console.log("PDF ticket generated successfully");

    // ZeptoMail email with attachment
    const emailBody = {
      from: { address: "noreply@cinetix.com", name: "Cinitix" },
      to: [{ email_address: { address: customerEmail, name: customerName } }],
      subject: replaceVariables(subject, variables),
      htmlbody: replaceVariables(htmlBody, variables),
      attachments: [
        {
          name: `ticket-${bookingReference}.svg`,
          content: ticketSvgBase64,
          mime_type: "image/svg+xml"
        }
      ]
    };

    console.log("Sending email with ticket attachment...");
    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": ZEPTOMAIL_API_KEY },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("ZeptoMail error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Booking confirmation email with ticket attachment sent successfully");
    return new Response(JSON.stringify({ success: true, result }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error sending booking confirmation:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
