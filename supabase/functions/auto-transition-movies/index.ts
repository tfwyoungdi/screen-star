import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("auto-transition-movies function called");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const today = new Date().toISOString().split('T')[0];
    console.log("Checking for movies to transition. Today:", today);

    // Find all coming_soon movies where release_date has passed using REST API
    const moviesResponse = await fetch(
      `${supabaseUrl}/rest/v1/movies?status=eq.coming_soon&is_active=eq.true&release_date=lte.${today}&select=id,title,release_date,organization_id`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!moviesResponse.ok) {
      const errorText = await moviesResponse.text();
      console.error("Error fetching coming soon movies:", errorText);
      throw new Error(`Failed to fetch movies: ${errorText}`);
    }

    const comingSoonMovies = await moviesResponse.json();
    console.log("Found coming soon movies:", comingSoonMovies?.length || 0);

    if (!comingSoonMovies || comingSoonMovies.length === 0) {
      console.log("No coming soon movies to transition");
      return new Response(
        JSON.stringify({ message: "No movies to transition", transitioned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transitionedMovies: string[] = [];
    const now = new Date().toISOString();

    // Check each movie for showtimes
    for (const movie of comingSoonMovies) {
      console.log(`Checking showtimes for movie: ${movie.title}`);
      
      // Check for active showtimes using REST API
      const showtimesResponse = await fetch(
        `${supabaseUrl}/rest/v1/showtimes?movie_id=eq.${movie.id}&is_active=eq.true&start_time=gte.${now}&select=id`,
        {
          headers: {
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
            "Prefer": "count=exact",
          },
        }
      );

      if (!showtimesResponse.ok) {
        console.error(`Error checking showtimes for movie ${movie.id}`);
        continue;
      }

      const contentRange = showtimesResponse.headers.get("content-range");
      const count = contentRange ? parseInt(contentRange.split("/")[1] || "0") : 0;
      
      console.log(`Movie ${movie.title} has ${count} active showtimes`);

      // Only transition if movie has at least one active showtime
      if (count > 0) {
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/movies?id=eq.${movie.id}`,
          {
            method: "PATCH",
            headers: {
              "apikey": supabaseServiceKey,
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ status: "now_showing" }),
          }
        );

        if (!updateResponse.ok) {
          console.error(`Error updating movie ${movie.id}`);
          continue;
        }

        transitionedMovies.push(movie.title);
        console.log(`Transitioned movie "${movie.title}" to now_showing`);
      }
    }

    console.log(`Transition complete. Movies transitioned: ${transitionedMovies.length}`);

    return new Response(
      JSON.stringify({
        message: `Transitioned ${transitionedMovies.length} movies`,
        transitioned: transitionedMovies.length,
        movies: transitionedMovies,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in auto-transition-movies:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
