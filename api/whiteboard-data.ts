import { supabase } from "../lib/supabase";

export const config = {
  runtime: "edge",
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-");
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const campaign = searchParams.get("campaign");

  if (!campaign) {
    return new Response(JSON.stringify({ error: "Campaign required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const safeCampaign = slugify(campaign);
    const whiteboardPath = `campaigns/${safeCampaign}/whiteboard.json`;

    if (req.method === "GET") {
      // Ler dados do whiteboard
      const {
        data: { publicUrl },
      } = supabase.storage.from("mag-files").getPublicUrl(whiteboardPath);

      try {
        const resp = await fetch(publicUrl);
        if (resp.ok) {
          const data = await resp.json();
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          });
        } else {
          // Whiteboard vazio
          return new Response(
            JSON.stringify({ elements: [], timestamp: Date.now() }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            }
          );
        }
      } catch (e) {
        return new Response(
          JSON.stringify({ elements: [], timestamp: Date.now() }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
    } else if (req.method === "POST") {
      // Atualizar dados do whiteboard
      const body = await req.json();

      const whiteboardData = {
        ...body,
        timestamp: Date.now(),
      };

      const blob = new Blob([JSON.stringify(whiteboardData, null, 2)], {
        type: "application/json",
      });

      const { error } = await supabase.storage
        .from("mag-files")
        .upload(whiteboardPath, blob, {
          contentType: "application/json",
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to save whiteboard: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ ok: true, timestamp: whiteboardData.timestamp }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    } else {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Whiteboard data error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to access whiteboard",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
