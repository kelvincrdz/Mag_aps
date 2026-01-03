import { useState, useEffect, useCallback, useRef } from "react";

export interface WhiteboardElement {
  id: string;
  type: "text" | "draw" | "shape";
  x: number;
  y: number;
  data: any;
}

export interface WhiteboardData {
  elements: WhiteboardElement[];
  timestamp: number;
}

export function useWhiteboard(campaign: string | null, enablePolling = true) {
  const [data, setData] = useState<WhiteboardData>({
    elements: [],
    timestamp: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Função para buscar dados
  const fetchData = useCallback(async () => {
    if (!campaign) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/whiteboard-data?campaign=${encodeURIComponent(campaign)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newData: WhiteboardData = await response.json();

      // Só atualiza se houve mudança
      if (newData.timestamp !== lastUpdate) {
        setData(newData);
        setLastUpdate(newData.timestamp);
      }
    } catch (err) {
      console.error("[useWhiteboard] Erro ao buscar dados:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [campaign, lastUpdate]);

  // Função para salvar dados
  const saveData = useCallback(
    async (newData: Partial<WhiteboardData>) => {
      if (!campaign) return;

      try {
        setError(null);

        const response = await fetch(
          `/api/whiteboard-data?campaign=${encodeURIComponent(campaign)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              elements: newData.elements || data.elements,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setLastUpdate(result.timestamp);

        // Buscar dados atualizados
        await fetchData();
      } catch (err) {
        console.error("[useWhiteboard] Erro ao salvar dados:", err);
        setError(err instanceof Error ? err.message : "Erro ao salvar");
        throw err;
      }
    },
    [campaign, data.elements, fetchData]
  );

  // Polling setup
  useEffect(() => {
    if (!campaign || !enablePolling) {
      return;
    }

    // Busca inicial
    fetchData();

    // Configurar polling a cada 5 segundos
    pollingIntervalRef.current = setInterval(() => {
      fetchData();
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [campaign, enablePolling, fetchData]);

  return {
    data,
    loading,
    error,
    saveData,
    refreshData: fetchData,
  };
}
