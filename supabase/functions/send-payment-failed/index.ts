import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentFailedRequest {
  organization_id: string;
  amount: number;
  failure_reason: string;
  retry_date?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-payment-failed function called");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organization_id, amount, failure_reason, retry_date }: PaymentFailedRequest = await req.json();

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, contact_email")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      throw new Error(`Organization not found: ${organization_id}`);
    }

    if (!org.contact_email) {
      throw new Error(`No contact email for organization: ${org.name}`);
    }

    // Get subscription and plan
    const { data: subscription } = await supabase
      .from("cinema_subscriptions")
      .select("*, plan:subscription_plans(name)")
      .eq("organization_id", organization_id)
      .single();

    const planName = subscription?.plan?.name || "Unknown Plan";

    // Get platform settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    const platformName = settings?.platform_name || "CineTix";
    const emailTemplates = (settings as any)?.email_templates || {};

    // Get email template
    const template = emailTemplates.payment_failed || {
      subject: "❌ Payment Failed for {{cinema_name}}",
      htmlBody: `<html><body><h1>Payment Failed</h1><p>We couldn't process your payment.</p></body></html>`,
      isActive: true,
    };

    if (!template.isActive) {
      console.log("payment_failed template is disabled");
      return new Response(
        JSON.stringify({ success: false, reason: "Template disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Calculate retry date (default 3 days from now)
    const retryDateObj = retry_date 
      ? new Date(retry_date) 
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Replace variables
    let subject = template.subject
      .replace(/\{\{cinema_name\}\}/g, org.name)
      .replace(/\{\{plan_name\}\}/g, planName)
      .replace(/\{\{platform_name\}\}/g, platformName);

    let html = template.htmlBody
      .replace(/\{\{cinema_name\}\}/g, org.name)
      .replace(/\{\{plan_name\}\}/g, planName)
      .replace(/\{\{amount\}\}/g, `$${amount.toFixed(2)}`)
      .replace(/\{\{failure_reason\}\}/g, failure_reason)
      .replace(/\{\{retry_date\}\}/g, retryDateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))
      .replace(/\{\{update_payment_url\}\}/g, `${supabaseUrl.replace(".supabase.co", ".lovable.app")}/billing`)
      .replace(/\{\{platform_name\}\}/g, platformName);

    // Send email
    const { error: emailError } = await supabase.functions.invoke("send-platform-email", {
      body: {
        email_type: "payment_failed",
        recipient_email: org.contact_email,
        recipient_organization_id: org.id,
        subject,
        html,
        metadata: { amount, failure_reason },
      },
    });

    if (emailError) {
      throw emailError;
    }

    // Log notification
    await supabase.from("subscription_notification_log").insert({
      organization_id: org.id,
      notification_type: "payment_failed",
      metadata: { amount, failure_reason },
    });

    console.log(`Sent payment failed email to ${org.name} (${org.contact_email})`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-payment-failed:", error);
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
