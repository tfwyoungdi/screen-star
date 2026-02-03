import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: Message[];
  organizationId: string;
  cinemaName: string;
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

    const { messages, organizationId, cinemaName } = (await req.json()) as RequestBody;

    if (!messages || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing messages or organizationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch cinema context data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name, address, contact_email, contact_phone, about_text")
      .eq("id", organizationId)
      .single();

    // Get current movies with showtimes
    const now = new Date().toISOString();
    const { data: showtimes } = await supabase
      .from("showtimes")
      .select(`
        id,
        start_time,
        price,
        movies (title, duration_minutes, genre, rating, description),
        screens (name)
      `)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .gte("start_time", now)
      .order("start_time")
      .limit(20);

    // Get concession items
    const { data: concessions } = await supabase
      .from("concession_items")
      .select("name, price, category, description")
      .eq("organization_id", organizationId)
      .eq("is_available", true)
      .limit(15);

    // Build context for the AI
    let context = `You are a friendly and helpful customer service assistant for ${cinemaName || org?.name || "our cinema"}.`;
    
    if (org) {
      context += `\n\nCinema Information:`;
      if (org.address) context += `\n- Address: ${org.address}`;
      if (org.contact_phone) context += `\n- Phone: ${org.contact_phone}`;
      if (org.contact_email) context += `\n- Email: ${org.contact_email}`;
      if (org.about_text) context += `\n- About: ${org.about_text}`;
    }

    if (showtimes && showtimes.length > 0) {
      context += `\n\nCurrent Movies & Showtimes:`;
      const movieMap = new Map<string, { times: string[]; info: any }>();
      
      for (const st of showtimes) {
        const movie = st.movies as any;
        if (!movie?.title) continue;
        
        const existing = movieMap.get(movie.title);
        const timeStr = new Date(st.start_time).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        
        if (existing) {
          existing.times.push(`${timeStr} ($${st.price})`);
        } else {
          movieMap.set(movie.title, {
            times: [`${timeStr} ($${st.price})`],
            info: movie,
          });
        }
      }

      for (const [title, data] of movieMap) {
        context += `\n- ${title}`;
        if (data.info.genre) context += ` (${data.info.genre})`;
        if (data.info.duration_minutes) context += ` - ${data.info.duration_minutes} min`;
        if (data.info.rating) context += ` - Rated ${data.info.rating}`;
        context += `\n  Showtimes: ${data.times.slice(0, 5).join(", ")}`;
        if (data.times.length > 5) context += ` and ${data.times.length - 5} more`;
      }
    }

    if (concessions && concessions.length > 0) {
      context += `\n\nConcessions Menu:`;
      for (const item of concessions) {
        context += `\n- ${item.name}: $${item.price}`;
        if (item.description) context += ` (${item.description})`;
      }
    }

    context += `\n\nGuidelines:
- Be friendly, concise, and helpful
- Help with movie showtimes, ticket info, directions, and general questions
- For booking, direct users to select a movie and showtime on the website
- If asked about refunds or complex issues, suggest contacting the cinema directly
- Keep responses brief but informative`;

    const systemMessage: Message = { role: "system", content: context };

    console.log("[cinema-chatbot] Processing request for org:", organizationId);
    console.log("[cinema-chatbot] Movies found:", showtimes?.length || 0);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [systemMessage, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
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
      console.error("[cinema-chatbot] AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[cinema-chatbot] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
