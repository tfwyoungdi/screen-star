import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("check-subscription-expiring function called");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get platform settings for email templates
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    const platformName = settings?.platform_name || "Cinitix";
    const emailTemplates = (settings as any)?.email_templates || {};

    // Check for subscriptions expiring in 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Get expiring subscriptions
    const { data: expiringSubscriptions, error: subError } = await supabase
      .from("cinema_subscriptions")
      .select(`
        *,
        organization:organizations(id, name, contact_email),
        plan:subscription_plans(name)
      `)
      .eq("status", "active")
      .lte("current_period_end", sevenDaysFromNow.toISOString())
      .gte("current_period_end", new Date().toISOString());

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    console.log(`Found ${expiringSubscriptions?.length || 0} expiring subscriptions`);

    let emailsSent = 0;

    for (const subscription of expiringSubscriptions || []) {
      const org = subscription.organization;
      const plan = subscription.plan;
      
      if (!org?.contact_email) {
        console.log(`Skipping org ${org?.id} - no contact email`);
        continue;
      }

      // Check if we already sent a notification for this period
      const { data: existingNotification } = await supabase
        .from("subscription_notification_log")
        .select("id")
        .eq("organization_id", org.id)
        .eq("notification_type", "subscription_expiring")
        .gte("sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existingNotification?.length) {
        console.log(`Already notified org ${org.id} recently`);
        continue;
      }

      // Calculate days remaining
      const expiryDate = new Date(subscription.current_period_end);
      const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Get email template
      const template = emailTemplates.subscription_expiring || {
        subject: "⏰ Your {{plan_name}} Subscription Expires in {{days_remaining}} Days",
        htmlBody: `<html><body><h1>Subscription Expiring</h1><p>Your subscription expires on {{expiry_date}}</p></body></html>`,
        isActive: true,
      };

      if (!template.isActive) {
        console.log("subscription_expiring template is disabled");
        continue;
      }

      // Replace variables
      let subject = template.subject
        .replace(/\{\{cinema_name\}\}/g, org.name)
        .replace(/\{\{plan_name\}\}/g, plan?.name || "Unknown")
        .replace(/\{\{days_remaining\}\}/g, daysRemaining.toString())
        .replace(/\{\{platform_name\}\}/g, platformName);

      let html = template.htmlBody
        .replace(/\{\{cinema_name\}\}/g, org.name)
        .replace(/\{\{plan_name\}\}/g, plan?.name || "Unknown")
        .replace(/\{\{expiry_date\}\}/g, expiryDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))
        .replace(/\{\{days_remaining\}\}/g, daysRemaining.toString())
        .replace(/\{\{renewal_url\}\}/g, `${supabaseUrl.replace(".supabase.co", ".lovable.app")}/billing`)
        .replace(/\{\{platform_name\}\}/g, platformName);

      // Send email
      const { error: emailError } = await supabase.functions.invoke("send-platform-email", {
        body: {
          email_type: "subscription_expiring",
          recipient_email: org.contact_email,
          recipient_organization_id: org.id,
          subject,
          html,
          metadata: { days_remaining: daysRemaining, plan_name: plan?.name },
        },
      });

      if (emailError) {
        console.error(`Failed to send email to ${org.contact_email}:`, emailError);
        continue;
      }

      // Log notification
      await supabase.from("subscription_notification_log").insert({
        organization_id: org.id,
        notification_type: "subscription_expiring",
        metadata: { days_remaining: daysRemaining },
      });

      emailsSent++;
      console.log(`Sent expiring notification to ${org.name} (${org.contact_email})`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: expiringSubscriptions?.length || 0,
        emailsSent 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-subscription-expiring:", error);
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
