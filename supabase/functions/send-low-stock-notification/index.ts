import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LowStockItem {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

interface NotificationPayload {
  notificationId: string;
  organizationId: string;
  items: LowStockItem[];
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-low-stock-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notificationId, organizationId, items, email }: NotificationPayload = await req.json();
    
    console.log(`Processing low stock notification for org: ${organizationId}`);
    console.log(`Items with low stock: ${items.length}`);

    if (!email) {
      console.log("No email configured for organization, skipping notification");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No email configured" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    const orgName = org?.name || 'Your Cinema';

    // Build email content
    const itemsList = items.map(item => 
      `• ${item.name}: ${item.stock_quantity} remaining (threshold: ${item.low_stock_threshold})`
    ).join('\n');

    const htmlItemsList = items.map(item => 
      `<li><strong>${item.name}</strong>: ${item.stock_quantity} remaining (threshold: ${item.low_stock_threshold})</li>`
    ).join('');

    // Use ZeptoMail for sending
    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    
    if (!ZEPTOMAIL_API_KEY) {
      console.error("ZEPTOMAIL_API_KEY not configured");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Email service not configured" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailResponse = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Authorization": ZEPTOMAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          address: "noreply@zeptomail.com",
          name: "CinemaFlow Inventory Alerts"
        },
        to: [{
          email_address: {
            address: email,
            name: "Cinema Manager"
          }
        }],
        subject: `⚠️ Low Stock Alert - ${orgName}`,
        htmlbody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">⚠️ Low Stock Alert</h2>
            <p>The following concession items at <strong>${orgName}</strong> are running low on stock:</p>
            <ul style="background: #fef3c7; padding: 20px 40px; border-radius: 8px;">
              ${htmlItemsList}
            </ul>
            <p>Please restock these items soon to avoid running out during peak hours.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated notification from CinemaFlow Inventory Management.
            </p>
          </div>
        `,
        textbody: `Low Stock Alert - ${orgName}\n\nThe following items are running low:\n\n${itemsList}\n\nPlease restock these items soon.`,
      }),
    });

    const result = await emailResponse.json();
    console.log("Email send result:", result);

    // Update notification as sent
    if (notificationId) {
      await supabase
        .from('low_stock_notifications')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', notificationId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Low stock notification sent" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending low stock notification:", error);
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
