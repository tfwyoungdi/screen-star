import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, organizationId } = await req.json();

    if (!customerId || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Customer ID and Organization ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First verify the customer exists
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("id", customerId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    // Fetch available movies first (needed for both cases)
    const { data: availableMovies, error: moviesError } = await supabase
      .from("movies")
      .select(`
        id,
        title,
        genre,
        rating,
        description,
        poster_url,
        duration_minutes
      `)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .eq("status", "now_showing");

    if (moviesError) {
      console.error("Error fetching movies:", moviesError);
      throw new Error("Failed to fetch available movies");
    }

    // If customer doesn't exist or error, return popular movies
    if (customerError || !customer) {
      console.log("Customer not found or error, returning popular movies");
      return new Response(
        JSON.stringify({
          recommendations: availableMovies?.slice(0, 4).map(m => ({
            ...m,
            reason: "Popular at this cinema",
            matchScore: 75,
          })) || [],
          basedOn: "popular",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch customer's booking history with movie details
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        created_at,
        showtime_id,
        showtimes (
          movie_id,
          movies (
            id,
            title,
            genre,
            rating,
            description
          )
        )
      `)
      .eq("customer_id", customerId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(20);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      // Return popular movies as fallback
      return new Response(
        JSON.stringify({
          recommendations: availableMovies?.slice(0, 4).map(m => ({
            ...m,
            reason: "Popular at this cinema",
            matchScore: 75,
          })) || [],
          basedOn: "popular",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract watched movies (handle null showtimes gracefully)
    const watchedMovies = (bookings || [])
      .filter((b: any) => b.showtimes?.movies)
      .map((b: any) => ({
        id: b.showtimes.movies.id,
        title: b.showtimes.movies.title,
        genre: b.showtimes.movies.genre,
        rating: b.showtimes.movies.rating,
        watchedAt: b.created_at,
      }));

    // Get unique movie IDs the customer has watched
    const watchedMovieIds = [...new Set(watchedMovies.map(m => m.id))];

    // Filter out already watched movies from available movies
    const unwatchedMovies = (availableMovies || []).filter(
      m => !watchedMovieIds.includes(m.id)
    );

    // If no booking history, return popular movies
    if (watchedMovies.length === 0) {
      return new Response(
        JSON.stringify({
          recommendations: availableMovies?.slice(0, 4).map(m => ({
            ...m,
            reason: "Popular at this cinema",
            matchScore: 75,
          })) || [],
          basedOn: "popular",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no unwatched movies to recommend
    if (unwatchedMovies.length === 0) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          basedOn: "none_available",
          message: "You've seen all our current movies! Check back soon for new releases.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to generate personalized recommendations
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Analyze genre preferences
    const genreCounts: Record<string, number> = {};
    watchedMovies.forEach(m => {
      if (m.genre) {
        const genres = m.genre.split(",").map((g: string) => g.trim());
        genres.forEach((g: string) => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }
    });

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    const prompt = `You are a movie recommendation AI for a cinema. Analyze the customer's viewing history and recommend movies from the available list.

CUSTOMER'S WATCHED MOVIES (most recent first):
${watchedMovies.slice(0, 10).map(m => `- "${m.title}" (${m.genre || 'Unknown genre'}, ${m.rating || 'Unrated'})`).join("\n")}

TOP GENRE PREFERENCES: ${topGenres.join(", ") || "Mixed"}

AVAILABLE MOVIES TO RECOMMEND:
${unwatchedMovies.map(m => `- ID: ${m.id} | "${m.title}" | Genre: ${m.genre || 'Unknown'} | Rating: ${m.rating || 'Unrated'} | Description: ${m.description?.slice(0, 100) || 'No description'}...`).join("\n")}

Return a JSON array of up to 4 movie recommendations. For each, include:
- id: the movie ID from the list
- reason: a personalized 1-sentence reason why they'd enjoy it (mention their preferences)
- matchScore: 1-100 based on how well it matches their taste

Format: [{"id": "uuid", "reason": "string", "matchScore": number}]
Only return the JSON array, no other text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a helpful movie recommendation assistant. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      // Fallback to genre-based matching
      const fallbackRecs = unwatchedMovies
        .filter(m => topGenres.some(g => m.genre?.toLowerCase().includes(g.toLowerCase())))
        .slice(0, 4)
        .map(m => ({
          ...m,
          reason: `Matches your interest in ${topGenres[0]} movies`,
          matchScore: 70,
        }));

      return new Response(
        JSON.stringify({
          recommendations: fallbackRecs.length > 0 ? fallbackRecs : unwatchedMovies.slice(0, 4).map(m => ({
            ...m,
            reason: "Recommended for you",
            matchScore: 60,
          })),
          basedOn: "genre_match",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse AI recommendations
    let aiRecommendations: Array<{ id: string; reason: string; matchScore: number }> = [];
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      aiRecommendations = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback
      aiRecommendations = unwatchedMovies.slice(0, 4).map(m => ({
        id: m.id,
        reason: "Based on your viewing history",
        matchScore: 65,
      }));
    }

    // Merge AI recommendations with full movie data
    const recommendations = aiRecommendations
      .map(rec => {
        const movie = unwatchedMovies.find(m => m.id === rec.id);
        if (!movie) return null;
        return {
          ...movie,
          reason: rec.reason,
          matchScore: rec.matchScore,
        };
      })
      .filter(Boolean)
      .slice(0, 4);

    return new Response(
      JSON.stringify({
        recommendations,
        basedOn: "ai_personalized",
        topGenres,
        moviesWatched: watchedMovies.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
