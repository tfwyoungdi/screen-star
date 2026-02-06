import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffInvitationRequest {
  email: string;
  cinemaName: string;
  role: string;
  inviteToken: string;
  inviteUrl: string;
}

const roleLabels: Record<string, string> = {
  box_office: "Box Office",
  gate_staff: "Gate Staff",
  manager: "Manager",
  accountant: "Accountant",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-staff-invitation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, cinemaName, role, inviteToken, inviteUrl }: StaffInvitationRequest = await req.json();
    
    console.log(`Sending invitation to ${email} for ${cinemaName} as ${role}`);

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    const roleName = roleLabels[role] || role;
    
    const emailBody = {
      from: {
        address: "noreply@cinitix.com",
        name: "Cinitix"
      },
      to: [
        {
          email_address: {
            address: email,
            name: email.split("@")[0]
          }
        }
      ],
      subject: `You're invited to join ${cinemaName} on Cinitix`,
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
              <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">🎬 Cinitix</h1>
            </div>
            
            <h2 style="color: #f5f5f0; margin-bottom: 20px;">You've been invited!</h2>
            
            <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6;">
              <strong style="color: #f5f5f0;">${cinemaName}</strong> has invited you to join their team as a <strong style="color: #D4AF37;">${roleName}</strong>.
            </p>
            
            <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6;">
              Click the button below to accept the invitation and create your account:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background-color: #D4AF37; color: #0a0a0a; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Or copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #D4AF37; word-break: break-all;">${inviteUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
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

    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending staff invitation:", error);
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
