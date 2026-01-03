import { VercelRequest, VercelResponse } from "@vercel/node";
import { loadWhiteboard } from "../services/magService";

// Configuração CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const config = {
  maxDuration: 300, // 5 minutos máximo para conexão SSE
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const campaign = req.query.campaign as string;

  if (!campaign) {
    res.status(400).json({ error: "Campaign name required" });
    return;
  }

  // Configurar headers para SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Enviar comentário inicial para estabelecer conexão
  res.write(": connected\n\n");

  let lastHash = "";
  let errorCount = 0;
  const maxErrors = 3;

  // Poll database a cada 500ms e enviar apenas quando houver mudanças
  const interval = setInterval(async () => {
    try {
      const data = await loadWhiteboard(campaign);

      if (data && data.elements) {
        const currentHash = JSON.stringify(data.elements);

        // Enviar apenas se houve mudança
        if (currentHash !== lastHash) {
          const eventData = JSON.stringify({
            elements: data.elements,
            timestamp: Date.now(),
          });

          res.write(`data: ${eventData}\n\n`);
          lastHash = currentHash;
          errorCount = 0; // Reset error count on success

          console.log(
            "[SSE] Enviando update para campanha:",
            campaign,
            "- Elementos:",
            data.elements.length
          );
        }
      }
    } catch (error) {
      errorCount++;
      console.error("[SSE] Erro ao carregar whiteboard:", error);

      // Se muitos erros, enviar erro ao cliente e fechar conexão
      if (errorCount >= maxErrors) {
        res.write(
          `event: error\ndata: {"message":"Erro ao carregar dados"}\n\n`
        );
        clearInterval(interval);
        res.end();
      }
    }
  }, 500); // 500ms para latência baixa

  // Heartbeat a cada 30s para manter conexão viva
  const heartbeatInterval = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  // Cleanup quando cliente desconectar
  req.on("close", () => {
    console.log("[SSE] Cliente desconectado da campanha:", campaign);
    clearInterval(interval);
    clearInterval(heartbeatInterval);
    res.end();
  });

  // Cleanup em caso de erro
  req.on("error", (err: Error) => {
    console.error("[SSE] Erro na requisição:", err);
    clearInterval(interval);
    clearInterval(heartbeatInterval);
    res.end();
  });
}
