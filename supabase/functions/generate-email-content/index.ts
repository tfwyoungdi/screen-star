import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  type: "subject" | "content" | "full";
  templateType: string;
  cinemaName: string;
  organizationId: string;
  context?: {
    movieTitle?: string;
    movieGenre?: string;
    offerTitle?: string;
    updateTitle?: string;
    rewardName?: string;
    existingContent?: string;
  };
  prompt?: string;
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
    const { type, templateType, cinemaName, organizationId, context, prompt } = body;

    if (!templateType || !cinemaName || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch cinema info for better context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: org } = await supabase
      .from("organizations")
      .select("name, about_text, address")
      .eq("id", organizationId)
      .single();

    // Fetch current movies for context
    const { data: movies } = await supabase
      .from("movies")
      .select("title, genre, rating")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .limit(5);

    let systemPrompt = `You are an expert marketing copywriter for ${cinemaName}, a cinema/movie theater.
Your writing style is:
- Warm, friendly, and engaging
- Creates excitement and urgency
- Concise but impactful
- Uses emojis sparingly but effectively

${org?.about_text ? `About the cinema: ${org.about_text}` : ""}
${movies?.length ? `Current movies: ${movies.map(m => m.title).join(", ")}` : ""}`;

    let userPrompt = "";

    if (type === "subject") {
      systemPrompt += `\n\nGenerate ONLY an email subject line. No explanations, just the subject line.
Keep it under 60 characters. Make it attention-grabbing.`;

      switch (templateType) {
        case "new_movie":
          userPrompt = `Create an exciting email subject line announcing "${context?.movieTitle || "a new movie"}"${context?.movieGenre ? ` (${context.movieGenre})` : ""} at ${cinemaName}.`;
          break;
        case "special_offer":
          userPrompt = `Create an enticing email subject line for a special offer: "${context?.offerTitle || "discount"}" at ${cinemaName}.`;
          break;
        case "general_update":
          userPrompt = `Create a compelling email subject line about: "${context?.updateTitle || "cinema update"}" from ${cinemaName}.`;
          break;
        case "loyalty_reward":
          userPrompt = `Create an exciting email subject line about a loyalty reward: "${context?.rewardName || "special reward"}" from ${cinemaName}.`;
          break;
        default:
          userPrompt = `Create a compelling email subject line for ${cinemaName}. ${prompt || ""}`;
      }
    } else if (type === "content") {
      systemPrompt += `\n\nGenerate email body content. Return ONLY the content text, no HTML tags, no subject line.
Keep it conversational, 2-3 short paragraphs max. Create a sense of excitement.`;

      switch (templateType) {
        case "new_movie":
          userPrompt = `Write email content announcing "${context?.movieTitle || "a new movie"}"${context?.movieGenre ? ` (${context.movieGenre})` : ""} at ${cinemaName}. Make it exciting and encourage booking.`;
          break;
        case "special_offer":
          userPrompt = `Write email content for a special offer: "${context?.offerTitle || "discount"}" at ${cinemaName}. Create urgency and explain how to redeem.`;
          break;
        case "general_update":
          userPrompt = `Write email content about: "${context?.updateTitle || "an update"}" from ${cinemaName}. Be informative and engaging.`;
          break;
        case "loyalty_reward":
          userPrompt = `Write email content about a loyalty reward: "${context?.rewardName || "special reward"}" from ${cinemaName}. Make the customer feel valued.`;
          break;
        default:
          userPrompt = `Write compelling email content for ${cinemaName}. ${prompt || ""}`;
      }
    } else if (type === "full") {
      systemPrompt += `\n\nGenerate both a subject line AND email body content.
Return as JSON: { "subject": "...", "content": "..." }
Subject: Under 60 chars, attention-grabbing
Content: 2-3 paragraphs, conversational, exciting, no HTML`;

      userPrompt = prompt || `Create email content for a ${templateType.replace("_", " ")} campaign at ${cinemaName}.`;
      
      if (context?.existingContent) {
        userPrompt += ` Improve or expand on: "${context.existingContent}"`;
      }
    }

    console.log("[generate-email-content] Type:", type, "Template:", templateType);

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
      console.error("[generate-email-content] AI error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const generatedText = aiResponse.choices?.[0]?.message?.content || "";

    console.log("[generate-email-content] Generated:", generatedText.substring(0, 100));

    // Parse result based on type
    let result: { subject?: string; content?: string } = {};

    if (type === "full") {
      try {
        // Try to parse as JSON
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { content: generatedText };
        }
      } catch {
        result = { content: generatedText };
      }
    } else if (type === "subject") {
      result = { subject: generatedText.trim().replace(/^["']|["']$/g, "") };
    } else {
      result = { content: generatedText.trim() };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-email-content] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
