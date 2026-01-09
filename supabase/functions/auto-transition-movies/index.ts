import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // Find all coming_soon movies where release_date has passed
    const { data: comingSoonMovies, error: fetchError } = await supabase
      .from("movies")
      .select("id, title, release_date, organization_id")
      .eq("status", "coming_soon")
      .eq("is_active", true)
      .lte("release_date", today);

    if (fetchError) {
      console.error("Error fetching coming soon movies:", fetchError);
      throw fetchError;
    }

    if (!comingSoonMovies || comingSoonMovies.length === 0) {
      console.log("No coming soon movies to transition");
      return new Response(
        JSON.stringify({ message: "No movies to transition", transitioned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transitionedMovies: string[] = [];

    // Check each movie for showtimes
    for (const movie of comingSoonMovies) {
      const { count, error: showtimeError } = await supabase
        .from("showtimes")
        .select("id", { count: "exact", head: true })
        .eq("movie_id", movie.id)
        .eq("is_active", true)
        .gte("start_time", new Date().toISOString());

      if (showtimeError) {
        console.error(`Error checking showtimes for movie ${movie.id}:`, showtimeError);
        continue;
      }

      // Only transition if movie has at least one active showtime
      if (count && count > 0) {
        const { error: updateError } = await supabase
          .from("movies")
          .update({ status: "now_showing" })
          .eq("id", movie.id);

        if (updateError) {
          console.error(`Error updating movie ${movie.id}:`, updateError);
          continue;
        }

        transitionedMovies.push(movie.title);
        console.log(`Transitioned movie "${movie.title}" to now_showing`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Transitioned ${transitionedMovies.length} movies`,
        transitioned: transitionedMovies.length,
        movies: transitionedMovies,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-transition-movies:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
