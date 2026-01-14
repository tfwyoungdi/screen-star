import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkAnnouncementRequest {
  campaign_id?: string;
  title: string;
  subject: string;
  html_body: string;
  filter_criteria?: {
    plan_ids?: string[];
    is_active?: boolean;
    created_after?: string;
    created_before?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-bulk-announcement function called");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { campaign_id, title, subject, html_body, filter_criteria }: BulkAnnouncementRequest = await req.json();

    // Get platform settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("platform_name")
      .limit(1)
      .single();

    const platformName = settings?.platform_name || "CineTix";

    // Build query for organizations
    let query = supabase
      .from("organizations")
      .select("id, name, contact_email");

    // Apply filters
    if (filter_criteria?.is_active !== undefined) {
      query = query.eq("is_active", filter_criteria.is_active);
    } else {
      query = query.eq("is_active", true); // Default to active only
    }

    if (filter_criteria?.created_after) {
      query = query.gte("created_at", filter_criteria.created_after);
    }

    if (filter_criteria?.created_before) {
      query = query.lte("created_at", filter_criteria.created_before);
    }

    const { data: organizations, error: orgsError } = await query;

    if (orgsError) {
      throw orgsError;
    }

    console.log(`Found ${organizations?.length || 0} organizations to notify`);

    // Filter by plan if specified
    let targetOrgs = organizations || [];
    
    if (filter_criteria?.plan_ids?.length) {
      const { data: subscriptions } = await supabase
        .from("cinema_subscriptions")
        .select("organization_id")
        .in("plan_id", filter_criteria.plan_ids)
        .eq("status", "active");

      const subscribedOrgIds = new Set(subscriptions?.map(s => s.organization_id) || []);
      targetOrgs = targetOrgs.filter(org => subscribedOrgIds.has(org.id));
    }

    // Create or update campaign record
    let campaignId = campaign_id;
    if (!campaignId) {
      const { data: newCampaign, error: campaignError } = await supabase
        .from("platform_announcement_campaigns")
        .insert({
          title,
          subject,
          html_body,
          filter_criteria: filter_criteria || {},
          total_recipients: targetOrgs.length,
          status: "sending",
        })
        .select("id")
        .single();

      if (campaignError) {
        throw campaignError;
      }
      campaignId = newCampaign.id;
    } else {
      await supabase
        .from("platform_announcement_campaigns")
        .update({
          status: "sending",
          total_recipients: targetOrgs.length,
        })
        .eq("id", campaignId);
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const org of targetOrgs) {
      if (!org.contact_email) {
        console.log(`Skipping org ${org.id} - no contact email`);
        continue;
      }

      // Replace variables in template
      const personalizedSubject = subject
        .replace(/\{\{cinema_name\}\}/g, org.name)
        .replace(/\{\{announcement_title\}\}/g, title)
        .replace(/\{\{platform_name\}\}/g, platformName);

      const personalizedHtml = html_body
        .replace(/\{\{cinema_name\}\}/g, org.name)
        .replace(/\{\{announcement_title\}\}/g, title)
        .replace(/\{\{platform_name\}\}/g, platformName);

      try {
        const { error: emailError } = await supabase.functions.invoke("send-platform-email", {
          body: {
            email_type: "platform_announcement",
            recipient_email: org.contact_email,
            recipient_organization_id: org.id,
            subject: personalizedSubject,
            html: personalizedHtml,
            metadata: { campaign_id: campaignId, title },
          },
        });

        if (emailError) {
          console.error(`Failed to send to ${org.contact_email}:`, emailError);
          errors.push(`${org.name}: ${emailError.message}`);
        } else {
          sentCount++;
          console.log(`Sent announcement to ${org.name} (${org.contact_email})`);
        }
      } catch (err: any) {
        console.error(`Error sending to ${org.contact_email}:`, err);
        errors.push(`${org.name}: ${err.message}`);
      }
    }

    // Update campaign status
    await supabase
      .from("platform_announcement_campaigns")
      .update({
        status: "sent",
        sent_count: sentCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    console.log(`Bulk announcement complete: ${sentCount}/${targetOrgs.length} sent`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaign_id: campaignId,
        total_recipients: targetOrgs.length,
        sent_count: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-bulk-announcement:", error);
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
