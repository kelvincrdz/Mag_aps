import { put } from "@vercel/blob";

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

  try {
    const form = await req.formData();
    const campaign = String(form.get("campaign") || "default");
    const folder = String(form.get("folder") || "Arquivos");
    const filename = String(form.get("filename") || "file");
    const contentType = String(
      form.get("contentType") || "application/octet-stream"
    );
    const fileBlob = form.get("file");

    if (!(fileBlob instanceof Blob)) {
      return new Response(JSON.stringify({ error: "Missing file blob" }), {
        status: 400,
      });
    }

    const safeCampaign = slugify(campaign);
    const safeFolder = slugify(folder);
    const safeName = slugify(filename);
    const ts = Date.now();
    const pathname = `campaigns/${safeCampaign}/${safeFolder}/${ts}-${safeName}`;

    const blob = await put(pathname, fileBlob, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType,
      // cacheControlMaxAge: 2592000, // 30 days (optional)
    });

    return new Response(
      JSON.stringify({ url: blob.url, pathname: blob.pathname }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
    });
  }
}
