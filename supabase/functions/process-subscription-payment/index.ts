import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionPaymentRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  organizationId: string;
  returnUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("process-subscription-payment function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId, billingCycle, organizationId, returnUrl }: SubscriptionPaymentRequest = await req.json();

    console.log(`Processing subscription for org: ${organizationId}, plan: ${planId}, cycle: ${billingCycle}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      console.error("Plan not found:", planError);
      throw new Error("Invalid subscription plan");
    }

    // Calculate the price based on billing cycle
    const amount = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
    
    if (amount === 0) {
      throw new Error("Please select a paid plan");
    }

    // Fetch organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      throw new Error("Organization not found");
    }

    // Get user info from the auth header
    const authHeader = req.headers.get("authorization");
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader?.replace("Bearer ", "") ?? ""
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Use Stripe for platform subscription payments
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      throw new Error("Payment gateway not configured. Please contact support.");
    }

    // Create Stripe checkout session
    const subscriptionRef = `SUB-${org.slug}-${Date.now()}`;
    
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": Math.round(amount * 100).toString(),
        "line_items[0][price_data][product_data][name]": `Cinitix ${plan.name} Plan - ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}`,
        "line_items[0][price_data][product_data][description]": plan.description || `${plan.name} subscription plan`,
        "line_items[0][quantity]": "1",
        "mode": "payment",
        "success_url": `${returnUrl}?status=success&session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url": `${returnUrl}?status=cancelled`,
        "customer_email": user.email || "",
        "metadata[organization_id]": organizationId,
        "metadata[plan_id]": planId,
        "metadata[billing_cycle]": billingCycle,
        "metadata[subscription_ref]": subscriptionRef,
      }),
    });

    const session = await response.json();

    if (session.error) {
      console.error("Stripe error:", session.error);
      throw new Error(session.error.message);
    }

    console.log(`Subscription payment session created: ${session.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing subscription payment:", error);
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
