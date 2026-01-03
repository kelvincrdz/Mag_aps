import { supabase } from "../lib/supabase";

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const campaign = searchParams.get("campaign");

  if (!campaign) {
    return new Response(JSON.stringify({ error: "Campaign required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // IMPORTANTE: SSE tem limitações no Vercel Edge Functions
  // Timeout máximo de 30s em planos gratuitos
  // Recomenda-se usar polling ou Supabase Realtime ao invés de SSE

  try {
    // Para um streaming SSE funcional, precisaríamos:
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Enviar mensagem inicial
          const message = `data: ${JSON.stringify({
            type: "connected",
            campaign,
            timestamp: new Date().toISOString(),
          })}\n\n`;

          controller.enqueue(encoder.encode(message));

          // Manter conexão aberta (limitado pelo timeout do Vercel)
          const interval = setInterval(() => {
            const keepAlive = `data: ${JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString(),
            })}\n\n`;

            try {
              controller.enqueue(encoder.encode(keepAlive));
            } catch (e) {
              clearInterval(interval);
              controller.close();
            }
          }, 10000); // Ping a cada 10 segundos

          // Limpar após timeout (Vercel limita a 30s)
          setTimeout(() => {
            clearInterval(interval);
            controller.close();
          }, 25000);
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Whiteboard stream error:", error);
    return new Response(
      JSON.stringify({
        error: "Stream failed",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
