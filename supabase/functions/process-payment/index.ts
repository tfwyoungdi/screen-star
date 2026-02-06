import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PaymentRequest {
  bookingReference: string;
  organizationId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
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
      organizationId,
      amount: clientAmount, // Ignore client amount - we'll recalculate
      currency, 
      customerEmail, 
      customerName,
      returnUrl 
    }: PaymentRequest = await req.json();
    
    console.log(`Processing payment for booking ${bookingReference}, organization: ${organizationId}`);

    // Initialize Supabase client to fetch organization's payment config
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Recalculate amount server-side from database - never trust client
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, total_amount, discount_amount, organization_id, status")
      .eq("booking_reference", bookingReference)
      .eq("organization_id", organizationId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      throw new Error("Booking not found");
    }

    if (booking.status === 'paid') {
      throw new Error("This booking has already been paid");
    }

    // Recalculate total from booked_seats and concessions
    const { data: seats } = await supabase
      .from("booked_seats")
      .select("price")
      .eq("booking_id", booking.id);

    const { data: concessions } = await supabase
      .from("booking_concessions")
      .select("unit_price, quantity")
      .eq("booking_id", booking.id);

    const { data: combos } = await supabase
      .from("booking_combos")
      .select("unit_price, quantity")
      .eq("booking_id", booking.id);

    const seatsTotal = seats?.reduce((sum, s) => sum + Number(s.price), 0) || 0;
    const concessionsTotal = concessions?.reduce((sum, c) => sum + (Number(c.unit_price) * c.quantity), 0) || 0;
    const combosTotal = combos?.reduce((sum, c) => sum + (Number(c.unit_price) * c.quantity), 0) || 0;
    const discount = Number(booking.discount_amount) || 0;
    
    // Server-calculated amount - this is the source of truth
    const amount = seatsTotal + concessionsTotal + combosTotal - discount;

    console.log(`Server-calculated amount: ${amount} (seats: ${seatsTotal}, concessions: ${concessionsTotal}, combos: ${combosTotal}, discount: ${discount})`);

    // Update booking with verified amount if different
    if (Math.abs(amount - Number(booking.total_amount)) > 0.01) {
      console.warn(`Amount mismatch detected! Client: ${clientAmount}, DB: ${booking.total_amount}, Calculated: ${amount}`);
      await supabase
        .from("bookings")
        .update({ total_amount: amount })
        .eq("id", booking.id);
    }

    // Fetch organization's payment configuration (public info only)
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("payment_gateway, payment_gateway_configured")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      console.error("Error fetching organization:", orgError);
      throw new Error("Organization not found");
    }

    if (!org.payment_gateway_configured) {
      throw new Error("Payment gateway not configured. Please configure your payment settings in the dashboard.");
    }

    // SECURITY: Fetch secret key from LOCKED-DOWN secrets table (service role only)
    const { data: secrets, error: secretsError } = await supabase
      .from("organization_secrets")
      .select("payment_gateway_secret_key")
      .eq("organization_id", organizationId)
      .single();

    if (secretsError || !secrets?.payment_gateway_secret_key) {
      console.error("Error fetching payment secrets:", secretsError);
      throw new Error("Payment gateway not configured. Please configure your payment settings in the dashboard.");
    }

    const gateway = org.payment_gateway;
    const secretKey = secrets.payment_gateway_secret_key;

    console.log(`Using ${gateway} gateway for payment processing`);

    let paymentUrl: string;
    let paymentReference: string;

    switch (gateway) {
      case 'stripe': {
        const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            "payment_method_types[]": "card",
            "line_items[0][price_data][currency]": currency.toLowerCase(),
            "line_items[0][price_data][unit_amount]": Math.round(amount * 100).toString(),
            "line_items[0][price_data][product_data][name]": `Movie Tickets - ${bookingReference}`,
            "line_items[0][quantity]": "1",
            "mode": "payment",
            "success_url": `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=success&ref=${bookingReference}`,
            "cancel_url": `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=cancelled&ref=${bookingReference}`,
            "customer_email": customerEmail,
            "metadata[booking_reference]": bookingReference,
            "metadata[organization_id]": organizationId,
          }),
        });

        const session = await response.json();
        
        if (session.error) {
          console.error("Stripe error:", session.error);
          throw new Error(session.error.message);
        }

        paymentUrl = session.url;
        paymentReference = session.id;
        break;
      }

      case 'flutterwave': {
        const txRef = `CIN-${bookingReference}-${Date.now()}`;
        
        const response = await fetch("https://api.flutterwave.com/v3/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tx_ref: txRef,
            amount: amount,
            currency: currency,
            redirect_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=callback&ref=${bookingReference}`,
            customer: {
              email: customerEmail,
              name: customerName,
            },
            customizations: {
              title: "Cinitix Tickets",
              description: `Movie Tickets - ${bookingReference}`,
            },
            meta: {
              booking_reference: bookingReference,
              organization_id: organizationId,
            },
          }),
        });

        const result = await response.json();
        
        if (result.status !== "success") {
          console.error("Flutterwave error:", result);
          throw new Error(result.message || "Failed to initialize Flutterwave payment");
        }

        paymentUrl = result.data.link;
        paymentReference = txRef;
        break;
      }

      case 'paystack': {
        const response = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customerEmail,
            amount: Math.round(amount * 100), // Paystack uses kobo/cents
            currency: currency,
            reference: `CIN-${bookingReference}-${Date.now()}`,
            callback_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=callback&ref=${bookingReference}`,
            metadata: {
              booking_reference: bookingReference,
              organization_id: organizationId,
              customer_name: customerName,
            },
          }),
        });

        const result = await response.json();
        
        if (!result.status) {
          console.error("Paystack error:", result);
          throw new Error(result.message || "Failed to initialize Paystack payment");
        }

        paymentUrl = result.data.authorization_url;
        paymentReference = result.data.reference;
        break;
      }

      case 'nomba': {
        // Nomba payment integration
        const txRef = `CIN-${bookingReference}-${Date.now()}`;
        
        const response = await fetch("https://api.nomba.com/v1/checkout/order", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_reference: txRef,
            amount: amount,
            currency: currency || "NGN",
            callback_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=callback&ref=${bookingReference}`,
            customer_email: customerEmail,
            customer_name: customerName,
            description: `Movie Tickets - ${bookingReference}`,
            metadata: {
              booking_reference: bookingReference,
              organization_id: organizationId,
            },
          }),
        });

        const result = await response.json();
        
        if (!result.data?.checkout_url) {
          console.error("Nomba error:", result);
          throw new Error(result.message || "Failed to initialize Nomba payment");
        }

        paymentUrl = result.data.checkout_url;
        paymentReference = result.data.order_reference || txRef;
        break;
      }

      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }

    console.log(`Payment initialized successfully: ${paymentReference}`);

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
