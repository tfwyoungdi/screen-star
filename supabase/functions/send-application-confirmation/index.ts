import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationConfirmationRequest {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  cinemaName: string;
  primaryColor: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-application-confirmation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      applicantName,
      applicantEmail,
      jobTitle,
      cinemaName,
      primaryColor,
    }: ApplicationConfirmationRequest = await req.json();
    
    console.log(`Sending application confirmation to ${applicantEmail} for ${jobTitle}`);

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    const emailBody = {
      from: {
        address: "noreply@cinetix.com",
        name: "Cinitix Careers"
      },
      to: [
        {
          email_address: {
            address: applicantEmail,
            name: applicantName
          }
        }
      ],
      subject: `Application Received - ${jobTitle}`,
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
              <h1 style="color: ${primaryColor}; margin: 0; font-size: 28px;">🎬 ${cinemaName}</h1>
            </div>
            
            <h2 style="color: #f5f5f0; margin-bottom: 20px; text-align: center;">Thank You for Applying!</h2>
            
            <p style="color: #888; font-size: 16px; line-height: 1.6; text-align: center;">
              Dear ${applicantName},
            </p>
            
            <p style="color: #f5f5f0; font-size: 16px; line-height: 1.6; margin: 20px 0;">
              We have received your application for the <strong style="color: ${primaryColor};">${jobTitle}</strong> position at ${cinemaName}.
            </p>
            
            <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid ${primaryColor};">
              <p style="color: #f5f5f0; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong>What happens next?</strong><br><br>
                Our hiring team will carefully review your application. If your qualifications match our requirements, we'll reach out to schedule an interview.
              </p>
            </div>
            
            <p style="color: #888; font-size: 14px; line-height: 1.6;">
              Due to the high volume of applications, we may not be able to respond to every candidate. However, we truly appreciate your interest in joining our team.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: ${primaryColor}20; border: 1px solid ${primaryColor}40; border-radius: 8px; padding: 15px 25px;">
                <p style="margin: 0; color: ${primaryColor}; font-size: 14px;">
                  ✓ Application received for <strong>${jobTitle}</strong>
                </p>
              </div>
            </div>
            
            <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              This is an automated message from ${cinemaName}.<br>
              Please do not reply to this email.
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

    console.log("Application confirmation email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending application confirmation:", error);
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
