import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  organizationId: string;
  predictionType: "attendance" | "revenue" | "concessions" | "insights";
  daysAhead?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = (await req.json()) as RequestBody;
    const { organizationId, predictionType, daysAhead = 7 } = body;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing organizationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch historical booking data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        id,
        created_at,
        total_amount,
        status,
        showtime_id,
        showtimes (
          start_time,
          movies (title, genre)
        )
      `)
      .eq("organization_id", organizationId)
      .gte("created_at", ninetyDaysAgo.toISOString())
      .in("status", ["confirmed", "paid", "activated", "used"]);

    // Fetch showtime data for upcoming analysis
    const { data: upcomingShowtimes } = await supabase
      .from("showtimes")
      .select(`
        id,
        start_time,
        price,
        movies (title, genre, rating)
      `)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .gte("start_time", new Date().toISOString())
      .order("start_time")
      .limit(50);

    // Fetch concession sales data
    const { data: concessionSales } = await supabase
      .from("booking_concessions")
      .select(`
        quantity,
        unit_price,
        created_at,
        concession_items (name, category)
      `)
      .gte("created_at", ninetyDaysAgo.toISOString())
      .limit(500);

    // Fetch organization info
    const { data: org } = await supabase
      .from("organizations")
      .select("name, currency")
      .eq("id", organizationId)
      .single();

    // Aggregate data for AI analysis
    const dailyStats: Record<string, { bookings: number; revenue: number; dayOfWeek: number }> = {};
    
    bookings?.forEach((booking: any) => {
      const date = new Date(booking.created_at).toISOString().split("T")[0];
      const dayOfWeek = new Date(booking.created_at).getDay();
      if (!dailyStats[date]) {
        dailyStats[date] = { bookings: 0, revenue: 0, dayOfWeek };
      }
      dailyStats[date].bookings++;
      dailyStats[date].revenue += Number(booking.total_amount) || 0;
    });

    // Genre performance
    const genreStats: Record<string, { bookings: number; revenue: number }> = {};
    bookings?.forEach((booking: any) => {
      const genre = booking.showtimes?.movies?.genre || "Unknown";
      if (!genreStats[genre]) {
        genreStats[genre] = { bookings: 0, revenue: 0 };
      }
      genreStats[genre].bookings++;
      genreStats[genre].revenue += Number(booking.total_amount) || 0;
    });

    // Day of week patterns
    const dayOfWeekStats: Record<number, { bookings: number; revenue: number }> = {};
    Object.values(dailyStats).forEach((day) => {
      if (!dayOfWeekStats[day.dayOfWeek]) {
        dayOfWeekStats[day.dayOfWeek] = { bookings: 0, revenue: 0 };
      }
      dayOfWeekStats[day.dayOfWeek].bookings += day.bookings;
      dayOfWeekStats[day.dayOfWeek].revenue += day.revenue;
    });

    // Concession category stats
    const concessionStats: Record<string, { quantity: number; revenue: number }> = {};
    concessionSales?.forEach((sale: any) => {
      const category = sale.concession_items?.category || "Other";
      if (!concessionStats[category]) {
        concessionStats[category] = { quantity: 0, revenue: 0 };
      }
      concessionStats[category].quantity += sale.quantity;
      concessionStats[category].revenue += sale.quantity * sale.unit_price;
    });

    // Build context for AI
    const totalBookings = bookings?.length || 0;
    const totalRevenue = bookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0;
    const avgBookingsPerDay = totalBookings / 90;
    const avgRevenuePerDay = totalRevenue / 90;

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeekSummary = Object.entries(dayOfWeekStats)
      .map(([day, stats]) => `${dayNames[Number(day)]}: ${stats.bookings} bookings, $${stats.revenue.toFixed(0)}`)
      .join("\n");

    const genreSummary = Object.entries(genreStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([genre, stats]) => `${genre}: ${stats.bookings} bookings, $${stats.revenue.toFixed(0)}`)
      .join("\n");

    const upcomingMovies = upcomingShowtimes
      ?.map((s: any) => `${s.movies?.title} (${s.movies?.genre}) - ${new Date(s.start_time).toLocaleDateString()}`)
      .slice(0, 10)
      .join("\n");

    let systemPrompt = `You are an expert cinema business analyst providing predictive insights for ${org?.name || "a cinema"}.
You analyze historical booking patterns to forecast future performance and provide actionable recommendations.

Always be specific with numbers and percentages. Base predictions on the data provided.
Format your response as valid JSON.`;

    let userPrompt = "";
    let responseSchema: any = {};

    if (predictionType === "attendance") {
      userPrompt = `Analyze this cinema's booking data and predict attendance for the next ${daysAhead} days.

Historical Data (Last 90 Days):
- Total Bookings: ${totalBookings}
- Average Daily Bookings: ${avgBookingsPerDay.toFixed(1)}
- Total Revenue: $${totalRevenue.toFixed(0)}

Day of Week Patterns:
${dayOfWeekSummary}

Top Genres by Revenue:
${genreSummary}

Upcoming Movies:
${upcomingMovies || "No scheduled showtimes"}

Provide attendance predictions in this exact JSON format:
{
  "predictions": [
    {"date": "YYYY-MM-DD", "predictedBookings": number, "confidence": "high|medium|low", "reason": "brief explanation"}
  ],
  "weeklyTotal": number,
  "trend": "up|down|stable",
  "trendPercentage": number,
  "peakDay": "Day name",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`;
    } else if (predictionType === "revenue") {
      userPrompt = `Analyze this cinema's revenue data and forecast revenue for the next ${daysAhead} days.

Historical Data (Last 90 Days):
- Total Revenue: $${totalRevenue.toFixed(0)}
- Average Daily Revenue: $${avgRevenuePerDay.toFixed(0)}
- Total Bookings: ${totalBookings}
- Average Ticket Value: $${totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : 0}

Day of Week Revenue Patterns:
${dayOfWeekSummary}

Top Genres by Revenue:
${genreSummary}

Provide revenue predictions in this exact JSON format:
{
  "predictions": [
    {"date": "YYYY-MM-DD", "predictedRevenue": number, "confidence": "high|medium|low"}
  ],
  "weeklyTotal": number,
  "monthlyProjection": number,
  "trend": "up|down|stable",
  "trendPercentage": number,
  "revenueOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "riskFactors": ["risk 1", "risk 2"]
}`;
    } else if (predictionType === "concessions") {
      const concessionSummary = Object.entries(concessionStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([cat, stats]) => `${cat}: ${stats.quantity} items, $${stats.revenue.toFixed(0)}`)
        .join("\n");

      userPrompt = `Analyze concession sales and predict demand for the next ${daysAhead} days.

Concession Sales (Last 90 Days):
${concessionSummary || "No data available"}

Booking Patterns:
- Average Daily Bookings: ${avgBookingsPerDay.toFixed(1)}

Day of Week Patterns:
${dayOfWeekSummary}

Provide concession predictions in this exact JSON format:
{
  "categoryPredictions": [
    {"category": "string", "predictedSales": number, "recommendedStock": number}
  ],
  "peakDemandDays": ["Day1", "Day2"],
  "bundlingOpportunities": ["opportunity 1", "opportunity 2"],
  "stockRecommendations": ["recommendation 1", "recommendation 2"]
}`;
    } else if (predictionType === "insights") {
      userPrompt = `Provide comprehensive business insights and AI-powered recommendations for this cinema.

Historical Data (Last 90 Days):
- Total Bookings: ${totalBookings}
- Total Revenue: $${totalRevenue.toFixed(0)}
- Average Daily Bookings: ${avgBookingsPerDay.toFixed(1)}
- Average Daily Revenue: $${avgRevenuePerDay.toFixed(0)}

Day of Week Patterns:
${dayOfWeekSummary}

Top Genres by Revenue:
${genreSummary}

Provide insights in this exact JSON format:
{
  "performanceScore": number (0-100),
  "performanceLabel": "Excellent|Good|Average|Needs Improvement",
  "keyInsights": [
    {"title": "string", "description": "string", "impact": "high|medium|low", "actionable": true|false}
  ],
  "growthOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "riskAlerts": ["alert 1", "alert 2"],
  "competitiveAdvantages": ["advantage 1", "advantage 2"],
  "suggestedActions": [
    {"action": "string", "expectedImpact": "string", "difficulty": "easy|medium|hard", "timeframe": "string"}
  ]
}`;
    }

    console.log("[generate-predictions] Type:", predictionType, "Org:", organizationId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[generate-predictions] AI error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const generatedText = aiResponse.choices?.[0]?.message?.content || "";

    console.log("[generate-predictions] Raw response:", generatedText.substring(0, 200));

    // Parse JSON from response
    let result: any = {};
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[generate-predictions] Parse error:", parseError);
      result = { error: "Failed to parse predictions", raw: generatedText };
    }

    // Add metadata
    result.generatedAt = new Date().toISOString();
    result.predictionType = predictionType;
    result.historicalDataPoints = totalBookings;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-predictions] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
