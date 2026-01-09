import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

const handler = async (req: Request): Promise<Response> => {
  console.log("track-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get("t");
    const action = url.searchParams.get("a") || "open"; // 'open' or 'click'

    if (!trackingId) {
      console.log("No tracking ID provided, returning pixel anyway");
      return new Response(TRACKING_PIXEL, {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          ...corsHeaders,
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "open") {
      // Update open tracking
      const { error } = await supabase
        .from("email_analytics")
        .update({
          opened_at: new Date().toISOString(),
          opened_count: supabase.rpc("increment_counter", { row_id: trackingId, counter_name: "opened_count" }),
        })
        .eq("tracking_id", trackingId)
        .is("opened_at", null);

      // If first open didn't work (already opened), just increment counter
      if (error) {
        await supabase.rpc("sql", {
          query: `UPDATE email_analytics SET opened_count = opened_count + 1 WHERE tracking_id = '${trackingId}'`,
        });
      }

      // Simpler approach - just update
      await supabase
        .from("email_analytics")
        .update({
          opened_at: new Date().toISOString(),
        })
        .eq("tracking_id", trackingId)
        .is("opened_at", null);

      // Always increment counter
      const { data: analytics } = await supabase
        .from("email_analytics")
        .select("opened_count")
        .eq("tracking_id", trackingId)
        .single();

      if (analytics) {
        await supabase
          .from("email_analytics")
          .update({ opened_count: (analytics.opened_count || 0) + 1 })
          .eq("tracking_id", trackingId);
      }

      console.log(`Email opened: ${trackingId}`);
    } else if (action === "click") {
      // Update click tracking
      await supabase
        .from("email_analytics")
        .update({
          clicked_at: new Date().toISOString(),
        })
        .eq("tracking_id", trackingId)
        .is("clicked_at", null);

      const { data: analytics } = await supabase
        .from("email_analytics")
        .select("clicked_count")
        .eq("tracking_id", trackingId)
        .single();

      if (analytics) {
        await supabase
          .from("email_analytics")
          .update({ clicked_count: (analytics.clicked_count || 0) + 1 })
          .eq("tracking_id", trackingId);
      }

      console.log(`Email clicked: ${trackingId}`);

      // Redirect to the intended URL if provided
      const redirectUrl = url.searchParams.get("url");
      if (redirectUrl) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: decodeURIComponent(redirectUrl),
            ...corsHeaders,
          },
        });
      }
    }

    // Return tracking pixel
    return new Response(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error tracking email:", error);
    // Still return the pixel even on error
    return new Response(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        ...corsHeaders,
      },
    });
  }
};

serve(handler);
