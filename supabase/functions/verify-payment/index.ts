import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("verify-payment function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      bookingReference,
      paymentReference,
      gateway,
      transactionId,
      organizationId,
    } = await req.json();
    
    console.log(`Verifying ${gateway} payment: ${paymentReference || transactionId} for org: ${organizationId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch organization's payment gateway secret key
    let secretKey: string | null = null;
    
    if (organizationId) {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("payment_gateway_secret_key")
        .eq("id", organizationId)
        .single();

      if (!orgError && org?.payment_gateway_secret_key) {
        secretKey = org.payment_gateway_secret_key;
        console.log("Using organization's payment gateway secret key");
      }
    }

    // If no org key found, try to get it from the booking
    if (!secretKey && bookingReference) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("organization_id")
        .eq("booking_reference", bookingReference)
        .single();

      if (booking?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("payment_gateway_secret_key")
          .eq("id", booking.organization_id)
          .single();

        if (org?.payment_gateway_secret_key) {
          secretKey = org.payment_gateway_secret_key;
          console.log("Using organization's payment gateway secret key from booking");
        }
      }
    }

    if (!secretKey) {
      throw new Error(`Payment gateway not configured for this organization`);
    }

    let verified = false;
    let paymentDetails: any = {};

    switch (gateway) {
      case 'stripe': {
        const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${paymentReference}`, {
          headers: {
            "Authorization": `Bearer ${secretKey}`,
          },
        });

        const session = await response.json();
        verified = session.payment_status === "paid";
        paymentDetails = {
          status: session.payment_status,
          amount: session.amount_total / 100,
          currency: session.currency,
        };
        break;
      }

      case 'flutterwave': {
        const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
          headers: {
            "Authorization": `Bearer ${secretKey}`,
          },
        });

        const result = await response.json();
        console.log("Flutterwave verification response:", JSON.stringify(result));
        verified = result.status === "success" && result.data?.status === "successful";
        paymentDetails = {
          status: result.data?.status,
          amount: result.data?.amount,
          currency: result.data?.currency,
        };
        break;
      }

      case 'paystack': {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${paymentReference}`, {
          headers: {
            "Authorization": `Bearer ${secretKey}`,
          },
        });

        const result = await response.json();
        verified = result.status && result.data?.status === "success";
        paymentDetails = {
          status: result.data?.status,
          amount: result.data?.amount / 100,
          currency: result.data?.currency,
        };
        break;
      }

      case 'nomba': {
        const response = await fetch(`https://api.nomba.com/v1/checkout/transaction/${paymentReference}`, {
          headers: {
            "Authorization": `Bearer ${secretKey}`,
          },
        });

        const result = await response.json();
        verified = result.data?.status === "successful";
        paymentDetails = {
          status: result.data?.status,
          amount: result.data?.amount,
          currency: result.data?.currency,
        };
        break;
      }

      default:
        throw new Error(`Unsupported gateway: ${gateway}`);
    }

    if (verified) {
      // Update booking status to paid
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'paid',
        })
        .eq('booking_reference', bookingReference);

      if (error) {
        console.error("Error updating booking:", error);
      } else {
        console.log(`Booking ${bookingReference} marked as paid`);
      }
    }

    console.log(`Payment verification result: ${verified}`);

    return new Response(JSON.stringify({ 
      success: true, 
      verified,
      paymentDetails,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
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
