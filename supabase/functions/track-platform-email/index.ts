import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TRANSPARENT_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get("id");
    const action = url.searchParams.get("action") || "open";

    console.log(`Tracking platform email: ${action} for ${trackingId}`);

    if (!trackingId) {
      return new Response(TRANSPARENT_PIXEL, {
        status: 200,
        headers: { "Content-Type": "image/gif" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "open") {
      // Update the individual email analytics record (only first open)
      const { data: updatedRecord, error } = await supabase
        .from("platform_email_analytics")
        .update({ 
          opened_at: new Date().toISOString(),
          status: "opened"
        })
        .eq("tracking_id", trackingId)
        .is("opened_at", null)
        .select("metadata")
        .maybeSingle();

      if (error) {
        console.error("Failed to update open tracking:", error);
      }

      // Increment opened_count on the campaign record
      if (updatedRecord?.metadata?.campaign_id) {
        const campaignId = updatedRecord.metadata.campaign_id;
        const { data: campaign } = await supabase
          .from("platform_customer_email_campaigns")
          .select("opened_count")
          .eq("id", campaignId)
          .single();

        if (campaign) {
          const { error: campError } = await supabase
            .from("platform_customer_email_campaigns")
            .update({ opened_count: (campaign.opened_count || 0) + 1 })
            .eq("id", campaignId);

          if (campError) {
            console.error("Failed to update campaign opened_count:", campError);
          }
        }
      }
    } else if (action === "click") {
      const { error } = await supabase
        .from("platform_email_analytics")
        .update({ 
          clicked_at: new Date().toISOString(),
          status: "clicked"
        })
        .eq("tracking_id", trackingId);

      if (error) {
        console.error("Failed to update click tracking:", error);
      }

      // Redirect to the target URL if provided
      const redirectUrl = url.searchParams.get("url");
      if (redirectUrl) {
        return new Response(null, {
          status: 302,
          headers: { Location: redirectUrl },
        });
      }
    }

    return new Response(TRANSPARENT_PIXEL, {
      status: 200,
      headers: { 
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in track-platform-email:", error);
    return new Response(TRANSPARENT_PIXEL, {
      status: 200,
      headers: { "Content-Type": "image/gif" },
    });
  }
};

serve(handler);
