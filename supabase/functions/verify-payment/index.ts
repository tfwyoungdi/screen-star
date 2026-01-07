import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
      transactionId, // For Flutterwave callback
    } = await req.json();
    
    console.log(`Verifying ${gateway} payment: ${paymentReference || transactionId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let verified = false;
    let paymentDetails: any = {};

    switch (gateway) {
      case 'stripe': {
        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        if (!STRIPE_SECRET_KEY) throw new Error("Stripe not configured");

        const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${paymentReference}`, {
          headers: {
            "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
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
        const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
        if (!FLUTTERWAVE_SECRET_KEY) throw new Error("Flutterwave not configured");

        const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
          headers: {
            "Authorization": `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          },
        });

        const result = await response.json();
        verified = result.status === "success" && result.data?.status === "successful";
        paymentDetails = {
          status: result.data?.status,
          amount: result.data?.amount,
          currency: result.data?.currency,
        };
        break;
      }

      case 'paystack': {
        const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
        if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack not configured");

        const response = await fetch(`https://api.paystack.co/transaction/verify/${paymentReference}`, {
          headers: {
            "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
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

      default:
        throw new Error(`Unsupported gateway: ${gateway}`);
    }

    if (verified) {
      // Update booking status to paid
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_reference', bookingReference);

      if (error) {
        console.error("Error updating booking:", error);
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
