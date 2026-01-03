import { supabase } from "../lib/supabase";

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const url = new URL(req.url);
    const campaign = url.searchParams.get("campaign");

    if (!campaign) {
      return new Response(
        JSON.stringify({ error: "Nome da campanha é obrigatório" }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("whiteboards")
      .select("*")
      .eq("campaign", campaign)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return new Response(JSON.stringify({ whiteboard: data || null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error loading whiteboard:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Erro ao carregar quadro branco",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
