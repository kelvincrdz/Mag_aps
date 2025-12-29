import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { list, put } from "@vercel/blob";

export const config = { runtime: "edge" };

function slugify(input: string) {
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

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
        const allowedContentTypes = [
          "audio/mpeg",
          "audio/wav",
          "text/markdown",
        ];
        return {
          allowedContentTypes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const payload = tokenPayload ? JSON.parse(tokenPayload) : {};
          const fullPath: string = payload.pathname || blob.pathname;
          // Expect path format campaigns/<campaign>/<folder>/<file>
          const parts = fullPath.split("/");
          let campaign = "Imported";
          let folder = "Arquivos";
          if (parts.length >= 4 && parts[0] === "campaigns") {
            campaign = parts[1];
            folder = parts[2];
          }
          const record = {
            id: blob.pathname,
            name: blob.pathname.split("/").pop() || blob.pathname,
            type: blob.contentType?.startsWith("audio") ? "audio" : "document",
            campaign,
            folder,
            url: blob.url,
            allowedUserIds: [],
          };

          // Merge into index.json for campaign
          const indexPath = `campaigns/${slugify(campaign)}/index.json`;
          let current: any[] = [];
          const existing = await list({
            prefix: indexPath,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          const found = (existing.blobs as any[]).find(
            (b: any) => b.pathname === indexPath
          );
          if (found) {
            const resp = await fetch(found.url);
            if (resp.ok) current = await resp.json();
          }
          const idx = current.findIndex((r) => r.id === record.id);
          if (idx >= 0) current[idx] = record;
          else current.push(record);
          await put(indexPath, JSON.stringify(current, null, 2), {
            access: "public",
            contentType: "application/json",
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
        } catch (error) {
          throw new Error("Failed to persist metadata");
        }
      },
    });

    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
    });
  }
}
