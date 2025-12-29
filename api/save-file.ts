import { list, put } from "@vercel/blob";

export const config = { runtime: "edge" };

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
    if (!record || !record.campaign || !record.folder || !record.url) {
      return new Response(JSON.stringify({ error: "Invalid record payload" }), {
        status: 400,
      });
    }

    const safeCampaign = slug(record.campaign);
    const indexPath = `campaigns/${safeCampaign}/index.json`;

    // Try to read existing index.json
    let current: FileRecord[] = [];
    const existing = await list({
      prefix: indexPath,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const found = (existing.blobs as any[]).find(
      (b: any) => b.pathname === indexPath
    );
    if (found) {
      const resp = await fetch(found.url);
      if (resp.ok) {
        current = await resp.json();
      }
    }

    // Merge or add
    const idx = current.findIndex((r) => r.id === record.id);
    if (idx >= 0) current[idx] = record;
    else current.push(record);

    // Write back
    await put(indexPath, JSON.stringify(current, null, 2), {
      access: "public",
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to save index" }), {
      status: 500,
    });
  }
}
