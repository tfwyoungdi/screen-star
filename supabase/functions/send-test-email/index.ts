import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  subject: string;
  html: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-test-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html }: TestEmailRequest = await req.json();
    
    console.log(`Sending test email to ${to}`);

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    const emailBody = {
      from: {
        address: "noreply@cinetix.com",
        name: "CineTix",
      },
      to: [
        {
          email_address: {
            address: to,
            name: to.split("@")[0],
          },
        },
      ],
      subject,
      htmlbody: html,
    };

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: ZEPTOMAIL_API_KEY,
      },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Failed to send test email:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Test email sent successfully");

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-test-email:", error);
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
