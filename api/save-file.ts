import { supabase } from "../lib/supabase";

export const config = {
  runtime: "edge",
};

interface FileRecord {
  id: string;
  name: string;
  type: "audio" | "document";
  campaign: string;
  folder: string;
  url: string; // blob public URL
  allowedUserIds: string[];
}

function slug(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const body = await req.json();
    const record: FileRecord = body.record;

    console.log("[save-file] Saving:", record?.id);

    if (!record || !record.campaign || !record.folder || !record.url) {
      console.error("[save-file] Invalid record");
      return new Response(JSON.stringify({ error: "Invalid record payload" }), {
        status: 400,
      });
    }

    const safeCampaign = slug(record.campaign);
    const indexPath = `campaigns/${safeCampaign}/index.json`;

    console.log("[save-file] Index:", indexPath);

    // Try to read existing index.json
    let current: FileRecord[] = [];
    const {
      data: { publicUrl },
    } = supabase.storage.from("mag-files").getPublicUrl(indexPath);

    try {
      const resp = await fetch(publicUrl);
      if (resp.ok) {
        current = await resp.json();
        console.log("[save-file] Found", current.length, "existing records");
      } else {
        console.log("[save-file] No existing index (status", resp.status, ")");
      }
    } catch (e) {
      console.log("[save-file] Creating new index");
    }

    // Merge or add
    const idx = current.findIndex((r) => r.id === record.id);
    if (idx >= 0) current[idx] = record;
    else current.push(record);

    // Write back to Supabase Storage
    const indexBlob = new Blob([JSON.stringify(current, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from("mag-files")
      .upload(indexPath, indexBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to save index: ${error.message}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Save metadata error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to save index";
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export { handler as POST };
