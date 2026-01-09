import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactNotificationRequest {
  cinemaName: string;
  adminEmail: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-contact-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
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

    const emailBody = {
      from: {
        address: "noreply@cinetix.com",
        name: "CineTix Notifications"
      },
      to: [
        {
          email_address: {
            address: adminEmail,
            name: cinemaName
          }
        }
      ],
      subject: `New Contact Form Submission: ${subject}`,
      htmlbody: `
        <!DOCTYPE html>
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
                  <td style="padding: 10px 0; color: #f5f5f0; font-size: 14px;">${senderName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Email</td>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px;">
                    <a href="mailto:${senderEmail}" style="color: #D4AF37; text-decoration: none;">${senderEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Subject</td>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; font-weight: bold;">${subject}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <p style="color: #888; font-size: 12px; text-transform: uppercase; margin: 0 0 10px 0;">Message</p>
              <p style="color: #f5f5f0; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="mailto:${senderEmail}?subject=Re: ${encodeURIComponent(subject)}" 
                 style="display: inline-block; background-color: #D4AF37; color: #000; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Reply to ${senderName}
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              This notification was sent from the ${cinemaName} contact form.
            </p>
          </div>
        </body>
        </html>
      `
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
