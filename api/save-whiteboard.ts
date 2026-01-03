import { supabase } from "../lib/supabase";

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const { whiteboard } = await req.json();

    if (!whiteboard || !whiteboard.campaign || !whiteboard.imageData) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
      });
    }

    // Check if whiteboard already exists for this campaign
    const { data: existing, error: fetchError } = await supabase
      .from("whiteboards")
      .select("id")
      .eq("campaign", whiteboard.campaign)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (existing) {
      // Update existing whiteboard
      const { error: updateError } = await supabase
        .from("whiteboards")
        .update({
          imageData: whiteboard.imageData,
          lastModified: Date.now(),
        })
        .eq("campaign", whiteboard.campaign);

      if (updateError) throw updateError;
    } else {
      // Insert new whiteboard
      const { error: insertError } = await supabase.from("whiteboards").insert({
        id: whiteboard.id || crypto.randomUUID(),
        campaign: whiteboard.campaign,
        imageData: whiteboard.imageData,
        lastModified: whiteboard.lastModified || Date.now(),
      });

      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error saving whiteboard:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro ao salvar quadro branco" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
