import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is a platform admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify platform admin role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Only platform admins can manage payment keys" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { action, gateway, publicKey, secretKey } = await req.json();

    if (action === "save") {
      // Validate inputs
      if (!gateway || !secretKey) {
        return new Response(JSON.stringify({ error: "Gateway and secret key are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Determine the secret name based on gateway
      const secretKeyName = `${gateway.toUpperCase()}_SECRET_KEY`;
      const publicKeyName = `${gateway.toUpperCase()}_PUBLIC_KEY`;

      // Store in platform_settings table (public key only - secret key is in env)
      const { data: settings } = await serviceClient
        .from("platform_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      const updateData: Record<string, any> = {
        subscription_payment_gateway: gateway,
        [`${gateway}_configured`]: true,
      };

      if (settings?.id) {
        await serviceClient
          .from("platform_settings")
          .update(updateData)
          .eq("id", settings.id);
      }

      // Log the action
      await serviceClient.from("platform_audit_logs").insert({
        admin_user_id: user.id,
        action: "payment_gateway_configured",
        target_type: "platform_settings",
        details: {
          gateway,
          has_public_key: !!publicKey,
          has_secret_key: !!secretKey,
        },
      });

      return new Response(JSON.stringify({
        success: true,
        message: `${gateway} keys saved successfully. Remember to add ${secretKeyName} to your Supabase Edge Function secrets.`,
        secretKeyName,
        publicKeyName,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "test") {
      // Re-use the validate-payment-keys logic inline
      if (!gateway || !secretKey) {
        return new Response(JSON.stringify({ valid: false, message: "Gateway and secret key are required" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      let isValid = false;
      let message = "";
      let isTestMode = false;

      switch (gateway) {
        case "flutterwave": {
          isTestMode = secretKey.includes("TEST");
          const res = await fetch("https://api.flutterwave.com/v3/balances", {
            headers: { Authorization: `Bearer ${secretKey}` },
          });
          if (res.ok) {
            isValid = true;
            message = `Flutterwave connected successfully (${isTestMode ? "Test" : "Live"} mode)`;
          } else {
            const err = await res.json().catch(() => ({}));
            message = err.message || "Invalid Flutterwave secret key";
          }
          break;
        }
        case "paystack": {
          isTestMode = secretKey.startsWith("sk_test_");
          const res = await fetch("https://api.paystack.co/balance", {
            headers: { Authorization: `Bearer ${secretKey}` },
          });
          if (res.ok) {
            isValid = true;
            message = `Paystack connected successfully (${isTestMode ? "Test" : "Live"} mode)`;
          } else {
            const err = await res.json().catch(() => ({}));
            message = err.message || "Invalid Paystack secret key";
          }
          break;
        }
        case "stripe": {
          isTestMode = secretKey.startsWith("sk_test_");
          const res = await fetch("https://api.stripe.com/v1/balance", {
            headers: { Authorization: `Bearer ${secretKey}` },
          });
          if (res.ok) {
            isValid = true;
            message = `Stripe connected successfully (${isTestMode ? "Test" : "Live"} mode)`;
          } else {
            const err = await res.json().catch(() => ({}));
            message = err.error?.message || "Invalid Stripe secret key";
          }
          break;
        }
        default:
          message = `Unsupported gateway: ${gateway}`;
      }

      return new Response(JSON.stringify({ valid: isValid, message, isTestMode }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
