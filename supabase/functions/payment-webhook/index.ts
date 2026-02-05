import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-paystack-signature, verif-hash",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function verifyStripeSignature(payload: string, signature: string): Promise<boolean> {
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn("STRIPE_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const parts = signature.split(",");
    const timestamp = parts.find(p => p.startsWith("t="))?.split("=")[1];
    const sig = parts.find(p => p.startsWith("v1="))?.split("=")[1];
    
    if (!timestamp || !sig) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(STRIPE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return expectedHex === sig;
  } catch (error) {
    console.error("Stripe signature verification failed:", error);
    return false;
  }
}

async function verifyPaystackSignature(payload: string, signature: string): Promise<boolean> {
  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!PAYSTACK_SECRET_KEY) {
    console.warn("PAYSTACK_SECRET_KEY not configured");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(PAYSTACK_SECRET_KEY),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return expectedHex === signature;
  } catch (error) {
    console.error("Paystack signature verification failed:", error);
    return false;
  }
}

function verifyFlutterwaveHash(hash: string): boolean {
  const FLUTTERWAVE_WEBHOOK_HASH = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH");
  if (!FLUTTERWAVE_WEBHOOK_HASH) {
    console.warn("FLUTTERWAVE_WEBHOOK_HASH not configured");
    return false;
  }
  return hash === FLUTTERWAVE_WEBHOOK_HASH;
}

async function verifyNombaSignature(payload: string, signature: string): Promise<boolean> {
  const NOMBA_WEBHOOK_SECRET = Deno.env.get("NOMBA_WEBHOOK_SECRET");
  if (!NOMBA_WEBHOOK_SECRET) {
    console.warn("NOMBA_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(NOMBA_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (expectedHex.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expectedHex.length; i++) {
      result |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error("Nomba signature verification failed:", error);
    return false;
  }
}

async function updateBookingStatus(bookingReference: string, status: string, paymentDetails: Record<string, any>) {
  console.log(`Updating booking ${bookingReference} to status: ${status}`);
  
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status: status,
      payment_reference: paymentDetails.reference || paymentDetails.id,
      updated_at: new Date().toISOString(),
    })
    .eq("booking_reference", bookingReference)
    .select(`
      *,
      showtime:showtimes(
        start_time,
        screen:screens(name),
        movie:movies(title)
      )
    `)
    .single();

  if (error) {
    console.error("Failed to update booking:", error);
    throw error;
  }
  
  console.log(`Booking ${bookingReference} updated successfully`);

  // Send confirmation email
  if (status === "paid" && booking) {
    await sendConfirmationEmail(booking);
  }
}

async function sendConfirmationEmail(booking: any) {
  try {
    console.log(`Sending confirmation email for booking ${booking.booking_reference}`);

    // Get organization name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", booking.organization_id)
      .single();

    // Get booked seats
    const { data: bookedSeats } = await supabase
      .from("booked_seats")
      .select("seat_label")
      .eq("booking_id", booking.id);

    const seats = bookedSeats?.map(s => s.seat_label) || [];
    const showtime = new Date(booking.showtime?.start_time).toLocaleString();
    const qrCodeData = JSON.stringify({
      ref: booking.booking_reference,
      showtime: booking.showtime_id,
    });

    const emailPayload = {
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      cinemaName: org?.name || "Cinema",
      movieTitle: booking.showtime?.movie?.title || "Movie",
      showtime: showtime,
      screenName: booking.showtime?.screen?.name || "Screen",
      seats: seats,
      totalAmount: booking.total_amount,
      bookingReference: booking.booking_reference,
      qrCodeData: qrCodeData,
    };

    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-confirmation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify(emailPayload),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send confirmation email:", error);
    } else {
      console.log("Confirmation email sent successfully");
    }
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    // Don't throw - email failure shouldn't fail the webhook
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("payment-webhook function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const gateway = url.searchParams.get("gateway");
    const rawBody = await req.text();
    
    console.log(`Processing ${gateway} webhook`);

    let bookingReference: string | null = null;
    let paymentStatus: string = "failed";
    let paymentDetails: Record<string, any> = {};

    switch (gateway) {
      case "stripe": {
        const signature = req.headers.get("stripe-signature");
        if (!signature || !await verifyStripeSignature(rawBody, signature)) {
          console.error("Invalid Stripe signature");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const event = JSON.parse(rawBody);
        console.log(`Stripe event type: ${event.type}`);

        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          bookingReference = session.metadata?.booking_reference;
          paymentStatus = session.payment_status === "paid" ? "paid" : "failed";
          paymentDetails = { id: session.id, reference: session.payment_intent };
        } else if (event.type === "payment_intent.succeeded") {
          const paymentIntent = event.data.object;
          bookingReference = paymentIntent.metadata?.booking_reference;
          paymentStatus = "paid";
          paymentDetails = { id: paymentIntent.id, reference: paymentIntent.id };
        }
        break;
      }

      case "flutterwave": {
        const verifHash = req.headers.get("verif-hash");
        if (!verifHash || !verifyFlutterwaveHash(verifHash)) {
          console.error("Invalid Flutterwave hash");
          return new Response(JSON.stringify({ error: "Invalid hash" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const payload = JSON.parse(rawBody);
        console.log(`Flutterwave event: ${payload.event}`);

        if (payload.event === "charge.completed" && payload.data.status === "successful") {
          bookingReference = payload.data.meta?.booking_reference;
          paymentStatus = "paid";
          paymentDetails = { id: payload.data.id, reference: payload.data.tx_ref };
        }
        break;
      }

      case "paystack": {
        const signature = req.headers.get("x-paystack-signature");
        if (!signature || !await verifyPaystackSignature(rawBody, signature)) {
          console.error("Invalid Paystack signature");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const payload = JSON.parse(rawBody);
        console.log(`Paystack event: ${payload.event}`);

        if (payload.event === "charge.success") {
          bookingReference = payload.data.metadata?.booking_reference;
          paymentStatus = "paid";
          paymentDetails = { id: payload.data.id, reference: payload.data.reference };
        }
        break;
      }

      case "nomba": {
        const nombaSignature = req.headers.get("x-nomba-signature");
        if (!nombaSignature || !await verifyNombaSignature(rawBody, nombaSignature)) {
          console.error("Invalid Nomba signature");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const payload = JSON.parse(rawBody);
        console.log(`Nomba event: ${payload.event}`);

        if (payload.event === "checkout.completed" && payload.data?.status === "successful") {
          bookingReference = payload.data?.metadata?.booking_reference;
          paymentStatus = "paid";
          paymentDetails = { id: payload.data.id, reference: payload.data.order_reference };
        }
        break;
      }

      default:
        console.error(`Unknown gateway: ${gateway}`);
        return new Response(JSON.stringify({ error: "Unknown gateway" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    if (bookingReference && paymentStatus === "paid") {
      await updateBookingStatus(bookingReference, paymentStatus, paymentDetails);
    } else {
      console.log(`No action taken - ref: ${bookingReference}, status: ${paymentStatus}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
