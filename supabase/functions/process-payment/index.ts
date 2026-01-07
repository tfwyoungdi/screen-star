import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  bookingReference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  gateway: 'stripe' | 'flutterwave' | 'paystack';
  publicKey: string;
  returnUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("process-payment function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      bookingReference, 
      amount, 
      currency, 
      customerEmail, 
      customerName,
      gateway,
      publicKey,
      returnUrl 
    }: PaymentRequest = await req.json();
    
    console.log(`Processing ${gateway} payment for ${bookingReference}, amount: ${amount} ${currency}`);

    let paymentUrl: string;
    let paymentReference: string;

    switch (gateway) {
      case 'stripe': {
        // For Stripe, we create a checkout session
        // The cinema's secret key should be stored in their org config or as a secret
        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        if (!STRIPE_SECRET_KEY) {
          throw new Error("Stripe is not configured. Please add your Stripe secret key.");
        }

        const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            "payment_method_types[]": "card",
            "line_items[0][price_data][currency]": currency.toLowerCase(),
            "line_items[0][price_data][unit_amount]": Math.round(amount * 100).toString(),
            "line_items[0][price_data][product_data][name]": `Movie Tickets - ${bookingReference}`,
            "line_items[0][quantity]": "1",
            "mode": "payment",
            "success_url": `${returnUrl}?status=success&ref=${bookingReference}`,
            "cancel_url": `${returnUrl}?status=cancelled&ref=${bookingReference}`,
            "customer_email": customerEmail,
            "metadata[booking_reference]": bookingReference,
          }),
        });

        const session = await response.json();
        
        if (session.error) {
          throw new Error(session.error.message);
        }

        paymentUrl = session.url;
        paymentReference = session.id;
        break;
      }

      case 'flutterwave': {
        // Flutterwave payment initialization
        const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
        if (!FLUTTERWAVE_SECRET_KEY) {
          throw new Error("Flutterwave is not configured. Please add your Flutterwave secret key.");
        }

        const txRef = `CIN-${bookingReference}-${Date.now()}`;
        
        const response = await fetch("https://api.flutterwave.com/v3/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tx_ref: txRef,
            amount: amount,
            currency: currency,
            redirect_url: `${returnUrl}?status=callback&ref=${bookingReference}`,
            customer: {
              email: customerEmail,
              name: customerName,
            },
            customizations: {
              title: "CineTix Tickets",
              description: `Movie Tickets - ${bookingReference}`,
            },
            meta: {
              booking_reference: bookingReference,
            },
          }),
        });

        const result = await response.json();
        
        if (result.status !== "success") {
          throw new Error(result.message || "Failed to initialize Flutterwave payment");
        }

        paymentUrl = result.data.link;
        paymentReference = txRef;
        break;
      }

      case 'paystack': {
        // Paystack payment initialization
        const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
        if (!PAYSTACK_SECRET_KEY) {
          throw new Error("Paystack is not configured. Please add your Paystack secret key.");
        }

        const response = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customerEmail,
            amount: Math.round(amount * 100), // Paystack uses kobo/cents
            currency: currency,
            reference: `CIN-${bookingReference}-${Date.now()}`,
            callback_url: `${returnUrl}?status=callback&ref=${bookingReference}`,
            metadata: {
              booking_reference: bookingReference,
              customer_name: customerName,
            },
          }),
        });

        const result = await response.json();
        
        if (!result.status) {
          throw new Error(result.message || "Failed to initialize Paystack payment");
        }

        paymentUrl = result.data.authorization_url;
        paymentReference = result.data.reference;
        break;
      }

      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }

    console.log(`Payment initialized: ${paymentReference}`);

    return new Response(JSON.stringify({ 
      success: true, 
      paymentUrl,
      paymentReference,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
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
