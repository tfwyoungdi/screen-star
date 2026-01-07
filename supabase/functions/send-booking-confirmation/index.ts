import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  customerName: string;
  customerEmail: string;
  cinemaName: string;
  movieTitle: string;
  showtime: string;
  screenName: string;
  seats: string[];
  totalAmount: number;
  bookingReference: string;
  qrCodeData: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-booking-confirmation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customerName,
      customerEmail,
      cinemaName,
      movieTitle,
      showtime,
      screenName,
      seats,
      totalAmount,
      bookingReference,
      qrCodeData,
    }: BookingConfirmationRequest = await req.json();
    
    console.log(`Sending booking confirmation to ${customerEmail} for ${movieTitle}`);

    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    const seatsList = seats.join(", ");
    
    const emailBody = {
      from: {
        address: "noreply@cinetix.com",
        name: "CineTix"
      },
      to: [
        {
          email_address: {
            address: customerEmail,
            name: customerName
          }
        }
      ],
      subject: `Your Booking Confirmation - ${movieTitle}`,
      htmlbody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">🎬 CineTix</h1>
            </div>
            
            <h2 style="color: #f5f5f0; margin-bottom: 20px; text-align: center;">Booking Confirmed!</h2>
            
            <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <p style="color: #D4AF37; font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase;">Booking Reference</p>
              <p style="color: #f5f5f0; font-size: 28px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">${bookingReference}</p>
            </div>
            
            <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #888; font-size: 14px;">Cinema</td>
                  <td style="padding: 10px 0; color: #f5f5f0; font-size: 14px; text-align: right;">${cinemaName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Movie</td>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right; font-weight: bold;">${movieTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Date & Time</td>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">${showtime}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Screen</td>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">${screenName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Seats</td>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px; text-align: right; font-weight: bold;">${seatsList}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Total Paid</td>
                  <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #22c55e; font-size: 18px; text-align: right; font-weight: bold;">$${totalAmount.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #ffffff; border-radius: 8px;">
              <p style="color: #333; font-size: 14px; margin: 0 0 15px 0;">Show this QR code at the gate:</p>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}" alt="Ticket QR Code" style="width: 200px; height: 200px;" />
            </div>
            
            <p style="color: #888; font-size: 14px; text-align: center; line-height: 1.6;">
              Please arrive at least 15 minutes before the showtime.<br>
              Present your booking reference or this QR code at the entrance.
            </p>
            
            <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              Thank you for booking with ${cinemaName}. Enjoy your movie!
            </p>
          </div>
        </body>
        </html>
      `
    };

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": ZEPTOMAIL_API_KEY,
      },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("ZeptoMail error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Booking confirmation email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending booking confirmation:", error);
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
