import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlatformEmailRequest {
  email_type: string;
  recipient_email: string;
  recipient_organization_id?: string;
  subject: string;
  html: string;
  metadata?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-platform-email function called");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const zeptoMailApiKey = Deno.env.get("ZEPTOMAIL_API_KEY");
    
    if (!zeptoMailApiKey) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      email_type, 
      recipient_email, 
      recipient_organization_id, 
      subject, 
      html, 
      metadata 
    }: PlatformEmailRequest = await req.json();

    console.log(`Sending ${email_type} email to ${recipient_email}`);
    
    // Generate tracking ID
    const trackingId = crypto.randomUUID();
    
    // Add tracking pixel to HTML
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-platform-email?id=${trackingId}&action=open`;
    const htmlWithTracking = html.replace(
      "</body>",
      `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" /></body>`
    );
    
    // Send email via ZeptoMail
    const emailResponse = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Authorization": `Zoho-enczapikey ${zeptoMailApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          address: "noreply@cinitix.com",
          name: "Cinitix Platform",
        },
        to: [{ email_address: { address: recipient_email } }],
        subject: subject,
        htmlbody: htmlWithTracking,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("Failed to send email:", emailResult);
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    console.log("Email sent successfully:", emailResult);
    
    // Log email in analytics
    const { error: analyticsError } = await supabase
      .from("platform_email_analytics")
      .insert({
        email_type,
        recipient_email,
        recipient_organization_id,
        subject,
        status: "sent",
        tracking_id: trackingId,
        metadata: metadata || {},
      });

    if (analyticsError) {
      console.error("Failed to log email analytics:", analyticsError);
    }

    return new Response(
      JSON.stringify({ success: true, trackingId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-platform-email:", error);
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
