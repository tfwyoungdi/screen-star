import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerAnnouncementRequest {
  campaign_id: string;
  organization_id: string;
  subject: string;
  html_body: string;
  cinema_name: string;
}

function addTrackingPixel(html: string, trackingUrl: string): string {
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${trackingPixel}</body>`);
  }
  return html + trackingPixel;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-customer-announcement function called");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const zeptomailApiKey = Deno.env.get("ZEPTOMAIL_API_KEY");
    
    if (!zeptomailApiKey) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { campaign_id, organization_id, subject, html_body, cinema_name }: CustomerAnnouncementRequest = await req.json();

    console.log(`Sending announcement for campaign ${campaign_id} to org ${organization_id}`);

    // Fetch all customers for this organization
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, email, full_name")
      .eq("organization_id", organization_id);

    if (customersError) {
      throw customersError;
    }

    console.log(`Found ${customers?.length || 0} customers to email`);

    // Update campaign with total recipients
    await supabase
      .from("customer_email_campaigns")
      .update({
        total_recipients: customers?.length || 0,
        status: "sending",
      })
      .eq("id", campaign_id);

    let sentCount = 0;
    const errors: string[] = [];

    for (const customer of customers || []) {
      if (!customer.email) continue;

      // Generate unique tracking ID
      const trackingId = crypto.randomUUID();

      // Personalize the email
      const personalizedSubject = subject
        .replace(/\{\{customer_name\}\}/g, customer.full_name || "Valued Customer")
        .replace(/\{\{cinema_name\}\}/g, cinema_name);

      let personalizedHtml = html_body
        .replace(/\{\{customer_name\}\}/g, customer.full_name || "Valued Customer")
        .replace(/\{\{cinema_name\}\}/g, cinema_name);

      // Add tracking pixel
      const trackingUrl = `${supabaseUrl}/functions/v1/track-email?t=${trackingId}&a=open`;
      personalizedHtml = addTrackingPixel(personalizedHtml, trackingUrl);

      try {
        const emailBody = {
          from: { address: "noreply@cinitix.com", name: cinema_name },
          to: [{ email_address: { address: customer.email, name: customer.full_name || "" } }],
          subject: personalizedSubject,
          htmlbody: personalizedHtml,
        };

        const response = await fetch("https://api.zeptomail.com/v1.1/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Zoho-enczapikey ${zeptomailApiKey}`,
          },
          body: JSON.stringify(emailBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`ZeptoMail error for ${customer.email}:`, errorText);
          errors.push(`${customer.email}: ${errorText}`);
          continue;
        }

        // Record in email_analytics for tracking
        await supabase.from("email_analytics").insert({
          organization_id,
          email_type: "customer_announcement",
          recipient_email: customer.email,
          subject: personalizedSubject,
          tracking_id: trackingId,
        });

        sentCount++;
        console.log(`Email sent to ${customer.email}`);
      } catch (err: any) {
        console.error(`Error sending to ${customer.email}:`, err);
        errors.push(`${customer.email}: ${err.message}`);
      }
    }

    // Update campaign with final stats
    await supabase
      .from("customer_email_campaigns")
      .update({
        status: "sent",
        sent_count: sentCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    console.log(`Campaign complete: ${sentCount}/${customers?.length || 0} emails sent`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        total_recipients: customers?.length || 0,
        sent_count: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-customer-announcement:", error);
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
