import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifySubscriptionRequest {
  sessionId?: string;
  reference?: string;
  organizationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("verify-subscription-payment function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, reference, organizationId }: VerifySubscriptionRequest = await req.json();

    console.log(`Verifying subscription payment for org: ${organizationId}, session: ${sessionId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      throw new Error("Payment gateway not configured");
    }

    // Verify the Stripe session
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
      },
    });

    const session = await response.json();

    if (session.error) {
      console.error("Stripe verification error:", session.error);
      throw new Error("Failed to verify payment");
    }

    if (session.payment_status !== "paid") {
      console.log("Payment not completed:", session.payment_status);
      return new Response(
        JSON.stringify({ verified: false, message: "Payment not completed" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Extract metadata
    const planId = session.metadata?.plan_id;
    const billingCycle = session.metadata?.billing_cycle;
    const metadataOrgId = session.metadata?.organization_id;

    if (metadataOrgId !== organizationId) {
      throw new Error("Organization mismatch");
    }

    // Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create or update the subscription
    const { data: existingSub, error: existingError } = await supabase
      .from("cinema_subscriptions")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from("cinema_subscriptions")
        .update({
          plan_id: planId,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          stripe_customer_id: session.customer,
          updated_at: now.toISOString(),
        })
        .eq("id", existingSub.id);

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        throw new Error("Failed to update subscription");
      }
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from("cinema_subscriptions")
        .insert({
          organization_id: organizationId,
          plan_id: planId,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          stripe_customer_id: session.customer,
          billing_email: session.customer_email,
        });

      if (insertError) {
        console.error("Error creating subscription:", insertError);
        throw new Error("Failed to create subscription");
      }
    }

    // Activate the organization
    const { error: orgError } = await supabase
      .from("organizations")
      .update({ is_active: true })
      .eq("id", organizationId);

    if (orgError) {
      console.error("Error activating organization:", orgError);
    }

    console.log(`Subscription activated for org: ${organizationId}`);

    return new Response(
      JSON.stringify({
        verified: true,
        message: "Subscription activated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error verifying subscription payment:", error);
    return new Response(
      JSON.stringify({ error: error.message, verified: false }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
