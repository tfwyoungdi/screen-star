import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerEmail {
  email: string;
  name: string;
  organization_id: string;
}

interface PlatformCustomerEmailRequest {
  title: string;
  subject: string;
  html_body: string;
  customer_emails: CustomerEmail[];
  filter_cinema?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-platform-customer-email function called");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const zeptoMailApiKey = Deno.env.get("ZEPTOMAIL_API_KEY");
    
    if (!zeptoMailApiKey) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, subject, html_body, customer_emails, filter_cinema }: PlatformCustomerEmailRequest = await req.json();

    console.log(`Sending email to ${customer_emails.length} customers`);

    // Get platform settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("platform_name")
      .limit(1)
      .single();

    const platformName = settings?.platform_name || "Cinitix";

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from("platform_customer_email_campaigns")
      .insert({
        title,
        subject,
        html_body,
        total_recipients: customer_emails.length,
        status: "sending",
        filter_criteria: { cinema_id: filter_cinema || null },
      })
      .select("id")
      .single();

    if (campaignError) {
      throw campaignError;
    }

    const campaignId = campaign.id;
    let sentCount = 0;
    const errors: string[] = [];

    for (const customer of customer_emails) {
      if (!customer.email) {
        console.log(`Skipping customer - no email`);
        continue;
      }

      // Generate tracking ID
      const trackingId = crypto.randomUUID();

      // Personalize the email
      const personalizedSubject = subject
        .replace(/\{\{customer_name\}\}/g, customer.name || "Valued Customer")
        .replace(/\{\{email_title\}\}/g, title)
        .replace(/\{\{platform_name\}\}/g, platformName);

      let personalizedHtml = html_body
        .replace(/\{\{customer_name\}\}/g, customer.name || "Valued Customer")
        .replace(/\{\{email_title\}\}/g, title)
        .replace(/\{\{platform_name\}\}/g, platformName);

      // Add tracking pixel
      const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-platform-email?id=${trackingId}&action=open`;
      if (personalizedHtml.includes("</body>")) {
        personalizedHtml = personalizedHtml.replace(
          "</body>",
          `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" /></body>`
        );
      } else {
        personalizedHtml += `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" />`;
      }

      try {
        const emailResponse = await fetch("https://api.zeptomail.com/v1.1/email", {
          method: "POST",
          headers: {
            "Authorization": `Zoho-enczapikey ${zeptoMailApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: {
              address: "noreply@cinetix.app",
              name: platformName,
            },
            to: [{ email_address: { address: customer.email, name: customer.name || "" } }],
            subject: personalizedSubject,
            htmlbody: personalizedHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`ZeptoMail error for ${customer.email}:`, errorText);
          errors.push(`${customer.email}: ${errorText}`);
          continue;
        }

        // Log email in analytics
        await supabase.from("platform_email_analytics").insert({
          email_type: "platform_customer_email",
          recipient_email: customer.email,
          recipient_organization_id: customer.organization_id,
          subject: personalizedSubject,
          status: "sent",
          tracking_id: trackingId,
          metadata: { campaign_id: campaignId, title },
        });

        sentCount++;
        console.log(`Email sent to ${customer.email}`);
      } catch (err: any) {
        console.error(`Error sending to ${customer.email}:`, err);
        errors.push(`${customer.email}: ${err.message}`);
      }
    }

    // Update campaign status
    await supabase
      .from("platform_customer_email_campaigns")
      .update({
        status: "sent",
        sent_count: sentCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    console.log(`Campaign complete: ${sentCount}/${customer_emails.length} emails sent`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaignId,
        total_recipients: customer_emails.length,
        sent_count: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-platform-customer-email:", error);
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
