import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


const handler = async (req: Request): Promise<Response> => {
  console.log("send-showtime-reminder function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
    if (!ZEPTOMAIL_API_KEY) {
      throw new Error("ZEPTOMAIL_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get bookings with showtimes in the next 2-3 hours that haven't been reminded yet
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    console.log(`Looking for showtimes between ${twoHoursFromNow.toISOString()} and ${threeHoursFromNow.toISOString()}`);

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_reference,
        customer_name,
        customer_email,
        total_amount,
        reminder_sent,
        showtimes!inner (
          id,
          start_time,
          screens (name),
          movies (title, poster_url),
          organizations (name, address)
        ),
        booked_seats (seat_label)
      `)
      .eq("status", "paid")
      .eq("reminder_sent", false)
      .gte("showtimes.start_time", twoHoursFromNow.toISOString())
      .lte("showtimes.start_time", threeHoursFromNow.toISOString());

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings to remind`);

    const results: { success: string[]; failed: string[] } = {
      success: [],
      failed: [],
    };

    for (const rawBooking of bookings || []) {
      const booking = rawBooking as any;
      try {
        const showtime = Array.isArray(booking.showtimes) ? booking.showtimes[0] : booking.showtimes;
        const screen = Array.isArray(showtime.screens) ? showtime.screens[0] : showtime.screens;
        const movie = Array.isArray(showtime.movies) ? showtime.movies[0] : showtime.movies;
        const org = Array.isArray(showtime.organizations) ? showtime.organizations[0] : showtime.organizations;
        
        const showtimeDate = new Date(showtime.start_time);
        const formattedDate = showtimeDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = showtimeDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const seatsList = booking.booked_seats.map((s: any) => s.seat_label).join(", ");
        const hoursUntil = Math.round((showtimeDate.getTime() - now.getTime()) / (60 * 60 * 1000));

        const emailBody = {
          from: {
            address: "noreply@cinetix.com",
            name: "CineTix",
          },
          to: [
            {
              email_address: {
                address: booking.customer_email,
                name: booking.customer_name,
              },
            },
          ],
          subject: `⏰ Reminder: ${movie.title} starts in ${hoursUntil} hours!`,
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
                
                <h2 style="color: #f5f5f0; margin-bottom: 10px; text-align: center;">Your Movie Starts Soon!</h2>
                <p style="color: #D4AF37; font-size: 18px; text-align: center; margin-bottom: 30px;">⏰ In approximately ${hoursUntil} hours</p>
                
                <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <p style="color: #D4AF37; font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase;">Booking Reference</p>
                  <p style="color: #f5f5f0; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">${booking.booking_reference}</p>
                </div>
                
                <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; color: #888; font-size: 14px;">Movie</td>
                      <td style="padding: 10px 0; color: #f5f5f0; font-size: 14px; text-align: right; font-weight: bold;">${movie.title}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Date</td>
                      <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Time</td>
                      <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px; text-align: right; font-weight: bold;">${formattedTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Screen</td>
                      <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #f5f5f0; font-size: 14px; text-align: right;">${screen.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #888; font-size: 14px;">Seats</td>
                      <td style="padding: 10px 0; border-top: 1px solid #2a2a2a; color: #D4AF37; font-size: 14px; text-align: right; font-weight: bold;">${seatsList}</td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <p style="color: #888; font-size: 14px; margin: 0 0 5px 0;">📍 Location</p>
                  <p style="color: #f5f5f0; font-size: 16px; margin: 0; font-weight: bold;">${org.name}</p>
                  <p style="color: #888; font-size: 14px; margin: 5px 0 0 0;">${org.address || 'Address not available'}</p>
                </div>
                
                <div style="background-color: #D4AF37; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <p style="color: #0a0a0a; font-size: 14px; margin: 0; font-weight: bold; text-align: center;">
                    💡 Pro tip: Arrive 15-20 minutes early to grab snacks and find your seats!
                  </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                  We're excited to have you! Enjoy your movie experience.
                </p>
              </div>
            </body>
            </html>
          `,
        };

        const response = await fetch("https://api.zeptomail.com/v1.1/email", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: ZEPTOMAIL_API_KEY,
          },
          body: JSON.stringify(emailBody),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error(`Failed to send reminder for booking ${booking.booking_reference}:`, result);
          results.failed.push(booking.booking_reference);
          continue;
        }

        // Mark booking as reminded
        await supabase
          .from("bookings")
          .update({ reminder_sent: true })
          .eq("id", booking.id);

        console.log(`Reminder sent for booking ${booking.booking_reference}`);
        results.success.push(booking.booking_reference);
      } catch (err) {
        console.error(`Error processing booking ${booking.booking_reference}:`, err);
        results.failed.push(booking.booking_reference);
      }
    }

    console.log(`Reminder results: ${results.success.length} sent, ${results.failed.length} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.success.length,
        failed: results.failed.length,
        details: results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-showtime-reminder:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
