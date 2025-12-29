import { list } from "@vercel/blob";

export const config = { runtime: "edge" };

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
      const all = await list({
        prefix: "campaigns/",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      const indexCandidates = (all.blobs as any[]).filter((b: any) =>
        b.pathname.endsWith("/index.json")
      );
      for (const b of indexCandidates) indexes.push(b.pathname);
    }

    const results: FileRecord[] = [];
    for (const path of indexes) {
      const blobs = await list({
        prefix: path,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      const found = (blobs.blobs as any[]).find(
        (b: any) => b.pathname === path
      );
      if (found) {
        const resp = await fetch(found.url);
        if (resp.ok) {
          const arr: FileRecord[] = await resp.json();
          results.push(...arr);
        }
      }
    }

    return new Response(JSON.stringify({ files: results }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to list files" }), {
      status: 500,
    });
  }
}
