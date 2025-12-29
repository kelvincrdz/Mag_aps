import { supabase } from "../lib/supabase";

interface FileRecord {
  id: string;
  name: string;
  type: "audio" | "document";
  campaign: string;
  folder: string;
  url: string;
  allowedUserIds: string[];
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const campaign = searchParams.get("campaign");

    const indexes: string[] = [];
    if (campaign) {
      indexes.push(
        `campaigns/${campaign.toLowerCase().replace(/\s+/g, "-")}/index.json`
      );
    } else {
      // Discover all campaign indices under campaigns/*/index.json
      const { data: files } = await supabase.storage
        .from("mag-files")
        .list("campaigns", {
          limit: 1000,
          offset: 0,
        });

      if (files) {
        // List subdirectories (campaigns)
        for (const folder of files) {
          const indexPath = `campaigns/${folder.name}/index.json`;
          const { data: indexFile } = await supabase.storage
            .from("mag-files")
            .list(`campaigns/${folder.name}`, {
              limit: 1,
              search: "index.json",
            });

          if (indexFile && indexFile.length > 0) {
            indexes.push(indexPath);
          }
        }
      }
    }

    const results: FileRecord[] = [];
    for (const path of indexes) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("mag-files").getPublicUrl(path);

      try {
        const resp = await fetch(publicUrl);
        if (resp.ok) {
          const arr: FileRecord[] = await resp.json();
          results.push(...arr);
        }
      } catch (e) {
        // Index file might not exist yet
        console.warn(`Could not fetch ${path}:`, e);
      }
    }

    return new Response(JSON.stringify({ files: results }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("List files error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to list files";
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export { handler as GET };
